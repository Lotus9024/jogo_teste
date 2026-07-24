import { CARD_BY_ID, forwardDeltaForSeat, gridCellsBetween, roadAttackBonus } from '@tronos/shared/cards';
import { unitAt, unitsAt } from './gameQueries.js';

export function cannonOperator(state, cannon) {
  const forward = forwardDeltaForSeat(cannon.ownerSeat);
  return state.units.find(unit => unit.cardId === 'operator'
    && unit.ownerSeat === cannon.ownerSeat
    && unit.x === cannon.x - forward.x
    && unit.z === cannon.z - forward.z) ?? null;
}

export function mountedTower(state, unit) {
  if (!unit.mountedOnTowerId) return null;
  return state.units.find(item => item.id === unit.mountedOnTowerId
    && ['tower', 'royal_tower'].includes(item.cardId)
    && item.ownerSeat === unit.ownerSeat
    && !item.underConstruction) ?? null;
}

export function attackCard(state, unit, card) {
  const tower = card.id === 'archer' ? mountedTower(state, unit) : null;
  const towerRangeBonus = tower ? (CARD_BY_ID[tower.cardId]?.archerRangeBonus ?? 1) : 0;
  const towerDamageBonus = tower ? (CARD_BY_ID[tower.cardId]?.archerDamageBonus ?? 0) : 0;
  const roadBonus = roadAttackBonus(unit.x, unit.z, state.roads, card.id);
  return towerRangeBonus || towerDamageBonus || roadBonus
    ? { ...card, attackRange: card.attackRange + towerRangeBonus + roadBonus, damage: card.damage + towerDamageBonus }
    : card;
}

export function unitBlocksAttackLine(state, unit, target, card) {
  if (card.id === 'archer' && mountedTower(state, unit)) return false;
  return gridCellsBetween(unit, target).some(cell => unitsAt(state, cell.x, cell.z, unit.id)
    .some(blocker => card.id !== 'archer' || blocker.cardId !== 'wooden_barrier'));
}

export function damageUnit(state, target, damage) {
  if (!state.units.includes(target)) return false;
  const absorbed = Math.min(target.shield ?? 0, damage);
  target.shield = (target.shield ?? 0) - absorbed;
  target.hp -= damage - absorbed;
  if (target.hp > 0) return false;
  state.units.splice(state.units.indexOf(target), 1);
  if (['tower', 'royal_tower'].includes(target.cardId)) {
    for (let index = state.units.length - 1; index >= 0; index -= 1) {
      if (state.units[index].mountedOnTowerId === target.id) state.units.splice(index, 1);
    }
  }
  return true;
}

export function fireCannonAt(state, targetCell, card) {
  const areaDistance = unit => Math.max(Math.abs(unit.x - targetCell.x), Math.abs(unit.z - targetCell.z));
  state.units
    .filter(unit => areaDistance(unit) <= card.areaRadius)
    .forEach(unit => damageUnit(state, unit, areaDistance(unit) === 0 ? card.damage : card.areaDamage));
}

export function applyFireEntryDamage(state, unit) {
  const fires = (state.fires ?? []).filter(fire => fire.x === unit.x && fire.z === unit.z && !fire.damagedUnitIds.includes(unit.id));
  for (const fire of fires) {
    fire.damagedUnitIds.push(unit.id);
    if (damageUnit(state, unit, 1)) break;
  }
}

export function resolveEndingFires(state, endingSeat) {
  const expiring = (state.fires ?? []).filter(fire => fire.ownerSeat !== endingSeat);
  for (const fire of expiring) {
    const occupant = unitAt(state, fire.x, fire.z);
    if (occupant && !fire.damagedUnitIds.includes(occupant.id)) damageUnit(state, occupant, 1);
  }
  state.fires = (state.fires ?? []).filter(fire => fire.ownerSeat === endingSeat);
}

export function mountableTowerAt(state, player, card, x, z, movingUnitId = null) {
  if (card.id !== 'archer') return null;
  const occupants = unitsAt(state, x, z, movingUnitId);
  const tower = occupants.find(unit => ['tower', 'royal_tower'].includes(unit.cardId)
    && unit.ownerSeat === player.seat && !unit.underConstruction);
  const mountedArcher = occupants.some(unit => unit.cardId === 'archer' && unit.mountedOnTowerId === tower?.id);
  return tower && !mountedArcher && occupants.every(unit => unit.id === tower.id) ? tower : null;
}

export function fireTowerVolley(state, player, archer, ability) {
  const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (const [dx, dz] of directions) {
    const target = state.units
      .filter(unit => unit.id !== archer.id && unit.ownerSeat !== player.seat)
      .map(unit => ({ unit, step: dx ? (unit.x - archer.x) / dx : (unit.z - archer.z) / dz }))
      .filter(({ unit, step }) => step >= 1 && step <= ability.range && unit.x === archer.x + dx * step && unit.z === archer.z + dz * step)
      .sort((a, b) => a.step - b.step)[0]?.unit;
    if (target) damageUnit(state, target, ability.damage);
  }
}
