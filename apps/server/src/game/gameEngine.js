import { randomUUID } from 'node:crypto';
import { CARD_BY_ID, baseCellsForSeat, isAttackDistanceValid, isDeploymentCell, movementDistance } from '@tronos/shared/cards';
import { GAME_CONFIG } from '@tronos/shared/game-config';
import { drawCard } from './createInitialState.js';

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

function mountedTower(state, unit) {
  if (!unit.mountedOnTowerId) return null;
  return state.units.find(item => item.id === unit.mountedOnTowerId && item.cardId === 'tower' && item.ownerSeat === unit.ownerSeat && !item.underConstruction) ?? null;
}

function attackCard(state, unit, card) {
  return card.id === 'archer' && mountedTower(state, unit) ? { ...card, attackRange: card.attackRange + 1 } : card;
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
      .filter(unit => unit.ownerSeat !== player.seat)
      .map(unit => ({ unit, step: dx ? (unit.x - archer.x) / dx : (unit.z - archer.z) / dz }))
      .filter(({ unit, step }) => step >= 1 && step <= instant.range && unit.x === archer.x + dx * step && unit.z === archer.z + dz * step)
      .sort((a, b) => a.step - b.step)[0]?.unit;
    if (target) damageUnit(state, target, instant.damage);
  }
}

function endTurn(state) {
  state.activeSeat = state.activeSeat === 1 ? 2 : 1;
  if (state.activeSeat === 1) state.round += 1;
  state.units.forEach(unit => {
    if (unit.underConstruction && unit.ownerSeat === state.activeSeat && unit.buildReadyRound <= state.round) unit.underConstruction = false;
  });
  const player = state.players.find(item => item.seat === state.activeSeat);
  player.energy = Math.min(GAME_CONFIG.maxEnergy, player.energy + GAME_CONFIG.energyPerTurn);
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
    if (!validCell(x, z) || !deploymentCell(player.seat, x, z) || inBase(x, z) || (unitAt(state, x, z) && !tower)) fail('Escolha uma casa livre a até 2 casas do seu reino.');
    if (player.energy < card.cost) fail('Energia insuficiente.');
    player.energy -= card.cost; player.hand.splice(index, 1); player.discard.push(instance.cardId);
    state.units.push({
      id: randomUUID(), ownerSeat: player.seat, cardId: card.id, x, z, hp: card.hp, shield: 0,
      actionUsed: true, abilityUsed: false, instantUsedRound: 0, empowered: false, mountedOnTowerId: tower?.id ?? null,
      underConstruction: card.type === 'construction', buildReadyRound: card.type === 'construction' ? state.round + card.buildRounds : null
    });
  } else if (action.type === 'move') {
    requireTurn(state, player);
    const unit = state.units.find(item => item.id === action.unitId && item.ownerSeat === player.seat) ?? fail('Unidade inválida.');
    const x = integer(action.x), z = integer(action.z), card = CARD_BY_ID[unit.cardId];
    if (unit.actionUsed) fail('Esta unidade já agiu neste turno.');
    if (unit.underConstruction || card.type === 'construction') fail('Esta construção não pode se mover.');
    if (mountedTower(state, unit)) fail('O arqueiro montado não pode se mover.');
    const tower = mountableTowerAt(state, player, card, x, z, unit.id);
    if (!validCell(x, z) || inBase(x, z) || (unitAt(state, x, z, unit.id) && !tower) || movementDistance(card.movementType, unit, { x, z }) > card.move) fail('Movimento inválido.');
    unit.x = x; unit.z = z; unit.mountedOnTowerId = tower?.id ?? null; unit.actionUsed = true;
  } else if (action.type === 'attack') {
    requireTurn(state, player);
    const unit = state.units.find(item => item.id === action.unitId && item.ownerSeat === player.seat) ?? fail('Unidade inválida.');
    const card = attackCard(state, unit, CARD_BY_ID[unit.cardId]);
    if (unit.actionUsed) fail('Esta unidade já agiu neste turno.');
    if (unit.underConstruction) fail('A construção ainda não foi concluída.');
    if (card.damage <= 0 || card.attackRange <= 0) fail('Esta carta não pode atacar.');
    const damage = card.damage + (unit.empowered ? 8 : 0);
    if (action.targetUnitId) {
      const target = state.units.find(item => item.id === action.targetUnitId && item.ownerSeat !== player.seat) ?? fail('Alvo inválido.');
      if (!isAttackDistanceValid(card, distance(unit, target))) fail('Alvo fora de alcance.');
      const defeatedCell = { x: target.x, z: target.z };
      const defeated = damageUnit(state, target, damage);
      if (defeated && card.id !== 'archer' && !unitAt(state, defeatedCell.x, defeatedCell.z)) { unit.x = defeatedCell.x; unit.z = defeatedCell.z; }
    } else if (action.targetBaseSeat === opponent.seat) {
      if (!isAttackDistanceValid(card, Math.min(...baseCells(opponent.seat).map(cell => distance(unit, cell))))) fail('Base fora de alcance.');
      opponent.baseHp = Math.max(0, opponent.baseHp - damage);
      if (!opponent.baseHp) { state.phase = 'finished'; state.winnerSeat = player.seat; state.turnEndsAt = null; }
    } else fail('Alvo inválido.');
    unit.empowered = false; unit.actionUsed = true;
  } else if (action.type === 'use_ability') {
    requireTurn(state, player);
    const unit = state.units.find(item => item.id === action.unitId && item.ownerSeat === player.seat) ?? fail('Unidade inválida.');
    const card = CARD_BY_ID[unit.cardId];
    if (!card.ability?.enabled || unit.abilityUsed || player.energy < card.ability.cost) fail('Habilidade indisponível.');
    let archerTargets = null;
    if (card.id === 'archer') {
      const target = state.units.find(item => item.id === action.targetUnitId && item.ownerSeat !== player.seat) ?? fail('Alvo inválido.');
      if (distance(unit, target) > card.attackRange) fail('Alvo fora de alcance.');
      archerTargets = state.units.filter(item => item.ownerSeat !== player.seat && distance(item, target) <= 1);
    }
    player.energy -= card.ability.cost; unit.abilityUsed = true;
    if (card.id === 'warrior') unit.empowered = true;
    if (card.id === 'guard') unit.shield = 12;
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

  state.version += 1;
  return state;
}

export function applyTurnTimeout(state) {
  if (state.phase !== 'playing' || !state.turnEndsAt || Date.now() < state.turnEndsAt) return false;
  endTurn(state); state.version += 1; return true;
}
