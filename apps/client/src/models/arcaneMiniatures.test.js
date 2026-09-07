import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { makeMage, makeRoyalWarrior, makeRoyalTower, setTowerConstructionState } from './unitModels.js';
import { UNIT_MODEL_SCALE } from './createCardUnit.js';

test('arcane and royal miniatures keep footprint, independent faction materials and animation anchors', () => {
  for (const factory of [makeMage, makeRoyalWarrior, makeRoyalTower]) {
    const model = factory(), second = factory();
    const size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3()).multiplyScalar(UNIT_MODEL_SCALE);
    assert.ok(size.x <= 1.08 && size.z <= 1.08, `${model.name} exceeds the playable cell`);
    assert.notEqual(model.getObjectByName('selectionRing').material, second.getObjectByName('selectionRing').material);
    let triangles = 0;
    model.traverse(part => {
      if (!part.isMesh) return;
      const vertices = part.geometry.getAttribute('position');
      assert.ok(vertices.array.every(Number.isFinite));
      triangles += (part.geometry.index?.count ?? vertices.count) / 3;
    });
    assert.ok(triangles < 12000, `${model.name}: ${triangles} triangles`);
  }
  const mage = makeMage();
  assert.equal(mage.getObjectByName('mageFireOrb').parent, mage.getObjectByName('mageStaff'));
  assert.ok(mage.getObjectByName('mageStaff').userData.magicAnchor);
});

test('the folded robe has outward normals and the royal cape stays behind the new human front', () => {
  const mage = makeMage();
  const geometry = mage.getObjectByName('magePleatedRobe').geometry;
  const positions = geometry.getAttribute('position'), normals = geometry.getAttribute('normal');
  for (let index = 0; index < positions.count; index += 1) {
    assert.ok(positions.getX(index) * normals.getX(index) + positions.getZ(index) * normals.getZ(index) > 0);
  }
  const royal = makeRoyalWarrior();
  const front = royal.userData.modelFrontZ;
  const cape = royal.getObjectByName('royalWarriorCloak');
  assert.ok(cape.position.z * front < 0);
  assert.ok(royal.getObjectByName('royalWarriorSunSigil').position.z * front > 0);
  assert.equal(royal.getObjectByName('warriorHelmetCrest'), undefined);
  assert.ok(cape.geometry.getAttribute('position').count > 20, 'Cape must retain sculpted folds');
});

test('royal tower banners and crown remain attached to finished construction geometry', () => {
  const tower = makeRoyalTower();
  const built = tower.getObjectByName('towerBuiltParts');
  assert.equal(tower.getObjectByName('royalCrown').parent, built);
  assert.equal(tower.getObjectByName('royalTowerBanner').parent, built);
  setTowerConstructionState(tower, true);
  assert.equal(built.visible, false);
  setTowerConstructionState(tower, false);
  assert.equal(built.visible, true);
});
