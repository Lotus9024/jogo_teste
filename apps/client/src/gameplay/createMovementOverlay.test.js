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
