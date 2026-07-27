import test from 'node:test';
import assert from 'node:assert/strict';
import { cardCostText, cardMarkup, cards } from './cardView.js';
import { CARD_ICON_IDS, cardIconMarkup, cardSymbolMarkup } from './cardIcon.js';
import { canUsePhysicalDeck } from './createDeckController.js';
import { createDevCardInstanceId } from './createDevCardGallery.js';
import { deckBuilderTemplate } from './shell/deckBuilderTemplate.js';

test('a carta exibe sua categoria logo abaixo do nome', () => {
  const markup = cardMarkup(cards.find(card => card.id === 'goblin_tower'), 0);
  assert.match(markup, /class="game-card[^"].*category-goblin/);
  assert.match(markup, /class="card-category"><i class="card-category-symbol"[^>]*>[^<]+<\/i>GOBLIN<\/small>/);
  assert.match(markup, /Goblins que nascem ao lado[^]*\nNecessita de 2 Goblins/);
});

test('todas as cartas exibem um símbolo junto à categoria', () => {
  for (const [index, card] of cards.entries()) {
    assert.match(
      cardMarkup(card, index),
      /class="card-category-symbol"[^>]*>[^<]+<\/i>/,
      `${card.id} ficou sem símbolo`,
    );
  }
});

test('todas as cartas possuem um selo de símbolo visível na arte', () => {
  for (const card of cards) {
    const symbol = cardSymbolMarkup(card);
    assert.match(symbol, new RegExp(`data-card-symbol="${card.id}"`));
    assert.doesNotMatch(symbol, />\\?</);
    assert.match(cardMarkup(card, 0), new RegExp(`data-card-symbol="${card.id}"`));
  }
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

test('somente cartas com texto denso recebem automaticamente o modo de leitura ampliada', () => {
  for (const card of cards) {
    const dense = card.description.length > 115 || card.abilityText.length > 150;
    if (dense) assert.match(cardMarkup(card, 0), /copy-readable/, `${card.id} deveria ampliar a leitura`);
    else assert.doesNotMatch(cardMarkup(card, 0), /copy-readable/, `${card.id} não precisa ampliar a leitura`);
  }
});

test('máquinas exibem vida como Resistência nas cartas', () => {
  const markup = cardMarkup(cards.find(card => card.id === 'cannon'), 0);
  assert.match(markup, /aria-label="Resistência"/);
});

test('Torre Real mostra dano e Nevasca não exibe atributos inexistentes', () => {
  const towerMarkup = cardMarkup(cards.find(card => card.id === 'royal_tower'), 0);
  assert.match(towerMarkup, /aria-label="Dano"[^]*<b>5<\/b>/);
  const blizzardMarkup = cardMarkup(cards.find(card => card.id === 'blizzard'), 0);
  assert.doesNotMatch(blizzardMarkup, />null</);
  assert.doesNotMatch(blizzardMarkup, /aria-label="Vida"/);
  assert.match(blizzardMarkup, /aria-label="Alcance"[^]*<b>∞<\/b>/);
});

test('construções omitem atributos zerados e cartas passivas omitem habilidade', () => {
  const houseMarkup = cardMarkup(cards.find(card => card.id === 'wooden_house'), 0);
  assert.doesNotMatch(houseMarkup, /aria-label="Dano"/);
  assert.doesNotMatch(houseMarkup, /aria-label="Movimento"/);
  assert.doesNotMatch(houseMarkup, /class="card-ability"/);
  assert.match(houseMarkup, /class="game-card[^"]* no-ability/);
  const towerMarkup = cardMarkup(cards.find(card => card.id === 'tower'), 0);
  assert.doesNotMatch(towerMarkup, /(?:Aperte|Pressione)\s+F/i);
});

test('descrições de habilidades não repetem instruções de teclado', () => {
  for (const card of cards) {
    assert.doesNotMatch(card.abilityText, /(?:Aperte|Pressione)\s+F/i);
    assert.doesNotMatch(cardMarkup(card, 0), /(?:Aperte|Pressione)\s+F/i);
  }
});

test('carta com buff exibe o custo efetivo e o desconto aplicado', () => {
  const goblin = cards.find(card => card.id === 'goblin');
  assert.equal(cardCostText({ ...goblin, baseCost: 2, effectiveCost: 1 }), '1 (-1)');
  assert.match(cardMarkup({ ...goblin, baseCost: 2, effectiveCost: 1 }, 0), /<b>1<\/b><small class="card-cost-discount">\(-1\)<\/small>/);
  assert.equal(cardCostText(goblin), '2');
  const clone = cards.find(card => card.id === 'goblin_clone');
  assert.equal(cardCostText(clone), '—');
  assert.equal(cardCostText({ ...clone, baseCost: 6, effectiveCost: 6 }), '6');
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

test('seletor de Deck mostra raridades atuais e reservas futuras', () => {
  const markup = deckBuilderTemplate();
  assert.match(markup, /data-deck-rarity="common"[^]*data-deck-count="common">0\/7/);
  assert.match(markup, /data-deck-rarity="uncommon"[^]*data-deck-count="uncommon">0\/5/);
  assert.match(markup, /data-deck-rarity="rare"[^]*data-deck-count="rare">0\/3/);
  assert.match(markup, /data-deck-rarity="legendary"[^]*data-deck-count="legendary">0\/0[^]*Futuro: 2 cartas/);
  assert.match(markup, /data-deck-rarity="mystic"[^]*data-deck-count="mystic">0\/0[^]*Futuro: 1 carta/);
});
