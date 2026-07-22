import { CARD_BY_ID } from './cardCatalog.js';

export function effectiveCardCost(cardId, seat, units = []) {
  const card = CARD_BY_ID[cardId];
  if (!card) return Number.POSITIVE_INFINITY;
  if (card.id !== 'goblin_tower') return card.cost;
  const goblins = units.filter(unit => unit.ownerSeat === seat && unit.cardId === 'goblin').length;
  return Math.max(card.minimumCost ?? 1, card.cost - goblins * (card.goblinDiscount ?? 1));
}

export function goblinSpawnHp(seat, x, z, units = []) {
  const towerNearby = units.some(unit => unit.ownerSeat === seat
    && unit.cardId === 'goblin_tower'
    && !unit.underConstruction
    && Math.abs(unit.x - x) + Math.abs(unit.z - z) === 1);
  return CARD_BY_ID.goblin.hp + (towerNearby ? 1 : 0);
}
