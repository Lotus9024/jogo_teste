import { GAME_CONFIG } from '@tronos/shared/game-config';
import { drawCard, grantRandomCard } from './createInitialState.js';
import { resolveEndingFires } from './combat.js';
import { fail } from './gameQueries.js';
import { healLevelTwoConstructions, refreshKingdomProgress } from './kingdomProgress.js';
import { builderEnergyBonus, damageAlliedConstructionsBesideGoblins } from './kingdomEffects.js';
import { applyRoyalTowerBlessing, finishSnowstormTurn } from './battleEffects.js';

export function requireTurn(state, player) {
  if (state.phase !== 'playing') fail('A partida ainda não começou.');
  if (state.activeSeat !== player.seat) fail('Aguarde o seu turno.');
}

export function endTurn(state) {
  const endingPlayer = state.players.find(item => item.seat === state.activeSeat);
  if ((endingPlayer?.pendingMageAltarChoices ?? 0) > 0) fail('Escolha uma carta do seu baralho pelo Altar Mago antes de passar o turno.');
  if (endingPlayer?.hand.length > GAME_CONFIG.maxHandSize) fail(`Jogue ou descarte até ficar com no máximo ${GAME_CONFIG.maxHandSize} cartas.`);
  resolveEndingFires(state, state.activeSeat);
  finishSnowstormTurn(state, state.activeSeat);
  state.activeSeat = state.activeSeat === 1 ? 2 : 1;
  if (state.activeSeat === 1) state.round += 1;
  let completedMageAltars = 0;
  let completedGoblinAltars = 0;
  const completedRoyalTowers = [];
  state.units.forEach(unit => {
    if (unit.underConstruction && unit.ownerSeat === state.activeSeat && unit.buildReadyRound <= state.round) {
      unit.underConstruction = false;
      if (unit.cardId === 'mage_altar') completedMageAltars += 1;
      if (unit.cardId === 'goblin_altar') completedGoblinAltars += 1;
      if (unit.cardId === 'royal_tower') completedRoyalTowers.push(unit);
    }
  });
  completedRoyalTowers.forEach(tower => applyRoyalTowerBlessing(state, tower));
  state.roads.forEach(road => {
    if (road.underConstruction && road.ownerSeat === state.activeSeat && road.buildReadyRound <= state.round) road.underConstruction = false;
  });
  refreshKingdomProgress(state);
  healLevelTwoConstructions(state, state.activeSeat);
  damageAlliedConstructionsBesideGoblins(state, state.activeSeat);
  refreshKingdomProgress(state);
  const player = state.players.find(item => item.seat === state.activeSeat);
  player.energy = Math.min(player.maxEnergy, player.energy + GAME_CONFIG.energyPerTurn + builderEnergyBonus(state, player.seat));
  drawCard(player, { round: state.round });
  player.pendingMageAltarChoices = (player.pendingMageAltarChoices ?? 0) + completedMageAltars;
  for (let index = 0; index < completedGoblinAltars; index += 1) {
    grantRandomCard(player, card => card.category === 'goblin');
  }
  state.units.filter(unit => unit.ownerSeat === state.activeSeat).forEach(unit => {
    unit.actionUsed = false;
    unit.movedThisTurn = false;
    unit.attackedThisTurn = false;
    unit.abilityUsed = false;
    unit.bonusMoves = 0;
    unit.bonusAttacks = 0;
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
