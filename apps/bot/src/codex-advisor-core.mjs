import {
  CARD_BY_ID,
  baseCellsForSeat,
  cellKey,
  completedRoadCount,
  connectedRoadKeys,
  effectiveCardCost,
  forwardDeltaForSeat,
  gridCellsBetween,
  isAttackDistanceValid,
  isCannonTargetValid,
  isDeploymentCell,
  isGoblinTroop,
  isRoadCard,
  isRoadPlacementCell,
  movementDistance,
  roadAttackBonus,
  roadMovementBonus
} from '@tronos/shared/cards';
import { GAME_CONFIG } from '@tronos/shared/game-config';

export const ADVISOR_SCHEMA_VERSION = 1;
export const READ_ONLY_NOTICE = 'SOMENTE LEITURA: nenhuma jogada foi ou pode ser enviada.';

function fingerprintRules() {
  const source = Object.values(CARD_BY_ID)
    .sort((left, right) => left.id.localeCompare(right.id))
    .map(card => [card.id, card.hp, card.damage, card.areaDamage, card.move, card.movementType,
      card.minAttackRange, card.attackRange, card.areaRadius, card.cost, card.buildRounds,
      card.ability?.cost, card.ability?.damage, card.instant?.cost, card.instant?.damage, card.instant?.range].join(':'))
    .join('|');
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export const LOCAL_RULES_FINGERPRINT = fingerprintRules();

const otherSeat = seat => seat === 1 ? 2 : 1;
const manhattan = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.z - b.z);
const chebyshev = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.z - b.z));
const round = value => Math.round(Number(value) * 100) / 100;
const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
const shortId = value => String(value ?? 'sem-id').slice(0, 8);
const coordinates = value => `(${value.x},${value.z})`;

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function finiteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function assertUnique(values, label) {
  if (new Set(values).size !== values.length) throw new Error(`${label} contém IDs duplicados.`);
}

function assertCell(cell, boardSize, label) {
  if (!Number.isInteger(cell?.x) || !Number.isInteger(cell?.z)
    || cell.x < 0 || cell.x >= boardSize || cell.z < 0 || cell.z >= boardSize) {
    throw new Error(`${label} está fora do tabuleiro.`);
  }
}

function assertSnapshot(value) {
  if (!value || typeof value !== 'object') throw new Error('Resposta sem snapshot utilizável.');
  if (!value.self || ![1, 2].includes(value.self.seat)) throw new Error('Snapshot sem assento próprio válido.');
  if (!value.state || typeof value.state !== 'object') throw new Error('Snapshot sem estado da partida.');
  if (!Number.isInteger(value.state.version)) throw new Error('Snapshot sem state.version inteiro.');
  if (!Number.isInteger(value.state.board?.size) || value.state.board.size < 3) throw new Error('Snapshot sem tamanho de tabuleiro válido.');
  if (!['waiting', 'playing', 'finished'].includes(value.state.phase)) throw new Error(`Fase desconhecida: ${value.state.phase}.`);
  if (![1, 2].includes(value.state.activeSeat)) throw new Error('Snapshot sem activeSeat válido.');
  if (!Number.isInteger(value.state.round) || value.state.round < 1) throw new Error('Snapshot sem rodada válida.');

  const players = asArray(value.state.players);
  if (!players.some(player => player.seat === value.self.seat)) throw new Error('O jogador próprio não aparece em state.players.');
  if (value.state.phase !== 'waiting' && ![1, 2].every(seat => players.some(player => player.seat === seat))) {
    throw new Error('Partida em andamento precisa conter os dois jogadores.');
  }
  assertUnique(players.map(player => player.id), 'state.players');
  assertUnique(players.map(player => player.seat), 'state.players.seat');
  for (const player of players) {
    if (![1, 2].includes(player.seat) || !finiteNumber(player.baseHp) || !finiteNumber(player.energy)
      || !finiteNumber(player.maxEnergy) || !finiteNumber(player.citizens) || !finiteNumber(player.baseLevel)) {
      throw new Error(`Jogador ${player.id ?? '?'} possui valores numéricos inválidos.`);
    }
  }

  const units = asArray(value.state.units);
  assertUnique(units.map(unit => unit.id), 'state.units');
  for (const unit of units) {
    if (!CARD_BY_ID[unit.cardId]) throw new Error(`Carta desconhecida na unidade ${unit.id}: ${unit.cardId}.`);
    if (![1, 2].includes(unit.ownerSeat) || !finiteNumber(unit.hp)) throw new Error(`Unidade ${unit.id} possui dono ou HP inválido.`);
    assertCell(unit, value.state.board.size, `Unidade ${unit.id}`);
  }

  const roads = asArray(value.state.roads);
  assertUnique(roads.map(road => road.id), 'state.roads');
  for (const road of roads) {
    if (![1, 2].includes(road.ownerSeat)) throw new Error(`Rua ${road.id} possui dono inválido.`);
    assertCell(road, value.state.board.size, `Rua ${road.id}`);
  }
  for (const fire of asArray(value.state.fires)) assertCell(fire, value.state.board.size, `Fogo ${fire.id ?? '?'}`);

  const hand = asArray(value.self.hand);
  assertUnique(hand.map(instance => instance.instanceId), 'self.hand');
  for (const instance of hand) {
    if (!CARD_BY_ID[instance.cardId]) throw new Error(`Carta desconhecida na mão: ${instance.cardId}.`);
  }
}

export function unwrapSnapshot(input) {
  const snapshot = input?.snapshot ?? input;
  assertSnapshot(snapshot);
  return snapshot;
}

export function createModel(input, observedAt = Date.now()) {
  const envelope = input?.snapshot ? input : null;
  const snapshot = unwrapSnapshot(input);
  const state = snapshot.state;
  const units = asArray(state.units).map(unit => ({ ...unit, card: CARD_BY_ID[unit.cardId] ?? null }));
  const roads = asArray(state.roads).map(road => ({ ...road }));
  const fires = asArray(state.fires).map(fire => ({ ...fire, damagedUnitIds: asArray(fire.damagedUnitIds) }));
  const players = asArray(state.players).map(player => ({ ...player }));
  const selfSeat = snapshot.self.seat;
  const enemySeat = otherSeat(selfSeat);
  const selfPlayer = players.find(player => player.seat === selfSeat);
  const enemyPlayer = players.find(player => player.seat === enemySeat) ?? {
    id: null,
    name: 'Aguardando adversário',
    seat: enemySeat,
    connected: false,
    baseHp: 0,
    energy: 0,
    maxEnergy: GAME_CONFIG.maxEnergy,
    citizens: 0,
    baseLevel: 1,
    handCount: 0,
    deckCount: 0
  };

  return {
    envelope: envelope ? { connected: envelope.connected, error: envelope.error ?? null } : { connected: null, error: null },
    code: snapshot.code ?? null,
    self: { ...snapshot.self, hand: asArray(snapshot.self.hand).map(item => ({ ...item })) },
    state: {
      ...state,
      players,
      units,
      roads,
      fires
    },
    boardSize: state.board.size,
    selfSeat,
    enemySeat,
    selfPlayer,
    enemyPlayer,
    units,
    roads,
    fires,
    observedAt
  };
}

export function unitsAt(model, x, z, excludeId = null) {
  return model.units.filter(unit => unit.id !== excludeId && unit.x === x && unit.z === z);
}

export function unitAt(model, x, z, excludeId = null) {
  return unitsAt(model, x, z, excludeId)[0] ?? null;
}

export function mountedTower(model, unit) {
  if (!unit?.mountedOnTowerId) return null;
  return model.units.find(candidate => candidate.id === unit.mountedOnTowerId
    && ['tower', 'royal_tower'].includes(candidate.cardId)
    && candidate.ownerSeat === unit.ownerSeat
    && !candidate.underConstruction) ?? null;
}

export function cannonOperator(model, cannon) {
  if (!cannon || cannon.cardId !== 'cannon') return null;
  const forward = forwardDeltaForSeat(cannon.ownerSeat);
  return model.units.find(unit => unit.cardId === 'operator'
    && unit.ownerSeat === cannon.ownerSeat
    && unit.x === cannon.x - forward.x
    && unit.z === cannon.z - forward.z) ?? null;
}

function operationalCannonOperator(model, cannon) {
  const operator = cannonOperator(model, cannon);
  return cannon && !cannon.underConstruction && operator && !operator.underConstruction ? operator : null;
}

function attackCard(model, unit) {
  const card = unit.card ?? CARD_BY_ID[unit.cardId];
  if (!card) return null;
  const tower = unit.cardId === 'archer' ? mountedTower(model, unit) : null;
  const towerRangeBonus = tower ? (CARD_BY_ID[tower.cardId]?.archerRangeBonus ?? 1) : 0;
  const towerDamageBonus = tower ? (CARD_BY_ID[tower.cardId]?.archerDamageBonus ?? 0) : 0;
  const adjacentRoyalRangeBonus = unit.cardId === 'archer' && !tower && model.units.some(candidate =>
    candidate.ownerSeat === unit.ownerSeat
    && candidate.cardId === 'royal_tower'
    && !candidate.underConstruction
    && chebyshev(candidate, unit) === 1)
    ? CARD_BY_ID.royal_tower.adjacentArcherRangeBonus
    : 0;
  const roadBonus = roadAttackBonus(unit.x, unit.z, model.roads, unit.cardId);
  return towerRangeBonus || towerDamageBonus || adjacentRoyalRangeBonus || roadBonus
    ? {
        ...card,
        attackRange: card.attackRange + towerRangeBonus + adjacentRoyalRangeBonus + roadBonus,
        damage: card.damage + towerDamageBonus,
      }
    : card;
}

