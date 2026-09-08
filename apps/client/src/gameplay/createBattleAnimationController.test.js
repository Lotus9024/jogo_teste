import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createBattleAnimationController } from './createBattleAnimationController.js';
import { makeWarrior } from '../assets/models/warriorModel.js';

function setup(options = {}) {
  const scene = new THREE.Scene();
  const units = [];
  const hoverables = [];
  const controller = createBattleAnimationController({
    scene,
    tile: 1,
    half: 7,
    units,
    hoverables,
    ...options,
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

test('ataque corpo a corpo move a arma e preserva a raiz lógica da unidade', () => {
  const { scene, units, controller } = setup();
  const warrior = makeWarrior();
  warrior.position.set(0, 0.06, 0);
  warrior.userData.cardId = 'warrior';
  units.push(warrior);
  scene.add(warrior);
  const initialChildren = scene.children.length;
  const sword = warrior.getObjectByName('warriorSword');
  const swordRotation = sword.rotation.clone();

  assert.equal(controller.playAttack(warrior, new THREE.Vector3(1, 0.06, 0)), true);
  assert.equal(scene.children.length, initialChildren + 1);
  controller.update(0.17, 0.17);
  assert.notEqual(sword.rotation.x, swordRotation.x);
  assert.deepEqual(warrior.scale.toArray(), [1, 1, 1]);
  assert.deepEqual(warrior.position.toArray(), [0, 0.06, 0]);

  controller.update(0.17, 0.34);
  assert.deepEqual(warrior.scale.toArray(), [1, 1, 1]);
  assert.equal(sword.rotation.x, swordRotation.x);
  assert.equal(scene.children.length, initialChildren);
});

test('efeito online de ataque lança um projétil quando a unidade é arqueira', () => {
  const { scene, units, controller } = setup();
  const archer = new THREE.Group();
  archer.userData.cardId = 'archer';
  archer.userData.serverUnitId = 'online-archer';
  units.push(archer);
  scene.add(archer);
  const initialChildren = scene.children.length;

  controller.processServerEffects([{
    id: 'archer-attack-effect',
    type: 'unit_attack',
    unitId: 'online-archer',
    cardId: 'archer',
    toX: 8,
    toZ: 7,
  }]);
  assert.equal(scene.children.length, initialChildren + 1);
  controller.update(0.3, 0.3);
  assert.equal(scene.children.length, initialChildren);
});

test('efeitos confirmados são idempotentes durante toda a partida, inclusive após muitos eventos', () => {
  const { scene, units, controller } = setup();
  const warrior = makeWarrior();
  warrior.userData.serverUnitId = 'warrior';
  units.push(warrior);
  scene.add(warrior);
  const event = { id: 'first-hit', type: 'unit_attack', unitId: 'warrior', cardId: 'warrior', toX: 8, toZ: 7 };
  controller.processServerEffects([event], { present: false });
  assert.equal(scene.children.length, 1);
  controller.processServerEffects([event]);
  assert.equal(scene.children.length, 1);
  for (let index = 0; index < 210; index += 1) controller.processServerEffects([{ ...event, id: `next-${index}` }]);
  assert.ok(scene.children.filter(part => part.name === 'attackTrace').length <= 8);
  controller.update(1, 1);
  controller.processServerEffects([event]);
  assert.equal(scene.children.length, 1);
});

test('cancelar deslocamento por outro destino não acumula inclinação nem muda a escala da unidade', () => {
  const { scene, controller } = setup();
  const warrior = makeWarrior();
  warrior.scale.setScalar(0.55);
  scene.add(warrior);
  controller.slideUnit(warrior, new THREE.Vector3(2, 0.06, 0));
  controller.update(0.1, 0.1);
  controller.slideUnit(warrior, new THREE.Vector3(3, 0.06, 2));
  controller.update(1, 1.1);
  assert.deepEqual(warrior.position.toArray(), [3, 0.06, 2]);
  assert.deepEqual(warrior.scale.toArray(), [0.55, 0.55, 0.55]);
  assert.deepEqual(warrior.rotation.toArray().slice(0, 3), [0, 0, 0]);
  assert.equal(warrior.userData.presentationAnimating, false);
});

test('derrota usa materiais temporários sem liberar geometrias ou alterar materiais compartilhados', () => {
  const { scene, controller } = setup();
  const warrior = makeWarrior();
  const original = warrior.getObjectByName('swordBlade');
  let geometryDisposed = false;
  original.geometry.addEventListener('dispose', () => { geometryDisposed = true; });
  controller.playDefeat(warrior);
  assert.ok(scene.getObjectByName('unitDefeatEcho'));
  controller.update(0.12, 0.12);
  assert.equal(original.material.opacity, 1);
  controller.update(0.12, 0.24);
  assert.equal(scene.getObjectByName('unitDefeatEcho'), undefined);
  assert.equal(geometryDisposed, false);
});

test('limpar a apresentação libera efeitos temporários e restaura poses e escalas', () => {
  const { scene, controller } = setup();
  const warrior = makeWarrior();
  scene.add(warrior);
  controller.playAbility(warrior);
  controller.spawnClone(warrior);
  controller.explodeAt(new THREE.Vector3());
  controller.launchTowerVolley(new THREE.Vector3());
  controller.playDefeat(makeWarrior());
  controller.update(0.08, 0.08);
  controller.clear();
  assert.equal(scene.children.length, 1);
  assert.equal(warrior.userData.presentationAnimating, false);
  assert.equal(warrior.userData.cloneAnimating, false);
  assert.deepEqual(warrior.scale.toArray(), [1, 1, 1]);
});
