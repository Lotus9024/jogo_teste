import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { GAME_CONFIG } from '@tronos/shared/game-config';
import { createBoardTiles } from './createBoardTiles.js';

test('instanced tiles preserve every logical cell, original height and checkerboard material', () => {
  const size = GAME_CONFIG.boardSize;
  const tile = 1.08;
  const half = (size - 1) * tile / 2;
  const materials = [new THREE.MeshStandardMaterial(), new THREE.MeshStandardMaterial()];
  const group = createBoardTiles({ size, tile, half, materials });
  const cells = new Set();
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  assert.equal(group.children.length, 2);
  group.children.forEach((batch, parity) => {
    assert.equal(batch.material, materials[parity]);
    assert.ok(batch.boundingSphere.radius > half);
    assert.equal(batch.receiveShadow, true);
    assert.equal(batch.castShadow, false);
    batch.geometry.computeBoundingBox();
    assert.ok(Math.abs(batch.geometry.boundingBox.min.y + 0.09) < 1e-6);
    assert.ok(Math.abs(batch.geometry.boundingBox.max.y - 0.09) < 1e-6);
    batch.userData.cells.forEach(({ x, z }, index) => {
      batch.getMatrixAt(index, matrix);
      position.setFromMatrixPosition(matrix);
      assert.ok(Math.abs(position.x - (x * tile - half)) < 1e-6);
      assert.ok(Math.abs(position.z - (z * tile - half)) < 1e-6);
      assert.ok(Math.abs(position.y - (-0.04 + (((x * 17 + z * 11) % 5) - 2) * 0.004)) < 1e-6);
      assert.equal((x + z) % 2, parity);
      cells.add(`${x},${z}`);
    });
  });
  assert.equal(cells.size, size * size);
  assert.equal(group.children[0].geometry, group.children[1].geometry);
});