function unitAttackDamage(unit, card) {
  return card.damage + (unit.cloneDamageBonus ?? 0) + (unit.empowered ? 8 : 0);
}

function effectiveHp(unit) {
  return Math.max(0, Number(unit.hp ?? 0)) + Math.max(0, Number(unit.shield ?? 0));
}

function inBoard(model, cell) {
  return cell.x >= 0 && cell.x < model.boardSize && cell.z >= 0 && cell.z < model.boardSize;
}

function inAnyBase(model, cell) {
  return [1, 2].some(seat => baseCellsForSeat(seat, model.boardSize)
    .some(base => base.x === cell.x && base.z === cell.z));
}

function attackLineBlocked(model, unit, target, card = attackCard(model, unit)) {
  if (!card) return true;
  if (card.id === 'archer' && mountedTower(model, unit)) return false;
  return gridCellsBetween(unit, target).some(cell => unitsAt(model, cell.x, cell.z, unit.id)
    .some(blocker => card.id !== 'archer' || blocker.cardId !== 'wooden_barrier'));
}

function movementLineBlocked(model, unit, target) {
  return gridCellsBetween(unit, target).some(cell => unitsAt(model, cell.x, cell.z, unit.id).length > 0);
}

function actionReady(unit, respectActionUsed) {
  return !unit.underConstruction && (!respectActionUsed || !unit.actionUsed);
}

function currentTurnIndex(state) {
  return (state.round - 1) * 2 + (state.activeSeat === 2 ? 1 : 0);
}

function affectedUnit(unit, damage) {
  return {
    unitId: unit.id,
    ownerSeat: unit.ownerSeat,
    cardId: unit.cardId,
    at: { x: unit.x, z: unit.z },
    damage,
    lethal: damage >= effectiveHp(unit),
    effectiveHp: effectiveHp(unit)
  };
}

function cannonShotCells(model, cannon) {
  const card = CARD_BY_ID.cannon;
  const forward = forwardDeltaForSeat(cannon.ownerSeat);
  const cells = [];
  for (let step = card.minAttackRange; step <= card.attackRange; step += 1) {
    const cell = { x: cannon.x + forward.x * step, z: cannon.z + forward.z * step };
    if (!inBoard(model, cell) || attackLineBlocked(model, cannon, cell, card)) continue;
    cells.push(cell);
  }
  return cells;
}

function cannonAffected(model, cell) {
  const card = CARD_BY_ID.cannon;
  return model.units
    .filter(unit => chebyshev(unit, cell) <= card.areaRadius)
    .map(unit => affectedUnit(unit, unit.x === cell.x && unit.z === cell.z ? card.damage : card.areaDamage));
}

export function attackOptionsForUnit(model, unit, { respectActionUsed = true } = {}) {
  const card = attackCard(model, unit);
  const bonusAttackReady = (unit.bonusAttacks ?? 0) > 0 && card?.family === 'goblin';
  if (!card || (!actionReady(unit, respectActionUsed) && !(respectActionUsed && bonusAttackReady))
    || (respectActionUsed && card.id === 'henry' && unit.attackedThisTurn)
    || card.damage <= 0 || card.attackRange <= 0) return [];
  const enemySeat = otherSeat(unit.ownerSeat);

  if (card.id === 'mage') {
    const seen = new Set();
    const options = [];
    for (const target of model.units) {
      const key = cellKey(target.x, target.z);
      if (target.id === unit.id || seen.has(key)) continue;
      const distance = manhattan(unit, target);
      if (distance < card.minAttackRange || distance > card.attackRange) continue;
      seen.add(key);
      const actualTarget = unitAt(model, target.x, target.z);
      if (!actualTarget) continue;
      options.push({
        kind: 'mage-fire',
        actorUnitId: unit.id,
        actorCardId: unit.cardId,
        cell: { x: target.x, z: target.z },
        targetUnitId: actualTarget.id,
        affected: [affectedUnit(actualTarget, unitAttackDamage(unit, card))],
        exact: true
      });
    }
    return options;
  }

  if (card.id === 'cannon') {
    const operator = operationalCannonOperator(model, unit);
    if (!operator || (respectActionUsed && operator.actionUsed)) return [];
    const cells = cannonShotCells(model, unit);
    const enemyBaseKeys = new Set(baseCellsForSeat(enemySeat, model.boardSize).map(cell => cellKey(cell.x, cell.z)));
    const options = cells
      .map(cell => ({
        kind: 'cannon-shot',
        actorUnitId: unit.id,
        actorCardId: unit.cardId,
        operatorUnitId: operator.id,
        cell,
        affected: cannonAffected(model, cell),
        exact: true
      }))
      .filter(option => option.affected.length > 0);
    const baseCell = cells.find(cell => enemyBaseKeys.has(cellKey(cell.x, cell.z)));
    if (baseCell) options.push({
      kind: 'attack-base',
      actorUnitId: unit.id,
      actorCardId: unit.cardId,
      operatorUnitId: operator.id,
      targetBaseSeat: enemySeat,
      cell: baseCell,
      baseDamage: unitAttackDamage(unit, card),
      affected: cannonAffected(model, baseCell),
      exact: true
    });
    return options;
  }

  const damage = unitAttackDamage(unit, card);
  const options = model.units
    .filter(target => target.ownerSeat === enemySeat
      && target.id !== unit.id
      && isAttackDistanceValid(card, manhattan(unit, target))
      && !attackLineBlocked(model, unit, target, card))
    .map(target => ({
      kind: 'attack-unit',
      actorUnitId: unit.id,
      actorCardId: unit.cardId,
      targetUnitId: target.id,
      affected: [affectedUnit(target, damage)],
      exact: true
    }));

  const baseCell = baseCellsForSeat(enemySeat, model.boardSize)
    .find(cell => isAttackDistanceValid(card, manhattan(unit, cell)) && !attackLineBlocked(model, unit, cell, card));
  if (baseCell) options.push({
    kind: 'attack-base',
    actorUnitId: unit.id,
    actorCardId: unit.cardId,
    targetBaseSeat: enemySeat,
    cell: baseCell,
    baseDamage: damage,
    affected: [],
    exact: true
  });
  return options;
}

export function attackOptionsForSeat(model, seat, { respectActionUsed = true } = {}) {
  return model.units
    .filter(unit => unit.ownerSeat === seat)
    .flatMap(unit => attackOptionsForUnit(model, unit, { respectActionUsed }));
}

function towerVolleyOption(model, archer) {
  const tower = mountedTower(model, archer);
  const ability = CARD_BY_ID.tower.instant;
  const player = model.state.players.find(candidate => candidate.seat === archer.ownerSeat);
  if (tower?.cardId !== 'tower'
    || (archer.instantReadyTurn ?? 0) > currentTurnIndex(model.state)
    || player.energy < ability.cost) return null;
  const targets = [];
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const nearestEnemy = model.units
      .filter(unit => unit.id !== archer.id && unit.ownerSeat !== archer.ownerSeat)
      .map(unit => ({ unit, step: dx ? (unit.x - archer.x) / dx : (unit.z - archer.z) / dz }))
      .filter(({ unit, step }) => step >= 1 && step <= ability.range
        && unit.x === archer.x + dx * step
        && unit.z === archer.z + dz * step)
      .sort((left, right) => left.step - right.step)[0]?.unit;
    if (nearestEnemy) targets.push(affectedUnit(nearestEnemy, ability.damage));
  }
  return {
    kind: 'tower-volley',
    actorUnitId: archer.id,
    actorCardId: archer.cardId,
    towerUnitId: tower.id,
    energyCost: ability.cost,
    affected: targets,
    exact: true
  };
}

export function towerVolleyOptionsForSeat(model, seat) {
  return model.units
    .filter(unit => unit.ownerSeat === seat && unit.cardId === 'archer')
    .map(unit => towerVolleyOption(model, unit))
    .filter(Boolean);
}

export function mageAcidOptionsForSeat(model, seat, { respectActionUsed = true } = {}) {
  const player = model.state.players.find(candidate => candidate.seat === seat);
  const card = CARD_BY_ID.mage;
  return model.units
    .filter(unit => unit.ownerSeat === seat
      && unit.cardId === 'mage'
      && !unit.underConstruction
      && (unit.instantReadyTurn ?? 0) <= currentTurnIndex(model.state)
      && player.energy >= card.instant.cost)
    .map(unit => ({
      kind: 'mage-acid',
      actorUnitId: unit.id,
      actorCardId: unit.cardId,
      energyCost: card.instant.cost,
      affected: model.units
        .filter(target => target.id !== unit.id && chebyshev(unit, target) <= card.instant.radius)
        .map(target => affectedUnit(target, card.instant.damage)),
      exact: true
    }));
}

export function goblinCloneInstantOptionsForSeat(model, seat) {
  const player = model.state.players.find(candidate => candidate.seat === seat);
  const instant = CARD_BY_ID.goblin_clone.instant;
  return model.units
    .filter(unit => unit.ownerSeat === seat
      && unit.isGoblinClone
      && (unit.instantReadyTurn ?? 0) <= currentTurnIndex(model.state)
      && player.energy >= instant.cost)
    .map(unit => ({
      kind: 'goblin-clone-instant',
      actorUnitId: unit.id,
      actorCardId: unit.cardId,
      energyCost: instant.cost,
      affected: [affectedUnit(unit, -1)],
      exact: true
    }));
}

