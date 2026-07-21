import test from 'node:test';
import assert from 'node:assert/strict';
import { CARD_BY_ID } from '@tronos/shared/cards';
import { GAME_CONFIG } from '@tronos/shared/game-config';
import { createDeck, rarityForRoll } from '../src/game/createInitialState.js';

test('sorteia cartas comuns e incomuns na proporção de dois para um', () => {
  const rarityRolls = Array.from({ length: GAME_CONFIG.deckSize }, (_, index) => index % 3);
  let call = 0;
  const deck = createDeck(max => {
    const isRarityRoll = call % 2 === 0;
    const value = isRarityRoll ? rarityRolls[call / 2] : 0;
    call += 1;
    return value % max;
  });

  const rarities = deck.map(cardId => CARD_BY_ID[cardId].rarityClass);
  assert.equal(rarities.filter(rarity => rarity === 'common').length, 12);
  assert.equal(rarities.filter(rarity => rarity === 'uncommon').length, 6);
});

test('pode sortear qualquer carta dentro da raridade escolhida', () => {
  const calls = [2, 0, 2, 1, 2, 2];
  let call = 0;
  const deck = createDeck(max => calls[call++ % calls.length] % max);

  assert.deepEqual(deck.slice(0, 3), ['archer', 'tower', 'cannon']);
});

test('nível dois usa chances 60% comum, 30% incomum e 10% rara', () => {
  assert.deepEqual(Array.from({ length: 10 }, (_, roll) => rarityForRoll(2, roll)), [
    'common', 'common', 'common', 'common', 'common', 'common',
    'uncommon', 'uncommon', 'uncommon', 'rare'
  ]);
  let call = 0;
  const deck = createDeck(max => (call++ % 2 === 0 ? 9 : 0) % max, 2, 1);
  assert.deepEqual(deck, ['mage']);
});
