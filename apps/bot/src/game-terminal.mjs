import { createServer } from 'node:http';
import { createInterface } from 'node:readline';
import { WebSocket } from 'ws';
import {
  CARD_BY_ID,
  baseCellsForSeat,
  effectiveCardCost,
  forwardDeltaForSeat,
  goblinTowerRequirementError,
  gridCellsBetween,
  isAttackDistanceValid,
  isCannonTargetValid,
  isDeploymentCell,
  isRoadCard,
  isRoadPlacementCell,
  roadAttackBonus,
  roadMovementBonus,
  movementDistance
} from '@tronos/shared/cards';
import { CLIENT_EVENTS, SERVER_EVENTS, encodeMessage, parseMessage } from '@tronos/shared/protocol';
import { formatDeckSummary, selectDeckBeforeMatch } from './deck-builder.mjs';

const args = process.argv.slice(2);
const mode = String(args[0] ?? '').toLowerCase();
const roomCode = mode === 'entrar' || mode === 'join' ? String(args[1] ?? '').toUpperCase() : null;
const playerName = mode === 'criar' || mode === 'create' ? String(args[1] ?? 'Codex') : String(args[2] ?? 'Codex');
const wsUrl = process.env.TRONOS_WS_URL ?? 'ws://127.0.0.1:3001/ws';
const apiUrl = (process.env.TRONOS_API_URL ?? 'http://127.0.0.1:3001/api').replace(/\/+$/, '');
const clientOrigin = process.env.TRONOS_CLIENT_ORIGIN ?? 'http://127.0.0.1:4173';
const roomVisibility = process.env.TRONOS_ROOM_VISIBILITY === 'public' ? 'public' : 'private';
const controlPort = Number(process.env.TRONOS_TERMINAL_PORT ?? 4310);

if (!['entrar', 'join', 'criar', 'create'].includes(mode) || (roomCode && !/^[A-Z2-9]{6}$/.test(roomCode))) {
  console.log('Uso:');
  console.log('  node apps/bot/src/game-terminal.mjs entrar CODIGO Nome [--deck ids,separados]');
  console.log('  node apps/bot/src/game-terminal.mjs criar Nome [--deck ids,separados]');
  process.exit(1);
}

const selectedDeckCardIds = await selectDeckBeforeMatch({ args });

async function createAuthenticatedSocketTicket() {
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Origin: clientOrigin,
    'X-Nexus-Request': 'browser'
  };
  const guestResponse = await fetch(`${apiUrl}/auth/guest`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ name: playerName })
  });
  const guestPayload = await guestResponse.json().catch(() => ({}));
  if (!guestResponse.ok) throw new Error(guestPayload.message ?? `Falha ao criar jogador (${guestResponse.status}).`);
  const setCookie = guestResponse.headers.get('set-cookie');
  const cookie = String(setCookie ?? '').split(';', 1)[0];
  if (!cookie || !guestPayload.csrfToken) throw new Error('O servidor não devolveu uma sessão válida.');

  const authenticatedHeaders = {
    ...headers,
    Cookie: cookie,
    'X-CSRF-Token': guestPayload.csrfToken
  };
  const deckResponse = await fetch(`${apiUrl}/deck`, {
    method: 'PUT',
    headers: authenticatedHeaders,
    body: JSON.stringify({ cardIds: selectedDeckCardIds })
  });
  const deckPayload = await deckResponse.json().catch(() => ({}));
  if (!deckResponse.ok) throw new Error(deckPayload.message ?? `Falha ao salvar o deck (${deckResponse.status}).`);

  const ticketResponse = await fetch(`${apiUrl}/auth/socket-ticket`, {
    method: 'POST',
    headers: authenticatedHeaders,
    body: '{}'
  });
  const ticketPayload = await ticketResponse.json().catch(() => ({}));
  if (!ticketResponse.ok || !ticketPayload.ticket) {
    throw new Error(ticketPayload.message ?? `Falha ao criar acesso à partida (${ticketResponse.status}).`);
  }
  return ticketPayload.ticket;
}

let snapshot = null;
let lastText = 'Conectando ao servidor...';
let lastError = null;
const ownAliases = new Map();
const enemyAliases = new Map();
let ownCounter = 0;
let enemyCounter = 0;

function aliasFor(unit) {
  if (!snapshot) return unit.id.slice(0, 6);
  const own = unit.ownerSeat === snapshot.self.seat;
  const aliases = own ? ownAliases : enemyAliases;
  if (!aliases.has(unit.id)) aliases.set(unit.id, `${own ? 'M' : 'E'}${own ? ++ownCounter : ++enemyCounter}`);
  return aliases.get(unit.id);
}