export function goblinBomberOptionsForSeat(model, seat, { respectActionUsed = true } = {}) {
  const card = CARD_BY_ID.goblin_bomber;
  return model.units
    .filter(unit => unit.ownerSeat === seat
      && unit.cardId === card.id
      && actionReady(unit, respectActionUsed))
    .map(unit => {
      const forward = forwardDeltaForSeat(seat);
      const destination = {
        x: unit.x + forward.x * card.ability.chargeDistance,
        z: unit.z + forward.z * card.ability.chargeDistance,
      };
      if (!inBoard(model, destination)
        || inAnyBase(model, destination)
        || movementLineBlocked(model, unit, destination)) return null;
      return {
        kind: 'goblin-bomber',
        actorUnitId: unit.id,
        actorCardId: unit.cardId,
        cell: destination,
        affected: [
          ...model.units
            .filter(target => target.id !== unit.id && chebyshev(target, destination) <= card.ability.radius)
            .map(target => {
              const targetCard = CARD_BY_ID[target.cardId];
              const damage = ['construction', 'machine'].includes(targetCard?.type)
                ? card.ability.constructionDamage
                : card.ability.troopDamage;
              return affectedUnit(target, damage);
            }),
          affectedUnit(unit, effectiveHp(unit)),
        ],
        exact: true,
      };
    })
    .filter(Boolean);
}

export function goblinTowerOptionsForSeat(model, seat, { respectActionUsed = true } = {}) {
  const player = model.state.players.find(candidate => candidate.seat === seat);
  const card = CARD_BY_ID.goblin_tower;
  if (!player || player.energy < card.ability.cost) return [];

  return model.units
    .filter(unit => unit.ownerSeat === seat
      && unit.cardId === 'goblin_tower'
      && actionReady(unit, respectActionUsed)
      && !unit.underConstruction)
    .flatMap(unit => {
      const options = [];
      for (let x = 0; x < model.boardSize; x += 1) for (let z = 0; z < model.boardSize; z += 1) {
        const cell = { x, z };
        if (inAnyBase(model, cell) || unitsAt(model, x, z).length > 0) continue;
        const reinforced = model.units.some(tower => tower.ownerSeat === seat
          && tower.cardId === 'goblin_tower'
          && !tower.underConstruction
          && manhattan(tower, cell) === 1);
        options.push({
          kind: 'goblin-reinforcement',
          actorUnitId: unit.id,
          actorCardId: unit.cardId,
          spawnedCardId: 'goblin',
          spawnedHp: CARD_BY_ID.goblin.hp + Number(reinforced),
          energyCost: card.ability.cost,
          cell,
          exact: false
        });
      }
      return options;
    });
}

export function altarAbilityOptionsForSeat(model, seat, { respectActionUsed = true } = {}) {
  const player = model.state.players.find(candidate => candidate.seat === seat);
  if (!player || model.state.activeSeat !== seat) return [];
  return model.units
    .filter(unit => unit.ownerSeat === seat
      && ['goblin_altar', 'mage_altar'].includes(unit.cardId)
      && actionReady(unit, respectActionUsed))
    .map(unit => {
      const ability = CARD_BY_ID[unit.cardId].ability;
      if ((unit.abilityReadyTurn ?? 0) > currentTurnIndex(model.state) || player.energy < ability.cost) return null;
      if (unit.cardId === 'goblin_altar') {
        const buffedUnitIds = model.units
          .filter(target => target.ownerSeat === seat
            && target.card?.family === 'goblin'
            && !['construction', 'machine'].includes(target.card?.type)
            && manhattan(unit, target) <= ability.range)
          .map(target => target.id);
        return {
          kind: 'goblin-march',
          actorUnitId: unit.id,
          actorCardId: unit.cardId,
          energyCost: ability.cost,
          buffedUnitIds,
          exact: true,
        };
      }
      const debuffedUnitIds = model.units
        .filter(target => target.card?.family === 'goblin'
          && !['construction', 'machine'].includes(target.card?.type))
        .map(target => target.id);
      return {
        kind: 'mage-seal',
        actorUnitId: unit.id,
        actorCardId: unit.cardId,
        energyCost: ability.cost,
        debuffedUnitIds,
        exact: true,
      };
    })
    .filter(Boolean);
}

function mountableTowerAt(model, unit, x, z) {
  if (unit.cardId !== 'archer') return null;
  const occupants = unitsAt(model, x, z, unit.id);
  const tower = occupants.find(candidate => candidate.cardId === 'tower'
    && candidate.ownerSeat === unit.ownerSeat
    && !candidate.underConstruction);
  const alreadyMounted = occupants.some(candidate => candidate.cardId === 'archer' && candidate.mountedOnTowerId === tower?.id);
  return tower && !alreadyMounted && occupants.every(candidate => candidate.id === tower.id) ? tower : null;
}

export function movementOptionsForUnit(model, unit, { respectActionUsed = true } = {}) {
  const card = unit.card ?? CARD_BY_ID[unit.cardId];
  const bonusMoveReady = (unit.bonusMoves ?? 0) > 0 && card?.family === 'goblin';
  if (!card || (!actionReady(unit, respectActionUsed) && !(respectActionUsed && bonusMoveReady)) || card.type === 'construction'
    || (respectActionUsed && card.id === 'henry' && unit.movedThisTurn)
    || card.type === 'terrain' || unit.mountedOnTowerId || card.move <= 0) return [];

  if (card.id === 'cannon') {
    const operator = operationalCannonOperator(model, unit);
    const forward = forwardDeltaForSeat(unit.ownerSeat);
    const destination = { x: unit.x + forward.x, z: unit.z + forward.z };
    if (!operator || (respectActionUsed && operator.actionUsed)
      || !inBoard(model, destination) || inAnyBase(model, destination)
      || unitAt(model, destination.x, destination.z, unit.id)) return [];
    return [{
      kind: 'move-cannon-formation',
      actorUnitId: unit.id,
      operatorUnitId: operator.id,
      from: { x: unit.x, z: unit.z },
      to: destination,
      operatorFrom: { x: operator.x, z: operator.z },
      operatorTo: { x: unit.x, z: unit.z },
      exact: true
    }];
  }

  const range = card.move + roadMovementBonus(unit.x, unit.z, model.roads, unit.cardId);
  const options = [];
  for (let x = 0; x < model.boardSize; x += 1) {
    for (let z = 0; z < model.boardSize; z += 1) {
      const target = { x, z };
      const distance = movementDistance(card.movementType, unit, target);
      const tower = mountableTowerAt(model, unit, x, z);
      const occupied = unitsAt(model, x, z, unit.id).length > 0;
      if (distance < 1 || distance > range || inAnyBase(model, target)
        || (occupied && !tower) || movementLineBlocked(model, unit, target)) continue;
      options.push({
        kind: tower ? 'mount-tower' : 'move-unit',
        actorUnitId: unit.id,
        towerUnitId: tower?.id ?? null,
        from: { x: unit.x, z: unit.z },
        to: target,
        exact: true
      });
    }
  }
  return options;
}

export function movementOptionsForSeat(model, seat, options) {
  return model.units
    .filter(unit => unit.ownerSeat === seat)
    .flatMap(unit => movementOptionsForUnit(model, unit, options));
}

export function legalSummonCells(model, instance) {
  const card = CARD_BY_ID[instance.cardId];
  if (!card) return [];
  const seat = model.selfSeat;
  if (card.id === 'mage_altar' && model.units.some(unit => unit.ownerSeat === seat
    && unit.card?.family === 'goblin'
    && !['construction', 'machine'].includes(unit.card?.type))) return [];
  if (card.id === 'goblin_altar' && model.units.filter(unit => unit.ownerSeat === seat
    && unit.card?.family === 'goblin'
    && !['construction', 'machine'].includes(unit.card?.type)
    && isDeploymentCell(seat, unit.x, unit.z, model.boardSize)).length < 2) return [];
  if (card.id === 'goblin_tower' && model.units.filter(unit =>
    unit.ownerSeat === seat && !unit.underConstruction && isGoblinTroop(unit.cardId)).length < card.requiredGoblinTroops) return [];
  if (card.id === 'goblin_clone' && !model.self.lastPlayedGoblinTroopCardId) return [];
  const cells = [];
  for (let x = 0; x < model.boardSize; x += 1) {
    for (let z = 0; z < model.boardSize; z += 1) {
      const occupants = unitsAt(model, x, z);
      const tower = card.id === 'archer' && occupants.find(unit => unit.cardId === 'tower'
        && unit.ownerSeat === seat && !unit.underConstruction);
      const mountable = tower && occupants.length === 1
        && !model.units.some(unit => unit.cardId === 'archer' && unit.mountedOnTowerId === tower.id);
      const roadBlocker = occupants.some(unit => ['construction', 'machine'].includes(CARD_BY_ID[unit.cardId]?.type));
      const roadOccupied = model.roads.some(road => road.x === x && road.z === z);
      const valid = card.type === 'spell'
        ? !inAnyBase(model, { x, z })
        : isRoadCard(card.id)
        ? !inAnyBase(model, { x, z }) && !roadBlocker
          && isRoadPlacementCell(seat, x, z, model.roads, model.boardSize, model.selfPlayer.baseLevel)
        : isDeploymentCell(seat, x, z, model.boardSize)
          && !inAnyBase(model, { x, z })
          && (!occupants.length || mountable)
          && !(roadOccupied && ['construction', 'machine'].includes(card.type));
      const besideBasicHouse = card.id === 'goblin_house' && model.units.some(unit => {
        const nearby = CARD_BY_ID[unit.cardId];
        return nearby?.house && nearby.category === 'basic'
          && Math.max(Math.abs(unit.x - x), Math.abs(unit.z - z)) === 1;
      });
      if (valid && !besideBasicHouse) cells.push({ x, z, mountable: Boolean(mountable), towerUnitId: tower?.id ?? null });
    }
  }
  return cells;
}

