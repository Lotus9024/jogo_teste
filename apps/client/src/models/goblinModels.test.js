import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { makeGoblin, makeGoblinTower, setGoblinTowerConstructionState } from './unitModels.js';
import { UNIT_MODEL_SCALE } from './createCardUnit.js';

const TILE_SIZE = 1.08;

test('Goblin e Torre Goblin possuem modelos próprios dentro da casa', () => {
  const goblin = makeGoblin();
  assert.ok(goblin.getObjectByName('goblinDagger'));
  assert.ok(goblin.getObjectByName('goblinLootSack'));
  const tower = makeGoblinTower();
  assert.ok(tower.getObjectByName('goblinTowerBanner'));
  for (const unit of [goblin, tower]) {
    const size = new THREE.Box3().setFromObject(unit).getSize(new THREE.Vector3());
    assert.ok(size.x * UNIT_MODEL_SCALE <= TILE_SIZE);
    assert.ok(size.z * UNIT_MODEL_SCALE <= TILE_SIZE);
  }
  setGoblinTowerConstructionState(tower, true);
  assert.equal(tower.getObjectByName('goblinTowerBuiltParts').visible, false);
  assert.equal(tower.getObjectByName('goblinTowerConstructionParts').visible, true);
});
