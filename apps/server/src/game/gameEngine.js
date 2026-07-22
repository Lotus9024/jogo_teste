import { randomUUID } from 'node:crypto';
import { CARD_BY_ID, baseCellsForSeat, citizensForSeat, completedRoadCount, forwardDeltaForSeat, gridCellsBetween, isAttackDistanceValid, isCannonTargetValid, isDeploymentCell, isRoadPlacementCell, movementDistance, roadMovementBonus } from '@tronos/shared/cards';
import { GAME_CONFIG } from '@tronos/shared/game-config';
import { createDeck, drawCard } from './createInitialState.js';

const fail = message => { throw new Error(message); };
const distance = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.z - b.z);
const integer = value => Number.isInteger(value) ? value : fail('Coordenada inválida.');

function playerById(state, playerId) {
  return state.players.find(player => player.id === playerId) ?? fail('Jogador inválido.');
}
const baseCells = seat => baseCellsForSeat(seat, GAME_CONFIG.boardSize);
function inBase(x, z) { return [1, 2].some(seat => baseCells(seat).some(cell => cell.x === x && cell.z === z)); }
function validCell(x, z) { return x >= 0 && x < GAME_CONFIG.boardSize && z >= 0 && z < GAME_CONFIG.boardSize; }
function deploymentCell(seat, x, z) { return isDeploymentCell(seat, x, z, GAME_CONFIG.boardSize); }
function unitsAt(state, x, z, excludeId = null) { return state.units.filter(unit => unit.id !== excludeId && unit.x === x && unit.z === z); }
function unitAt(state, x, z, excludeId = null) { return unitsAt(state, x, z, excludeId)[0]; }
function unitBlocksLine(state, from, to, excludeId = null) {
  return gridCellsBetween(from, to).some(cell => unitAt(state, cell.x, cell.z, excludeId));
}

function refreshKingdomProgress(state) {
  state.players.forEach(player => {
    player.citizens = citizensForSeat(player.seat, state.units, state.roads, GAME_CONFIG.boardSize);
    if (player.baseLevel >= 2 || player.citizens < GAME_CONFIG.level2CitizenRequirement || completedRoadCount(player.seat, state.roads) < GAME_CONFIG.level2RoadRequirement) return;
    player.baseLevel = 2;
    player.maxEnergy = GAME_CONFIG.level2MaxEnergy;
    player.energy = Math.min(player.maxEnergy, player.energy + GAME_CONFIG.level2EnergyBonus);
    player.deck = createDeck(undefined, player.baseLevel, player.deck.length);
  });
}

function healLevelTwoConstructions(state, seat) {
  const player = state.players.find(item => item.seat === seat);
  if (player?.baseLevel < 2 || state.round % 2 !== 0) return;
  state.units.filter(unit => unit.ownerSeat === seat && CARD_BY_ID[unit.cardId]?.type === 'construction' && !unit.underConstruction).forEach(unit => {
    unit.hp = Math.min(CARD_BY_ID[unit.cardId].hp, unit.hp + 1);
  });
}

function cannonOperator(state, cannon) {
  const forward = forwardDeltaForSeat(cannon.ownerSeat);
  return state.units.find(unit => unit.cardId === 'operator'
    && unit.ownerSeat === cannon.ownerSeat
    && unit.x === cannon.x - forward.x
    && unit.z === cannon.z - forward.z) ?? null;
}

function mountedTower(state, unit) {
  if (!unit.mountedOnTowerId) return null;
  return state.units.find(item => item.id === unit.mountedOnTowerId && item.cardId === 'tower' && item.ownerSeat === unit.ownerSeat && !item.underConstruction) ?? null;
}

function attackCard(state, unit, card) {
  return card.id === 'archer' && mountedTower(state, unit) ? { ...card, attackRange: card.attackRange + 1 } : card;
}

function unitBlocksAttackLine(state, unit, target, card) {
  if (card.id === 'archer' && mountedTower(state, unit)) return false;
  return gridCellsBetween(unit, target).some(cell => unitsAt(state, cell.x, cell.z, unit.id)
    .some(blocker => card.id !== 'archer' || blocker.cardId !== 'wooden_barrier'));
}