function baseDistance(model, cell, seat) {
  return Math.min(...baseCellsForSeat(seat, model.boardSize).map(base => manhattan(cell, base)));
}

function cellThreatDamage(model, attackerSeat, cell) {
  let damage = 0;
  for (const unit of model.units.filter(candidate => candidate.ownerSeat === attackerSeat && !candidate.underConstruction)) {
    const card = attackCard(model, unit);
    if (!card || card.damage <= 0) continue;
    if (card.id === 'mage') {
      if (manhattan(unit, cell) >= card.minAttackRange && manhattan(unit, cell) <= card.attackRange) damage += card.damage;
      continue;
    }
    if (card.id === 'cannon') {
      if (!operationalCannonOperator(model, unit)) continue;
      const shot = cannonShotCells(model, unit).find(target => chebyshev(target, cell) <= card.areaRadius);
      if (shot) damage += targetCellDamage(card, shot, cell);
      continue;
    }
    if (isAttackDistanceValid(card, manhattan(unit, cell)) && !attackLineBlocked(model, unit, cell, card)) damage += card.damage + (unit.empowered ? 8 : 0);
  }
  return damage;
}

function targetCellDamage(card, target, cell) {
  return target.x === cell.x && target.z === cell.z ? card.damage : card.areaDamage;
}

function unitMaterialValue(model, unit) {
  const card = unit.card ?? CARD_BY_ID[unit.cardId];
  if (!card) return 0;
  const maximumHp = Math.max(1, Number(card.hp ?? unit.hp ?? 1));
  const hpRatio = clamp(Number(unit.hp ?? 0) / maximumHp, 0, 1);
  let value = Number(card.cost ?? 0) * 10 * (0.35 + 0.65 * hpRatio);
  if (unit.underConstruction) value *= 0.55;
  if (unit.actionUsed) value *= 0.92;
  if (unit.cardId === 'cannon') value *= operationalCannonOperator(model, unit) ? 1.35 : 0.45;
  if (unit.cardId === 'operator' && model.units.some(candidate => operationalCannonOperator(model, candidate)?.id === unit.id)) value += 20;
  if (unit.cardId === 'archer' && mountedTower(model, unit)) value += 25;
  if (unit.cardId === 'wooden_house' && !unit.underConstruction) value += 24;
  if (card.arenaCitizens && !unit.underConstruction) value += card.arenaCitizens * 18;
  return round(value);
}

function materialForSeat(model, seat) {
  const units = model.units.filter(unit => unit.ownerSeat === seat);
  const unitValue = units.reduce((total, unit) => total + unitMaterialValue(model, unit), 0);
  const owner = seat === model.selfSeat ? model.selfPlayer : model.enemyPlayer;
  const connected = connectedRoadKeys(seat, model.roads, model.boardSize, owner?.baseLevel ?? 1);
  const roadValue = model.roads
    .filter(road => road.ownerSeat === seat)
    .reduce((total, road) => total + (road.underConstruction ? 5.5 : 10) + (connected.has(cellKey(road.x, road.z)) ? 4 : 0), 0);
  return {
    units: round(unitValue),
    roads: round(roadValue),
    total: round(unitValue + roadValue),
    pieceCount: units.length,
    roadCount: model.roads.filter(road => road.ownerSeat === seat).length
  };
}

function threatMap(options, targetSeat) {
  const byTarget = new Map();
  for (const option of options) {
    for (const effect of option.affected ?? []) {
      if (effect.ownerSeat !== targetSeat) continue;
      const byAttacker = byTarget.get(effect.unitId) ?? new Map();
      const previous = byAttacker.get(option.actorUnitId);
      if (!previous || previous.damage < effect.damage) byAttacker.set(option.actorUnitId, {
        actorUnitId: option.actorUnitId,
        actorCardId: option.actorCardId,
        damage: effect.damage,
        kind: option.kind,
        exact: option.exact
      });
      byTarget.set(effect.unitId, byAttacker);
    }
  }
  return [...byTarget.entries()].map(([unitId, attackers]) => {
    const unitThreats = [...attackers.values()];
    const totalDamage = unitThreats.reduce((total, threat) => total + threat.damage, 0);
    return { unitId, totalDamage, attackers: unitThreats };
  });
}

function baseThreatSummary(options, baseHp) {
  const byAttacker = new Map();
  for (const option of options.filter(candidate => candidate.kind === 'attack-base')) {
    const previous = byAttacker.get(option.actorUnitId);
    if (!previous || previous.baseDamage < option.baseDamage) byAttacker.set(option.actorUnitId, option);
  }
  const attacks = [...byAttacker.values()];
  const totalDamage = attacks.reduce((total, option) => total + option.baseDamage, 0);
  const orderedDamage = attacks.map(option => option.baseDamage).sort((left, right) => right - left);
  let accumulated = 0;
  let minimumAttacksToLethal = null;
  for (let index = 0; index < orderedDamage.length; index += 1) {
    accumulated += orderedDamage[index];
    if (accumulated >= baseHp) {
      minimumAttacksToLethal = index + 1;
      break;
    }
  }
  return {
    totalDamage,
    lethal: totalDamage >= baseHp,
    minimumAttacksToLethal,
    remainingHpAfterAll: Math.max(0, baseHp - totalDamage),
    attackers: attacks.map(option => ({
      unitId: option.actorUnitId,
      cardId: option.actorCardId,
      damage: option.baseDamage,
      shotsToKillAlone: Math.ceil(baseHp / option.baseDamage),
      through: option.operatorUnitId ?? null,
      at: option.cell ?? null
    }))
  };
}

function dependencySummary(model, seat) {
  const cannons = model.units.filter(unit => unit.ownerSeat === seat && unit.cardId === 'cannon');
  const operators = model.units.filter(unit => unit.ownerSeat === seat && unit.cardId === 'operator');
  const archers = model.units.filter(unit => unit.ownerSeat === seat && unit.cardId === 'archer');
  return {
    operatedCannons: cannons.filter(cannon => operationalCannonOperator(model, cannon)).map(cannon => ({
      cannonUnitId: cannon.id,
      operatorUnitId: operationalCannonOperator(model, cannon).id,
      ready: !cannon.actionUsed && !operationalCannonOperator(model, cannon).actionUsed
    })),
    unoperatedCannons: cannons.filter(cannon => !operationalCannonOperator(model, cannon)).map(cannon => cannon.id),
    idleOperators: operators.filter(operator => !cannons.some(cannon => operationalCannonOperator(model, cannon)?.id === operator.id)).map(operator => operator.id),
    mountedArchers: archers.filter(archer => mountedTower(model, archer)).map(archer => ({
      archerUnitId: archer.id,
      towerUnitId: mountedTower(model, archer).id
    }))
  };
}

function optionUtility(model, option, perspectiveSeat, threateningUnitIds = new Set()) {
  const opponentSeat = otherSeat(perspectiveSeat);
  const opponent = model.state.players.find(player => player.seat === opponentSeat);
  let score = 0;
  const evidence = [];
  const risks = [];

  if (option.kind === 'goblin-reinforcement') {
    score += CARD_BY_ID.goblin.cost * 28 + option.spawnedHp * 20;
    score += Math.max(0, model.boardSize - baseDistance(model, option.cell, model.enemySeat)) * 3;
    evidence.push(`invoca Goblin com ${option.spawnedHp} HP em ${coordinates(option.cell)}`);
    if (option.spawnedHp > CARD_BY_ID.goblin.hp) evidence.push('a casa adjacente a uma Torre Goblin concede +1 de vida');
    risks.push('o snapshot não revela as cartas do próprio deck; o servidor rejeitará se não houver Goblin nele');
  }

  if (option.kind === 'goblin-march') {
    score += option.buffedUnitIds.length * 95;
    evidence.push(`${option.buffedUnitIds.length} Goblins recebem movimento e ataque adicionais`);
    if (!option.buffedUnitIds.length) risks.push('nenhum Goblin está no raio do Altar');
  }

  if (option.kind === 'mage-seal') {
    const enemies = option.debuffedUnitIds.filter(id => model.units.find(unit => unit.id === id)?.ownerSeat !== perspectiveSeat);
    const allies = option.debuffedUnitIds.length - enemies.length;
    score += enemies.length * 80 - allies * 45;
    evidence.push(`${enemies.length} Goblins inimigos perdem 1 de ataque por 2 turnos`);
    if (allies) risks.push(`${allies} Goblins aliados também serão enfraquecidos`);
  }

  if (option.baseDamage) {
    score += option.baseDamage * 180;
    evidence.push(`causa ${option.baseDamage} de dano à base inimiga (${opponent.baseHp} HP)`);
    if (option.baseDamage >= opponent.baseHp) score += 20000;
  }

  for (const effect of option.affected ?? []) {
    const target = model.units.find(unit => unit.id === effect.unitId);
    if (!target) continue;
    const value = unitMaterialValue(model, target);
    if (effect.ownerSeat === perspectiveSeat) {
      score -= effect.damage * 90 + (effect.lethal ? value * 2 : value * 0.25);
      risks.push(`fogo amigo em ${target.card?.name ?? target.cardId}#${shortId(target.id)}: ${effect.damage}${effect.lethal ? ' (letal)' : ''}`);
    } else {
      score += effect.damage * 55 + (effect.lethal ? value * 1.3 : value * 0.2);
      if (threateningUnitIds.has(target.id)) score += 500;
      evidence.push(`${effect.lethal ? 'elimina' : 'fere'} ${target.card?.name ?? target.cardId}#${shortId(target.id)} por ${effect.damage}`);
    }
  }

  if (option.energyCost) {
    score -= option.energyCost * 12;
    risks.push(`consome ${option.energyCost} de energia`);
  }
  return { score: round(score), evidence, risks };
}

