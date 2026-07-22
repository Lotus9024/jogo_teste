import { CARD_BY_ID, citizensForSeat, completedRoadCount } from '@tronos/shared/cards';
import { GAME_CONFIG } from '@tronos/shared/game-config';
import { createDeck } from './createInitialState.js';

export function refreshKingdomProgress(state) {
  state.players.forEach(player => {
    player.citizens = citizensForSeat(player.seat, state.units, state.roads, GAME_CONFIG.boardSize);
    if (player.baseLevel >= 2 || player.citizens < GAME_CONFIG.level2CitizenRequirement || completedRoadCount(player.seat, state.roads) < GAME_CONFIG.level2RoadRequirement) return;
    player.baseLevel = 2;
    player.maxEnergy = GAME_CONFIG.level2MaxEnergy;
    player.energy = Math.min(player.maxEnergy, player.energy + GAME_CONFIG.level2EnergyBonus);
    player.deck = createDeck(undefined, player.baseLevel, player.deck.length);
  });
}

export function healLevelTwoConstructions(state, seat) {
  const player = state.players.find(item => item.seat === seat);
  if (player?.baseLevel < 2 || state.round % 2 !== 0) return;
  state.units
    .filter(unit => unit.ownerSeat === seat && CARD_BY_ID[unit.cardId]?.type === 'construction' && !unit.underConstruction)
    .forEach(unit => {
      unit.hp = Math.min(CARD_BY_ID[unit.cardId].hp, unit.hp + 1);
    });
}