function damageUnit(state, target, damage) {
  const absorbed = Math.min(target.shield ?? 0, damage);
  target.shield = (target.shield ?? 0) - absorbed;
  target.hp -= damage - absorbed;
  if (target.hp > 0) return false;
  state.units.splice(state.units.indexOf(target), 1);
  if (target.cardId === 'tower') state.units.forEach(unit => {
    if (unit.mountedOnTowerId === target.id) unit.mountedOnTowerId = null;
  });
  return true;
}

function fireCannonAt(state, cannon, targetCell, card) {
  const areaDistance = unit => Math.max(Math.abs(unit.x - targetCell.x), Math.abs(unit.z - targetCell.z));
  state.units
    .filter(unit => areaDistance(unit) <= card.areaRadius)
    .forEach(unit => damageUnit(state, unit, areaDistance(unit) === 0 ? card.damage : card.areaDamage));
}

function applyFireEntryDamage(state, unit) {
  const fires = (state.fires ?? []).filter(fire => fire.x === unit.x && fire.z === unit.z && !fire.damagedUnitIds.includes(unit.id));
  for (const fire of fires) {
    fire.damagedUnitIds.push(unit.id);
    if (damageUnit(state, unit, 1)) break;
  }
}

function resolveEndingFires(state, endingSeat) {
  const expiring = (state.fires ?? []).filter(fire => fire.ownerSeat !== endingSeat);
  for (const fire of expiring) {
    const occupant = unitAt(state, fire.x, fire.z);
    if (occupant && !fire.damagedUnitIds.includes(occupant.id)) damageUnit(state, occupant, 1);
  }
  state.fires = (state.fires ?? []).filter(fire => fire.ownerSeat === endingSeat);
}

function mountableTowerAt(state, player, card, x, z, movingUnitId = null) {
  if (card.id !== 'archer') return null;
  const occupants = unitsAt(state, x, z, movingUnitId);
  const tower = occupants.find(unit => unit.cardId === 'tower' && unit.ownerSeat === player.seat && !unit.underConstruction);
  const mountedArcher = occupants.some(unit => unit.cardId === 'archer' && unit.mountedOnTowerId === tower?.id);
  return tower && !mountedArcher && occupants.every(unit => unit.id === tower.id) ? tower : null;
}

function fireTowerVolley(state, player, archer, instant) {
  const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (const [dx, dz] of directions) {
    const target = state.units
      .filter(unit => unit.id !== archer.id)
      .map(unit => ({ unit, step: dx ? (unit.x - archer.x) / dx : (unit.z - archer.z) / dz }))
      .filter(({ unit, step }) => step >= 1 && step <= instant.range && unit.x === archer.x + dx * step && unit.z === archer.z + dz * step)
      .sort((a, b) => a.step - b.step)[0]?.unit;
    if (target?.ownerSeat !== player.seat) damageUnit(state, target, instant.damage);
  }
}

function endTurn(state) {
  resolveEndingFires(state, state.activeSeat);
  state.activeSeat = state.activeSeat === 1 ? 2 : 1;
  if (state.activeSeat === 1) state.round += 1;
  state.units.forEach(unit => {
    if (unit.underConstruction && unit.ownerSeat === state.activeSeat && unit.buildReadyRound <= state.round) unit.underConstruction = false;
  });
  state.roads.forEach(road => {
    if (road.underConstruction && road.ownerSeat === state.activeSeat && road.buildReadyRound <= state.round) road.underConstruction = false;
  });
  refreshKingdomProgress(state);
  healLevelTwoConstructions(state, state.activeSeat);
  const player = state.players.find(item => item.seat === state.activeSeat);
  player.energy = Math.min(player.maxEnergy, player.energy + GAME_CONFIG.energyPerTurn);
  drawCard(player);
  state.units.filter(unit => unit.ownerSeat === state.activeSeat).forEach(unit => {
    unit.actionUsed = false;
    unit.abilityUsed = false;
    unit.shield = 0;
  });
  state.turnEndsAt = Date.now() + GAME_CONFIG.turnDurationSeconds * 1000;
}

