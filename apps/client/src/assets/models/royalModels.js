import * as THREE from 'three';
import { add } from '../../core/scenePrimitives.js';
import { makeTower } from './towerModel.js';
import { makeWarrior } from './warriorModel.js';

const royalGold = new THREE.MeshStandardMaterial({
  color: 0xa77a32,
  emissive: 0x432408,
  emissiveIntensity: 0.14,
  roughness: 0.48,
  metalness: 0.72,
  flatShading: true,
});
const royalRed = new THREE.MeshStandardMaterial({
  color: 0x4c1721,
  roughness: 0.92,
  metalness: 0.02,
  flatShading: true,
  side: THREE.DoubleSide,
});
const blackIron = new THREE.MeshStandardMaterial({
  color: 0x24272b,
  roughness: 0.58,
  metalness: 0.62,
  flatShading: true,
});

function addCrown(parent, position, scale = 1) {
  const crown = new THREE.Group();
  crown.name = 'royalCrown';
  crown.position.fromArray(position);
  crown.scale.setScalar(scale);
  add(new THREE.CylinderGeometry(0.2, 0.23, 0.1, 8), royalGold, crown, [0, 0, 0]);
  for (let index = 0; index < 5; index += 1) {
    const angle = index / 5 * Math.PI * 2;
    add(
      new THREE.ConeGeometry(0.065, 0.25, 4),
      royalGold,
      crown,
      [Math.sin(angle) * 0.16, 0.15, Math.cos(angle) * 0.16],
      [0, angle, 0],
    );
  }
  parent.add(crown);
  return crown;
}

export function makeRoyalWarrior() {
  const root = makeWarrior();
  root.name = 'Guerreiro Real';
  root.userData.name = root.name;
  root.userData.role = 'HUMANO · GUERREIRO REAL';
  const rig = root.getObjectByName('rig');
  if (!rig) return root;

  addCrown(rig, [0, 2.18, -0.02], 0.74);
  const cloak = add(
    new THREE.PlaneGeometry(0.86, 1.12, 1, 2),
    royalRed,
    rig,
    [0, 1.24, 0.27],
    [-0.14, 0, 0],
  );
  cloak.name = 'royalWarriorCloak';
  add(new THREE.TorusGeometry(0.2, 0.035, 6, 16, Math.PI), royalGold, rig, [0, 1.74, -0.12], [Math.PI / 2, 0, 0]);
  [-1, 1].forEach(side => {
    const pauldron = add(
      new THREE.DodecahedronGeometry(0.2, 0),
      blackIron,
      rig,
      [side * 0.39, 1.58, 0],
    );
    pauldron.scale.set(1.18, 0.66, 0.92);
    add(new THREE.BoxGeometry(0.05, 0.08, 0.27), royalGold, pauldron, [0, 0.02, 0]);
  });
  return root;
}

export function makeRoyalTower() {
  const root = makeTower();
  root.name = 'Torre Real';
  root.userData.name = root.name;
  root.userData.role = 'CONSTRUÇÃO · TORRE REAL';
  const built = root.getObjectByName('towerBuiltParts');
  if (!built) return root;

  addCrown(built, [0, 2.05, 0], 0.95);
  [-1, 1].forEach(side => {
    const pole = add(new THREE.CylinderGeometry(0.025, 0.03, 0.9, 6), blackIron, built, [side * 0.56, 1.94, 0]);
    pole.name = 'royalTowerBannerPole';
    const banner = add(
      new THREE.PlaneGeometry(0.34, 0.48),
      royalRed,
      built,
      [side * 0.56, 1.78, 0.02],
      [0, 0, 0],
    );
    banner.name = 'royalTowerBanner';
    add(new THREE.BoxGeometry(0.08, 0.08, 0.025), royalGold, banner, [0, 0.06, 0.02]);
  });
  return root;
}
