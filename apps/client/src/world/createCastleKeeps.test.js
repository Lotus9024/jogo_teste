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

test('arquitetura e fundação respeitam o footprint real nos modos de dois, três e quatro jogadores', () => {
  const tile = 1.08, half = 7.56;
  const board = new THREE.Group();
  const { keeps, setPlayerCount, setVisualSize } = createCastleKeeps(board, { tile, half });
  for (const playerCount of [2, 3, 4]) {
    setPlayerCount(playerCount);
    for (let seat = 1; seat <= playerCount; seat += 1) {
      for (const size of [1, 3, 6]) {
        const { footprint } = setVisualSize(seat, size);
        const keep = keeps[seat - 1];
        board.updateWorldMatrix(true, true);
        // Measure transformed vertices: rotated circular towers have a looser
        // bounding-box approximation than the geometry that is actually drawn.
        const bounds = new THREE.Box3().setFromObject(keep, true);
        const halfWidth = footprint * tile / 2;
        assert.ok(bounds.min.x >= keep.position.x - halfWidth - 0.0001);
        assert.ok(bounds.max.x <= keep.position.x + halfWidth + 0.0001);
        assert.ok(bounds.min.z >= keep.position.z - halfWidth - 0.0001);
        assert.ok(bounds.max.z <= keep.position.z + halfWidth + 0.0001);
        const foundation = new THREE.Box3().setFromObject(keep.getObjectByName('Limite visual da base'));
        assert.ok(Math.abs(foundation.max.x - foundation.min.x - footprint * tile) < 0.0001);
        assert.ok(Math.abs(foundation.max.z - foundation.min.z - footprint * tile) < 0.0001);
        const entrance = keep.getObjectByName('castleEntrance').getWorldPosition(new THREE.Vector3());
        const direction = entrance.sub(keep.position).setY(0);
        assert.ok(direction.dot(keep.position.clone().negate().setY(0)) > 0, 'o portão segue orientado para o centro');
      }
    }
  }
});

test('rig de dano não move footprint, pátio ou âncora de status e começa sem transformações', () => {
  const board = new THREE.Group();
  const { alliedKeep } = createCastleKeeps(board, { tile: 1.08, half: 7.56 });
  const structure = alliedKeep.getObjectByName('castleStructure');
  assert.deepEqual(structure.position.toArray(), [0, 0, 0]);
  assert.deepEqual(structure.scale.toArray(), [1, 1, 1]);
  assert.equal(alliedKeep.getObjectByName('castleEntrance').parent.parent, structure);
  board.updateWorldMatrix(true, true);
  const fixed = ['Limite visual da base', 'castleCourtyard', 'castleStatusAnchor'].map(name => {
    const object = alliedKeep.getObjectByName(name);
    return [object, object.matrixWorld.clone()];
  });
  const roofBounds = new THREE.Box3().setFromObject(structure);
  const status = alliedKeep.getObjectByName('castleStatusAnchor').getWorldPosition(new THREE.Vector3());
  assert.ok(status.y > roofBounds.max.y);
  assert.ok(status.y - roofBounds.max.y < 0.4);
  structure.position.set(0.07, 0.02, -0.05);
  structure.rotation.z = 0.03;
  board.updateWorldMatrix(true, true);
  for (const [object, matrix] of fixed) assert.deepEqual(object.matrixWorld.elements, matrix.elements);
});

test('portaria tem passagem aberta e arquitetura usa luz discreta sem luzes pontuais extras', () => {
  const board = new THREE.Group();
  const { alliedKeep, enemyKeep } = createCastleKeeps(board, { tile: 1.08, half: 7.56 });
  board.updateWorldMatrix(true, true);
  for (const keep of [alliedKeep, enemyKeep]) {
    const entrance = keep.getObjectByName('castleEntrance');
    const origin = entrance.localToWorld(new THREE.Vector3(0.035, 0.6, 1));
    const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(entrance.getWorldQuaternion(new THREE.Quaternion()));
    const ray = new THREE.Raycaster(origin, direction);
    assert.equal(ray.intersectObject(keep.getObjectByName('castleGatehousePassage')).length, 0);
    assert.ok(keep.getObjectByName('castleMainRoof'));
    assert.ok(keep.getObjectByName('castleGatehouseRoof'));
    keep.traverse(object => {
      assert.equal(Boolean(object.isPointLight), false);
      if (object.isMesh) assert.ok((object.material.emissiveIntensity ?? 0) <= 1);
    });
  }
});
