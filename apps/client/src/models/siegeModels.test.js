import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { makeCannon, setCannonConstructionState } from '../assets/models/cannonModel.js';
import { makeOperator } from '../assets/models/operatorModel.js';
import { makeRoad } from '../assets/models/roadModel.js';
import { makeWoodenHouse, setWoodenHouseConstructionState } from '../assets/models/woodenHouseModel.js';
import { UNIT_MODEL_SCALE } from './createCardUnit.js';

test('canhão possui silhueta de cerco e estados de construção', () => {
  const cannon = makeCannon();
  const size = new THREE.Box3().setFromObject(cannon).getSize(new THREE.Vector3());
  assert.ok(cannon.getObjectByName('cannonBarrel'));
  assert.ok(cannon.getObjectByName('cannonWheel'));
  assert.ok(size.x * UNIT_MODEL_SCALE <= 1.08);
  assert.ok(size.z * UNIT_MODEL_SCALE <= 1.08);
  setCannonConstructionState(cannon, true);
  assert.equal(cannon.getObjectByName('cannonBuiltParts').visible, false);
  assert.equal(cannon.getObjectByName('cannonConstructionParts').visible, true);
});

test('operador possui ferramenta e identidade próprias', () => {
  const operator = makeOperator();
  assert.equal(operator.userData.role, 'OPERADOR');
  assert.ok(operator.getObjectByName('operatorWrench'));
});

test('Casa de madeira alterna entre obra e construção concluída', () => {
  const house = makeWoodenHouse();
  assert.ok(house.getObjectByName('houseBuiltParts'));
  setWoodenHouseConstructionState(house, true);
  assert.equal(house.getObjectByName('houseBuiltParts').visible, false);
  assert.equal(house.getObjectByName('houseConstructionParts').visible, true);
});

test('Rua desenha apenas o centro e as direções conectadas', () => {
  const road = makeRoad({ north: true, south: false, east: true, west: false });
  const meshes = [];
  road.traverse(object => { if (object.isMesh) meshes.push(object); });
  assert.equal(meshes.length, 4);
  assert.equal(road.getObjectByName('selectionRing'), undefined);
});
