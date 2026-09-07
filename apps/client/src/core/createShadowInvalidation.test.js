import test from 'node:test';
import assert from 'node:assert/strict';
import { Group } from 'three';
import { createShadowInvalidation } from './createShadowInvalidation.js';

test('shadows follow deployment, movement and removal but reuse static maps', () => {
  const renderer = { shadowMap: { enabled: true, needsUpdate: false } };
  const shadows = createShadowInvalidation(renderer);
  const unit = new Group();
  assert.equal(shadows.update([unit], 0), true);
  renderer.shadowMap.needsUpdate = false;
  assert.equal(shadows.update([unit], 1), false);
  assert.equal(renderer.shadowMap.needsUpdate, false);
  unit.position.x = 3;
  assert.equal(shadows.update([unit], 1.01), false);
  assert.equal(shadows.update([unit], 1.1), true);
  assert.equal(shadows.update([], 1.2), true);
});

test('castle upgrades and visibility invalidate shadows; low quality does no shadow work', () => {
  const renderer = { shadowMap: { enabled: true } };
  const shadows = createShadowInvalidation(renderer);
  const castle = new Group();
  shadows.update([castle], 0);
  castle.userData.currentLevel = 2;
  assert.equal(shadows.update([castle], 1), true);
  castle.visible = false;
  assert.equal(shadows.update([castle], 2), true);
  renderer.shadowMap.enabled = false;
  castle.scale.setScalar(2);
  assert.equal(shadows.update([castle], 3), false);
});
