import { ACTION_HANDLERS } from './actions/index.js';
import { fail, playerById } from './gameQueries.js';
import { refreshKingdomProgress } from './kingdomProgress.js';
import { endTurn } from './turnLifecycle.js';

export function applyGameAction(state, playerId, action, expectedVersion) {
  if (!action || typeof action !== 'object' || typeof action.type !== 'string') fail('Ação inválida.');
  if (expectedVersion !== state.version) fail('O estado da partida mudou. Tente novamente.');
  const player = playerById(state, playerId);
  const opponent = state.players.find(item => item.seat !== player.seat);
  if (!Object.hasOwn(ACTION_HANDLERS, action.type)) fail('Ação não reconhecida.');
  const handler = ACTION_HANDLERS[action.type];

  const previousEffects = state.effects ?? [];
  state.effects = [];
  try {
    handler(state, player, opponent, action);
  } catch (error) {
    state.effects = previousEffects;
    throw error;
  }
  refreshKingdomProgress(state);
  state.version += 1;
  return state;
}

export function applyTurnTimeout(state) {
  if (state.phase !== 'playing' || !state.turnEndsAt || Date.now() < state.turnEndsAt) return false;
  state.effects = [];
  endTurn(state);
  state.version += 1;
  return true;
}
