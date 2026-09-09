import test from 'node:test';
import assert from 'node:assert/strict';
import { DECK_REQUIREMENT_MESSAGE } from '@tronos/shared/cards';
import {
  deckArgument,
  formatDeckSummary,
  parseDeckText,
  recommendedDeckCardIds,
  selectDeckBeforeMatch,
} from '../src/deck-builder.mjs';

test('deck recomendado respeita limites e inclui as três raridades', () => {
  const ids = recommendedDeckCardIds();
  assert.ok(ids.includes('citizen'));
  assert.ok(ids.includes('archer'));
  assert.ok(ids.includes('mage'));
  assert.match(formatDeckSummary(ids), /7 comuns.*5 incomuns.*3 raras/);
});

test('parâmetro --deck aceita IDs separados por vírgula', async () => {
  const text = recommendedDeckCardIds().join(',');
  assert.equal(deckArgument(['criar', 'Codex', '--deck', text]), text);
  assert.deepEqual(parseDeckText(text), recommendedDeckCardIds());
  assert.deepEqual(await selectDeckBeforeMatch({
    args: [`--deck=${text}`],
    interactive: false,
  }), recommendedDeckCardIds());
});

test('deck rejeita carta desconhecida e ausência de raridade', () => {
  assert.throws(() => parseDeckText('warrior,archer,carta_futura'), /desconhecidas/i);
  assert.throws(() => parseDeckText('warrior,archer'), { message: DECK_REQUIREMENT_MESSAGE });
});

test('execução automática usa deck recomendado sem bloquear por entrada', async () => {
  assert.deepEqual(
    await selectDeckBeforeMatch({ args: [], interactive: false }),
    recommendedDeckCardIds(),
  );
});
