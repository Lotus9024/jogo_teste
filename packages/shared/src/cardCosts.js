import { CARD_BY_ID } from './cardCatalog.js';

export function effectiveCardCost(cardId, seat, units = []) {
  const card = CARD_BY_ID[cardId];
  if (!card) return Number.POSITIVE_INFINITY;
  const completedAllied = units.filter(unit => unit.ownerSeat === seat && !unit.underConstruction);
  const goblinTroops = completedAllied.filter(unit => isGoblinTroop(unit.cardId)).length;
  const goblinAltars = completedAllied.filter(unit => unit.cardId === 'goblin_altar').length;
  const mageAltars = completedAllied.filter(unit => unit.cardId === 'mage_altar').length;
  const towerDiscount = card.id === 'goblin_tower' ? goblinTroops * (card.goblinDiscount ?? 1) : 0;
  const familyDiscount = card.category === 'goblin' ? goblinAltars : card.category === 'mage' ? mageAltars : 0;
  return Math.max(card.minimumCost ?? 1, card.cost - towerDiscount - familyDiscount);
}

export function isBasicCard(cardId) { return CARD_BY_ID[cardId]?.category === 'basic'; }
export function isGoblinCard(cardId) { return CARD_BY_ID[cardId]?.category === 'goblin'; }
export function isMageCard(cardId) { return CARD_BY_ID[cardId]?.category === 'mage'; }
export function isGoblinTroop(cardId) {
  const card = CARD_BY_ID[cardId];
  return card?.category === 'goblin' && !card.type;
}

export function goblinSpawnHp(seat, x, z, units = [], cardId = 'goblin') {
  const towerNearby = units.some(unit => unit.ownerSeat === seat
    && unit.cardId === 'goblin_tower'
    && !unit.underConstruction
    && Math.abs(unit.x - x) + Math.abs(unit.z - z) === 1);
  return (CARD_BY_ID[cardId]?.hp ?? 1) + (isGoblinTroop(cardId) && towerNearby ? 1 : 0);
}
