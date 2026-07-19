import { GAME_CONFIG } from '@tronos/shared/game-config';

export function createInitialState(players) {
  return {
    version: 1,
    phase: players.length === GAME_CONFIG.maxPlayers ? 'playing' : 'waiting',
    round: 1,
    activeSeat: 1,
    turnEndsAt: players.length === GAME_CONFIG.maxPlayers ? Date.now() + GAME_CONFIG.turnDurationSeconds * 1000 : null,
    players: players.map(player => ({
      id: player.id,
      name: player.name,
      seat: player.seat,
      connected: true,
      baseHp: GAME_CONFIG.startingBaseHp,
      energy: GAME_CONFIG.startingEnergy,
      hand: [],
      deckCount: 28
    })),
    units: [],
    board: { size: GAME_CONFIG.boardSize }
  };
}
