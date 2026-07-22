import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { createCastleKeeps } from './createCastleKeeps.js';

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
});
