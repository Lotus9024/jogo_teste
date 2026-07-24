import { CARD_BY_ID, CARD_DEFINITIONS } from './cardCatalog.js';

export const DECK_LIMITS = Object.freeze({ common: 6, uncommon: 4, rare: 2 });
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
  const counts = { common: 0, uncommon: 0, rare: 0 };
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
      throw new Error('O Deck precisa ter exatamente 6 cartas comuns, 4 incomuns e 2 raras.');
    }
  }
  return ids;
}
