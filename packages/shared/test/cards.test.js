import test from 'node:test';
import assert from 'node:assert/strict';
import { CARD_BY_ID, deploymentDistance, isDeploymentCell } from '../src/cards.js';

test('zona de lançamento ocupa somente as duas casas ao redor do reino', () => {
  assert.equal(isDeploymentCell(1, 6, 11), true);
  assert.equal(isDeploymentCell(1, 6, 10), true);
  assert.equal(isDeploymentCell(1, 6, 9), false);
  assert.equal(isDeploymentCell(1, 6, 12), false);
  assert.equal(isDeploymentCell(2, 8, 3), true);
  assert.equal(isDeploymentCell(2, 8, 4), true);
  assert.equal(deploymentDistance(2, { x: 8, z: 5 }), 3);
});

test('torre expõe construção e rajada cardinal', () => {
  assert.equal(CARD_BY_ID.tower.hp, 5);
  assert.equal(CARD_BY_ID.tower.cost, 7);
  assert.equal(CARD_BY_ID.tower.buildRounds, 2);
  assert.deepEqual(
    { cost: CARD_BY_ID.tower.instant.cost, range: CARD_BY_ID.tower.instant.range, damage: CARD_BY_ID.tower.instant.damage },
    { cost: 2, range: 3, damage: 2 }
  );
});
