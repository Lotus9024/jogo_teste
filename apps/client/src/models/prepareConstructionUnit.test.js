import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { makeGoblinTower, makeTower, makeWoodBarrier, makeWoodenHouse } from './unitModels.js';
import { prepareConstructionUnit } from './prepareConstructionUnit.js';

const CONSTRUCTION_FACTORIES = [makeWoodBarrier, makeTower, makeWoodenHouse, makeGoblinTower];

test('construções não usam pedestal e encostam no chão em todos os estados', () => {
  for (const makeConstruction of CONSTRUCTION_FACTORIES) {
    const unit = prepareConstructionUnit(makeConstruction());
    assert.equal(unit.getObjectByName('unitPedestal'), undefined);
    assert.equal(unit.getObjectByName('teamPlatform'), undefined);
    assert.equal(unit.getObjectByName('selectionRing').position.y, 0.035);

    const rig = unit.getObjectByName('rig');
    const stateGroups = rig.children.filter((child) => child.isGroup && /Parts$/.test(child.name));
    const groundedObjects = stateGroups.length > 0 ? stateGroups : [rig];

    for (const object of groundedObjects) {
      const bounds = new THREE.Box3().setFromObject(object);
      assert.ok(Math.abs(bounds.min.y) < 0.001, `${object.name || 'rig'} está a ${bounds.min.y} do chão`);
    }
  }
});
