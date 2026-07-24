import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createBattleAnimationController } from './createBattleAnimationController.js';

function setup() {
  const scene = new THREE.Scene();
  const units = [];
  const hoverables = [];
  const controller = createBattleAnimationController({
    scene,
    tile: 1,
    half: 7,
    units,
    hoverables,
  });
  return { scene, units, hoverables, controller };
}

test('desloca a peça suavemente até o quadrado de destino', () => {
  const { scene, units, hoverables, controller } = setup();
  const unit = new THREE.Group();
  unit.position.set(-1, 0.06, 2);
  unit.userData.cardId = 'warrior';
  units.push(unit);
  hoverables.push(unit);
  scene.add(unit);

  const destination = new THREE.Vector3(2, 0.06, 2);
  assert.equal(controller.slideUnit(unit, destination, { duration: 0.5 }), true);
  assert.equal(unit.userData.isMoving, true);

  controller.update(0.25, 0.25);
  assert.ok(unit.position.x > -1 && unit.position.x < 2);

  controller.update(0.25, 0.5);
  assert.equal(unit.position.distanceTo(destination), 0);
  assert.equal(unit.userData.isMoving, false);
});

test('Bombardeiro atravessa rapidamente o caminho, explode e pode sair da arena', () => {
  const { scene, units, hoverables, controller } = setup();
  const bomber = new THREE.Group();
  bomber.position.set(0, 0.06, 4);
  bomber.userData.serverUnitId = 'bomber';
  units.push(bomber);
  hoverables.push(bomber);
  scene.add(bomber);

  controller.processServerEffects([{
    id: 'charge-effect',
    type: 'goblin_bomber_charge',
    unitId: 'bomber',
    fromX: 7,
    fromZ: 10,
    toX: 7,
    toZ: 5,
  }]);
  assert.equal(controller.isUnitProtected('bomber'), true);

  controller.update(0.14, 0.14);
  assert.ok(bomber.position.z < 4 && bomber.position.z > -2);

  controller.update(0.14, 0.28);
  assert.equal(controller.isUnitProtected('bomber'), false);
  assert.equal(units.includes(bomber), false);
  assert.equal(scene.children.includes(bomber), false);
});

test('Clone surge em azul e recupera a escala final do modelo', () => {
  const { scene, controller } = setup();
  const clone = new THREE.Group();
  clone.scale.set(0.8, 0.9, 0.8);
  clone.userData.serverUnitId = 'clone';
  scene.add(clone);

  controller.spawnClone(clone);
  assert.equal(clone.userData.cloneAnimating, true);
  assert.ok(clone.scale.x < 0.1);
  assert.ok(scene.children.some(child => child !== clone));

  controller.update(0.9, 0.9);
  assert.deepEqual(clone.scale.toArray(), [0.8, 0.9, 0.8]);
  assert.equal(clone.userData.cloneAnimating, false);
});

test('Torre lança quatro flechas físicas e a Nevasca permanece pelo prazo correto', () => {
  const { scene, controller } = setup();
  const initialChildren = scene.children.length;
  controller.launchTowerVolley(new THREE.Vector3(0, 0.06, 0), 3);
  assert.equal(scene.children.length, initialChildren + 4);
  controller.update(0.44, 0.44);
  assert.equal(scene.children.length, initialChildren);

  const storm = controller.createLocalSnowstorm({
    ownerSeat: 1,
    targetSeat: 2,
    x: 7,
    z: 7,
    radius: 1,
    remainingTurns: 2,
  });
  assert.ok(scene.getObjectByName('snowstormEffect'));
  controller.finishLocalSnowstormTurn(2);
  assert.equal(scene.getObjectByName('snowstormEffect').userData.storm.remainingTurns, 1);
  controller.finishLocalSnowstormTurn(2);
  assert.equal(scene.getObjectByName('snowstormEffect'), undefined);
  assert.match(storm.id, /^local-snowstorm-/);
});
