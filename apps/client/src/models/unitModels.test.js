import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { isMountedArcher } from '../gameplay/unitState.js';
import { UNIT_MODEL_SCALE } from './createCardUnit.js';
import { makeArcher, makeGuard, makeTower, makeWarrior } from './unitModels.js';

const TILE_SIZE = 1.08;

test('tropas mantêm rig, plataforma e silhueta dentro da casa', () => {
  for (const factory of [makeWarrior, makeGuard, makeArcher, makeTower]) {
    const unit = factory();
    const size = new THREE.Box3().setFromObject(unit).getSize(new THREE.Vector3());
    assert.ok(unit.getObjectByName('rig'));
    assert.ok(unit.getObjectByName('teamPlatform'));
    assert.ok(unit.getObjectByName('selectionRing'));
    assert.ok(size.x * UNIT_MODEL_SCALE <= TILE_SIZE);
    assert.ok(size.z * UNIT_MODEL_SCALE <= TILE_SIZE);
  }
});

test('guarda possui identidade própria e não usa elementos de mago', () => {
  const guard = makeGuard();
  assert.equal(guard.userData.role, 'GUARDA');
  assert.ok(guard.getObjectByName('guardShield'));
  let magicParts = 0;
  guard.traverse(object => { if (object.userData.magic) magicParts += 1; });
  assert.equal(magicParts, 0);
});

test('guerreiro usa espada sem escudo', () => {
  const warrior = makeWarrior();
  assert.ok(warrior.getObjectByName('warriorSword'));
  assert.equal(warrior.getObjectByName('warriorShield'), undefined);
});

test('somente arqueiro montado tem o movimento bloqueado', () => {
  const archer = makeArcher();
  archer.userData.cardId = 'archer';
  assert.equal(isMountedArcher(archer), false);
  archer.userData.mountedOnTowerId = 'tower-built';
  assert.equal(isMountedArcher(archer), true);
  const warrior = makeWarrior();
  warrior.userData.cardId = 'warrior';
  warrior.userData.mountedOnTowerId = 'tower-built';
  assert.equal(isMountedArcher(warrior), false);
});
