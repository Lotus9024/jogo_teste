import { CARD_BY_ID, citizensForSeat, completedRoadCount } from '@tronos/shared/cards';
import { GAME_CONFIG } from '@tronos/shared/game-config';
import { refreshBuilderResistance } from './kingdomEffects.js';

export function refreshKingdomProgress(state) {
  state.players.forEach(player => {
    player.citizens = citizensForSeat(player.seat, state.units, state.roads, GAME_CONFIG.boardSize, player.baseLevel);
    const qualifies = player.citizens >= GAME_CONFIG.level2CitizenRequirement
      && completedRoadCount(player.seat, state.roads) >= GAME_CONFIG.level2RoadRequirement;
    const nextLevel = qualifies ? 2 : 1;
    if (nextLevel === player.baseLevel) return;
    const upgraded = nextLevel > player.baseLevel;
    player.baseLevel = nextLevel;
    player.maxEnergy = upgraded ? GAME_CONFIG.level2MaxEnergy : GAME_CONFIG.maxEnergy;
    player.energy = Math.min(player.maxEnergy, player.energy + (upgraded ? GAME_CONFIG.level2EnergyBonus : 0));
  });
  refreshBuilderResistance(state);
}

export function healLevelTwoConstructions(state, seat) {
  const player = state.players.find(item => item.seat === seat);
  if (player?.baseLevel < 2 || state.round % 2 !== 0) return;
  state.units
    .filter(unit => unit.ownerSeat === seat && CARD_BY_ID[unit.cardId]?.type === 'construction' && !unit.underConstruction)
    .forEach(unit => {
      unit.hp = Math.min(unit.maxHp ?? CARD_BY_ID[unit.cardId].hp, unit.hp + 1);
    });
}
