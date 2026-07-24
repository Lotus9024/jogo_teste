import test from 'node:test';
import assert from 'node:assert/strict';
import { cardCostText, cardMarkup, cards } from './cardView.js';
import { CARD_ICON_IDS, cardIconMarkup } from './cardIcon.js';
import { canUsePhysicalDeck } from './createDeckController.js';
import { createDevCardInstanceId } from './createDevCardGallery.js';

test('a carta exibe sua categoria logo abaixo do nome', () => {
  const markup = cardMarkup(cards.find(card => card.id === 'goblin_tower'), 0);
  assert.match(markup, /class="game-card[^"].*category-goblin/);
  assert.match(markup, /class="card-category">GOBLIN<\/small>/);
  assert.match(markup, /Cada Goblin seu[^]*\nQualquer Goblin/);
});

test('cada carta possui uma ilustração vetorial própria', () => {
  assert.equal(CARD_ICON_IDS.length, cards.length);
  assert.equal(new Set(CARD_ICON_IDS).size, cards.length);
  for (const card of cards) {
    const icon = cardIconMarkup(card);
    assert.match(icon, new RegExp(`data-card-icon="${card.id}"`));
    assert.match(icon, /<(?:svg|span)/);
  }
});

test('cartas escolhidas usam os novos desenhos licenciados do Game Icons', () => {
  const cannonIcon = cardIconMarkup(cards.find(card => card.id === 'cannon'));
  const goblinIcon = cardIconMarkup(cards.find(card => card.id === 'goblin'));
  assert.match(cannonIcon, /game-icons\/lorc\/cannon\.svg/);
  assert.match(goblinIcon, /game-icons\/caro-asercion\/goblin\.svg/);
  assert.match(cannonIcon, /card-illustration--game-icon/);
  assert.doesNotMatch(cannonIcon, /\sid=/);
});

test('todas as cartas usam tipografia mínima padronizada', () => {
  for (const card of cards) {
    const markup = cardMarkup(card, 0);
    const descriptionSize = Number(markup.match(/--desc-size:([\d.]+)px/)?.[1]);
    const abilitySize = Number(markup.match(/--ability-size:([\d.]+)px/)?.[1]);
    assert.ok(descriptionSize >= 7.5, `${card.id} reduziu demais a descrição`);
    assert.ok(abilitySize >= 7.5, `${card.id} reduziu demais a habilidade`);
  }
});

test('cartas com texto denso recebem automaticamente o modo de leitura ampliada', () => {
  for (const cardId of ['goblin_altar', 'mage', 'mage_altar', 'goblin_swarm', 'road', 'cobblestone_road', 'cannon', 'tower', 'henry']) {
    const card = cards.find(candidate => candidate.id === cardId);
    if (!card) continue;
    assert.match(cardMarkup(card, 0), /copy-readable/);
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

test('somente poderes acionáveis aparecem como habilidade da carta', () => {
  for (const cardId of ['goblin_house', 'goblin_tower', 'goblin_bomber', 'goblin_clone', 'mage', 'tower', 'goblin_altar', 'mage_altar']) {
    assert.notEqual(cards.find(card => card.id === cardId).ability, 'Nenhuma');
  }
  for (const cardId of ['henry', 'goblin', 'goblin_swarm', 'wooden_house', 'road']) {
    assert.equal(cards.find(card => card.id === cardId).ability, 'Nenhuma');
  }
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
