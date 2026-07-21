import { setTowerConstructionState, setWoodBarrierConstructionState, setWoodenHouseConstructionState } from '../models/unitModels.js';
import { setCannonConstructionState } from '../assets/models/cannonModel.js';

export function isMountedArcher(unit) {
  return unit?.userData.cardId === 'archer' && Boolean(unit.userData.mountedOnTowerId);
}

export function setAttackHighlight(unit, highlighted) {
  const ring = unit.getObjectByName('selectionRing');
  if (!ring) return;
  if (ring.userData.baseColor === undefined) ring.userData.baseColor = ring.material.color.getHex();
  const color = highlighted ? 0xff2d20 : ring.userData.baseColor;
  ring.material.color.setHex(color);
  ring.material.emissive.setHex(color);
  ring.material.emissiveIntensity = highlighted ? 1.65 : (ring.userData.baseEmissiveIntensity ?? 0.75);
  unit.userData.attackHighlighted = highlighted;
}

export function setUnitTeamColor(unit, color) {
  const ring = unit.getObjectByName('selectionRing');
  const platform = unit.getObjectByName('teamPlatform');
  [ring, platform].filter(Boolean).forEach(part => {
    part.material.color.setHex(color);
    part.material.emissive.setHex(color);
  });
  if (ring) {
    ring.userData.baseColor = color;
    ring.userData.baseEmissiveIntensity = 0.9;
    ring.material.emissiveIntensity = 0.9;
  }
  if (platform) {
    platform.userData.baseColor = color;
    platform.material.emissiveIntensity = 0.62;
  }
}

export function applyConstructionState(unit, underConstruction, units, app) {
  unit.userData.underConstruction = underConstruction;
  if (unit.userData.cardId === 'wooden_barrier') setWoodBarrierConstructionState(unit, underConstruction);
  if (unit.userData.cardId === 'tower') setTowerConstructionState(unit, underConstruction);
  if (unit.userData.cardId === 'cannon') setCannonConstructionState(unit, underConstruction);
  if (unit.userData.cardId === 'wooden_house') setWoodenHouseConstructionState(unit, underConstruction);
  app.dataset.constructions = String(units.filter(item => item.userData.underConstruction).length);
}