function unitByAlias(value) {
  const wanted = String(value ?? '').toUpperCase();
  return snapshot?.state.units.find(unit => aliasFor(unit) === wanted || unit.id === value) ?? null;
}

function handByAlias(value) {
  const match = /^H(\d+)$/i.exec(String(value ?? ''));
  return match ? snapshot?.self.hand[Number(match[1]) - 1] ?? null : snapshot?.self.hand.find(card => card.instanceId === value) ?? null;
}

function cardForUnit(unit) {
  const card = CARD_BY_ID[unit.cardId];
  const tower = unit.cardId === 'archer' ? mountedTower(unit) : null;
  const towerRangeBonus = tower ? (CARD_BY_ID[tower.cardId]?.archerRangeBonus ?? 1) : 0;
  const towerDamageBonus = tower ? (CARD_BY_ID[tower.cardId]?.archerDamageBonus ?? 0) : 0;
  const adjacentRoyalBonus = unit.cardId === 'archer' && !tower && snapshot.state.units.some(candidate =>
    candidate.ownerSeat === unit.ownerSeat
    && candidate.cardId === 'royal_tower'
    && !candidate.underConstruction
    && Math.max(Math.abs(candidate.x - unit.x), Math.abs(candidate.z - unit.z)) === 1)
    ? CARD_BY_ID.royal_tower.adjacentArcherRangeBonus
    : 0;
  const roadBonus = roadAttackBonus(unit.x, unit.z, snapshot?.state.roads ?? [], unit.cardId);
  return towerRangeBonus || towerDamageBonus || adjacentRoyalBonus || roadBonus
    ? {
        ...card,
        attackRange: card.attackRange + towerRangeBonus + adjacentRoyalBonus + roadBonus,
        damage: card.damage + towerDamageBonus,
      }
    : card;
}

function unitAt(x, z, excludeId = null) {
  return snapshot?.state.units.find(unit => unit.id !== excludeId && unit.x === x && unit.z === z) ?? null;
}

function cellInBase(x, z) {
  return [1, 2].some(seat => baseCellsForSeat(seat, snapshot.state.board.size).some(cell => cell.x === x && cell.z === z));
}

function lineBlocked(from, to, excludeId = null) {
  return gridCellsBetween(from, to).some(cell => unitAt(cell.x, cell.z, excludeId));
}

function cannonOperator(cannon) {
  const forward = forwardDeltaForSeat(cannon.ownerSeat);
  const operator = unitAt(cannon.x - forward.x, cannon.z - forward.z, cannon.id);
  return operator?.cardId === 'operator' && operator.ownerSeat === cannon.ownerSeat ? operator : null;
}

function operatedCannon(operator) {
  const forward = forwardDeltaForSeat(operator.ownerSeat);
  const cannon = unitAt(operator.x + forward.x, operator.z + forward.z, operator.id);
  return cannon?.cardId === 'cannon' && cannon.ownerSeat === operator.ownerSeat ? cannon : null;
}

function cannonShotCells(cannon) {
  const size = snapshot.state.board.size;
  const forward = forwardDeltaForSeat(cannon.ownerSeat);
  const cells = [];
  for (let step = CARD_BY_ID.cannon.minAttackRange; step <= CARD_BY_ID.cannon.attackRange; step += 1) {
    const cell = { x: cannon.x + forward.x * step, z: cannon.z + forward.z * step };
    if (cell.x < 0 || cell.x >= size || cell.z < 0 || cell.z >= size || attackLineBlocked(cannon, cell)) continue;
    cells.push(cell);
  }
  return cells;
}

function mountedTower(unit) {
  if (!unit?.mountedOnTowerId) return null;
  return snapshot.state.units.find(candidate => candidate.id === unit.mountedOnTowerId
    && ['tower', 'royal_tower'].includes(candidate.cardId)
    && candidate.ownerSeat === unit.ownerSeat
    && !candidate.underConstruction) ?? null;
}

function attackLineBlocked(unit, target) {
  if (unit?.cardId === 'archer' && mountedTower(unit)) return false;
  return gridCellsBetween(unit, target).some(cell => {
    const blocker = unitAt(cell.x, cell.z, unit.id);
    return blocker && (unit.cardId !== 'archer' || blocker.cardId !== 'wooden_barrier');
  });
}

function mountableTowerAt(unit, x, z) {
  if (unit.cardId !== 'archer') return null;
  const occupants = snapshot.state.units.filter(candidate => candidate.id !== unit.id && candidate.x === x && candidate.z === z);
  const tower = occupants.find(candidate => candidate.cardId === 'tower' && candidate.ownerSeat === unit.ownerSeat && !candidate.underConstruction);
  const occupied = occupants.some(candidate => candidate.cardId === 'archer' && candidate.mountedOnTowerId === tower?.id);
  return tower && !occupied && occupants.every(candidate => candidate.id === tower.id) ? tower : null;
}