function actionTitle(model, option) {
  const actor = model.units.find(unit => unit.id === option.actorUnitId);
  const actorName = actor?.card?.name ?? actor?.cardId ?? 'Peça';
  if (option.kind === 'attack-base') return `${actorName} pode pressionar a base agora`;
  if (option.kind === 'cannon-shot') return `Disparo de Canhão favorável em ${coordinates(option.cell)}`;
  if (option.kind === 'mage-fire-pair') return `Mago pode incendiar duas casas valiosas`;
  if (option.kind === 'mage-fire') return `Mago tem alvo útil em ${coordinates(option.cell)}`;
  if (option.kind === 'tower-volley') return `Rajada da Torre disponível agora`;
  if (option.kind === 'mage-acid') return `Círculo ácido tem valor tático`;
  if (option.kind === 'goblin-reinforcement') return `Torre Goblin pode chamar reforço em ${coordinates(option.cell)}`;
  if (option.kind === 'goblin-bomber') return 'Goblin Bombardeiro pode realizar uma carga explosiva';
  if (option.kind === 'goblin-march') return 'Altar Goblin pode iniciar uma marcha';
  if (option.kind === 'mage-seal') return 'Altar Mago pode enfraquecer os Goblins';
  return `${actorName} tem uma troca disponível`;
}

function suggestionFromOption(option) {
  return {
    kind: option.kind,
    actorUnitId: option.actorUnitId,
    operatorUnitId: option.operatorUnitId ?? undefined,
    targetUnitId: option.targetUnitId ?? undefined,
    targetBaseSeat: option.targetBaseSeat ?? undefined,
    cell: option.cell ?? undefined,
    cells: option.cells ?? undefined,
    towerUnitId: option.towerUnitId ?? undefined,
    spawnedCardId: option.spawnedCardId ?? undefined,
    buffedUnitIds: option.buffedUnitIds ?? undefined,
    debuffedUnitIds: option.debuffedUnitIds ?? undefined
  };
}

function makeRecommendation({ score, urgency, category, title, evidence, risks = [], confidence, suggestion, exact }) {
  return {
    score: round(score),
    urgency,
    category,
    title,
    evidence: evidence.filter(Boolean),
    risks: risks.filter(Boolean),
    confidence: {
      level: confidence,
      basis: exact ? 'legalidade calculada pelas definições oficiais locais e pelo snapshot observado' : 'heurística posicional; não inclui a mão inimiga oculta'
    },
    suggestion: suggestion ?? null
  };
}

function pairMageFireOptions(options) {
  const grouped = Map.groupBy
    ? Map.groupBy(options.filter(option => option.kind === 'mage-fire'), option => option.actorUnitId)
    : options.filter(option => option.kind === 'mage-fire').reduce((map, option) => {
      const values = map.get(option.actorUnitId) ?? [];
      values.push(option);
      map.set(option.actorUnitId, values);
      return map;
    }, new Map());
  const pairs = [];
  for (const [actorUnitId, values] of grouped) {
    const enemyOnly = values.filter(option => option.affected.every(effect => effect.ownerSeat !== undefined));
    for (let first = 0; first < enemyOnly.length; first += 1) {
      for (let second = first + 1; second < enemyOnly.length; second += 1) {
        if (cellKey(enemyOnly[first].cell.x, enemyOnly[first].cell.z) === cellKey(enemyOnly[second].cell.x, enemyOnly[second].cell.z)) continue;
        pairs.push({
          kind: 'mage-fire-pair',
          actorUnitId,
          actorCardId: 'mage',
          cells: [enemyOnly[first].cell, enemyOnly[second].cell],
          affected: [...enemyOnly[first].affected, ...enemyOnly[second].affected],
          exact: true
        });
      }
    }
  }
  return pairs;
}

function bestPlacement(model, instance, incomingCannonLines) {
  const card = CARD_BY_ID[instance.cardId];
  const connected = connectedRoadKeys(model.selfSeat, model.roads, model.boardSize, model.selfPlayer.baseLevel);
  const cells = legalSummonCells(model, instance);
  let best = null;
  for (const cell of cells) {
    let score = Number(card.cost ?? 0) * 8;
    const riskDamage = isRoadCard(card.id) ? 0 : cellThreatDamage(model, model.enemySeat, cell);
    score -= riskDamage * 35;
    if (cell.mountable) score += 120;
    if (card.id === 'guard' || card.id === 'wooden_barrier') score += Math.max(0, 5 - baseDistance(model, cell, model.selfSeat)) * 12;
    else score += Math.max(0, 8 - baseDistance(model, cell, model.enemySeat)) * 4;
    if (card.id === 'wooden_house') {
      const connectedHouse = [[1, 0], [-1, 0], [0, 1], [0, -1]]
        .some(([dx, dz]) => connected.has(cellKey(cell.x + dx, cell.z + dz)));
      if (connectedHouse) score += 60;
    }
    if (card.id === 'operator') {
      const forward = forwardDeltaForSeat(model.selfSeat);
      if (model.units.some(unit => unit.ownerSeat === model.selfSeat && unit.cardId === 'cannon'
        && cell.x === unit.x - forward.x && cell.z === unit.z - forward.z)) score += 110;
    }
    if (card.id === 'cannon') {
      const forward = forwardDeltaForSeat(model.selfSeat);
      if (model.units.some(unit => unit.ownerSeat === model.selfSeat && unit.cardId === 'operator'
        && unit.x === cell.x - forward.x && unit.z === cell.z - forward.z)) score += 110;
    }
    if (!isRoadCard(card.id) && incomingCannonLines.some(line => line.has(cellKey(cell.x, cell.z)))) score += 180;
    if (!best || score > best.score) best = { cell, score, riskDamage };
  }
  return best;
}

function summonRecommendations(model, context) {
  if (!context.selfActive) return [];
  const energy = model.selfPlayer.energy;
  const results = [];
  for (const instance of model.self.hand) {
    const card = CARD_BY_ID[instance.cardId];
    const cost = card ? effectiveCardCost(card.id, model.selfSeat, model.units, {
      lastPlayedGoblinTroopCardId: model.self.lastPlayedGoblinTroopCardId
    }) : Number.POSITIVE_INFINITY;
    if (!card || cost > energy) continue;
    const legalCells = legalSummonCells(model, instance);
    if (card.id === 'goblin_swarm' && legalCells.length < card.summonCount) continue;
    const placement = bestPlacement(model, instance, context.incomingCannonLines);
    if (!placement) continue;
    let score = 100 + placement.score;
    const discount = card.cost - cost;
    const evidence = [`${card.name} custa ${cost}${discount > 0 ? ` (-${discount})` : ''}; energia atual ${energy}`, `posição legal avaliada: ${coordinates(placement.cell)}`];
    const risks = placement.riskDamage > 0 ? [`a casa recebe até ${placement.riskDamage} de dano das peças já visíveis`] : [];
    if (card.id === 'wooden_house') {
      const missing = Math.max(0, GAME_CONFIG.level2CitizenRequirement - model.selfPlayer.citizens);
      score += missing > 0 ? 220 : -80;
      evidence.push(`faltam ${missing} cidadãos para o nível 2`);
    }
    if (card.arenaCitizens) {
      const missing = Math.max(0, GAME_CONFIG.level2CitizenRequirement - model.selfPlayer.citizens);
      score += missing > 0 ? 90 * card.arenaCitizens : 10;
      evidence.push(`${card.name} conta como ${card.arenaCitizens} cidadão enquanto permanecer na arena`);
    }
    if (card.id === 'goblin_swarm') {
      score += 150;
      evidence.push(`gera 3 Goblins em casas aleatórias entre ${legalCells.length} posições válidas`);
      risks.push('as posições exatas do Enxame são aleatórias');
    }
    if (card.id === 'goblin_spanking') {
      const goblins = model.units.filter(unit => unit.ownerSeat === model.selfSeat && isGoblinTroop(unit.cardId)).length;
      score += goblins * 115;
      evidence.push(`${goblins} Goblins atuais recebem movimento e ataque adicionais; novos Goblins entram prontos`);
      if (!goblins) risks.push('sem Goblins em campo, o valor depende de lançar outro Goblin ainda neste turno');
    }
    if (isRoadCard(card.id)) {
      const missing = Math.max(0, GAME_CONFIG.level2RoadRequirement - completedRoadCount(model.selfSeat, model.roads));
      score += missing > 0 ? 180 : 15;
      evidence.push(`faltam ${missing} ruas prontas para o nível 2`);
    }
    if (card.id === 'operator' && model.units.some(unit => unit.ownerSeat === model.selfSeat && unit.cardId === 'cannon' && !operationalCannonOperator(model, unit))) {
      score += 250;
      evidence.push('há Canhão próprio sem Operador');
    }
    if (card.id === 'archer' && placement.cell.mountable) {
      score += 260;
      evidence.push('a colocação monta o Arqueiro diretamente em uma Torre pronta');
    }
    if (card.id === 'cannon' && model.units.some(unit => unit.ownerSeat === model.selfSeat && unit.cardId === 'operator')) {
      score += 100;
      evidence.push('já existe Operador próprio no tabuleiro');
    }
    if (context.incomingReady.totalDamage > 0 && ['guard', 'warrior', 'wooden_barrier'].includes(card.id)) score += 100;
    results.push(makeRecommendation({
      score,
      urgency: context.incomingReady.lethal ? 'alta' : 'média',
      category: 'invocação',
      title: `Considerar ${card.name} em ${coordinates(placement.cell)}`,
      evidence,
      risks,
      confidence: 'média',
      exact: false,
      suggestion: {
        kind: 'summon',
        cardInstanceId: instance.instanceId,
        cardId: instance.cardId,
        cell: { x: placement.cell.x, z: placement.cell.z },
        mountsTowerUnitId: placement.cell.towerUnitId ?? undefined
      }
    }));
  }
  return results;
}

