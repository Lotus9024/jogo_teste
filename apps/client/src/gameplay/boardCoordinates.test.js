import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createBoardCoordinates } from './boardCoordinates.js';
import { createDeploymentOverlay } from './createDeploymentOverlay.js';
import { devBaseLevelForProgress } from './createDevModeController.js';

test('converte posições e identifica casas ocupadas e bases', () => {
  const tile = 1.08;
  const half = 7.56;
  const unit = { position: new THREE.Vector3(2 * tile - half, 0, 9 * tile - half) };
  const coordinates = createBoardCoordinates({ getUnits: () => [unit], tile, half });

  assert.equal(coordinates.unitAtCell(2, 9), unit);
  assert.equal(coordinates.unitAtCell(2, 9, unit), null);
  assert.equal(coordinates.baseSeatAtCell(7, 1), 2);
  assert.equal(coordinates.baseSeatAtCell(7, 13), 1);
  assert.equal(coordinates.baseSeatAtCell(4, 13), null);
  assert.equal(coordinates.baseCellsForSeat(1).length, 9);
  assert.equal(coordinates.snapToTile(2 * tile - half + 0.1), 2 * tile - half);
});

test('DEV MODE evolui automaticamente com os mesmos requisitos da partida', () => {
  assert.equal(devBaseLevelForProgress({ currentLevel: 1, citizens: 7, completedRoads: 1 }), 1);
  assert.equal(devBaseLevelForProgress({ currentLevel: 1, citizens: 8, completedRoads: 1 }), 2);
  assert.equal(devBaseLevelForProgress({
    currentLevel: 4,
    citizens: 0,
    completedRoads: 0,
    manual: true,
  }), 4);
});

test('marcação colorida usa a expansão lateral do nível dois no DEV MODE', () => {
  const scene = new THREE.Scene();
  const levels = { 1: 1, 2: 1 };
  const overlay = createDeploymentOverlay({
    scene,
    tile: 1,
    half: 7,
    getBaseLevel: seat => levels[seat],
  });
  overlay.show(1);
  assert.equal(scene.children.some(marker => (
    marker.userData.deploymentSeat === 1 && marker.userData.x === 3 && marker.userData.z === 13
  )), false);

  levels[1] = 2;
  overlay.show(1);
  assert.equal(scene.children.some(marker => (
    marker.userData.deploymentSeat === 1 && marker.userData.x === 3 && marker.userData.z === 13
  )), true);
});
