import * as THREE from 'three';
import { M, add } from '../core/scenePrimitives.js';
import { ensureHealthBadge } from '../ui/unitHealthBadge.js';
import { makeCannon } from '../assets/models/cannonModel.js';
import { makeOperator } from '../assets/models/operatorModel.js';
import { makeArcher, makeGuard, makeTower, makeWarrior, makeWoodBarrier, makeWoodenHouse, unitBase } from './unitModels.js';

const UNIT_FACTORIES = Object.freeze({
  warrior: makeWarrior,
  guard: makeGuard,
  archer: makeArcher,
  wooden_barrier: makeWoodBarrier,
  tower: makeTower,
  operator: makeOperator,
  cannon: makeCannon,
  wooden_house: makeWoodenHouse
});

export const UNIT_MODEL_SCALE = 0.55;

function createFallbackUnit(card) {
  const colors = { common: 0x858a85, uncommon: 0x628c67, rare: 0x5186a8, epic: 0x8d5ab0, legendary: 0xc68a34 };
  const color = colors[card.rarityClass];
  const unit = new THREE.Group();
  unitBase(unit, color);
  const rig = new THREE.Group();
  rig.name = 'rig';
  rig.position.y = 0.18;
  unit.add(rig);
  const material = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.12, roughness: 0.55, metalness: 0.35 });
  add(new THREE.CylinderGeometry(0.32, 0.44, 0.95, 18), M.darkLeather, rig, [0, 0.68, 0]);
  add(new THREE.OctahedronGeometry(0.38, 1), material, rig, [0, 1.5, 0]);
  add(new THREE.TorusGeometry(0.35, 0.045, 10, 32), M.gold, rig, [0, 1.5, 0], [Math.PI / 2, 0, 0]);
  return unit;
}

export function createCardUnit(card, cardIndex) {
  const unit = UNIT_FACTORIES[card.id]?.() ?? createFallbackUnit(card);
  unit.name = card.name;
  unit.userData = {
    ...unit.userData,
    selectable: true,
    hoverable: true,
    cardId: card.id,
    cardIndex,
    name: card.name,
    role: card.info,
    hp: card.hp,
    maxHp: card.hp,
    damage: card.damage,
    move: card.move,
    movementType: card.movementType,
    minAttackRange: card.minAttackRange,
    attackRange: card.attackRange,
    areaRadius: card.areaRadius,
    cardType: card.type,
    buildRounds: card.buildRounds,
    cost: card.cost,
    ability: card.ability,
    abilityUsed: false,
    description: card.abilityText
  };
  unit.scale.setScalar(UNIT_MODEL_SCALE);
  if (card.hp !== null) ensureHealthBadge(unit);
  return unit;
}