function movementCells(unit, card) {
  if (card.type === 'construction' || card.type === 'terrain' || unit.mountedOnTowerId || unit.cardId === 'cannon') return [];
  const range = card.move + roadMovementBonus(unit.x, unit.z, snapshot.state.roads ?? [], unit.cardId);
  const cells = [];
  for (let x = 0; x < snapshot.state.board.size; x += 1) for (let z = 0; z < snapshot.state.board.size; z += 1) {
    const value = movementDistance(card.movementType, unit, { x, z });
    const tower = mountableTowerAt(unit, x, z);
    const occupied = snapshot.state.units.some(candidate => candidate.id !== unit.id && candidate.x === x && candidate.z === z);
    if (value >= 1 && value <= range && !cellInBase(x, z) && (!occupied || tower) && !lineBlocked(unit, { x, z }, unit.id)) cells.push({ x, z, tower });
  }
  return cells;
}

function mageFireCells(unit) {
  const card = CARD_BY_ID.mage;
  const cells = [];
  for (let x = 0; x < snapshot.state.board.size; x += 1) for (let z = 0; z < snapshot.state.board.size; z += 1) {
    const value = Math.abs(x - unit.x) + Math.abs(z - unit.z);
    if (value >= card.minAttackRange && value <= card.attackRange) cells.push({ x, z });
  }
  return cells;
}

function summonCells(instance) {
  const card = CARD_BY_ID[instance.cardId], seat = snapshot.self.seat, cells = [];
  for (let x = 0; x < snapshot.state.board.size; x += 1) for (let z = 0; z < snapshot.state.board.size; z += 1) {
    const occupants = snapshot.state.units.filter(unit => unit.x === x && unit.z === z);
    const tower = card.id === 'archer' && occupants.find(unit => ['tower', 'royal_tower'].includes(unit.cardId) && unit.ownerSeat === seat && !unit.underConstruction);
    const mountable = tower && occupants.length === 1;
    const roadBlocker = occupants.some(unit => ['construction', 'machine'].includes(CARD_BY_ID[unit.cardId]?.type));
    const roadOccupied = (snapshot.state.roads ?? []).some(road => road.x === x && road.z === z);
    const valid = card.type === 'spell'
      ? !cellInBase(x, z)
      : isRoadCard(card.id)
      ? !cellInBase(x, z) && !roadBlocker && isRoadPlacementCell(seat, x, z, snapshot.state.roads ?? [], snapshot.state.board.size)
      : isDeploymentCell(seat, x, z, snapshot.state.board.size) && !cellInBase(x, z) && (!occupants.length || mountable) && !(roadOccupied && ['construction', 'machine'].includes(card.type));
    const besideBasicHouse = card.id === 'goblin_house' && snapshot.state.units.some(unit => {
      const nearby = CARD_BY_ID[unit.cardId];
      return nearby?.house && nearby.category === 'basic'
        && Math.max(Math.abs(unit.x - x), Math.abs(unit.z - z)) === 1;
    });
    if (valid && !besideBasicHouse) cells.push({ x, z, mountable: Boolean(mountable) });
  }
  return cells;
}

function goblinSummonCells() {
  const cells = [];
  for (let x = 0; x < snapshot.state.board.size; x += 1) for (let z = 0; z < snapshot.state.board.size; z += 1) {
    if (!cellInBase(x, z) && !unitAt(x, z)) cells.push({ x, z });
  }
  return cells;
}

function possibleCardActions(instance) {
  const card = CARD_BY_ID[instance.cardId];
  const me = snapshot.state.players.find(player => player.seat === snapshot.self.seat);
  const cost = effectiveCardCost(card.id, snapshot.self.seat, snapshot.state.units, {
    lastPlayedGoblinTroopCardId: snapshot.self.lastPlayedGoblinTroopCardId
  });
  if (snapshot.state.activeSeat !== snapshot.self.seat) return 'Não é o seu turno.';
  if (card.id === 'goblin_clone' && !snapshot.self.lastPlayedGoblinTroopCardId) return 'Clone Goblin: lance uma tropa Goblin antes.';
  const goblinTowerError = goblinTowerRequirementError(card.id, snapshot.self.seat, snapshot.state.units);
  if (goblinTowerError) return goblinTowerError;
  if (me.energy < cost) return `${card.name}: energia insuficiente (${me.energy}/${cost}).`;
  const cells = summonCells(instance);
  const discount = card.cost - cost;
  const summonNote = card.id === 'goblin_swarm'
    ? `\n  efeito: ocupa 3 casas aleatórias entre as ${cells.length} casas válidas`
    : '';
  return `${card.name} (${card.rarity}, custo ${cost}${discount > 0 ? ` (-${discount})` : ''})\n  invocar: ${cells.map(cell => `${cell.x},${cell.z}${cell.mountable ? '(torre)' : ''}`).join(' ') || 'nenhum'}${summonNote}`;
}

