import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createMovementOverlay } from './createMovementOverlay.js';

function unit(id, ownerSeat, x, z) {
  const object = new THREE.Group();
  object.position.set(x, 0, z);
  object.userData = {
    serverUnitId: id, ownerSeat, cardId: 'warrior', move: 2, movementType: 'straight',
    minAttackRange: 1, attackRange: 2, damage: 2, actionUsed: false, underConstruction: false
  };
  return object;
}

test('casas ocupadas ou atrás de uma tropa não recebem marca verde nem vermelha', () => {
  const scene = new THREE.Scene();
  const app = { dataset: {} };
  const source = unit('source', 1, 5, 5);
  const blocker = unit('blocker', 1, 6, 5);
  const hiddenEnemy = unit('enemy', 2, 7, 5);
  const units = [source, blocker, hiddenEnemy];
  const overlay = createMovementOverlay({
    scene, app, units, tile: 1, half: 0,
    unitAtCell: (x, z, excluded) => units.find(candidate => candidate !== excluded && candidate.position.x === x && candidate.position.z === z),
    baseSeatAtCell: () => null,
    baseCellsForSeat: () => [],
    getRoads: () => [],
    getMatchContext: () => ({ onlineState: null, selfSeat: 1, devMode: true })
  });

  overlay.show(source);
  assert.equal(overlay.isInteractiveCell(6, 5), false);
  assert.equal(overlay.isInteractiveCell(7, 5), false);
  assert.equal(app.dataset.attackTiles, '0');
});

test('arqueiro montado marca alvos e castelo mesmo com uma unidade à frente', () => {
  const scene = new THREE.Scene();
  const app = { dataset: {} };
  const source = unit('mounted-archer', 1, 5, 5);
  Object.assign(source.userData, { cardId: 'archer', move: 1, movementType: 'any', minAttackRange: 3, attackRange: 5, mountedOnTowerId: 'tower-1' });
  const tower = unit('tower-1', 1, 5, 5);
  tower.userData.cardId = 'tower';
  const blocker = unit('blocker', 1, 5, 4);
  const enemy = unit('enemy', 2, 5, 2);
  const units = [source, tower, blocker, enemy];
  const overlay = createMovementOverlay({
    scene, app, units, tile: 1, half: 0,
    unitAtCell: (x, z, excluded) => units.find(candidate => candidate !== excluded && candidate.position.x === x && candidate.position.z === z),
    baseSeatAtCell: () => null,
    baseCellsForSeat: seat => seat === 2 ? [{ x: 6, z: 2 }] : [],
    getRoads: () => [],
    getMatchContext: () => ({ onlineState: { state: { activeSeat: 1 } }, selfSeat: 1, devMode: false })
  });

  overlay.show(source);
  assert.equal(overlay.isInteractiveCell(5, 2), true);
  assert.equal(overlay.isInteractiveCell(6, 2), true);
  assert.equal(app.dataset.movementTiles, '0');
  assert.equal(app.dataset.attackTiles, '2');
});

test('canhão marca disparos mesmo com uma unidade à frente', () => {
  const scene = new THREE.Scene();
  const app = { dataset: {} };
  const source = unit('cannon', 1, 5, 8);
  Object.assign(source.userData, { cardId: 'cannon', move: 1, movementType: 'forward', minAttackRange: 3, attackRange: 6, damage: 4, areaRadius: 2 });
  const operator = unit('operator', 1, 5, 9);
  operator.userData.cardId = 'operator';
  const blocker = unit('blocker', 1, 5, 7);
  const enemy = unit('enemy', 2, 5, 4);
  const units = [source, operator, blocker, enemy];
  const overlay = createMovementOverlay({
    scene, app, units, tile: 1, half: 0,
    unitAtCell: (x, z, excluded) => units.find(candidate => candidate !== excluded && candidate.position.x === x && candidate.position.z === z),
    baseSeatAtCell: () => null,
    baseCellsForSeat: () => [],
    getRoads: () => [],
    getMatchContext: () => ({ onlineState: { state: { activeSeat: 1 } }, selfSeat: 1, devMode: false })
  });

  overlay.show(source);
  assert.equal(overlay.isInteractiveCell(5, 4), true);
  assert.equal(overlay.isInteractiveCell(5, 2), true);
  assert.equal(app.dataset.movementTiles, '0');
  assert.equal(app.dataset.attackTiles, '4');
});
