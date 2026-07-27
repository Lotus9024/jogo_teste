import { CARD_BY_ID, CARD_DEFINITIONS } from './cardCatalog.js';

export const DECK_LIMITS = Object.freeze({
  common: 7,
  uncommon: 5,
  rare: 3,
  legendary: 0,
  mystic: 0,
});
export const DECK_FUTURE_LIMITS = Object.freeze({ legendary: 2, mystic: 1 });
export const DECK_REQUIREMENT_MESSAGE = 'O Deck precisa ter exatamente 7 cartas comuns, 5 incomuns, 3 raras, 0 lendárias e 0 místicas.';
export const DECK_RARITIES = Object.freeze(Object.keys(DECK_LIMITS));
export const DEFAULT_DECK_CARD_IDS = Object.freeze(DECK_RARITIES.flatMap(rarity =>
  CARD_DEFINITIONS
    .filter(card => card.rarityClass === rarity)
    .slice(0, DECK_LIMITS[rarity])
    .map(card => card.id)
));

export function normalizeDeckCardIds(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(id => typeof id === 'string' && CARD_BY_ID[id] && DECK_RARITIES.includes(CARD_BY_ID[id].rarityClass)))];
}

export function deckCounts(value) {
  const counts = Object.fromEntries(DECK_RARITIES.map(rarity => [rarity, 0]));
  normalizeDeckCardIds(value).forEach(id => { counts[CARD_BY_ID[id].rarityClass] += 1; });
  return counts;
}

export function validateDeckCardIds(value, { allowDefault = false } = {}) {
  const ids = normalizeDeckCardIds(value);
  if (!ids.length && allowDefault) return [...DEFAULT_DECK_CARD_IDS];
  if (!ids.length) throw new Error('Monte um Deck antes de criar ou entrar em uma sala.');
  const counts = deckCounts(ids);
  for (const rarity of DECK_RARITIES) {
    if (counts[rarity] !== DECK_LIMITS[rarity]) {
      throw new Error(DECK_REQUIREMENT_MESSAGE);
    }
  }
  const altarCount = ids.filter(id => ['goblin_altar', 'mage_altar'].includes(id)).length;
  if (altarCount > 1) throw new Error('O Deck pode ter apenas um Altar.');
  return ids;
}