function cellCode(x, z) {
  const occupants = snapshot.state.units.filter(unit => unit.x === x && unit.z === z);
  if (occupants.length) {
    const mounted = occupants.find(unit => unit.mountedOnTowerId);
    return aliasFor(mounted ?? occupants[0]).padEnd(3).slice(0, 3);
  }
  if ((snapshot.state.fires ?? []).some(fire => fire.x === x && fire.z === z)) return ' F ';
  const road = (snapshot.state.roads ?? []).find(item => item.x === x && item.z === z);
  if (road) return road.underConstruction ? ' r ' : `R${road.ownerSeat} `;
  for (const seat of [1, 2]) {
    if (baseCellsForSeat(seat, snapshot.state.board.size).some(cell => cell.x === x && cell.z === z)) return `B${seat} `;
  }
  return ' . ';
}

function remainingSeconds() {
  if (!snapshot?.state.turnEndsAt) return '--';
  return String(Math.max(0, Math.ceil((snapshot.state.turnEndsAt - Date.now()) / 1000)));
}

function renderState() {
  if (!snapshot) return lastText;
  const { state, self, code } = snapshot;
  const me = state.players.find(player => player.seat === self.seat);
  const rival = state.players.find(player => player.seat !== self.seat);
  const lines = [
    '',
    `SALA ${code} | ${state.phase.toUpperCase()} | rodada ${state.round} | versão ${state.version}`,
    `DECK: ${formatDeckSummary(selectedDeckCardIds)}`,
    `Turno: P${state.activeSeat}${state.activeSeat === self.seat ? ' (VOCÊ)' : ' (RIVAL)'} | ${remainingSeconds()}s`,
    `P${me.seat} ${me.name}: base ${me.baseHp} LV${me.baseLevel ?? 1} | cidadãos ${me.citizens ?? 0} | energia ${me.energy}/${me.maxEnergy} | mão ${me.handCount} | deck ${me.deckCount}`,
    rival ? `P${rival.seat} ${rival.name}: base ${rival.baseHp} LV${rival.baseLevel ?? 1} | cidadãos ${rival.citizens ?? 0} | energia ${rival.energy}/${rival.maxEnergy} | mão ${rival.handCount} | deck ${rival.deckCount}` : 'Aguardando rival...',
    '',
    `MÃO: ${self.hand.length ? self.hand.map((instance, index) => {
      const card = CARD_BY_ID[instance.cardId];
      const cost = effectiveCardCost(card.id, self.seat, state.units, {
        lastPlayedGoblinTroopCardId: self.lastPlayedGoblinTroopCardId
      });
      const discount = card.cost - cost;
      return `H${index + 1}=${card.name}[${card.rarity}](${Number.isFinite(cost) ? `c${cost}${discount > 0 ? `(-${discount})` : ''}` : 'c—'})`;
    }).join(' | ') : 'vazia'}`,
    ...(self.pendingMageAltarChoices > 0 ? [
      '',
      `ESCOLHA DO ALTAR MAGO (${self.pendingMageAltarChoices}): ${self.deckChoices.map(cardId => `${cardId}=${CARD_BY_ID[cardId]?.name ?? cardId}`).join(' | ')}`,
      'Use: escolher ID_DA_CARTA'
    ] : []),
    '',
    'UNIDADES:'
  ];

  if (!state.units.length) lines.push('  nenhuma');
  for (const unit of state.units) {
    const card = cardForUnit(unit);
    const flags = [
      unit.actionUsed ? 'AGIU' : 'PRONTO',
      unit.cardId === 'henry' && unit.movedThisTurn ? 'MOVEU' : null,
      unit.cardId === 'henry' && unit.attackedThisTurn ? 'ATACOU' : null,
      unit.underConstruction ? `CONSTRUINDO(R${unit.buildReadyRound})` : null,
      unit.mountedOnTowerId ? 'NA-TORRE' : null,
      unit.cardId === 'cannon' ? (cannonOperator(unit) ? `OPERADO:${aliasFor(cannonOperator(unit))}` : 'SEM-OPERADOR') : null,
      unit.cardId === 'operator' && operatedCannon(unit) ? `OPERANDO:${aliasFor(operatedCannon(unit))}` : null,
      unit.bonusMoves > 0 ? `MOV+${unit.bonusMoves}` : null,
      unit.bonusAttacks > 0 ? `ATQ+${unit.bonusAttacks}` : null
    ].filter(Boolean).join(',');
    lines.push(`  ${aliasFor(unit)} P${unit.ownerSeat} ${card.name} @${unit.x},${unit.z} HP${unit.hp} ATK${card.damage} MOV${card.move} ALC${card.minAttackRange ?? 1}-${card.attackRange} [${flags}]`);
  }

  lines.push('', 'RUAS:');
  if (!(state.roads ?? []).length) lines.push('  nenhuma');
  for (const road of state.roads ?? []) {
    const roadCard = CARD_BY_ID[road.cardId ?? 'road'];
    lines.push(`  P${road.ownerSeat} ${roadCard?.name ?? road.cardId ?? 'Rua'} @${road.x},${road.z} [${road.underConstruction ? `CONSTRUINDO(R${road.buildReadyRound})` : 'PRONTA'}]`);
  }

  lines.push('', 'FOGOS:');
  if (!(state.fires ?? []).length) lines.push('  nenhum');
  for (const fire of state.fires ?? []) lines.push(`  P${fire.ownerSeat} @${fire.x},${fire.z} atingidos:${fire.damagedUnitIds?.length ?? 0}`);

  const size = state.board.size;
  lines.push('', `TABULEIRO (x 0-${size - 1}, z nas linhas):`);
  lines.push(`    ${Array.from({ length: size }, (_, x) => String(x).padStart(2)).join(' ')}`);
  for (let z = 0; z < size; z += 1) {
    lines.push(`${String(z).padStart(2)} |${Array.from({ length: size }, (_, x) => cellCode(x, z)).join('')}`);
  }
  lines.push('', 'Legenda: B=base, R=Rua pronta, r=Rua construindo, F=fogo, M=minha unidade, E=inimiga');
  lines.push('Comandos: estado | acoes [M1|H1] | invocar H1 x z | mover M1 x z | atacar M1 E1|base | disparar M1 x z | fogo M1 x z [x z] | acido M1 | goblin M1 x z | habilidade M1 | escolher carta_id | passar | json | ajuda');
  return lines.join('\n');
}

