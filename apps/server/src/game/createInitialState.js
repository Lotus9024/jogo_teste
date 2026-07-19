import { randomInt, randomUUID } from 'node:crypto';
import { CARD_DEFINITIONS } from '@tronos/shared/cards';
import { GAME_CONFIG } from '@tronos/shared/game-config';

function shuffledDeck() {
  const deck = Array.from({ length: GAME_CONFIG.deckSize }, (_, index) => CARD_DEFINITIONS[index % CARD_DEFINITIONS.length].id);
  for (let index = deck.length - 1; index > 0; index -= 1) {
    const swap = randomInt(index + 1);
    [deck[index], deck[swap]] = [deck[swap], deck[index]];
  }
  return deck;
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
    baseHp: GAME_CONFIG.startingBaseHp, energy: GAME_CONFIG.startingEnergy,
    hand: [], deck: shuffledDeck(), discard: []
  }));
  if (ready) statePlayers.forEach(player => {
    for (let index = 0; index < GAME_CONFIG.startingHandSize; index += 1) drawCard(player);
  });
  return {
    version: 1, phase: ready ? 'playing' : 'waiting', round: 1, activeSeat: 1,
    turnEndsAt: ready ? Date.now() + GAME_CONFIG.turnDurationSeconds * 1000 : null,
    winnerSeat: null, players: statePlayers, units: [], board: { size: GAME_CONFIG.boardSize }
  };
}