function mageAltarChoiceRecommendations(model) {
  if ((model.self.pendingMageAltarChoices ?? 0) < 1) return [];
  const options = asArray(model.self.deckChoices)
    .filter(cardId => CARD_BY_ID[cardId])
    .sort((left, right) => CARD_BY_ID[right].cost - CARD_BY_ID[left].cost);
  const cardId = options[0];
  if (!cardId) return [];
  return [makeRecommendation({
    score: 500,
    urgency: 'alta',
    category: 'baralho',
    title: `Concluir a escolha do Altar Mago com ${CARD_BY_ID[cardId].name}`,
    evidence: [`há ${model.self.pendingMageAltarChoices} escolha obrigatória pendente`, `${CARD_BY_ID[cardId].name} é a opção de maior custo disponível no deck atual`],
    risks: ['a melhor escolha estratégica pode depender da posição atual, não apenas do custo'],
    confidence: 'média',
    exact: false,
    suggestion: { kind: 'choose-deck-card', cardId, options }
  })];
}

function movementRecommendations(model, context) {
  if (!context.selfActive) return [];
  const enemyBase = model.enemySeat;
  const results = [];
  for (const unit of model.units.filter(candidate => candidate.ownerSeat === model.selfSeat)) {
    const options = movementOptionsForUnit(model, unit, { respectActionUsed: true });
    let best = null;
    for (const option of options) {
      const before = baseDistance(model, unit, enemyBase);
      const after = baseDistance(model, option.to, enemyBase);
      const progress = before - after;
      const riskDamage = cellThreatDamage(model, model.enemySeat, option.to);
      let score = progress * 24 - riskDamage * 38;
      const fireRisks = [];
      if (option.kind === 'mount-tower') score += 220;
      if (unit.cardId === 'guard' && context.incomingReady.totalDamage > 0) {
        const ownBaseProgress = baseDistance(model, unit, model.selfSeat) - baseDistance(model, option.to, model.selfSeat);
        score += ownBaseProgress * 32;
      }
      if (model.fires.some(fire => fire.x === option.to.x && fire.z === option.to.z && !fire.damagedUnitIds.includes(unit.id))) {
        score -= 500;
        fireRisks.push(`${unit.card?.name ?? unit.cardId} entraria em fogo e sofreria 1`);
      }
      if (option.operatorUnitId && model.fires.some(fire => fire.x === option.operatorTo.x && fire.z === option.operatorTo.z
        && !fire.damagedUnitIds.includes(option.operatorUnitId))) {
        score -= 10_000;
        fireRisks.push('o Operador de 1 HP morreria no fogo ao ocupar a antiga casa do Canhão');
      }
      if (!best || score > best.score) best = { option, score, progress, riskDamage, fireRisks };
    }
    if (!best || best.score < 12) continue;
    results.push(makeRecommendation({
      score: 80 + best.score,
      urgency: best.option.kind === 'mount-tower' ? 'alta' : 'baixa',
      category: 'posicionamento',
      title: best.option.kind === 'mount-tower'
        ? `Montar Arqueiro na Torre em ${coordinates(best.option.to)}`
        : `Reposicionar ${unit.card?.name ?? unit.cardId}#${shortId(unit.id)} para ${coordinates(best.option.to)}`,
      evidence: [
        `movimento legal a partir de ${coordinates(best.option.from)}`,
        `progresso para a base rival: ${best.progress} casa(s)`
      ],
      risks: [
        ...(best.riskDamage > 0 ? [`exposição visível estimada: ${best.riskDamage} de dano`] : ['não considera cartas ocultas do adversário']),
        ...best.fireRisks
      ],
      confidence: 'média',
      exact: false,
      suggestion: {
        kind: best.option.kind,
        actorUnitId: unit.id,
        to: best.option.to,
        operatorUnitId: best.option.operatorUnitId ?? undefined,
        operatorTo: best.option.operatorTo ?? undefined,
        towerUnitId: best.option.towerUnitId ?? undefined
      }
    }));
  }
  return results;
}

function cannonLinesToBase(model, seat) {
  const opponentSeat = otherSeat(seat);
  const baseKeys = new Set(baseCellsForSeat(opponentSeat, model.boardSize).map(cell => cellKey(cell.x, cell.z)));
  return model.units
    .filter(unit => unit.ownerSeat === seat && unit.cardId === 'cannon' && operationalCannonOperator(model, unit))
    .flatMap(cannon => cannonShotCells(model, cannon)
      .filter(cell => baseKeys.has(cellKey(cell.x, cell.z)))
      .map(cell => new Set(gridCellsBetween(cannon, cell).map(item => cellKey(item.x, item.z)))));
}

function tacticalRecommendations(model, context) {
  const results = [];
  const incomingAttackers = new Set(context.incomingReady.attackers.map(item => item.unitId));

  if (context.incomingNow.lethal) results.push(makeRecommendation({
    score: 30000,
    urgency: 'crítica',
    category: 'defesa',
    title: 'A base está sob letal no turno atual',
    evidence: [`dano legal visível: ${context.incomingNow.totalDamage}; HP da base: ${model.selfPlayer.baseHp}`],
    risks: ['se o adversário executar todos os ataques válidos, a partida termina'],
    confidence: 'alta',
    exact: true,
    suggestion: null
  }));
  else if (context.incomingReady.totalDamage > 0) results.push(makeRecommendation({
    score: context.incomingReady.lethal ? 6500 : 1200 + context.incomingReady.totalDamage * 100,
    urgency: context.incomingReady.lethal ? 'crítica' : 'alta',
    category: 'defesa',
    title: context.incomingReady.lethal ? 'Impedir o letal projetado contra a base' : 'Reduzir pressão já alinhada à base',
    evidence: [`peças visíveis podem somar ${context.incomingReady.totalDamage} de dano à base quando estiverem prontas`],
    risks: ['projeção não inclui movimentos nem cartas ocultas; o risco real pode mudar'],
    confidence: 'média',
    exact: false,
    suggestion: {
      kind: 'neutralize-base-attackers',
      unitIds: [...incomingAttackers]
    }
  }));

  if (context.selfActive) {
    const options = [
      ...context.ownCurrentOptions,
      ...pairMageFireOptions(context.ownCurrentOptions),
      ...towerVolleyOptionsForSeat(model, model.selfSeat),
      ...mageAcidOptionsForSeat(model, model.selfSeat, { respectActionUsed: true }),
      ...goblinCloneInstantOptionsForSeat(model, model.selfSeat),
      ...goblinTowerOptionsForSeat(model, model.selfSeat, { respectActionUsed: true }),
      ...goblinBomberOptionsForSeat(model, model.selfSeat, { respectActionUsed: true }),
      ...altarAbilityOptionsForSeat(model, model.selfSeat, { respectActionUsed: true })
    ];
    const scored = options.map(option => ({ option, ...optionUtility(model, option, model.selfSeat, incomingAttackers) }));
    const bestByActorAndSlot = new Map();
    for (const candidate of scored) {
      const slot = ['mage-acid', 'tower-volley'].includes(candidate.option.kind) ? 'instant' : 'normal';
      const key = `${candidate.option.actorUnitId}:${slot}`;
      const previous = bestByActorAndSlot.get(key);
      if (!previous || candidate.score > previous.score) bestByActorAndSlot.set(key, candidate);
    }
    for (const candidate of [...bestByActorAndSlot.values()].filter(item => item.score > 0)) {
      const lethal = candidate.option.baseDamage >= model.enemyPlayer.baseHp;
      results.push(makeRecommendation({
        score: candidate.score + (lethal ? 5000 : 0),
        urgency: lethal ? 'crítica' : candidate.score >= 500 ? 'alta' : 'média',
        category: 'tática',
        title: lethal ? 'Finalização legal disponível agora' : actionTitle(model, candidate.option),
        evidence: candidate.evidence,
        risks: candidate.risks,
        confidence: 'alta',
        exact: true,
        suggestion: suggestionFromOption(candidate.option)
      }));
    }
  } else if (context.turnFresh) {
    const instantOptions = [
      ...mageAcidOptionsForSeat(model, model.selfSeat, { respectActionUsed: false }),
      ...towerVolleyOptionsForSeat(model, model.selfSeat),
    ];
    for (const option of instantOptions) {
      const utility = optionUtility(model, option, model.selfSeat, incomingAttackers);
      if (utility.score <= 0) continue;
      results.push(makeRecommendation({
        score: utility.score + 400,
        urgency: 'alta',
        category: 'instantânea',
        title: option.kind === 'tower-volley'
          ? 'Rajada da Torre pode ser usada mesmo fora do turno'
          : 'Ácido do Mago pode ser usado mesmo fora do turno',
        evidence: utility.evidence,
        risks: utility.risks,
        confidence: 'alta',
        exact: true,
        suggestion: suggestionFromOption(option)
      }));
    }
  }
  return results;
}