function possibleActions(unit) {
  if (!snapshot || unit.ownerSeat !== snapshot.self.seat) return 'Escolha uma unidade sua.';
  const { state } = snapshot;
  const card = cardForUnit(unit);
  const results = [];
  const me = state.players.find(player => player.seat === snapshot.self.seat);
  const turnIndex = (state.round - 1) * 2 + (state.activeSeat === 2 ? 1 : 0);
  const tower = mountedTower(unit);
  const instant = unit.isGoblinClone
    ? CARD_BY_ID.goblin_clone.instant
    : unit.cardId === 'archer' && tower?.cardId === 'tower'
      ? CARD_BY_ID.tower.instant
      : card.instant;
  const instantReady = instant?.enabled
    && (unit.instantReadyTurn ?? 0) <= turnIndex
    && me.energy >= instant.cost;
  if (instantReady) results.push(unit.isGoblinClone
    ? `instantânea (qualquer turno): f ${aliasFor(unit)} · custo ${instant.cost} · +1 vida máxima e dano`
    : unit.cardId === 'archer'
      ? `instantânea (qualquer turno): f ${aliasFor(unit)} · custo ${instant.cost} · ${instant.damage} de dano nas 4 direções`
      : `instantânea (qualquer turno): acido ${aliasFor(unit)} · custo ${instant.cost} · dano ${instant.damage} em todas as cartas ao redor`);
  if (state.activeSeat !== snapshot.self.seat) return `${aliasFor(unit)} ${card.name}\n  ${results.join('\n  ') || 'Não é o seu turno.'}`;
  const hasGoblinBonusAction = unit.cardId !== 'henry' && ((unit.bonusMoves ?? 0) > 0 || (unit.bonusAttacks ?? 0) > 0);
  if (unit.actionUsed && !hasGoblinBonusAction) return `${aliasFor(unit)} já agiu neste turno.${results.length ? `\n  ${results.join('\n  ')}` : ''}`;
  if (unit.underConstruction) return `${aliasFor(unit)} ainda está em construção.`;

  if (card.id === 'cannon') {
    const operator = cannonOperator(unit);
    const forward = forwardDeltaForSeat(unit.ownerSeat);
    const destination = { x: unit.x + forward.x, z: unit.z + forward.z };
    const canMove = operator && !operator.actionUsed && !unitAt(destination.x, destination.z, unit.id) && !cellInBase(destination.x, destination.z);
    results.push(`mover formação: ${canMove ? `${destination.x},${destination.z}` : 'nenhum (exige Operador pronto exatamente atrás e frente livre)'}`);
    const shots = operator && !operator.actionUsed ? cannonShotCells(unit) : [];
    results.push(`disparar (centro ${card.damage}, redor ${card.areaDamage}, raio ${card.areaRadius}, inclusive aliados): ${shots.map(cell => `${cell.x},${cell.z}`).join(' ') || 'nenhum'}`);
  } else {
    const moves = (card.id === 'henry' && unit.movedThisTurn) || (unit.actionUsed && (unit.bonusMoves ?? 0) < 1)
      ? []
      : movementCells(unit, card);
    if (card.type !== 'construction' && card.type !== 'terrain') results.push(`mover: ${moves.map(cell => `${cell.x},${cell.z}${cell.tower ? '(torre)' : ''}`).join(' ') || 'nenhum'}`);
  }

  if (card.id === 'mage') {
    results.push(`fogo (escolha 1 ou 2): ${mageFireCells(unit).map(cell => `${cell.x},${cell.z}`).join(' ')}`);
  } else if (card.id === 'goblin_tower') {
    const cells = goblinSummonCells();
    if (me.energy >= card.ability.cost) results.push(`reforço goblin: goblin ${aliasFor(unit)} x z · custo ${card.ability.cost} · ${cells.length} casas livres fora das bases`);
    else results.push(`reforço goblin: energia insuficiente (${me.energy}/${card.ability.cost})`);
  } else if (card.id === 'goblin_bomber') {
    const forward = forwardDeltaForSeat(unit.ownerSeat);
    const destination = { x: unit.x + forward.x * card.ability.chargeDistance, z: unit.z + forward.z * card.ability.chargeDistance };
    const inside = destination.x >= 0 && destination.x < state.board.size && destination.z >= 0 && destination.z < state.board.size;
    const clear = inside && !cellInBase(destination.x, destination.z) && !lineBlocked(unit, destination, unit.id);
    results.push(`carga explosiva: ${clear ? `habilidade ${aliasFor(unit)} → ${destination.x},${destination.z}` : 'indisponível (trajeto bloqueado, base ou fora da arena)'} · 3 em tropas · 4 em construções · raio 1`);
  } else if (['goblin_altar', 'mage_altar', 'goblin_house'].includes(card.id) && card.ability?.enabled) {
    if ((unit.abilityReadyTurn ?? 0) <= turnIndex && me.energy >= card.ability.cost) {
      results.push(`${card.ability.name}: habilidade ${aliasFor(unit)} · custo ${card.ability.cost}`);
    } else {
      results.push(`${card.ability.name}: indisponível ou energia insuficiente`);
    }
  } else if (card.id !== 'cannon'
    && card.damage > 0
    && !(card.id === 'henry' && unit.attackedThisTurn)
    && (!unit.actionUsed || (unit.bonusAttacks ?? 0) > 0)) {
    const targets = state.units.filter(target => target.ownerSeat !== unit.ownerSeat
      && isAttackDistanceValid(card, Math.abs(target.x - unit.x) + Math.abs(target.z - unit.z))
      && !attackLineBlocked(unit, target));
    results.push(`atacar: ${targets.map(aliasFor).join(' ') || 'nenhum'}`);
  }
  const rivalSeat = unit.ownerSeat === 1 ? 2 : 1;
  const attackAvailable = card.id === 'henry'
    ? !unit.attackedThisTurn
    : !unit.actionUsed || (unit.bonusAttacks ?? 0) > 0;
  const canHitBase = attackAvailable && baseCellsForSeat(rivalSeat, state.board.size).some(cell => (card.id === 'cannon'
    ? isCannonTargetValid(unit, cell)
    : card.id !== 'mage' && card.damage > 0 && isAttackDistanceValid(card, Math.abs(cell.x - unit.x) + Math.abs(cell.z - unit.z)))
    && !attackLineBlocked(unit, cell));
  if (canHitBase) results.push('base rival: atacar ' + aliasFor(unit) + ' base');
  return `${aliasFor(unit)} ${card.name}\n  ${results.join('\n  ')}`;
}

