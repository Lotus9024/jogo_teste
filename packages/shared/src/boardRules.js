import { CARD_BY_ID } from './cardCatalog.js';

export function movementDistance(movementType, from, to) {
  const dx = Math.abs(from.x - to.x), dz = Math.abs(from.z - to.z);
  if (movementType === 'straight') return dx === 0 || dz === 0 ? dx + dz : Number.POSITIVE_INFINITY;
  if (movementType === 'any') return Math.max(dx, dz);
  return dx + dz;
}

export function gridCellsBetween(from, to) {
  const dx = to.x - from.x, dz = to.z - from.z;
  const steps = Math.max(Math.abs(dx), Math.abs(dz));
  if (steps <= 1) return [];
  const cells = [], seen = new Set();
  for (let step = 1; step < steps; step += 1) {
    const x = Math.round(from.x + dx * step / steps);
    const z = Math.round(from.z + dz * step / steps);
    const key = `${x}:${z}`;
    if (!seen.has(key)) { seen.add(key); cells.push({ x, z }); }
  }
  return cells;
}

export function forwardDeltaForSeat(seat) {
  return { x: 0, z: seat === 1 ? -1 : 1 };
}

export function isCannonTargetValid(cannon, target) {
  const forward = forwardDeltaForSeat(cannon.ownerSeat);
  const step = forward.z ? (target.z - cannon.z) / forward.z : (target.x - cannon.x) / forward.x;
  return Number.isInteger(step)
    && step >= CARD_BY_ID.cannon.minAttackRange
    && step <= CARD_BY_ID.cannon.attackRange
    && target.x === cannon.x + forward.x * step
    && target.z === cannon.z + forward.z * step;
}

export function isAttackDistanceValid(card, value) {
  const minimum = card.minAttackRange ?? 1;
  return value >= minimum && value <= card.attackRange;
}

export function isAttackTargetValid(card, from, to) {
  const dx = Math.abs(from.x - to.x), dz = Math.abs(from.z - to.z);
  if (card.attackType === 'straight' && dx !== 0 && dz !== 0) return false;
  return isAttackDistanceValid(card, dx + dz);
}

export function baseCellsForSeat(seat, boardSize = 15, baseLevel = 1) {
  const centerX = Math.floor(boardSize / 2);
  const centerZ = seat === 1 ? boardSize - 2 : 1;
  const cells = [];
  const lateralRadius = baseLevel >= 2 ? 2 : 1;
  for (let x = centerX - lateralRadius; x <= centerX + lateralRadius; x += 1) {
    for (let z = centerZ - 1; z <= centerZ + 1; z += 1) cells.push({ x, z });
  }
  return cells;
}

export function deploymentDistance(seat, cell, boardSize = 15, baseLevel = 1) {
  return Math.min(...baseCellsForSeat(seat, boardSize, baseLevel).map(base => Math.abs(base.x - cell.x) + Math.abs(base.z - cell.z)));
}

export function isDeploymentCell(seat, x, z, boardSize = 15, baseLevel = 1) {
  if (![1, 2].includes(seat) || x < 0 || x >= boardSize || z < 0 || z >= boardSize) return false;
  const value = deploymentDistance(seat, { x, z }, boardSize, baseLevel);
  return value >= 1 && value <= 2;
}

export const ORTHOGONAL_DIRECTIONS = Object.freeze([
  Object.freeze({ x: 1, z: 0 }), Object.freeze({ x: -1, z: 0 }),
  Object.freeze({ x: 0, z: 1 }), Object.freeze({ x: 0, z: -1 })
]);

export const cellKey = (x, z) => `${x}:${z}`;
