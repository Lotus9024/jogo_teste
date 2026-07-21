import { randomUUID } from 'node:crypto';
import { CARD_BY_ID, isAttackDistanceValid, movementDistance } from '@tronos/shared/cards';
import { GAME_CONFIG } from '@tronos/shared/game-config';
import { drawCard } from './createInitialState.js';

const fail = message => { throw new Error(message); };
const distance = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.z - b.z);
const integer = value => Number.isInteger(value) ? value : fail('Coordenada inválida.');

function playerById(state, playerId) {
  return state.players.find(player => player.id === playerId) ?? fail('Jogador inválido.');
}
function baseCells(seat) {
  const centerZ = seat === 1 ? GAME_CONFIG.boardSize - 2 : 1;
  const cells = [];
  for (let x = 6; x <= 8; x += 1) for (let z = centerZ - 1; z <= centerZ + 1; z += 1) cells.push({ x, z });
  return cells;
}
function inBase(x, z) { return [1, 2].some(seat => baseCells(seat).some(cell => cell.x === x && cell.z === z)); }
function validCell(x, z) { return x >= 0 && x < GAME_CONFIG.boardSize && z >= 0 && z < GAME_CONFIG.boardSize; }
function deploymentCell(seat, x, z) { return seat === 1 ? z >= 8 && z <= 11 : z >= 3 && z <= 6; }
function unitAt(state, x, z) { return state.units.find(unit => unit.x === x && unit.z === z); }

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
    if (!validCell(x, z) || !deploymentCell(player.seat, x, z) || inBase(x, z) || unitAt(state, x, z)) fail('Escolha uma casa livre na sua zona de invocação.');
    const index = player.hand.findIndex(card => card.instanceId === action.cardInstanceId);
    if (index < 0) fail('Esta carta não está na sua mão.');
    const instance = player.hand[index], card = CARD_BY_ID[instance.cardId];
    if (!card || player.energy < card.cost) fail('Energia insuficiente.');
    player.energy -= card.cost; player.hand.splice(index, 1); player.discard.push(instance.cardId);
    state.units.push({
      id: randomUUID(), ownerSeat: player.seat, cardId: card.id, x, z, hp: card.hp, shield: 0,
      actionUsed: true, abilityUsed: false, instantUsedRound: 0, empowered: false,
      underConstruction: card.type === 'construction', buildReadyRound: card.type === 'construction' ? state.round + card.buildRounds : null
    });
  } else if (action.type === 'move') {
    requireTurn(state, player);
    const unit = state.units.find(item => item.id === action.unitId && item.ownerSeat === player.seat) ?? fail('Unidade inválida.');
    const x = integer(action.x), z = integer(action.z), card = CARD_BY_ID[unit.cardId];
    if (unit.actionUsed) fail('Esta unidade já agiu neste turno.');
    if (unit.underConstruction || card.type === 'construction') fail('Esta construção não pode se mover.');
    if (!validCell(x, z) || inBase(x, z) || unitAt(state, x, z) || movementDistance(card.movementType, unit, { x, z }) > card.move) fail('Movimento inválido.');
    unit.x = x; unit.z = z; unit.actionUsed = true;
  } else if (action.type === 'attack') {
    requireTurn(state, player);
    const unit = state.units.find(item => item.id === action.unitId && item.ownerSeat === player.seat) ?? fail('Unidade inválida.');
    const card = CARD_BY_ID[unit.cardId];
    if (unit.actionUsed) fail('Esta unidade já agiu neste turno.');
    if (unit.underConstruction) fail('A construção ainda não foi concluída.');
    if (card.damage <= 0 || card.attackRange <= 0) fail('Esta carta não pode atacar.');
    const damage = card.damage + (unit.empowered ? 8 : 0);
    if (action.targetUnitId) {
      const target = state.units.find(item => item.id === action.targetUnitId && item.ownerSeat !== player.seat) ?? fail('Alvo inválido.');
      if (!isAttackDistanceValid(card, distance(unit, target))) fail('Alvo fora de alcance.');
      const defeatedCell = { x: target.x, z: target.z };
      const absorbed = Math.min(target.shield ?? 0, damage); target.shield -= absorbed; target.hp -= damage - absorbed;
      if (target.hp <= 0) {
        state.units.splice(state.units.indexOf(target), 1);
        if (card.id !== 'archer') { unit.x = defeatedCell.x; unit.z = defeatedCell.z; }
      }
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
    if (!card.instant?.enabled || unit.instantUsedRound === state.round || player.energy < card.instant.cost) fail('Habilidade instantânea indisponível.');
    if (card.id === 'warrior') unit.shield = (unit.shield ?? 0) + 8;
    if (card.id === 'guard') {
      const target = state.units.find(item => item.id === action.targetUnitId && item.ownerSeat === player.seat) ?? fail('Aliado inválido.');
      if (distance(unit, target) > 1) fail('Aliado fora de alcance.');
      target.shield = (target.shield ?? 0) + 10;
    }
    if (card.id === 'archer') {
      const target = state.units.find(item => item.id === action.targetUnitId && item.ownerSeat !== player.seat) ?? fail('Alvo inválido.');
      if (distance(unit, target) > card.attackRange) fail('Alvo fora de alcance.');
      const damage = 7,absorbed = Math.min(target.shield ?? 0, damage);target.shield -= absorbed;target.hp -= damage-absorbed;
      if (target.hp <= 0) state.units.splice(state.units.indexOf(target),1);
    }
    player.energy -= card.instant.cost;unit.instantUsedRound = state.round;
  } else fail('Ação não reconhecida.');

  state.version += 1;
  return state;
}

export function applyTurnTimeout(state) {
  if (state.phase !== 'playing' || !state.turnEndsAt || Date.now() < state.turnEndsAt) return false;
  endTurn(state); state.version += 1; return true;
}
