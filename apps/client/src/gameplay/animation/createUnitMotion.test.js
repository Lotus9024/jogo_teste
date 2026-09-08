import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createUnitMotion } from './createUnitMotion.js';
import { presentationChanges } from './presentationChanges.js';

function actor({ castle = false, machine = false } = {}) {
  const root = new THREE.Group();
  root.position.set(3, 0.06, 5);
  root.scale.setScalar(0.55);
  root.userData = { cardId: machine ? 'cannon' : 'warrior', cardType: machine ? 'machine' : 'unit', isCastle: castle };
  const rig = new THREE.Group();
  rig.name = castle ? 'castleStructure' : 'rig';
  rig.position.y = castle ? 0 : 0.18;
  const weapon = new THREE.Group();
  weapon.name = machine ? 'cannonBarrel' : 'warriorSword';
  weapon.position.set(0.3, 1, 0.2);
  weapon.rotation.z = -0.18;
  rig.add(weapon);
  const foot = new THREE.Group();
  foot.name = 'warriorBoot';
  foot.position.x = 0.2;
  rig.add(foot);
  const wheel = new THREE.Group();
  wheel.name = 'cannonWheel';
  rig.add(wheel);
  root.add(rig);
  const anchor = new THREE.Object3D();
  anchor.name = 'castleStatusAnchor';
  anchor.position.y = 3;
  root.add(anchor);
  return { root, rig, weapon, foot, wheel, anchor };
}

test('weapon attacks and overlapping walking restore every visual transform without changing the logical root', () => {
  const { root, rig, weapon } = actor();
  const motion = createUnitMotion();
  const rootPosition = root.position.clone();
  const restWeapon = weapon.rotation.clone();
  motion.play(root, 'attack');
  motion.walk(root, 0.24, 3);
  motion.update(0.17);
  assert.notEqual(weapon.rotation.x, restWeapon.x);
  assert.notEqual(rig.position.y, 0.18);
  assert.deepEqual(root.position.toArray(), rootPosition.toArray());
  assert.deepEqual(root.scale.toArray(), [0.55, 0.55, 0.55]);
  motion.walk(root, 1, 3);
  motion.update(0.2);
  assert.equal(rig.position.y, 0.18);
  assert.equal(weapon.rotation.x, restWeapon.x);
  assert.equal(weapon.rotation.z, restWeapon.z);
  assert.equal(root.userData.presentationAnimating, false);
});

test('cannon recoils through its barrel and rolls wheels without bobbing the carriage', () => {
  const { root, rig, weapon, wheel } = actor({ machine: true });
  const motion = createUnitMotion();
  motion.play(root, 'attack');
  motion.walk(root, 0.5, 2);
  motion.update(0.17);
  assert.ok(weapon.position.z > 0.2);
  assert.notEqual(wheel.rotation.x, 0);
  assert.equal(rig.position.y, 0.18);
  motion.clear();
  assert.equal(weapon.position.z, 0.2);
  assert.equal(wheel.rotation.x, 0);
  assert.equal(root.userData.presentationAnimating, false);
});

test('castle impact moves only architecture and preserves the courtyard/status anchor', () => {
  const { root, rig, anchor } = actor({ castle: true });
  const motion = createUnitMotion();
  root.updateWorldMatrix(true, true);
  const anchorPosition = anchor.getWorldPosition(new THREE.Vector3());
  motion.play(root, 'impact');
  motion.update(0.05);
  assert.notEqual(rig.rotation.z, 0);
  root.updateWorldMatrix(true, true);
  assert.deepEqual(anchor.getWorldPosition(new THREE.Vector3()).toArray(), anchorPosition.toArray());
  motion.update(0.15);
  assert.equal(rig.rotation.z, 0);
});

test('reduced motion skips stepping and bounds attack emphasis while preserving completion', () => {
  const { root, rig, weapon, foot } = actor();
  const motion = createUnitMotion({ reducedMotion: () => true });
  motion.walk(root, 0.3, 3);
  motion.play(root, 'attack');
  motion.update(0.07);
  assert.equal(rig.position.y, 0.18);
  assert.equal(foot.rotation.x, 0);
  assert.ok(Math.abs(weapon.rotation.x) <= 0.12);
  motion.walk(root, 1, 3);
  motion.update(0.07);
  assert.equal(weapon.rotation.x, 0);
  assert.equal(root.userData.presentationAnimating, false);
});

test('confirmed snapshot changes distinguish damage, healing and abilities from ordinary turn resets', () => {
  const previous = { hp: 3, abilityReadyTurn: 2, instantReadyTurn: 2, abilityUsed: true, bonusActions: 1 };
  assert.deepEqual(presentationChanges(previous, { ...previous }), { damaged: false, healed: false, ability: false });
  assert.deepEqual(presentationChanges(previous, { ...previous, hp: 2 }), { damaged: true, healed: false, ability: false });
  assert.deepEqual(presentationChanges(previous, { ...previous, hp: 4, instantReadyTurn: 4 }), { damaged: false, healed: true, ability: true });
  assert.equal(presentationChanges(previous, { ...previous, abilityUsed: false, bonusActions: 0 }).ability, false);
});
