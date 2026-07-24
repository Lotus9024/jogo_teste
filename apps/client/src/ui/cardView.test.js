import test from 'node:test';
import assert from 'node:assert/strict';
import { cardCostText, cardMarkup, cards } from './cardView.js';
import { canUsePhysicalDeck } from './createDeckController.js';
import { createDevCardInstanceId } from './createDevCardGallery.js';

test('a carta exibe sua categoria logo abaixo do nome', () => {
  const markup = cardMarkup(cards.find(card => card.id === 'goblin_tower'), 0);
  assert.match(markup, /class="game-card[^"].*category-goblin/);
  assert.match(markup, /class="card-category">GOBLIN<\/small>/);
  assert.match(markup, /Cada Goblin seu[^]*\nQualquer Goblin/);
});

test('cartas com texto denso recebem o modo de leitura ampliada', () => {
  for (const cardId of ['goblin_altar', 'mage', 'mage_altar', 'goblin_swarm', 'road', 'cannon', 'tower', 'henry']) {
    const markup = cardMarkup(cards.find(card => card.id === cardId), 0);
    assert.match(markup, /copy-readable/);
    const size = Number(markup.match(/--desc-size:([\d.]+)px/)?.[1]);
    assert.ok(size >= 7.5);
  }
});

test('máquinas exibem vida como Resistência nas cartas', () => {
  const markup = cardMarkup(cards.find(card => card.id === 'cannon'), 0);
  assert.match(markup, /aria-label="Resistência"/);
});

test('carta com buff exibe o custo efetivo e o desconto aplicado', () => {
  const goblin = cards.find(card => card.id === 'goblin');
  assert.equal(cardCostText({ ...goblin, baseCost: 2, effectiveCost: 1 }), '1 (-1)');
  assert.match(cardMarkup({ ...goblin, baseCost: 2, effectiveCost: 1 }, 0), /<b>1<\/b><small class="card-cost-discount">\(-1\)<\/small>/);
  assert.equal(cardCostText(goblin), '2');
});

test('DEV MODE pode abrir a galeria por qualquer baralho físico', () => {
  const ownDeck = { userData: { ownerSeat: 1 } };
  const enemyDeck = { userData: { ownerSeat: 2 } };
  assert.equal(canUsePhysicalDeck({ devMode: true }, ownDeck, 1), true);
  assert.equal(canUsePhysicalDeck({ devMode: true }, enemyDeck, 1), true);
  assert.equal(canUsePhysicalDeck({ devMode: false }, ownDeck, 1), true);
  assert.equal(canUsePhysicalDeck({ devMode: false }, enemyDeck, 1), false);
});

test('DEV MODE cria uma instância de carta mesmo sem randomUUID na rede local', () => {
  const instanceId = createDevCardInstanceId({});
  assert.match(instanceId, /^dev-[a-z0-9]+-[a-z0-9]+$/);
});
