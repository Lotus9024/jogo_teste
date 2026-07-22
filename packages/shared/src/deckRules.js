import { CARD_BY_ID, CARD_DEFINITIONS } from './cardCatalog.js';

export const DECK_LIMITS = Object.freeze({ common: 9, uncommon: 7, rare: 5 });
export const DECK_RARITIES = Object.freeze(Object.keys(DECK_LIMITS));
export const DEFAULT_DECK_CARD_IDS = Object.freeze(CARD_DEFINITIONS.map(card => card.id));

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
    if (counts[rarity] < 1) throw new Error('O Deck precisa ter ao menos uma carta comum, uma incomum e uma rara.');
    if (counts[rarity] > DECK_LIMITS[rarity]) throw new Error(`O Deck excedeu o limite de cartas ${rarity}.`);
  }
  return ids;
}
