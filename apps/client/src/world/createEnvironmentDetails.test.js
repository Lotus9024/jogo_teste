import test from 'node:test';
import assert from 'node:assert/strict';
import { createDistantIslands } from './createDistantIslands.js';
import { createMagicDust } from './terrain/createArcaneDetails.js';
import { SPACE_STAR_COUNTS } from '../core/createMagicSky.js';

test('céu distribui milhares de estrelas em 360 graus', () => {
  assert.deepEqual(SPACE_STAR_COUNTS, {
    distant: 2800,
    fine: 1300,
    bright: 160,
    band: 1700,
    total: 5960,
  });
});

test('ilha principal mantém uma órbita estelar densa e permanente', () => {
  const magicDust = createMagicDust();
  const { orbit, clusterOrbit } = magicDust.userData;

  assert.equal(orbit.userData.kind, 'main-island-star-orbit');
  assert.ok(orbit.userData.count >= 2200);
  assert.ok(clusterOrbit.userData.count >= 1200);
  assert.ok(orbit.material.opacity >= 0.6);
});

test('ilhas distantes possuem textura, relevo, silhuetas e órbitas próprias', () => {
  const { group } = createDistantIslands();

  assert.equal(group.children.length, 9);
  for (const island of group.children) {
    assert.ok(island.userData.orbit);
    assert.ok(island.userData.orbit.userData.count >= 132);
    assert.ok(island.getObjectByName('Árvores secas e monólitos das ilhas'));
    assert.ok(island.getObjectByName('Fragmentos minerais nas bordas'));
    assert.ok(island.getObjectByName('Formações rochosas inferiores'));
  }
});
