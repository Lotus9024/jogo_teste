import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { makeCannon, setCannonConstructionState } from '../assets/models/cannonModel.js';
import { makeOperator } from '../assets/models/operatorModel.js';
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
