import test from 'node:test';
import assert from 'node:assert/strict';
import { abilityBadgeTypeForUnit, abilityTriggerForUnit } from './abilityBadge.js';

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

test('somente construções e terrenos passivos mantêm ícone informativo', () => {
  assert.equal(abilityBadgeTypeForUnit(unit('henry')), null);
  assert.equal(abilityBadgeTypeForUnit(unit('citizen')), null);
  assert.equal(abilityBadgeTypeForUnit(unit('wooden_house')), 'wooden_house_lodging');
  assert.equal(abilityBadgeTypeForUnit(unit('goblin')), null);
  assert.equal(abilityBadgeTypeForUnit(unit('builder_area')), 'builder_workshop');
  assert.equal(abilityBadgeTypeForUnit(unit('road')), 'road_path');
  assert.equal(abilityBadgeTypeForUnit(unit('cobblestone_road')), 'cobblestone_path');
  assert.equal(abilityBadgeTypeForUnit(unit('warrior')), null);
});
