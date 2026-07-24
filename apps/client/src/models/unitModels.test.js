import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { isMountedArcher, setUnitOwnerFacing } from '../gameplay/unitState.js';
import { makeAcidCircle } from '../assets/models/acidEffectModel.js';
import { makeOperator } from '../assets/models/operatorModel.js';
import { makeRoad } from '../assets/models/roadModel.js';
import { cards } from '../ui/cardView.js';
import { UNIT_MODEL_SCALE } from './createCardUnit.js';
import {
  makeArcher,
  makeCitizen,
  makeGoblinBomber,
  makeGoblinClone,
  makeGoblinHouse,
  makeGoblin,
  makeGuard,
  makeHenry,
  makeMage,
  makeTower,
  makeWarrior,
  makeWoodBarrier,
  makeWoodenHouse,
  setArcherMountedState,
  setTowerConstructionState,
  setWoodBarrierConstructionState,
} from './unitModels.js';

const TILE_SIZE = 1.08;

test('construcoes apontam para o reino rival conforme o dono', () => {
  for (const [cardId, factory] of [['tower', makeTower], ['wooden_barrier', makeWoodBarrier]]) {
    const unit = factory();
    setUnitOwnerFacing(unit, cardId, 1);
    assert.equal(unit.rotation.y, Math.PI);
    setUnitOwnerFacing(unit, cardId, 2);
    assert.equal(unit.rotation.y, 0);
  }

  const cannon = new THREE.Group();
  setUnitOwnerFacing(cannon, 'cannon', 1);
  assert.equal(cannon.rotation.y, 0);
  setUnitOwnerFacing(cannon, 'cannon', 2);
  assert.equal(cannon.rotation.y, Math.PI);

  const house = makeWoodenHouse();
  setUnitOwnerFacing(house, 'wooden_house', 1);
  assert.equal(house.rotation.y, 0);
});

test('personagens sempre olham para o reino rival', () => {
  for (const [cardId, factory] of [
    ['warrior', makeWarrior],
    ['guard', makeGuard],
    ['goblin', makeGoblin],
    ['operator', makeOperator],
    ['archer', makeArcher],
    ['mage', makeMage],
  ]) {
    const unit = factory();
    const modelFrontZ = unit.userData.modelFrontZ ?? 1;
    setUnitOwnerFacing(unit, cardId, 1);
    const blueFacing = new THREE.Vector3(0, 0, modelFrontZ).applyQuaternion(unit.quaternion);
    assert.ok(blueFacing.z < -0.99, `${cardId} azul ficou virado para trás`);
    setUnitOwnerFacing(unit, cardId, 2);
    const redFacing = new THREE.Vector3(0, 0, modelFrontZ).applyQuaternion(unit.quaternion);
    assert.ok(redFacing.z > 0.99, `${cardId} vermelho ficou virado para trás`);
  }
});

test('Casa Goblin encosta no chão sem plataforma e Clone possui modelo próprio', () => {
  const house = makeGoblinHouse();
  assert.ok(house.getObjectByName('rig'));
  assert.equal(house.getObjectByName('teamPlatform'), undefined);
  assert.equal(house.getObjectByName('selectionRing'), undefined);
  const clone = makeGoblinClone();
  assert.equal(clone.name, 'Clone Goblin');
  assert.ok(clone.getObjectByName('goblinDagger'));
});

test('tropas mantêm rig, plataforma e silhueta dentro da casa', () => {
  for (const factory of [makeWarrior, makeGuard, makeGoblin, makeOperator, makeHenry, makeArcher, makeMage, makeTower, makeWoodBarrier, makeWoodenHouse]) {
    const unit = factory();
    const size = new THREE.Box3().setFromObject(unit).getSize(new THREE.Vector3());
    assert.ok(unit.getObjectByName('rig'));
    assert.ok(unit.getObjectByName('teamPlatform'));
    assert.ok(unit.getObjectByName('selectionRing'));
    assert.ok(size.x * UNIT_MODEL_SCALE <= TILE_SIZE);
    assert.ok(size.z * UNIT_MODEL_SCALE <= TILE_SIZE);
  }
});

test('troncos dos personagens possuem faces voltadas para fora', () => {
  for (const [factory, torsoName] of [
    [makeWarrior, 'warriorTunic'],
    [makeGuard, 'guardCoat'],
    [makeGoblin, 'goblinTunic'],
    [makeOperator, 'operatorShirt'],
  ]) {
    const torsoMesh = factory().getObjectByName(torsoName);
    assert.ok(torsoMesh, `${torsoName} não foi criado`);
    const positions = torsoMesh.geometry.getAttribute('position');
    const normals = torsoMesh.geometry.getAttribute('normal');
    for (let index = 0; index < positions.count; index += 1) {
      const position = new THREE.Vector3().fromBufferAttribute(positions, index);
      const normal = new THREE.Vector3().fromBufferAttribute(normals, index);
      assert.ok(position.dot(normal) > 0, `${torsoName} possui uma face invertida`);
    }
  }
});

