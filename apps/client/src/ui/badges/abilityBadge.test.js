import test from 'node:test';
import assert from 'node:assert/strict';
import { abilityTriggerForUnit } from './abilityBadge.js';

function unit(cardId, extras = {}) {
  return { userData: { cardId, ...extras } };
}

test('todas as habilidades ativas possuem acionador visual', () => {
  assert.equal(abilityTriggerForUnit(unit('mage')), 'acid');
  assert.equal(abilityTriggerForUnit(unit('tower')), 'tower');
  assert.equal(abilityTriggerForUnit(unit('goblin_tower')), 'goblin_tower');
  assert.equal(abilityTriggerForUnit(unit('goblin_house')), 'goblin_house');
  assert.equal(abilityTriggerForUnit(unit('goblin_altar')), 'goblin_altar');
  assert.equal(abilityTriggerForUnit(unit('mage_altar')), 'mage_altar');
  assert.equal(abilityTriggerForUnit(unit('goblin_bomber')), 'goblin_bomber');
  assert.equal(abilityTriggerForUnit(unit('goblin', { isGoblinClone: true })), 'goblin_clone');
  assert.equal(abilityTriggerForUnit(unit('warrior')), null);
});
