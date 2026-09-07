import * as THREE from 'three';
import { add } from '../../core/scenePrimitives.js';
import { makeTower } from './towerModel.js';
import { makeWarrior } from './warriorModel.js';
import { drapedClothGeometry, profileGeometry } from './miniatureGeometry.js';

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
  add(new THREE.CylinderGeometry(0.24, 0.25, 0.11, 10, 1, true), royalGold, crown, [0, 0, 0]);
  add(new THREE.TorusGeometry(0.245, 0.017, 5, 20), royalGold, crown, [0, -0.05, 0], [Math.PI / 2, 0, 0]);
  for (let index = 0; index < 7; index += 1) {
    const angle = index / 7 * Math.PI * 2;
    add(
      profileGeometry([[-0.065, 0], [-0.06, 0.08], [0, 0.25], [0.06, 0.08], [0.065, 0]], 0.03, 0.005),
      royalGold,
      crown,
      [Math.sin(angle) * 0.23, 0.015, Math.cos(angle) * 0.23],
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

  const frontZ = root.userData.modelFrontZ ?? 1;
  rig.getObjectByName('warriorHelmetCrest')?.removeFromParent();
  rig.getObjectByName('warriorBattleMantle')?.removeFromParent();
  addCrown(rig, [0, 2.26, -0.02], 0.74);
  const cloak = add(
    drapedClothGeometry({ topWidth: 0.56, bottomWidth: 0.86, height: 1.3, folds: 6, sweep: 0.2 }),
    royalRed,
    rig,
    [0, 1.72, -frontZ * 0.24],
    [0, frontZ === 1 ? Math.PI : 0, 0],
  );
  cloak.name = 'royalWarriorCloak';
  const insignia = add(profileGeometry([[0, 0.13], [0.08, 0.015], [0.13, 0], [0.035, -0.045], [0, -0.16], [-0.035, -0.045], [-0.13, 0], [-0.08, 0.015]], 0.025, 0.005), royalGold, rig, [0, 1.36, frontZ * 0.29]);
  insignia.name = 'royalWarriorSunSigil';
  add(new THREE.TorusGeometry(0.2, 0.035, 6, 16, Math.PI), royalGold, rig, [0, 1.74, frontZ * 0.12], [Math.PI / 2, 0, 0]);
  [-1, 1].forEach(side => {
    const pauldron = add(
      new THREE.DodecahedronGeometry(0.2, 0),
      blackIron,
      rig,
      [side * 0.39, 1.58, 0],
    );
    pauldron.scale.set(1.18, 0.66, 0.92);
    add(new THREE.BoxGeometry(0.05, 0.08, 0.27), royalGold, pauldron, [0, 0.02, 0]);
    for (let index = 0; index < 3; index += 1) add(new THREE.ConeGeometry(0.035, 0.14, 5), royalGold, pauldron, [(index - 1) * 0.09, 0.11, 0], [0, 0, side * 0.2]);
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
      drapedClothGeometry({ topWidth: 0.31, bottomWidth: 0.34, height: 0.6, folds: 3, sweep: 0.04 }),
      royalRed,
      built,
      [side * 0.56, 2.04, 0.025],
      [0, 0, 0],
    );
    banner.name = 'royalTowerBanner';
    add(profileGeometry([[0, 0.1], [0.05, 0], [0, -0.1], [-0.05, 0]], 0.02, 0.004), royalGold, banner, [0, -0.22, 0.07]);
  });
  return root;
}
