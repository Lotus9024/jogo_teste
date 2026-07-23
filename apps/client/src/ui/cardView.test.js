import test from 'node:test';
import assert from 'node:assert/strict';
import { cardMarkup, cards } from './cardView.js';
import { canUsePhysicalDeck } from './createDeckController.js';

test('a carta exibe sua categoria logo abaixo do nome', () => {
  const markup = cardMarkup(cards.find(card => card.id === 'goblin_tower'), 0);
  assert.match(markup, /class="game-card[^"].*category-goblin/);
  assert.match(markup, /class="card-category">GOBLIN<\/small>/);
  assert.match(markup, /Cada Goblin seu[^]*\nQualquer Goblin/);
});

test('máquinas exibem vida como Resistência nas cartas', () => {
  const markup = cardMarkup(cards.find(card => card.id === 'cannon'), 0);
  assert.match(markup, /aria-label="Resistência"/);
});

test('DEV MODE pode abrir a galeria por qualquer baralho físico', () => {
  const ownDeck = { userData: { ownerSeat: 1 } };
  const enemyDeck = { userData: { ownerSeat: 2 } };
  assert.equal(canUsePhysicalDeck({ devMode: true }, ownDeck, 1), true);
  assert.equal(canUsePhysicalDeck({ devMode: true }, enemyDeck, 1), true);
  assert.equal(canUsePhysicalDeck({ devMode: false }, ownDeck, 1), true);
  assert.equal(canUsePhysicalDeck({ devMode: false }, enemyDeck, 1), false);
});
