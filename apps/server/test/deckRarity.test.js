import test from 'node:test';
import assert from 'node:assert/strict';
import { CARD_BY_ID } from '@tronos/shared/cards';
import { GAME_CONFIG } from '@tronos/shared/game-config';
import { createDeck, drawCard, rarityForRoll, weightedCardForRarity } from '../src/game/createInitialState.js';

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

  assert.deepEqual(deck.slice(0, 3), ['henry', 'archer', 'tower']);
});

test('nível dois usa chances 50% comum, 30% incomum e 20% rara', () => {
  assert.deepEqual(Array.from({ length: 20 }, (_, roll) => rarityForRoll(2, roll)), [
    ...Array(10).fill('common'), ...Array(6).fill('uncommon'), ...Array(4).fill('rare')
  ]);
  let call = 0;
  const deck = createDeck(max => (call++ % 2 === 0 ? 19 : 1) % max, 2, 1);
  assert.deepEqual(deck, ['mage']);
});

test('renova o baralho quando ele acaba e continua comprando cartas', () => {
  const player = { baseLevel: 2, hand: [], deck: [] };
  assert.equal(drawCard(player), true);
  assert.equal(player.hand.length, 1);
  assert.equal(player.deck.length, GAME_CONFIG.deckSize - 1);
  assert.ok(CARD_BY_ID[player.hand[0].cardId]);
});

test('reduz o peso de Operador conforme a quantidade presente na mão', () => {
  const totals = [];
  const random = max => { totals.push(max); return 0; };
  weightedCardForRarity('common', { hand: [] }, 4, random);
  weightedCardForRarity('common', { hand: [{ cardId: 'operator' }] }, 4, random);
  weightedCardForRarity('common', { hand: [{ cardId: 'operator' }, { cardId: 'operator' }] }, 4, random);
  const [base, oneOperator, twoOperators] = totals;
  assert.equal(oneOperator, base - 10);
  assert.equal(twoOperators, base - 30);
});

test('aumenta o peso da Casa em 25% a partir da rodada cinco até ela ser comprada', () => {
  const totals = [];
  const player = { hand: [], hasDrawnHouse: false };
  const random = max => { totals.push(max); return 0; };
  weightedCardForRarity('common', player, 4, random);
  weightedCardForRarity('common', player, 5, random);
  player.hasDrawnHouse = true;
  weightedCardForRarity('common', player, 6, random);
  const [base, protectedFromBadLuck, afterDrawingHouse] = totals;
  assert.equal(protectedFromBadLuck, base + 25);
  assert.equal(afterDrawingHouse, base);
});

test('comprar Casa encerra o bônus de proteção contra azar', () => {
  const rolls = [0, 500];
  const player = { baseLevel: 1, hand: [], deck: ['slot'], hasDrawnHouse: false };
  assert.equal(drawCard(player, { round: 5, random: () => rolls.shift() }), true);
  assert.equal(player.hand[0].cardId, 'wooden_house');
  assert.equal(player.hasDrawnHouse, true);
});
