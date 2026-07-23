import { randomInt, randomUUID } from 'node:crypto';
import { CARD_DEFINITIONS, DEFAULT_DECK_CARD_IDS } from '@tronos/shared/cards';
import { GAME_CONFIG } from '@tronos/shared/game-config';

const CARDS_BY_RARITY = Object.freeze({
  common: Object.freeze(CARD_DEFINITIONS.filter(card => card.rarityClass === 'common')),
  uncommon: Object.freeze(CARD_DEFINITIONS.filter(card => card.rarityClass === 'uncommon')),
  rare: Object.freeze(CARD_DEFINITIONS.filter(card => card.rarityClass === 'rare'))
});

const BASE_CARD_WEIGHT = 100;

function cardWeight(card, player, round) {
  if (card.id === 'operator') {
    const operatorsInHand = player.hand.filter(instance => instance.cardId === 'operator').length;
    if (operatorsInHand >= 2) return 70;
    if (operatorsInHand === 1) return 90;
  }
  if (card.id === 'wooden_house' && round >= 5 && !player.hasDrawnHouse) return 125;
  return BASE_CARD_WEIGHT;
}

export function weightedCardForRarity(rarity, player, round = 1, random = randomInt) {
  const allowed = new Set(player.deckCardIds?.length ? player.deckCardIds : DEFAULT_DECK_CARD_IDS);
  const rarityPool = CARDS_BY_RARITY[rarity].filter(card => allowed.has(card.id));
  const fallbackPool = CARD_DEFINITIONS.filter(card => allowed.has(card.id));
  const pool = rarityPool.length ? rarityPool : fallbackPool;
  const weighted = pool.map(card => ({ card, weight: cardWeight(card, player, round) }));
  const total = weighted.reduce((sum, item) => sum + item.weight, 0);
  let roll = random(total);
  for (const item of weighted) {
    if (roll < item.weight) return item.card.id;
    roll -= item.weight;
  }
  return weighted.at(-1).card.id;
}

export function rarityForRoll(level, roll) {
  if (level >= 2) return roll < 10 ? 'common' : roll < 16 ? 'uncommon' : 'rare';
  return roll < 2 ? 'common' : 'uncommon';
}

export function createDeck(random = randomInt, level = 1, size = GAME_CONFIG.deckSize, deckCardIds = DEFAULT_DECK_CARD_IDS) {
  const allowed = new Set(deckCardIds);
  const sides = level >= 2 ? 20 : 3;
  return Array.from({ length: size }, () => {
    const rarity = rarityForRoll(level, random(sides));
    const rarityPool = CARDS_BY_RARITY[rarity].filter(card => allowed.has(card.id));
    const fallbackPool = CARD_DEFINITIONS.filter(card => allowed.has(card.id));
    const pool = rarityPool.length ? rarityPool : fallbackPool;
    return pool[random(pool.length)].id;
  });
}

export function drawCard(player, { round = 1, random = randomInt } = {}) {
  if (player.hand.length >= GAME_CONFIG.maxHandSize) return false;
  if (!player.deck.length) player.deck = createDeck(random, player.baseLevel ?? 1, GAME_CONFIG.deckSize, player.deckCardIds);
  player.deck.shift();
  const level = player.baseLevel ?? 1;
  const sides = level >= 2 ? 20 : 3;
  const rarity = rarityForRoll(level, random(sides));
  const cardId = weightedCardForRarity(rarity, player, round, random);
  player.hand.push({ instanceId: randomUUID(), cardId });
  if (cardId === 'wooden_house') player.hasDrawnHouse = true;
  return true;
}

export function grantRandomCard(player, predicate, random = randomInt) {
  const allowed = new Set(player.deckCardIds?.length ? player.deckCardIds : DEFAULT_DECK_CARD_IDS);
  const preferred = CARD_DEFINITIONS.filter(card => allowed.has(card.id) && predicate(card));
  const pool = preferred.length ? preferred : CARD_DEFINITIONS.filter(predicate);
  if (!pool.length) return false;
  player.hand.push({ instanceId: randomUUID(), cardId: pool[random(pool.length)].id });
  return true;
}

export function createInitialState(players) {
  const ready = players.length === GAME_CONFIG.maxPlayers;
  const statePlayers = players.map(player => ({
    id: player.id, name: player.name, seat: player.seat, connected: true,
    baseHp: GAME_CONFIG.startingBaseHp, energy: GAME_CONFIG.startingEnergy, maxEnergy: GAME_CONFIG.maxEnergy,
    citizens: 0, baseLevel: 1, hasDrawnHouse: false, pendingMageAltarChoices: 0,
    deckCardIds: [...(player.deckCardIds?.length ? player.deckCardIds : DEFAULT_DECK_CARD_IDS)],
    hand: [], deck: createDeck(randomInt, 1, GAME_CONFIG.deckSize, player.deckCardIds?.length ? player.deckCardIds : DEFAULT_DECK_CARD_IDS), discard: []
  }));
  if (ready) statePlayers.forEach(player => {
    for (let index = 0; index < GAME_CONFIG.startingHandSize; index += 1) drawCard(player, { round: 1 });
  });
  return {
    version: 1, phase: ready ? 'playing' : 'waiting', round: 1, activeSeat: 1,
    turnEndsAt: ready ? Date.now() + GAME_CONFIG.turnDurationSeconds * 1000 : null,
    winnerSeat: null, players: statePlayers, units: [], roads: [], fires: [], board: { size: GAME_CONFIG.boardSize }
  };
}
