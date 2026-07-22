import { GAME_CONFIG } from '@tronos/shared/game-config';
import { drawCard } from './createInitialState.js';
import { resolveEndingFires } from './combat.js';
import { fail } from './gameQueries.js';
import { healLevelTwoConstructions, refreshKingdomProgress } from './kingdomProgress.js';
import { builderEnergyBonus } from './kingdomEffects.js';

export function requireTurn(state, player) {
  if (state.phase !== 'playing') fail('A partida ainda não começou.');
  if (state.activeSeat !== player.seat) fail('Aguarde o seu turno.');
}

export function endTurn(state) {
  const endingPlayer = state.players.find(item => item.seat === state.activeSeat);
  if (endingPlayer?.hand.length > GAME_CONFIG.maxHandSize) fail(`Jogue ou descarte até ficar com no máximo ${GAME_CONFIG.maxHandSize} cartas.`);
  resolveEndingFires(state, state.activeSeat);
  state.activeSeat = state.activeSeat === 1 ? 2 : 1;
  if (state.activeSeat === 1) state.round += 1;
  state.units.forEach(unit => {
    if (unit.underConstruction && unit.ownerSeat === state.activeSeat && unit.buildReadyRound <= state.round) unit.underConstruction = false;
  });
  state.roads.forEach(road => {
    if (road.underConstruction && road.ownerSeat === state.activeSeat && road.buildReadyRound <= state.round) road.underConstruction = false;
  });
  refreshKingdomProgress(state);
  healLevelTwoConstructions(state, state.activeSeat);
  const player = state.players.find(item => item.seat === state.activeSeat);
  player.energy = Math.min(player.maxEnergy, player.energy + GAME_CONFIG.energyPerTurn + builderEnergyBonus(state, player.seat));
  drawCard(player, { round: state.round });
  state.units.filter(unit => unit.ownerSeat === state.activeSeat).forEach(unit => {
    unit.actionUsed = false;
    unit.movedThisTurn = false;
    unit.attackedThisTurn = false;
    unit.abilityUsed = false;
    unit.bonusMoves = 0;
    unit.shield = 0;
  });
  state.units.forEach(unit => {
    if ((unit.attackPenaltyUntilTurn ?? 0) <= ((state.round - 1) * 2 + (state.activeSeat === 2 ? 1 : 0))) {
      unit.attackPenalty = 0;
      unit.attackPenaltyUntilTurn = 0;
    }
  });
  state.turnEndsAt = Date.now() + GAME_CONFIG.turnDurationSeconds * 1000;
}