function sendAction(action) {
  if (!snapshot) throw new Error('Ainda não há estado da sala.');
  if (socket.readyState !== WebSocket.OPEN) throw new Error('WebSocket desconectado.');
  socket.send(encodeMessage(CLIENT_EVENTS.GAME_ACTION, { action, version: snapshot.state.version }));
  return `Enviado: ${JSON.stringify(action)}`;
}

function executeCommand(source) {
  const parts = String(source ?? '').trim().split(/\s+/).filter(Boolean);
  const command = String(parts.shift() ?? '').toLowerCase();
  if (!command || command === 'estado' || command === 'state') return renderState();
  if (command === 'json') return JSON.stringify(snapshot, null, 2);
  if (command === 'ajuda' || command === 'help') return [
    'estado',
    'acoes [M1|H1]',
    'invocar H1 x z',
    'mover M1 x z',
    'atacar M1 E1',
    'atacar M1 base',
    'disparar M1 x z  (Canhão: aceita casas vazias de 3 a 6 à frente; tropas e construções bloqueiam)',
    'habilidade M1 E1',
    'fogo M1 x z [x z]',
    'acido M1',
    'goblin M1 x z  (Torre Goblin: consome um Goblin do baralho e invoca na casa livre)',
    'habilidade M1  (Arqueiro montado, Goblin Bombardeiro, Altar Goblin ou Altar Mago)',
    'escolher carta_id  (compra obrigatória ao concluir o Altar Mago)',
    'passar',
    'json'
  ].join('\n');
  if (command === 'acoes' || command === 'actions') {
    const alias = parts[0];
    const chosenUnit = alias ? unitByAlias(alias) : null;
    const chosenCard = alias ? handByAlias(alias) : null;
    if (alias && !chosenUnit && !chosenCard) return 'Unidade ou carta não encontrada.';
    if (chosenCard) return possibleCardActions(chosenCard);
    if (chosenUnit) return possibleActions(chosenUnit);
    const ownUnits = snapshot.state.units.filter(unit => unit.ownerSeat === snapshot.self.seat);
    const hand = snapshot.self.hand;
    const sections = [...ownUnits.map(possibleActions), ...hand.map(possibleCardActions)];
    return sections.join('\n\n') || 'Nenhuma ação disponível.';
  }
  if (command === 'passar' || command === 'pass') return sendAction({ type: 'end_turn' });
  if (command === 'escolher' || command === 'choose') {
    const cardId = String(parts[0] ?? '').toLowerCase();
    if (!snapshot.self.deckChoices?.includes(cardId)) return 'Escolha uma das cartas listadas pelo Altar Mago.';
    return sendAction({ type: 'choose_deck_card', cardId });
  }
  if (command === 'invocar' || command === 'summon') {
    const card = handByAlias(parts[0]);
    if (!card) return 'Carta não encontrada. Use H1, H2...';
    return sendAction({ type: 'summon', cardInstanceId: card.instanceId, x: Number(parts[1]), z: Number(parts[2]) });
  }
  if (command === 'mover' || command === 'move') {
    const unit = unitByAlias(parts[0]);
    if (!unit) return 'Unidade não encontrada.';
    return sendAction({ type: 'move', unitId: unit.id, x: Number(parts[1]), z: Number(parts[2]) });
  }
  if (command === 'atacar' || command === 'attack') {
    const unit = unitByAlias(parts[0]);
    if (!unit) return 'Atacante não encontrado.';
    if (String(parts[1]).toLowerCase() === 'base') return sendAction({ type: 'attack', unitId: unit.id, targetBaseSeat: unit.ownerSeat === 1 ? 2 : 1 });
    if (unit.cardId === 'cannon' && Number.isInteger(Number(parts[1])) && Number.isInteger(Number(parts[2]))) {
      return sendAction({ type: 'attack', unitId: unit.id, x: Number(parts[1]), z: Number(parts[2]) });
    }
    const target = unitByAlias(parts[1]);
    if (!target) return 'Alvo não encontrado.';
    return sendAction({ type: 'attack', unitId: unit.id, targetUnitId: target.id });
  }
  if (command === 'disparar' || command === 'fire') {
    const unit = unitByAlias(parts[0]);
    if (!unit || unit.cardId !== 'cannon') return 'Escolha um Canhão seu.';
    return sendAction({ type: 'attack', unitId: unit.id, x: Number(parts[1]), z: Number(parts[2]) });
  }
  if (command === 'fogo' || command === 'mage_fire') {
    const unit = unitByAlias(parts[0]);
    if (!unit || unit.cardId !== 'mage' || unit.ownerSeat !== snapshot.self.seat) return 'Escolha um Mago seu.';
    const coordinates = parts.slice(1).map(Number);
    if (![2, 4].includes(coordinates.length) || coordinates.some(value => !Number.isInteger(value))) {
      return 'Use: fogo M1 x z [x z]';
    }
    const cells = [];
    for (let index = 0; index < coordinates.length; index += 2) cells.push({ x: coordinates[index], z: coordinates[index + 1] });
    return sendAction({ type: 'mage_fire', unitId: unit.id, cells });
  }
  if (command === 'acido' || command === 'acid') {
    const unit = unitByAlias(parts[0]);
    if (!unit || unit.cardId !== 'mage' || unit.ownerSeat !== snapshot.self.seat) return 'Escolha um Mago seu.';
    return sendAction({ type: 'use_instant', unitId: unit.id });
  }
  if (command === 'goblin' || command === 'reforco' || command === 'reinforcement') {
    const unit = unitByAlias(parts[0]);
    const x = Number(parts[1]);
    const z = Number(parts[2]);
    if (!unit || unit.cardId !== 'goblin_tower' || unit.ownerSeat !== snapshot.self.seat) return 'Escolha uma Torre Goblin sua.';
    if (!Number.isInteger(x) || !Number.isInteger(z)) return 'Use: goblin M1 x z';
    if (!goblinSummonCells().some(cell => cell.x === x && cell.z === z)) return 'Escolha uma casa livre fora das bases.';
    return sendAction({ type: 'summon_goblin', unitId: unit.id, x, z });
  }
  if (command === 'habilidade' || command === 'ability') {
    const unit = unitByAlias(parts[0]);
    const target = unitByAlias(parts[1]);
    if (!unit) return 'Unidade não encontrada.';
    return sendAction({ type: 'use_ability', unitId: unit.id, ...(target ? { targetUnitId: target.id } : {}) });
  }
  if (command === 'instantanea' || command === 'instant' || command === 'f') {
    const unit = unitByAlias(parts[0]);
    if (!unit) return 'Unidade não encontrada.';
    return sendAction({ type: 'use_instant', unitId: unit.id });
  }
  return 'Comando desconhecido. Digite ajuda.';
}