test('Henry tem silhueta baixa e duas lâminas próprias', () => {
  const henry = makeHenry();
  assert.equal(henry.userData.role, 'HUMANO · ÁGIL');
  assert.ok(henry.getObjectByName('henryLeftBlade'));
  assert.ok(henry.getObjectByName('henryRightBlade'));
  assert.ok(henry.getObjectByName('henryScarf'));
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
  assert.equal(spearShaft.geometry.parameters.height, 2.32);
  assert.ok(guard.getObjectByName('guardShieldHand'));
  assert.ok(guard.getObjectByName('guardSpearHand'));
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

test('torre alterna entre a obra real e o modelo pronto sem transparência', () => {
  const tower = makeTower();
  const built = tower.getObjectByName('towerBuiltParts');
  const construction = tower.getObjectByName('towerConstructionParts');
  assert.ok(built);
  assert.ok(construction);
  assert.equal(built.visible, true);
  assert.equal(construction.visible, false);

  setTowerConstructionState(tower, true);
  assert.equal(built.visible, false);
  assert.equal(construction.visible, true);
  tower.traverse(object => {
    if (object.isMesh) assert.equal(object.material.opacity, 1);
  });

  setTowerConstructionState(tower, false);
  assert.equal(built.visible, true);
  assert.equal(construction.visible, false);
});

test('barreira alterna entre paliçada parcial e paliçada pronta', () => {
  const barrier = makeWoodBarrier();
  const built = barrier.getObjectByName('barrierBuiltParts');
  const construction = barrier.getObjectByName('barrierConstructionParts');
  assert.ok(built);
  assert.ok(construction);
  assert.equal(built.visible, true);
  assert.equal(construction.visible, false);

  setWoodBarrierConstructionState(barrier, true);
  assert.equal(built.visible, false);
  assert.equal(construction.visible, true);
  setWoodBarrierConstructionState(barrier, false);
  assert.equal(built.visible, true);
  assert.equal(construction.visible, false);
});

test('guerreiro usa espada sem escudo', () => {
  const warrior = makeWarrior();
  assert.ok(warrior.getObjectByName('warriorSword'));
  assert.ok(warrior.getObjectByName('warriorSwordHand'));
  assert.equal(warrior.getObjectByName('warriorShield'), undefined);
});

test('Goblin e Operador usam os modelos finais de peça', () => {
  const goblin = makeGoblin();
  const operator = makeOperator();
  assert.ok(goblin.getObjectByName('goblinNose'));
  assert.ok(goblin.getObjectByName('goblinLootSack'));
  assert.ok(goblin.getObjectByName('goblinSackStrap'));
  assert.ok(goblin.getObjectByName('goblinDaggerHand'));
  assert.equal(operator.getObjectByName('operatorWrench'), undefined);
  assert.ok(operator.getObjectByName('operatorCapBrim'));
  for (const unit of [goblin, operator]) {
    assert.ok(unit.getObjectByName('unitPedestal'));
    assert.ok(unit.getObjectByName('teamPlatform'));
    assert.ok(unit.getObjectByName('selectionRing'));
  }
});

test('ruas usam uma superfície única e alcançam a borda das casas conectadas', () => {
  const straight = makeRoad(
    { north: true, south: true, east: false, west: false },
    TILE_SIZE,
    { cardId: 'road' },
  );
  const crossing = makeRoad(
    { north: true, south: true, east: true, west: true },
    TILE_SIZE,
    { cardId: 'cobblestone_road' },
  );
  assert.equal(straight.getObjectByName('roadBuiltParts').children.length, 1);
  assert.equal(crossing.getObjectByName('roadBuiltParts').children.length, 1);
  assert.ok(straight.getObjectByName('dirtRoadSurface'));
  assert.ok(crossing.getObjectByName('cobblestoneRoadSurface'));
  assert.equal(crossing.getObjectByName('cobblestoneRoadStone1'), undefined);

  const straightSize = new THREE.Box3().setFromObject(straight).getSize(new THREE.Vector3());
  const crossingSize = new THREE.Box3().setFromObject(crossing).getSize(new THREE.Vector3());
  assert.ok(straightSize.z > TILE_SIZE);
  assert.ok(crossingSize.x > TILE_SIZE);
  assert.ok(crossingSize.z > TILE_SIZE);
});

test('Cidadão e Goblin Bombardeiro possuem modelos próprios', () => {
  const citizen = makeCitizen();
  const bomber = makeGoblinBomber();
  assert.ok(citizen.getObjectByName('citizenPitchfork'));
  assert.ok(bomber.getObjectByName('goblinBomb'));
  for (const unit of [citizen, bomber]) {
    const size = new THREE.Box3().setFromObject(unit).getSize(new THREE.Vector3());
    assert.ok(size.x * UNIT_MODEL_SCALE <= TILE_SIZE);
    assert.ok(size.z * UNIT_MODEL_SCALE <= TILE_SIZE);
  }
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
