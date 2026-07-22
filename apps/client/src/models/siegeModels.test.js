import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { makeCannon, setCannonConstructionState } from '../assets/models/cannonModel.js';
import { makeOperator } from '../assets/models/operatorModel.js';
import { makeRoad, setRoadConstructionState } from '../assets/models/roadModel.js';
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
  const built = house.getObjectByName('houseBuiltParts');
  const construction = house.getObjectByName('houseConstructionParts');
  assert.ok(built);
  assert.ok(construction);
  assert.ok(house.getObjectByName('houseBuiltRoofLeft'));
  assert.ok(house.getObjectByName('houseConstructionRidge'));

  for (const state of [built, construction]) {
    const size = new THREE.Box3().setFromObject(state).getSize(new THREE.Vector3());
    assert.ok(size.x * UNIT_MODEL_SCALE <= 1.08);
    assert.ok(size.z * UNIT_MODEL_SCALE <= 1.08);
  }

  setWoodenHouseConstructionState(house, true);
  assert.equal(built.visible, false);
  assert.equal(construction.visible, true);
  setWoodenHouseConstructionState(house, false);
  assert.equal(built.visible, true);
  assert.equal(construction.visible, false);
});

test('Rua desenha apenas o centro e as direções conectadas', () => {
  const road = makeRoad({ north: true, south: false, east: true, west: false });
  assert.equal(road.getObjectByName('roadBuiltParts').children.length, 4);
  assert.equal(road.getObjectByName('selectionRing'), undefined);
  setRoadConstructionState(road, true);
  assert.equal(road.getObjectByName('roadBuiltParts').visible, false);
  assert.equal(road.getObjectByName('roadConstructionParts').visible, true);
  assert.ok(road.getObjectByName('roadConstructionParts').children.length >= 5);
});
