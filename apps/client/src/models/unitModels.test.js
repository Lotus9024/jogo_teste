import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { isMountedArcher } from '../gameplay/unitState.js';
import { makeAcidCircle } from '../assets/models/acidEffectModel.js';
import { cards } from '../ui/cardView.js';
import { UNIT_MODEL_SCALE } from './createCardUnit.js';
import { makeArcher, makeGuard, makeMage, makeTower, makeWarrior, makeWoodenHouse, setArcherMountedState } from './unitModels.js';

const TILE_SIZE = 1.08;

test('tropas mantêm rig, plataforma e silhueta dentro da casa', () => {
  for (const factory of [makeWarrior, makeGuard, makeArcher, makeMage, makeTower, makeWoodenHouse]) {
    const unit = factory();
    const size = new THREE.Box3().setFromObject(unit).getSize(new THREE.Vector3());
    assert.ok(unit.getObjectByName('rig'));
    assert.ok(unit.getObjectByName('teamPlatform'));
    assert.ok(unit.getObjectByName('selectionRing'));
    assert.ok(size.x * UNIT_MODEL_SCALE <= TILE_SIZE);
    assert.ok(size.z * UNIT_MODEL_SCALE <= TILE_SIZE);
  }
});

test('Mago possui cajado, orbe de fogo e identidade arcana', () => {
  const mage = makeMage();
  assert.equal(mage.userData.role, 'MAGO');
  assert.ok(mage.getObjectByName('mageStaff'));
  assert.ok(mage.getObjectByName('mageFireOrb'));
});

test('Mago possui círculo ácido no chão e instrução de atalho na carta', () => {
  const acid = makeAcidCircle(TILE_SIZE);
  assert.ok(acid.getObjectByName('acidPuddle'));
  assert.ok(acid.getObjectByName('acidRing'));
  assert.ok(acid.children.some(part => part.userData.acidDrop));
  assert.match(cards.find(card => card.id === 'mage').abilityText, /Aperte F selecionando a tropa/);
});

test('guarda possui identidade própria e não usa elementos de mago', () => {
  const guard = makeGuard();
  assert.equal(guard.userData.role, 'GUARDA');
  assert.ok(guard.getObjectByName('guardShield'));
  let magicParts = 0;
  guard.traverse(object => { if (object.userData.magic) magicParts += 1; });
  assert.equal(magicParts, 0);
  const spear = guard.getObjectByName('guardSpear');
  assert.ok(spear);
  const spearShaft = guard.getObjectByName('guardSpearShaft');
  assert.equal(spearShaft.geometry.parameters.height, 1.82);
});

test('arqueiro segura arco e flecha com as duas maos e perde a base ao montar', () => {
  const archer = makeArcher();
  const bow = archer.getObjectByName('archerBow');
  const arrow = archer.getObjectByName('archerArrow');
  assert.ok(bow);
  assert.ok(arrow);
  assert.equal(arrow.parent, bow);
  assert.ok(archer.getObjectByName('archerBowHand'));
  assert.ok(archer.getObjectByName('archerDrawHand'));

  setArcherMountedState(archer, true);
  assert.equal(archer.getObjectByName('unitPedestal').visible, false);
  assert.equal(archer.getObjectByName('teamPlatform').visible, false);
  assert.equal(archer.getObjectByName('selectionRing').visible, false);
  setArcherMountedState(archer, false);
  assert.equal(archer.getObjectByName('unitPedestal').visible, true);
  assert.equal(archer.getObjectByName('teamPlatform').visible, true);
});

test('torre oferece um encaixe dedicado para o arqueiro', () => {
  const tower = makeTower();
  assert.ok(tower.getObjectByName('archerMount'));
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