const socketTicket = await createAuthenticatedSocketTicket();
const socket = new WebSocket(wsUrl, ['nexus-v1'], { origin: clientOrigin });
socket.on('open', () => {
  socket.send(encodeMessage(CLIENT_EVENTS.AUTHENTICATE, { ticket: socketTicket }));
});
socket.on('message', raw => {
  const message = parseMessage(raw);
  if (!message) return;
  if (message.type === SERVER_EVENTS.AUTHENTICATED) {
    const type = roomCode ? CLIENT_EVENTS.ROOM_JOIN : CLIENT_EVENTS.ROOM_CREATE;
    socket.send(encodeMessage(type, roomCode
      ? { roomCode }
      : { name: `${playerName} vs IA`, visibility: roomVisibility }));
  } else if (message.type === SERVER_EVENTS.ROOM_STATE || message.type === SERVER_EVENTS.GAME_STATE) {
    snapshot = message.payload;
    lastError = null;
    lastText = renderState();
    console.log(lastText);
  } else if (message.type === SERVER_EVENTS.ERROR) {
    lastError = String(message.payload.message ?? 'Erro desconhecido.');
    console.error(`ERRO: ${lastError}`);
  }
});
socket.on('close', (code, reason) => console.error(`Conexão encerrada (${code}): ${String(reason)}`));
socket.on('error', error => console.error(`WebSocket: ${error.message}`));

