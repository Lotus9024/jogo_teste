import test from 'node:test';
import assert from 'node:assert/strict';
import { createDistantIslands } from './createDistantIslands.js';
import { createMagicDust } from './terrain/createArcaneDetails.js';
import { createSphericalStarPositions, SPACE_STAR_COUNTS } from '../core/createMagicSky.js';
import { createAnimatedGrass, createSurfaceRelief } from './terrain/terrainUnderside.js';

test('céu distribui milhares de estrelas em 360 graus', () => {
  assert.deepEqual(SPACE_STAR_COUNTS, {
    distant: 4200,
    fine: 2300,
    bright: 240,
    band: 2700,
    total: 9440,
  });
});

test('estrelas aleatórias cobrem os oito octantes do espaço', () => {
  const positions = createSphericalStarPositions({
    count: 1200,
    radius: 63,
    seed: 5021,
    depth: 12,
  });
  const octants = new Set();
  for (let index = 0; index < positions.length; index += 3) {
    octants.add(`${positions[index] >= 0 ? '+' : '-'}${positions[index + 1] >= 0 ? '+' : '-'}${positions[index + 2] >= 0 ? '+' : '-'}`);
  }
  assert.equal(octants.size, 8);
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

test('ilha principal possui relevo superficial e gramíneas animadas fora do tabuleiro', () => {
  const grass = createAnimatedGrass({ count: 120 });
  const relief = createSurfaceRelief({ count: 40 });

  assert.equal(grass.name, 'Gramíneas escuras animadas');
  assert.equal(grass.userData.animated, true);
  assert.equal(grass.userData.count, 120);
  assert.equal(grass.material.type, 'MeshLambertMaterial');
  assert.equal(relief.name, 'Pedras e placas do relevo superficial');
  assert.equal(relief.userData.count, 40);
});
