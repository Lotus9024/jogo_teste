import { CARD_BY_ID, isGoblinCard, isGoblinTroop, isMageCard } from '@tronos/shared/cards';
import { inBaseArea } from './gameQueries.js';

export function goblinTroopsInBaseArea(state, seat) {
  return state.units.filter(unit => unit.ownerSeat === seat
    && isGoblinTroop(unit.cardId)
    && inBaseArea(state, seat, unit.x, unit.z));
}

export function builderAreaIsActive(state, seat) {
  const forbiddenCardInBase = state.units.some(unit => unit.ownerSeat === seat
    && (isGoblinCard(unit.cardId) || isMageCard(unit.cardId))
    && inBaseArea(state, seat, unit.x, unit.z));
  return !forbiddenCardInBase;
}

export function activeBuilderAreaCount(state, seat) {
  if (!builderAreaIsActive(state, seat)) return 0;
  return state.units.filter(unit => unit.ownerSeat === seat
    && unit.cardId === 'builder_area'
    && !unit.underConstruction).length;
}

export function builderEnergyBonus(state, seat) {
  return activeBuilderAreaCount(state, seat) > 0 ? 1 : 0;
}

export function refreshBuilderResistance(state) {
  for (const unit of state.units) {
    const card = CARD_BY_ID[unit.cardId];
    if (card?.type !== 'construction') continue;
    const bonus = activeBuilderAreaCount(state, unit.ownerSeat);
    const oldBonus = unit.builderResistanceBonus ?? 0;
    const baseResistance = card.hp;
    unit.builderResistanceBonus = bonus;
    unit.maxHp = baseResistance + bonus;
    unit.hp = Math.max(0, Math.min(unit.maxHp, unit.hp + bonus - oldBonus));
  }
}
