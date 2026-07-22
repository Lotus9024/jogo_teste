import { randomUUID } from 'node:crypto';
import { CARD_BY_ID, isAttackDistanceValid, isCannonTargetValid } from '@tronos/shared/cards';
import { attackCard, cannonOperator, damageUnit, fireCannonAt, unitBlocksAttackLine } from '../combat.js';
import { baseCells, distance, fail, integer, unitAt, validCell } from '../gameQueries.js';
import { requireTurn } from '../turnLifecycle.js';

export function mageFireAction(state, player, _opponent, action) {
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
}

export function attackAction(state, player, opponent, action) {
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

  if (action.targetUnitId) attackUnit(state, player, action, unit, card, damage, operator);
  else if (card.id === 'cannon' && Number.isInteger(action.x) && Number.isInteger(action.z)) attackCell(state, action, unit, card, operator);
  else if (action.targetBaseSeat === opponent.seat) attackBase(state, player, opponent, unit, card, damage, operator);
  else fail('Alvo inválido.');

  unit.empowered = false;
  unit.actionUsed = true;
}

function attackUnit(state, player, action, unit, card, damage, operator) {
  const target = state.units.find(item => item.id === action.targetUnitId && (card.id === 'cannon' || item.ownerSeat !== player.seat) && item.id !== unit.id) ?? fail('Alvo inválido.');
  if (card.id === 'cannon' ? !isCannonTargetValid(unit, target) : !isAttackDistanceValid(card, distance(unit, target))) fail('Alvo fora de alcance.');
  if (unitBlocksAttackLine(state, unit, target, card)) fail('A linha de ataque está bloqueada.');
  if (card.id === 'cannon') {
    fireCannonAt(state, target, card);
    operator.actionUsed = true;
    return;
  }
  const defeatedCell = { x: target.x, z: target.z };
  const defeated = damageUnit(state, target, damage);
  if (defeated && !['archer', 'cannon'].includes(card.id) && !unitAt(state, defeatedCell.x, defeatedCell.z)) {
    unit.x = defeatedCell.x;
    unit.z = defeatedCell.z;
  }
}

function attackCell(state, action, unit, card, operator) {
  const targetCell = { x: integer(action.x), z: integer(action.z) };
  if (!validCell(targetCell.x, targetCell.z) || !isCannonTargetValid(unit, targetCell)) fail('Alvo fora de alcance.');
  if (unitBlocksAttackLine(state, unit, targetCell, card)) fail('A linha de ataque está bloqueada por outra unidade.');
  fireCannonAt(state, targetCell, card);
  operator.actionUsed = true;
}

function attackBase(state, player, opponent, unit, card, damage, operator) {
  const reachableBaseCells = baseCells(opponent.seat)
    .filter(cell => (card.id === 'cannon' ? isCannonTargetValid(unit, cell) : isAttackDistanceValid(card, distance(unit, cell))) && !unitBlocksAttackLine(state, unit, cell, card));
  const cannonBaseCell = card.id === 'cannon' ? reachableBaseCells[0] : null;
  if (!reachableBaseCells.length) fail('Base fora de alcance ou linha de ataque bloqueada.');
  opponent.baseHp = Math.max(0, opponent.baseHp - damage);
  if (card.id === 'cannon') {
    fireCannonAt(state, cannonBaseCell, card);
    operator.actionUsed = true;
  }
  if (!opponent.baseHp) {
    state.phase = 'finished';
    state.winnerSeat = player.seat;
    state.turnEndsAt = null;
  }
}