function strategicRecommendations(model, context) {
  const results = [];
  const ownDependencies = dependencySummary(model, model.selfSeat);
  const enemyDependencies = dependencySummary(model, model.enemySeat);
  const enemyThreatMap = threatMap(context.enemyReadyOptions, model.selfSeat);
  const ownThreatMap = threatMap(context.ownReadyOptions, model.enemySeat);

  for (const pair of ownDependencies.operatedCannons) {
    const operatorThreat = enemyThreatMap.find(item => item.unitId === pair.operatorUnitId);
    if (!operatorThreat) continue;
    const operator = model.units.find(unit => unit.id === pair.operatorUnitId);
    if (operatorThreat.totalDamage < effectiveHp(operator)) continue;
    results.push(makeRecommendation({
      score: 1450,
      urgency: 'alta',
      category: 'sinergia',
      title: 'Operador crítico está exposto',
      evidence: [`Operador#${shortId(operator.id)} mantém Canhão#${shortId(pair.cannonUnitId)} ativo e pode receber ${operatorThreat.totalDamage}`],
      risks: ['perder o Operador desativa movimento e disparo do Canhão'],
      confidence: 'média',
      exact: false,
      suggestion: { kind: 'protect-unit', unitId: operator.id, dependencyOfUnitId: pair.cannonUnitId }
    }));
  }

  for (const pair of enemyDependencies.operatedCannons) {
    const cannon = model.units.find(unit => unit.id === pair.cannonUnitId);
    const operator = model.units.find(unit => unit.id === pair.operatorUnitId);
    const cannonThreatened = ownThreatMap.find(item => item.unitId === cannon.id)?.totalDamage >= effectiveHp(cannon);
    const operatorThreatened = ownThreatMap.find(item => item.unitId === operator.id)?.totalDamage >= effectiveHp(operator);
    if (!cannonThreatened && !operatorThreatened) continue;
    results.push(makeRecommendation({
      score: 1100,
      urgency: 'alta',
      category: 'alvo prioritário',
      title: `Quebrar a formação de Canhão inimiga pelo ${operatorThreatened ? 'Operador' : 'Canhão'}`,
      evidence: [`Canhão#${shortId(cannon.id)} e Operador#${shortId(operator.id)} formam uma dependência de 1 HP`],
      risks: ['a análise soma ataques visíveis, mas a sequência pode ser bloqueada por ocupação'],
      confidence: 'média',
      exact: false,
      suggestion: { kind: 'focus-unit', unitId: operatorThreatened ? operator.id : cannon.id }
    }));
  }

  if (ownDependencies.unoperatedCannons.length) results.push(makeRecommendation({
    score: 420,
    urgency: 'média',
    category: 'sinergia',
    title: 'Canhão próprio está sem Operador',
    evidence: ownDependencies.unoperatedCannons.map(id => `Canhão#${shortId(id)} não pode mover nem disparar`),
    risks: ['uma peça de custo 8 está entregando pouco valor enquanto isolada'],
    confidence: 'alta',
    exact: true,
    suggestion: { kind: 'restore-cannon-operator', cannonUnitIds: ownDependencies.unoperatedCannons }
  }));

  const energyWaste = Math.max(0, model.selfPlayer.energy + GAME_CONFIG.energyPerTurn - model.selfPlayer.maxEnergy);
  if (context.selfActive && energyWaste > 0 && !context.incomingReady.lethal) results.push(makeRecommendation({
    score: 260 + energyWaste * 35,
    urgency: 'média',
    category: 'economia',
    title: 'Evitar desperdício no teto de energia',
    evidence: [`energia ${model.selfPlayer.energy}/${model.selfPlayer.maxEnergy}; próxima renda nominal ${GAME_CONFIG.energyPerTurn}; desperdício potencial ${energyWaste}`],
    risks: ['não gastar apenas por gastar: preserve resposta defensiva se houver ameaça'],
    confidence: 'alta',
    exact: true,
    suggestion: { kind: 'spend-before-cap', minimumUsefulSpend: energyWaste }
  }));

  const missingCitizens = Math.max(0, GAME_CONFIG.level2CitizenRequirement - model.selfPlayer.citizens);
  const missingRoads = Math.max(0, GAME_CONFIG.level2RoadRequirement - completedRoadCount(model.selfSeat, model.roads));
  if (!context.incomingReady.lethal && (missingCitizens > 0 || missingRoads > 0)) results.push(makeRecommendation({
    score: 180 + missingCitizens * 8 + missingRoads * 20,
    urgency: 'baixa',
    category: 'desenvolvimento',
    title: 'Progresso mensurável para o nível 2',
    evidence: [`faltam ${missingCitizens} cidadãos e ${missingRoads} ruas prontas`],
    risks: ['economia perde prioridade se surgir ameaça de base em um turno'],
    confidence: 'alta',
    exact: true,
    suggestion: { kind: 'develop-kingdom', missingCitizens, missingRoads }
  }));
  return results;
}

function annotateRanks(recommendations, limit) {
  const urgencyWeight = { crítica: 4, alta: 3, média: 2, baixa: 1 };
  const unique = new Map();
  for (const item of recommendations) {
    const key = `${item.category}:${item.title}:${JSON.stringify(item.suggestion)}`;
    const previous = unique.get(key);
    if (!previous || previous.score < item.score) unique.set(key, item);
  }
  return [...unique.values()]
    .sort((left, right) => right.score - left.score || urgencyWeight[right.urgency] - urgencyWeight[left.urgency])
    .slice(0, limit)
    .map((item, index) => ({ rank: index + 1, ...item }));
}