const terminal = createInterface({ input: process.stdin, output: process.stdout, terminal: Boolean(process.stdin.isTTY) });
terminal.setPrompt('tronos> ');
terminal.on('line', line => {
  try { console.log(executeCommand(line)); } catch (error) { console.error(`ERRO: ${error.message}`); }
  terminal.prompt();
});
terminal.on('SIGINT', () => process.exit(0));
terminal.prompt();

const control = createServer((request, response) => {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  if (request.method === 'GET' && request.url === '/state') {
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    return response.end(JSON.stringify({ connected: socket.readyState === WebSocket.OPEN, error: lastError, text: renderState(), snapshot }));
  }
  if (request.method === 'GET' && request.url === '/text') {
    response.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return response.end(renderState());
  }
  if (request.method === 'GET' && request.url === '/connect') {
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    return response.end(JSON.stringify({
      connected: socket.readyState === WebSocket.OPEN,
      roomCode: snapshot?.code ?? null,
      seat: snapshot?.self.seat ?? null,
      controlUrl: `http://127.0.0.1:${controlPort}`,
      spectatorUrl: `http://127.0.0.1:4174/spectator/spectator.html?source=http://127.0.0.1:${controlPort}`
    }, null, 2));
  }
  if (request.method === 'POST' && request.url === '/command') {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', chunk => { if (body.length < 2048) body += chunk; });
    request.on('end', () => {
      try {
        const command = request.headers['content-type']?.includes('application/json') ? JSON.parse(body).command : body;
        const result = executeCommand(command);
        response.setHeader('Content-Type', 'text/plain; charset=utf-8');
        response.end(result);
      } catch (error) {
        response.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
        response.end(error.message);
      }
    });
    return;
  }
  response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  response.end('Use GET /text, GET /state, GET /connect ou POST /command.');
});
control.listen(controlPort, '127.0.0.1', () => console.log(`Controle textual local: http://127.0.0.1:${controlPort}/text`));
