import {
  animateAbilityBadges,
  ensureAbilityBadge,
  setAbilityBadgeState
} from './badges/abilityBadge.js';
import { ensureBaseHealthBadge, updateHealthBadge } from './badges/healthBadge.js';
import {
  ensureMageFireBadge,
  setMageFireBadgeActive,
  setMageFireBadgeCooling
} from './badges/mageFireBadge.js';

export function ensureHealthBadge(unit) {
  const badge = ensureBaseHealthBadge(unit);
  ensureMageFireBadge(unit);
  ensureAbilityBadge(unit);
  return badge;
}

export {
  animateAbilityBadges,
  ensureAbilityBadge,
  setAbilityBadgeState,
  setMageFireBadgeActive,
  setMageFireBadgeCooling,
  updateHealthBadge
};
