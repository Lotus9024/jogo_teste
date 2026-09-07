import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { UNIT_MODEL_SCALE } from './createCardUnit.js';
import { makeWoodenHouse, setWoodenHouseConstructionState } from '../assets/models/woodenHouseModel.js';
import { makeWoodBarrier, setWoodBarrierConstructionState } from '../assets/models/woodBarrierModel.js';
import { makeTower, setTowerConstructionState } from '../assets/models/towerModel.js';
import { makeCannon, setCannonConstructionState } from '../assets/models/cannonModel.js';
import { makeGoblinHouse } from '../assets/models/goblinHouseModel.js';
import { makeGoblinTower, setGoblinTowerConstructionState } from '../assets/models/goblinTowerModel.js';
import { makeBuilderArea, makeGoblinAltar, makeMageAltar, setSupportConstructionState } from '../assets/models/supportBuildingModels.js';

test('miniaturas detalhadas cabem na casa sem alterar escala e usam geometrias finitas', () => {
  for (const factory of [makeWoodenHouse, makeWoodBarrier, makeTower, makeCannon, makeGoblinHouse, makeGoblinTower, makeGoblinAltar, makeMageAltar, makeBuilderArea]) {
    const model = factory();
    const size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
    assert.ok(size.x * UNIT_MODEL_SCALE <= 1.08, `${model.name}: largura invade outra casa`);
    assert.ok(size.z * UNIT_MODEL_SCALE <= 1.08, `${model.name}: profundidade invade outra casa`);
    assert.deepEqual(model.scale.toArray(), [1, 1, 1]);
    model.traverse(part => {
      if (!part.isMesh) return;
      for (const value of part.geometry.getAttribute('position').array) {
        assert.ok(Number.isFinite(value), `${model.name}: geometria inválida`);
      }
    });
  }
});

test('canhão tem boca aberta com parede interna e raios de roda separados do aro', () => {
  const cannon = makeCannon();
  cannon.updateMatrixWorld(true);
  const muzzle = cannon.getObjectByName('cannonMuzzle');
  const barrel = cannon.getObjectByName('cannonBarrel');
  const position = muzzle.getWorldPosition(new THREE.Vector3());
  const ray = new THREE.Raycaster(position.clone().add(new THREE.Vector3(0, 0, -1)), new THREE.Vector3(0, 0, 1));
  const hit = ray.intersectObject(barrel)[0];
  assert.ok(hit, 'a alma do canhão deve possuir fundo');
  assert.ok(hit.point.z - position.z > 0.4, 'a boca não pode ser tampada por uma face frontal');
  assert.ok(cannon.getObjectByName('cannonBore'));
  assert.equal(cannon.getObjectByName('cannonWheelSpokes').children.length, 4);

  const positions = barrel.geometry.getAttribute('position');
  const normals = barrel.geometry.getAttribute('normal');
  for (let index = 0; index < positions.count; index += 1) {
    const point = new THREE.Vector3().fromBufferAttribute(positions, index);
    if (Math.hypot(point.x, point.z) < 0.2 || point.y < -0.62 || point.y > 0.55) continue;
    const normal = new THREE.Vector3().fromBufferAttribute(normals, index);
    assert.ok(point.x * normal.x + point.z * normal.z > 0, 'parede externa com normais invertidas');
  }
});

test('detalhes construídos continuam ocultos durante as obras e o encaixe do arqueiro permanece estável', () => {
  for (const [factory, toggle, builtName, detailName] of [
    [makeWoodenHouse, setWoodenHouseConstructionState, 'houseBuiltParts', 'houseRoofShingles'],
    [makeWoodBarrier, setWoodBarrierConstructionState, 'barrierBuiltParts', 'barrierIronBindings'],
    [makeTower, setTowerConstructionState, 'towerBuiltParts', 'towerDoorArch'],
    [makeCannon, setCannonConstructionState, 'cannonBuiltParts', 'cannonMuzzle'],
    [makeGoblinTower, setGoblinTowerConstructionState, 'goblinTowerBuiltParts', 'goblinTowerTimberParapet'],
    [makeGoblinAltar, setSupportConstructionState, 'supportBuiltParts', 'goblinAltarBoneCircle'],
    [makeMageAltar, setSupportConstructionState, 'supportBuiltParts', 'mageAltarObelisk'],
    [makeBuilderArea, setSupportConstructionState, 'supportBuiltParts', 'builderCanopy'],
  ]) {
    const model = factory();
    const detail = model.getObjectByName(detailName);
    assert.ok(detail, `${model.name}: detalhe visual ausente`);
    let ancestor = detail;
    while (ancestor && ancestor.name !== builtName) ancestor = ancestor.parent;
    assert.ok(ancestor, `${detailName} precisa pertencer ao estado construído`);
    toggle(model, true);
    assert.equal(ancestor.visible, false);
    toggle(model, false);
    assert.equal(ancestor.visible, true);
  }
  const tower = makeTower();
  assert.deepEqual(tower.getObjectByName('archerMount').position.toArray(), [0, 1.42, 0]);
  assert.ok(tower.getObjectByName('towerTopFloor'));
  assert.ok(tower.getObjectByName('towerScaffoldPost'));
  assert.equal(makeGoblinHouse().getObjectByName('teamPlatform'), undefined);
});
