import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createBoardCoordinates } from './boardCoordinates.js';

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