export function analyzeSnapshot(input, { observedAt = Date.now(), top = 7 } = {}) {
  const model = createModel(input, observedAt);
  const playing = model.state.phase === 'playing';
  const turnFresh = !model.state.turnEndsAt || model.state.turnEndsAt > observedAt;
  const selfActive = playing && turnFresh && model.state.activeSeat === model.selfSeat;
  const enemyActive = playing && turnFresh && model.state.activeSeat === model.enemySeat;
  const ownCurrentOptions = selfActive ? attackOptionsForSeat(model, model.selfSeat, { respectActionUsed: true }) : [];
  const enemyCurrentOptions = enemyActive ? attackOptionsForSeat(model, model.enemySeat, { respectActionUsed: true }) : [];
  const ownReadyOptions = attackOptionsForSeat(model, model.selfSeat, { respectActionUsed: false });
  const enemyReadyOptions = attackOptionsForSeat(model, model.enemySeat, { respectActionUsed: false });
  const outgoingNow = baseThreatSummary(ownCurrentOptions, model.enemyPlayer.baseHp);
  const incomingNow = baseThreatSummary(enemyCurrentOptions, model.selfPlayer.baseHp);
  const outgoingReady = baseThreatSummary(ownReadyOptions, model.enemyPlayer.baseHp);
  const incomingReady = baseThreatSummary(enemyReadyOptions, model.selfPlayer.baseHp);
  const incomingCannonLines = cannonLinesToBase(model, model.enemySeat);
  const context = {
    ownCurrentOptions,
    enemyCurrentOptions,
    ownReadyOptions,
    enemyReadyOptions,
    outgoingNow,
    incomingNow,
    outgoingReady,
    incomingReady,
    incomingCannonLines,
    selfActive,
    enemyActive,
    turnFresh
  };

  const ownMaterial = materialForSeat(model, model.selfSeat);
  const enemyMaterial = materialForSeat(model, model.enemySeat);
  const ownThreatened = threatMap(enemyReadyOptions, model.selfSeat).map(item => {
    const unit = model.units.find(candidate => candidate.id === item.unitId);
    return {
      ...item,
      cardId: unit?.cardId,
      effectiveHp: unit ? effectiveHp(unit) : null,
      lethal: unit ? item.totalDamage >= effectiveHp(unit) : false,
      materialValue: unit ? unitMaterialValue(model, unit) : 0
    };
  }).sort((left, right) => Number(right.lethal) - Number(left.lethal) || right.materialValue - left.materialValue);
  const enemyThreatened = threatMap(ownReadyOptions, model.enemySeat).map(item => {
    const unit = model.units.find(candidate => candidate.id === item.unitId);
    return {
      ...item,
      cardId: unit?.cardId,
      effectiveHp: unit ? effectiveHp(unit) : null,
      lethal: unit ? item.totalDamage >= effectiveHp(unit) : false,
      materialValue: unit ? unitMaterialValue(model, unit) : 0
    };
  }).sort((left, right) => Number(right.lethal) - Number(left.lethal) || right.materialValue - left.materialValue);

  const recommendationLimit = Math.max(1, Math.min(20, Number(top) || 7));
  const rankedRecommendations = playing
    ? annotateRanks([
      ...tacticalRecommendations(model, context),
      ...mageAltarChoiceRecommendations(model),
      ...summonRecommendations(model, context),
      ...movementRecommendations(model, context),
      ...strategicRecommendations(model, context)
    ], recommendationLimit)
    : annotateRanks([makeRecommendation({
      score: 1,
      urgency: 'baixa',
      category: 'estado',
      title: model.state.phase === 'finished'
        ? (model.state.winnerSeat === model.selfSeat ? 'Partida encerrada com vitória' : 'Partida encerrada')
        : 'A partida ainda não está em andamento',
      evidence: model.state.phase === 'finished'
        ? [`vencedor registrado: P${model.state.winnerSeat ?? '?'}`]
        : [`fase atual: ${model.state.phase}`],
      risks: [],
      confidence: 'alta',
      exact: true,
      suggestion: null
    })], recommendationLimit);
  const recommendations = rankedRecommendations.map(recommendation => ({
    ...recommendation,
    validity: {
      stateVersion: model.state.version,
      expiresAt: recommendation.suggestion ? (model.state.turnEndsAt ?? null) : null,
      staleTurn: !turnFresh
    }
  }));

  const warnings = [
    'A mão e o deck adversários são ocultos; nenhuma carta específica foi presumida.',
    'Projeções “quando prontas” restauram ações, mas não simulam movimentos, compras nem respostas do adversário.',
    'O snapshot não informa uma versão das regras do servidor; cálculos usam as definições locais identificadas no relatório.',
    'Sugestões de invocação são alternativas e cada uma é avaliada contra a energia atual inteira.'
  ];
  if (model.envelope.connected === false) warnings.unshift('O terminal informou connected=false; o snapshot pode ser o último estado conhecido.');
  if (model.envelope.error) warnings.unshift(`O terminal informou erro: ${model.envelope.error}`);
  if (model.state.turnEndsAt && model.state.turnEndsAt <= observedAt) warnings.unshift('O relógio do turno já expirou no momento da análise; atualize o snapshot.');
  if (turnFresh && !selfActive && model.state.phase === 'playing') warnings.push('Não é o seu turno; somente instantâneas explicitamente válidas aparecem como ação imediata.');

  return {
    schemaVersion: ADVISOR_SCHEMA_VERSION,
    readOnly: true,
    notice: READ_ONLY_NOTICE,
    rules: {
      source: 'packages/shared/src/cards.js local',
      localFingerprint: LOCAL_RULES_FINGERPRINT,
      serverFingerprint: null,
      synchronizedWithServer: null
    },
    observation: {
      roomCode: model.code,
      stateVersion: model.state.version,
      observedAt,
      phase: model.state.phase,
      round: model.state.round,
      activeSeat: model.state.activeSeat,
      winnerSeat: model.state.winnerSeat ?? null,
      turnEndsAt: model.state.turnEndsAt ?? null,
      remainingMs: model.state.turnEndsAt ? Math.max(0, model.state.turnEndsAt - observedAt) : null
    },
    perspective: {
      selfSeat: model.selfSeat,
      enemySeat: model.enemySeat,
      selfName: model.selfPlayer.name,
      enemyName: model.enemyPlayer.name,
      isSelfTurn: selfActive
    },
    scoreboard: {
      self: {
        baseHp: model.selfPlayer.baseHp,
        energy: model.selfPlayer.energy,
        maxEnergy: model.selfPlayer.maxEnergy,
        citizens: model.selfPlayer.citizens,
        baseLevel: model.selfPlayer.baseLevel,
        handCount: model.self.hand.length,
        deckCount: model.selfPlayer.deckCount
      },
      enemy: {
        baseHp: model.enemyPlayer.baseHp,
        energy: model.enemyPlayer.energy,
        maxEnergy: model.enemyPlayer.maxEnergy,
        citizens: model.enemyPlayer.citizens,
        baseLevel: model.enemyPlayer.baseLevel,
        handCount: model.enemyPlayer.handCount,
        deckCount: model.enemyPlayer.deckCount
      }
    },
    material: {
      self: ownMaterial,
      enemy: enemyMaterial,
      delta: round(ownMaterial.total - enemyMaterial.total),
      model: 'custo, HP, prontidão e sinergias; valor heurístico, não pontuação oficial'
    },
    tactics: {
      legalAttacksNow: {
        self: ownCurrentOptions.length,
        enemy: enemyCurrentOptions.length
      },
      baseDamageNow: {
        outgoing: outgoingNow,
        incoming: incomingNow
      },
      baseDamageWhenReady: {
        outgoing: outgoingReady,
        incoming: incomingReady
      },
      ownThreatenedUnits: ownThreatened,
      enemyThreatenedUnits: enemyThreatened,
      ownMobilityNow: selfActive ? movementOptionsForSeat(model, model.selfSeat, { respectActionUsed: true }).length : 0,
      dependencies: {
        self: dependencySummary(model, model.selfSeat),
        enemy: dependencySummary(model, model.enemySeat)
      }
    },
    economy: {
      missingCitizensForLevel2: Math.max(0, GAME_CONFIG.level2CitizenRequirement - model.selfPlayer.citizens),
      missingReadyRoadsForLevel2: Math.max(0, GAME_CONFIG.level2RoadRequirement - completedRoadCount(model.selfSeat, model.roads)),
      potentialNextIncomeWaste: Math.max(0, model.selfPlayer.energy + GAME_CONFIG.energyPerTurn - model.selfPlayer.maxEnergy),
      playableHand: model.self.hand
        .filter(instance => CARD_BY_ID[instance.cardId]?.cost <= model.selfPlayer.energy)
        .map(instance => ({ instanceId: instance.instanceId, cardId: instance.cardId, cost: CARD_BY_ID[instance.cardId].cost }))
    },
    recommendations,
    warnings
  };
}

function formatBaseThreat(label, threat) {
  const attackers = threat.attackers.length
    ? threat.attackers.map(item => `${item.cardId}#${shortId(item.unitId)}:${item.damage}`).join(', ')
    : 'nenhum';
  return `${label}: ${threat.totalDamage} dano${threat.lethal ? ' · LETAL' : ''} · ${attackers}`;
}

function formatSuggestion(suggestion) {
  if (!suggestion) return 'nenhuma ação própria disponível neste estado';
  const parts = [suggestion.kind];
  if (suggestion.actorUnitId) parts.push(`peça ${shortId(suggestion.actorUnitId)}`);
  if (suggestion.targetUnitId) parts.push(`alvo ${shortId(suggestion.targetUnitId)}`);
  if (suggestion.targetBaseSeat) parts.push(`base P${suggestion.targetBaseSeat}`);
  if (suggestion.cell) parts.push(`casa ${coordinates(suggestion.cell)}`);
  if (suggestion.to) parts.push(`destino ${coordinates(suggestion.to)}`);
  if (suggestion.cells) parts.push(`casas ${suggestion.cells.map(coordinates).join(' + ')}`);
  if (suggestion.cardId) parts.push(`${suggestion.cardId}#${shortId(suggestion.cardInstanceId)}`);
  if (suggestion.spawnedCardId) parts.push(`invoca ${suggestion.spawnedCardId}`);
  if (suggestion.unitIds) parts.push(`peças ${suggestion.unitIds.map(shortId).join(', ')}`);
  return parts.join(' · ');
}

export function renderTextReport(analysis) {
  const lines = [
    'CODEX ADVISOR · SOMENTE LEITURA',
    analysis.notice,
    '',
    `Estado v${analysis.observation.stateVersion} · rodada ${analysis.observation.round} · fase ${analysis.observation.phase} · turno P${analysis.observation.activeSeat}`,
    `Regras locais ${analysis.rules.localFingerprint} · sincronização do processo servidor não verificável pelo snapshot`,
    `Perspectiva P${analysis.perspective.selfSeat} (${analysis.perspective.selfName}) vs P${analysis.perspective.enemySeat} (${analysis.perspective.enemyName})`,
    `Base ${analysis.scoreboard.self.baseHp}–${analysis.scoreboard.enemy.baseHp} · energia ${analysis.scoreboard.self.energy}/${analysis.scoreboard.self.maxEnergy} · material ${analysis.material.self.total}–${analysis.material.enemy.total} (Δ ${analysis.material.delta})`,
    '',
    'AMEAÇAS À BASE',
    formatBaseThreat('Agora, a favor', analysis.tactics.baseDamageNow.outgoing),
    formatBaseThreat('Agora, contra', analysis.tactics.baseDamageNow.incoming),
    formatBaseThreat('Quando prontas, a favor', analysis.tactics.baseDamageWhenReady.outgoing),
    formatBaseThreat('Quando prontas, contra', analysis.tactics.baseDamageWhenReady.incoming),
    '',
    'RECOMENDAÇÕES'
  ];

  if (!analysis.recommendations.length) lines.push('Nenhuma recomendação útil neste snapshot.');
  for (const recommendation of analysis.recommendations) {
    lines.push(`${recommendation.rank}. [${recommendation.urgency.toUpperCase()} · ${recommendation.category}] ${recommendation.title}`);
    for (const evidence of recommendation.evidence) lines.push(`   Evidência: ${evidence}`);
    for (const risk of recommendation.risks) lines.push(`   Risco: ${risk}`);
    lines.push(`   Sugestão manual: ${formatSuggestion(recommendation.suggestion)}`);
    lines.push(`   Confiança ${recommendation.confidence.level}: ${recommendation.confidence.basis}.`);
  }

  lines.push('', 'LIMITES');
  for (const warning of analysis.warnings) lines.push(`- ${warning}`);
  return lines.join('\n');
}
