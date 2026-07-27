import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {
  castleCenterCellForFootprint,
  castleFootprintForVisualSize,
  createCastleKeeps,
} from './createCastleKeeps.js';

test('os dois portões dos castelos ficam virados para o centro do tabuleiro', () => {
  const board = new THREE.Group();
  const { alliedKeep, enemyKeep } = createCastleKeeps(board, { tile: 1.08, half: 4.32 });
  board.updateWorldMatrix(true, true);

  const alliedEntrance = alliedKeep.getObjectByName('castleEntrance');
  const enemyEntrance = enemyKeep.getObjectByName('castleEntrance');
  const alliedEntrancePosition = alliedEntrance.getWorldPosition(new THREE.Vector3());
  const enemyEntrancePosition = enemyEntrance.getWorldPosition(new THREE.Vector3());

  assert.ok(alliedEntrancePosition.z < alliedKeep.position.z, 'o portão aliado aponta para o centro');
  assert.ok(enemyEntrancePosition.z > enemyKeep.position.z, 'o portão inimigo aponta para o centro');
  assert.ok(alliedKeep.getObjectByName('Torre central sombria'));
  assert.ok(enemyKeep.getObjectByName('Grade do portão'));
  assert.equal(alliedKeep.getObjectByName('castleLevelTwoDetails').visible, false);
});

test('todos os tamanhos visuais ocupam quadrados inteiros sem ultrapassar o tabuleiro', () => {
  const tile = 1.08;
  const half = 7.56;
  const board = new THREE.Group();
  const { alliedKeep, enemyKeep, setVisualSize } = createCastleKeeps(board, { tile, half });

  for (let size = 1; size <= 6; size += 1) {
    const footprint = castleFootprintForVisualSize(size);
    for (const [seat, keep] of [[1, alliedKeep], [2, enemyKeep]]) {
      const layout = setVisualSize(seat, size);
      const radius = Math.floor(footprint / 2);
      assert.equal(layout.footprint, footprint);
      assert.ok(layout.center.x - radius >= 0);
      assert.ok(layout.center.x + radius < 15);
      assert.ok(layout.center.z - radius >= 0);
      assert.ok(layout.center.z + radius < 15);
      assert.equal(keep.userData.footprintCells, footprint);
      assert.equal(keep.scale.x, footprint / 3);
      assert.equal(keep.scale.z, footprint / 3);
      const visualLimit = keep.getObjectByName('Limite visual da base');
      assert.ok(Math.abs(visualLimit.geometry.parameters.width * keep.scale.x - footprint * tile) < 0.0001);
    }
  }
});

test('castelos de quatro jogadores permanecem alinhados aos cantos em qualquer tamanho', () => {
  for (const footprint of [3, 7, 13]) {
    for (let seat = 1; seat <= 4; seat += 1) {
      const center = castleCenterCellForFootprint(seat, footprint, 15, 4);
      const radius = Math.floor(footprint / 2);
      assert.ok(center.x - radius >= 0 && center.x + radius < 15);
      assert.ok(center.z - radius >= 0 && center.z + radius < 15);
    }
  }
});
