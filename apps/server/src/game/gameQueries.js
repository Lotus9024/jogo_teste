import { baseCellsForSeat, gridCellsBetween, isDeploymentCell } from '@tronos/shared/cards';
import { GAME_CONFIG } from '@tronos/shared/game-config';

export const fail = message => { throw new Error(message); };

export const distance = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.z - b.z);

export const turnIndex = state => (state.round - 1) * 2 + (state.activeSeat === 2 ? 1 : 0);

export const integer = value => Number.isInteger(value) ? value : fail('Coordenada inválida.');

export function playerById(state, playerId) {
  return state.players.find(player => player.id === playerId) ?? fail('Jogador inválido.');
}

export const baseCells = (seat, state = null) => {
  const level = state?.players?.find(player => player.seat === seat)?.baseLevel ?? 1;
  return baseCellsForSeat(seat, GAME_CONFIG.boardSize, level);
};

export function inBase(x, z, state = null) {
  return [1, 2].some(seat => baseCells(seat, state).some(cell => cell.x === x && cell.z === z));
}

export function validCell(x, z) {
  return x >= 0 && x < GAME_CONFIG.boardSize && z >= 0 && z < GAME_CONFIG.boardSize;
}

export function deploymentCell(seat, x, z, state = null) {
  const level = state?.players?.find(player => player.seat === seat)?.baseLevel ?? 1;
  return isDeploymentCell(seat, x, z, GAME_CONFIG.boardSize, level);
}

export const inBaseArea = (state, seat, x, z) => deploymentCell(seat, x, z, state);

export function unitsAt(state, x, z, excludeId = null) {
  return state.units.filter(unit => unit.id !== excludeId && unit.x === x && unit.z === z);
}

export function unitAt(state, x, z, excludeId = null) {
  return unitsAt(state, x, z, excludeId)[0];
}

export function unitBlocksLine(state, from, to, excludeId = null) {
  return gridCellsBetween(from, to).some(cell => unitAt(state, cell.x, cell.z, excludeId));
}
