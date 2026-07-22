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

test('arqueiro comum marca alvos atrás de barreiras, mas não atrás de tropas', () => {
  const scene = new THREE.Scene();
  const app = { dataset: {} };
  const source = unit('archer', 1, 5, 5);
  Object.assign(source.userData, { cardId: 'archer', move: 1, movementType: 'any', minAttackRange: 3, attackRange: 4 });
  const barrier = unit('barrier', 2, 5, 4);
  barrier.userData.cardId = 'wooden_barrier';
  const visibleEnemy = unit('visible-enemy', 2, 5, 2);
  const troop = unit('troop', 1, 6, 5);
  const hiddenEnemy = unit('hidden-enemy', 2, 8, 5);
  const units = [source, barrier, visibleEnemy, troop, hiddenEnemy];
  const overlay = createMovementOverlay({
    scene, app, units, tile: 1, half: 0,
    unitAtCell: (x, z, excluded) => units.find(candidate => candidate !== excluded && candidate.position.x === x && candidate.position.z === z),
    baseSeatAtCell: () => null,
    baseCellsForSeat: () => [],
    getRoads: () => [],
    getMatchContext: () => ({ onlineState: null, selfSeat: 1, devMode: true })
  });

  overlay.show(source);
  assert.equal(overlay.isInteractiveCell(5, 2), true);
  assert.equal(overlay.isInteractiveCell(8, 5), false);
  assert.equal(app.dataset.attackTiles, '1');
});

test('canhão marca o primeiro alvo, mas não casas depois dele', () => {
  const scene = new THREE.Scene();
  const app = { dataset: {} };
  const source = unit('cannon', 1, 5, 8);
  Object.assign(source.userData, { cardId: 'cannon', move: 1, movementType: 'forward', minAttackRange: 3, attackRange: 6, damage: 3, areaRadius: 1 });
  const operator = unit('operator', 1, 5, 9);
  operator.userData.cardId = 'operator';
  const blocker = unit('blocker', 1, 5, 4);
  const units = [source, operator, blocker];
  const overlay = createMovementOverlay({
    scene, app, units, tile: 1, half: 0,
    unitAtCell: (x, z, excluded) => units.find(candidate => candidate !== excluded && candidate.position.x === x && candidate.position.z === z),
    baseSeatAtCell: () => null,
    baseCellsForSeat: () => [],
    getRoads: () => [],
    getMatchContext: () => ({ onlineState: { state: { activeSeat: 1 } }, selfSeat: 1, devMode: false })
  });

  overlay.show(source);
  assert.equal(overlay.isInteractiveCell(5, 5), true);
  assert.equal(overlay.isInteractiveCell(5, 4), true);
  assert.equal(overlay.isInteractiveCell(5, 3), false);
  assert.equal(overlay.isInteractiveCell(5, 2), false);
  assert.equal(app.dataset.movementTiles, '1');
  assert.equal(app.dataset.attackTiles, '2');
});

test('Henry esconde somente a ação que já utilizou', () => {
  const scene = new THREE.Scene();
  const app = { dataset: {} };
  const source = unit('henry', 1, 5, 5);
  Object.assign(source.userData, { cardId: 'henry', move: 1, movementType: 'any', minAttackRange: 1, attackRange: 1, damage: 1, movedThisTurn: true, attackedThisTurn: false });
  const enemy = unit('enemy', 2, 6, 5);
  const units = [source, enemy];
  const overlay = createMovementOverlay({
    scene, app, units, tile: 1, half: 0,
    unitAtCell: (x, z, excluded) => units.find(candidate => candidate !== excluded && candidate.position.x === x && candidate.position.z === z),
    baseSeatAtCell: () => null,
    baseCellsForSeat: () => [],
    getRoads: () => [],
    getMatchContext: () => ({ onlineState: { state: { activeSeat: 1 } }, selfSeat: 1, devMode: false })
  });

  overlay.show(source);
  assert.equal(app.dataset.movementTiles, '0');
  assert.equal(app.dataset.attackTiles, '1');

  source.userData.movedThisTurn = false;
  source.userData.attackedThisTurn = true;
  overlay.show(source);
  assert.ok(Number(app.dataset.movementTiles) > 0);
  assert.equal(app.dataset.attackTiles, '0');
});