function requireTurn(state, player) {
  if (state.phase !== 'playing') fail('A partida ainda não começou.');
  if (state.activeSeat !== player.seat) fail('Aguarde o seu turno.');
}

export function applyGameAction(state, playerId, action, expectedVersion) {
  if (!action || typeof action !== 'object' || typeof action.type !== 'string') fail('Ação inválida.');
  if (expectedVersion !== state.version) fail('O estado da partida mudou. Tente novamente.');
  const player = playerById(state, playerId);
  const opponent = state.players.find(item => item.seat !== player.seat);

  if (action.type === 'end_turn') {
    requireTurn(state, player); endTurn(state);
  } else if (action.type === 'summon') {
    requireTurn(state, player);
    const x = integer(action.x), z = integer(action.z);
    const index = player.hand.findIndex(card => card.instanceId === action.cardInstanceId);
    if (index < 0) fail('Esta carta não está na sua mão.');
    const instance = player.hand[index], card = CARD_BY_ID[instance.cardId];
    if (!card) fail('Carta inválida.');
    const tower = mountableTowerAt(state, player, card, x, z);
    const roadBlocker = unitsAt(state, x, z).some(unit => ['construction', 'machine'].includes(CARD_BY_ID[unit.cardId]?.type));
    const roadOccupied = state.roads.some(road => road.x === x && road.z === z);
    if (card.id === 'road') {
      if (!validCell(x, z) || inBase(x, z) || roadBlocker || !isRoadPlacementCell(player.seat, x, z, state.roads, GAME_CONFIG.boardSize)) fail('A Rua precisa estar conectada ao castelo ou a outra Rua do seu reino.');
    } else if (!validCell(x, z) || !deploymentCell(player.seat, x, z) || inBase(x, z) || (unitAt(state, x, z) && !tower) || (roadOccupied && ['construction', 'machine'].includes(card.type))) fail('Escolha uma casa livre a até 2 casas do seu reino.');
    if (player.energy < card.cost) fail('Energia insuficiente.');
    player.energy -= card.cost; player.hand.splice(index, 1); player.discard.push(instance.cardId);
    if (card.id === 'road') state.roads.push({ id: randomUUID(), ownerSeat: player.seat, x, z, underConstruction: true, buildReadyRound: state.round + card.buildRounds });
    else state.units.push({
        id: randomUUID(), ownerSeat: player.seat, cardId: card.id, x, z, hp: card.hp, shield: 0,
        actionUsed: true, abilityUsed: false, instantUsedRound: 0, empowered: false, mountedOnTowerId: tower?.id ?? null,
        underConstruction: Boolean(card.buildRounds), buildReadyRound: card.buildRounds ? state.round + card.buildRounds : null
      });
  } else if (action.type === 'move') {
    requireTurn(state, player);
    const unit = state.units.find(item => item.id === action.unitId && item.ownerSeat === player.seat) ?? fail('Unidade inválida.');
    const x = integer(action.x), z = integer(action.z), card = CARD_BY_ID[unit.cardId];
    if (unit.actionUsed) fail('Esta unidade já agiu neste turno.');
    if (unit.underConstruction || card.type === 'construction') fail('Esta construção não pode se mover.');
    if (mountedTower(state, unit)) fail('O arqueiro montado não pode se mover.');
    if (card.id === 'cannon') {
      const forward = forwardDeltaForSeat(player.seat);
      const operator = cannonOperator(state, unit);
      const destination = { x: unit.x + forward.x, z: unit.z + forward.z };
      if (!operator || operator.actionUsed) fail('O Canhão precisa de um Operador disponível exatamente atrás.');
      if (x !== destination.x || z !== destination.z) fail('O Canhão avança somente uma casa para frente.');
      if (!validCell(x, z) || inBase(x, z) || unitAt(state, x, z)) fail('A casa à frente do Canhão está bloqueada.');
      operator.x = unit.x; operator.z = unit.z; operator.actionUsed = true;
      unit.x = x; unit.z = z; unit.actionUsed = true;
      applyFireEntryDamage(state, operator);
      applyFireEntryDamage(state, unit);
    } else {
    const tower = mountableTowerAt(state, player, card, x, z, unit.id);
    const movementRange = card.move + roadMovementBonus(unit.x, unit.z, state.roads);
    const movementValue = movementDistance(card.movementType, unit, { x, z });
    if (!validCell(x, z) || inBase(x, z) || movementValue < 1 || movementValue > movementRange || (unitAt(state, x, z, unit.id) && !tower)) fail('Movimento inválido.');
    if (unitBlocksLine(state, unit, { x, z }, unit.id)) fail('O caminho está bloqueado por outra tropa.');
    unit.x = x; unit.z = z; unit.mountedOnTowerId = tower?.id ?? null; unit.actionUsed = true;
    applyFireEntryDamage(state, unit);
    }
  } else if (action.type === 'mage_fire') {
    requireTurn(state, player);
    const unit = state.units.find(item => item.id === action.unitId && item.ownerSeat === player.seat) ?? fail('Unidade inválida.');
    const card = CARD_BY_ID[unit.cardId];
    if (card.id !== 'mage' || unit.actionUsed || unit.underConstruction) fail('O Mago não pode conjurar fogo agora.');
    if (!Array.isArray(action.cells) || action.cells.length < 1 || action.cells.length > card.maxFireCells) fail('Escolha uma ou duas casas para o fogo.');
    const cells = action.cells.map(cell => ({ x: integer(cell?.x), z: integer(cell?.z) }));
    if (new Set(cells.map(cell => `${cell.x}:${cell.z}`)).size !== cells.length) fail('Escolha casas diferentes para o fogo.');
    if (cells.some(cell => !validCell(cell.x, cell.z) || distance(unit, cell) < card.minAttackRange || distance(unit, cell) > card.attackRange)) fail('Casa de fogo fora do alcance.');
    state.fires ??= [];
    for (const cell of cells) {
      const fire = { id: randomUUID(), ownerSeat: player.seat, casterUnitId: unit.id, x: cell.x, z: cell.z, damagedUnitIds: [] };
      state.fires.push(fire);
      const target = unitAt(state, cell.x, cell.z);
      if (target) damageUnit(state, target, card.damage);
    }
    unit.actionUsed = true;
  } else if (action.type === 'attack') {
    requireTurn(state, player);
    const unit = state.units.find(item => item.id === action.unitId && item.ownerSeat === player.seat) ?? fail('Unidade inválida.');
    const card = attackCard(state, unit, CARD_BY_ID[unit.cardId]);
    if (card.id === 'mage') fail('Escolha uma ou duas casas para conjurar o fogo.');
    if (unit.actionUsed) fail('Esta unidade já agiu neste turno.');
    if (unit.underConstruction) fail('A construção ainda não foi concluída.');
    if (card.damage <= 0 || card.attackRange <= 0) fail('Esta carta não pode atacar.');
    const damage = card.damage + (unit.empowered ? 8 : 0);
    const operator = card.id === 'cannon' ? cannonOperator(state, unit) : null;
    if (card.id === 'cannon' && (!operator || operator.actionUsed)) fail('O Canhão precisa de um Operador disponível exatamente atrás.');
    if (action.targetUnitId) {
      const target = state.units.find(item => item.id === action.targetUnitId && (card.id === 'cannon' || item.ownerSeat !== player.seat) && item.id !== unit.id) ?? fail('Alvo inválido.');
      if (card.id === 'cannon' ? !isCannonTargetValid(unit, target) : !isAttackDistanceValid(card, distance(unit, target))) fail('Alvo fora de alcance.');
      if (unitBlocksAttackLine(state, unit, target, card)) fail('A linha de ataque está bloqueada.');
      if (card.id === 'cannon') {
        fireCannonAt(state, unit, target, card);
        operator.actionUsed = true;
      } else {
      const defeatedCell = { x: target.x, z: target.z };
      const defeated = damageUnit(state, target, damage);
      if (defeated && !['archer', 'cannon'].includes(card.id) && !unitAt(state, defeatedCell.x, defeatedCell.z)) { unit.x = defeatedCell.x; unit.z = defeatedCell.z; }
      }
    } else if (card.id === 'cannon' && Number.isInteger(action.x) && Number.isInteger(action.z)) {
      const targetCell = { x: integer(action.x), z: integer(action.z) };
      if (!validCell(targetCell.x, targetCell.z) || !isCannonTargetValid(unit, targetCell)) fail('Alvo fora de alcance.');
      if (unitBlocksAttackLine(state, unit, targetCell, card)) fail('A linha de ataque está bloqueada por outra unidade.');
      fireCannonAt(state, unit, targetCell, card);
      operator.actionUsed = true;
    } else if (action.targetBaseSeat === opponent.seat) {
      const reachableBaseCells = baseCells(opponent.seat).filter(cell => (card.id === 'cannon' ? isCannonTargetValid(unit, cell) : isAttackDistanceValid(card, distance(unit, cell))) && !unitBlocksAttackLine(state, unit, cell, card));
      const cannonBaseCell = card.id === 'cannon' ? reachableBaseCells[0] : null;
      if (!reachableBaseCells.length) fail('Base fora de alcance ou linha de ataque bloqueada.');
      opponent.baseHp = Math.max(0, opponent.baseHp - damage);
      if (card.id === 'cannon') { fireCannonAt(state, unit, cannonBaseCell, card); operator.actionUsed = true; }
      if (!opponent.baseHp) { state.phase = 'finished'; state.winnerSeat = player.seat; state.turnEndsAt = null; }
    } else fail('Alvo inválido.');
    unit.empowered = false; unit.actionUsed = true;
  } else if (action.type === 'use_ability') {
    requireTurn(state, player);
    const unit = state.units.find(item => item.id === action.unitId && item.ownerSeat === player.seat) ?? fail('Unidade inválida.');
    const card = CARD_BY_ID[unit.cardId];
    if (!card.ability?.enabled || unit.abilityUsed || player.energy < card.ability.cost) fail('Habilidade indisponível.');
    if (unit.actionUsed || unit.underConstruction) fail('Esta unidade já agiu neste turno.');
    let archerTargets = null;
    if (card.id === 'archer') {
      const target = state.units.find(item => item.id === action.targetUnitId && item.ownerSeat !== player.seat) ?? fail('Alvo inválido.');
      if (distance(unit, target) > card.attackRange) fail('Alvo fora de alcance.');
      archerTargets = state.units.filter(item => item.ownerSeat !== player.seat && distance(item, target) <= 1);
    }
    player.energy -= card.ability.cost; unit.abilityUsed = true;
    if (card.id === 'warrior') unit.empowered = true;
    if (card.id === 'guard') unit.shield = 12;
    if (card.id === 'mage') {
      [...state.units].filter(item => item.id !== unit.id && Math.max(Math.abs(item.x - unit.x), Math.abs(item.z - unit.z)) <= card.ability.radius)
        .forEach(item => damageUnit(state, item, card.ability.damage));
      unit.actionUsed = true;
    }
    if (archerTargets) {
      archerTargets.forEach(item => { item.hp -= 8; });
      state.units = state.units.filter(item => item.hp > 0);
    }
  } else if (action.type === 'use_instant') {
    if (state.phase !== 'playing') fail('A partida ainda não começou.');
    const unit = state.units.find(item => item.id === action.unitId && item.ownerSeat === player.seat) ?? fail('Unidade inválida.');
    const card = CARD_BY_ID[unit.cardId];
    const tower = mountedTower(state, unit);
    const instant = card.id === 'archer' && tower ? CARD_BY_ID.tower.instant : card.instant;
    if (!instant?.enabled || unit.instantUsedRound === state.round || player.energy < instant.cost) fail('Habilidade instantânea indisponível.');
    if (card.id === 'archer' && tower) fireTowerVolley(state, player, unit, instant);
    player.energy -= instant.cost;unit.instantUsedRound = state.round;
  } else fail('Ação não reconhecida.');

  refreshKingdomProgress(state);
  state.version += 1;
  return state;
}

export function applyTurnTimeout(state) {
  if (state.phase !== 'playing' || !state.turnEndsAt || Date.now() < state.turnEndsAt) return false;
  endTurn(state); state.version += 1; return true;
}
