import { randomInt, randomUUID } from 'node:crypto';
import { CARD_DEFINITIONS } from '@tronos/shared/cards';
import { GAME_CONFIG } from '@tronos/shared/game-config';

const CARDS_BY_RARITY = Object.freeze({
  common: Object.freeze(CARD_DEFINITIONS.filter(card => card.rarityClass === 'common')),
  uncommon: Object.freeze(CARD_DEFINITIONS.filter(card => card.rarityClass === 'uncommon')),
  rare: Object.freeze(CARD_DEFINITIONS.filter(card => card.rarityClass === 'rare'))
});

export function rarityForRoll(level, roll) {
  if (level >= 2) return roll < 6 ? 'common' : roll < 9 ? 'uncommon' : 'rare';
  return roll < 2 ? 'common' : 'uncommon';
}

export function createDeck(random = randomInt, level = 1, size = GAME_CONFIG.deckSize) {
  const sides = level >= 2 ? 10 : 3;
  return Array.from({ length: size }, () => {
    const rarity = rarityForRoll(level, random(sides));
    const pool = CARDS_BY_RARITY[rarity].length ? CARDS_BY_RARITY[rarity] : CARDS_BY_RARITY.uncommon;
    return pool[random(pool.length)].id;
  });
}

export function drawCard(player) {
  if (player.hand.length >= GAME_CONFIG.maxHandSize || !player.deck.length) return false;
  player.hand.push({ instanceId: randomUUID(), cardId: player.deck.shift() });
  return true;
}

export function createInitialState(players) {
  const ready = players.length === GAME_CONFIG.maxPlayers;
  const statePlayers = players.map(player => ({
    id: player.id, name: player.name, seat: player.seat, connected: true,
    baseHp: GAME_CONFIG.startingBaseHp, energy: GAME_CONFIG.startingEnergy, maxEnergy: GAME_CONFIG.maxEnergy,
    citizens: 0, baseLevel: 1,
    hand: [], deck: createDeck(), discard: []
  }));
  if (ready) statePlayers.forEach(player => {
    for (let index = 0; index < GAME_CONFIG.startingHandSize; index += 1) drawCard(player);
  });
  return {
    version: 1, phase: ready ? 'playing' : 'waiting', round: 1, activeSeat: 1,
    turnEndsAt: ready ? Date.now() + GAME_CONFIG.turnDurationSeconds * 1000 : null,
    winnerSeat: null, players: statePlayers, units: [], roads: [], board: { size: GAME_CONFIG.boardSize }
  };
}
