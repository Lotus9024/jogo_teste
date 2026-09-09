import { createInterface } from 'node:readline/promises';
import { stdin as defaultInput, stdout as defaultOutput } from 'node:process';
import {
  CARD_BY_ID,
  CARD_DEFINITIONS,
  DECK_LIMITS,
  deckCounts,
  validateDeckCardIds,
} from '@tronos/shared/cards';

export function recommendedDeckCardIds() {
  const counts = { common: 0, uncommon: 0, rare: 0 };
  return CARD_DEFINITIONS
    .filter(card => {
      if (counts[card.rarityClass] >= DECK_LIMITS[card.rarityClass]) return false;
      counts[card.rarityClass] += 1;
      return true;
    })
    .map(card => card.id);
}

export function parseDeckText(value) {
  const ids = String(value ?? '')
    .split(/[\s,;]+/)
    .map(id => id.trim().toLowerCase())
    .filter(Boolean);
  const unknown = [...new Set(ids.filter(id => !CARD_BY_ID[id]))];
  if (unknown.length) throw new Error(`Cartas desconhecidas: ${unknown.join(', ')}.`);
  return validateDeckCardIds(ids);
}

export function deckArgument(args) {
  const inline = args.find(argument => String(argument).startsWith('--deck='));
  if (inline) return String(inline).slice('--deck='.length);
  const index = args.indexOf('--deck');
  return index >= 0 ? args[index + 1] : null;
}

export function formatDeckCatalog() {
  return ['common', 'uncommon', 'rare'].map(rarity => {
    const cards = CARD_DEFINITIONS
      .filter(card => card.rarityClass === rarity)
      .map(card => `${card.id} (${card.name})`)
      .join(' · ');
    return `${rarity.toUpperCase()} — escolha exatamente ${DECK_LIMITS[rarity]}:\n  ${cards}`;
  }).join('\n\n');
}

export function formatDeckSummary(ids) {
  const counts = deckCounts(ids);
  return `${ids.length} cartas · ${counts.common} comuns · ${counts.uncommon} incomuns · ${counts.rare} raras`;
}

export async function selectDeckBeforeMatch({
  args = [],
  input = defaultInput,
  output = defaultOutput,
  interactive = Boolean(input.isTTY && output.isTTY),
} = {}) {
  const explicit = deckArgument(args);
  if (explicit != null) return parseDeckText(explicit);

  const recommended = recommendedDeckCardIds();
  if (!interactive) return recommended;

  const terminal = createInterface({ input, output });
  try {
    output.write('\nMONTE SEU DECK ANTES DA PARTIDA\n');
    output.write(`Escolha cartas únicas: ${DECK_LIMITS.common} comuns, ${DECK_LIMITS.uncommon} incomuns e ${DECK_LIMITS.rare} raras.\n\n`);
    output.write(`${formatDeckCatalog()}\n\n`);
    output.write(`Pressione Enter para usar o deck recomendado (${formatDeckSummary(recommended)}).\n`);
    while (true) {
      const answer = await terminal.question('IDs separados por vírgula: ');
      if (!answer.trim()) return recommended;
      try {
        const selected = parseDeckText(answer);
        output.write(`Deck confirmado: ${formatDeckSummary(selected)}.\n\n`);
        return selected;
      } catch (error) {
        output.write(`Deck inválido: ${error.message}\n`);
      }
    }
  } finally {
    terminal.close();
  }
}
