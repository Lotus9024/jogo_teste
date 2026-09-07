import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { makeWarrior } from '../assets/models/warriorModel.js';
import { makeGuard } from '../assets/models/guardModel.js';
import { makeArcher, setArcherMountedState } from '../assets/models/archerModel.js';
import { makeOperator } from '../assets/models/operatorModel.js';
import { makeCitizen } from '../assets/models/citizenModel.js';
import { setUnitOwnerFacing } from '../gameplay/unitState.js';
import { UNIT_MODEL_SCALE } from './createCardUnit.js';

const models = [
  ['warrior', makeWarrior, ['warriorTunic', 'warriorBreastplate', 'warriorSplitTabard', 'warriorBattleMantle', 'swordBlade']],
  ['guard', makeGuard, ['guardCoat', 'guardCuirass', 'guardVisor', 'guardWatchCloak', 'guardHeraldicChevron']],
  ['archer', makeArcher, ['archerHuntingCoat', 'archerRangerCloak', 'archerHoodDrape', 'archerRecurveBow', 'archerQuiver']],
  ['operator', makeOperator, ['operatorShirt', 'operatorLeatherApron', 'operatorGoggleLens', 'operatorForgeHammer']],
  ['citizen', makeCitizen, ['citizenWorkShirt', 'citizenWaistcoatPanel', 'citizenProvisionSack', 'citizenPitchfork']],
];

test('human miniatures retain footprint, selection and faction-facing contracts with new sculpted silhouettes', () => {
  for (const [cardId, factory, details] of models) {
    const unit = factory();
    assert.equal(unit.userData.miniatureStyle, 'sculpted-human-v2');
    for (const name of ['rig', 'unitPedestal', 'teamPlatform', 'selectionRing', ...details]) {
      assert.ok(unit.getObjectByName(name), `${cardId}: missing ${name}`);
    }
    for (const seat of [1, 2]) {
      setUnitOwnerFacing(unit, cardId, seat);
      const facing = new THREE.Vector3(0, 0, unit.userData.modelFrontZ).applyQuaternion(unit.quaternion);
      assert.ok(seat === 1 ? facing.z < -0.99 : facing.z > 0.99);
      const size = new THREE.Box3().setFromObject(unit).getSize(new THREE.Vector3()).multiplyScalar(UNIT_MODEL_SCALE);
      assert.ok(size.x <= 1.08 && size.z <= 1.08, `${cardId} exceeds its cell: ${size.toArray()}`);
    }
  }
});

test('sculpted human models stay within a deliberate geometry budget and use finite textured surfaces', () => {
  for (const [cardId, factory] of models) {
    let triangles = 0;
    let meshes = 0;
    const geometries = new Set();
    factory().traverse(part => {
      if (!part.isMesh) return;
      meshes += 1;
      geometries.add(part.geometry);
      const positions = part.geometry.getAttribute('position');
      triangles += (part.geometry.index?.count ?? positions.count) / 3;
      assert.ok(positions.array.every(Number.isFinite), `${cardId}: non-finite vertex`);
      const materials = Array.isArray(part.material) ? part.material : [part.material];
      if (materials.some(material => material.map)) assert.ok(part.geometry.getAttribute('uv'), `${cardId}: textured surface has no UVs`);
    });
    assert.ok(meshes <= 72, `${cardId}: ${meshes} meshes`);
    assert.ok(triangles < 5000, `${cardId}: ${triangles} triangles`);
    assert.ok(geometries.size < meshes - 8, `${cardId}: anatomy buffers should be shared`);
  }
});

test('mounting the new archer hides the entire pedestal while preserving bow, hands and cape', () => {
  const archer = makeArcher();
  const cape = archer.getObjectByName('archerRangerCloak');
  const arrow = archer.getObjectByName('archerArrow');
  assert.equal(arrow.parent, archer.getObjectByName('archerBow'));
  setArcherMountedState(archer, true);
  for (const name of ['unitPedestal', 'teamPlatform', 'selectionRing']) assert.equal(archer.getObjectByName(name).visible, false);
  assert.equal(cape.visible, true);
  assert.equal(archer.getObjectByName('archerBowHand').visible, true);
  setArcherMountedState(archer, false);
  assert.equal(archer.getObjectByName('unitPedestal').visible, true);
});
