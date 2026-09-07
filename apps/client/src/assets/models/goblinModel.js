import * as THREE from 'three';
import { U } from './unitModelKit.js';
import { C, block, bootsAndLegs, creatureBase, goblinHead, hookedBlade, mesh, orb, plate, rivets, rod, shoulderScrap, wrappedHand } from './creatureMiniatureKit.js';

export function makeGoblin() {
  const { root, rig } = creatureBase('Goblin', 'GOBLIN · SAQUEADOR', 0x536541);
  bootsAndLegs(rig, 'goblin', { stride: 0.055 });
  mesh(rig, 'goblinTunic', new THREE.CylinderGeometry(0.30, 0.34, 0.61, 9), C.hide,
    [0, 0.825, 0.03], [0.075, 0, 0.025], [1, 1, 0.7]);
  orb(rig, 'goblinHunchedBack', C.hideDark, [0, 1.085, 0.085], [0.29, 0.19, 0.24]);
  plate(rig, 'goblinTatteredHem', C.hideDark,
    [[-0.28, 0.12], [-0.29, -0.08], [-0.18, -0.045], [-0.10, -0.18], [0, -0.09], [0.09, -0.15], [0.27, -0.02], [0.28, 0.12]],
    [0, 0.61, -0.222], 0.02);
  block(rig, 'goblinBelt', C.hideDark, [0.58, 0.10, 0.46], [0, 0.78, 0.025], [0, 0, 0.035]);
  block(rig, 'goblinBeltBuckle', U.bronze, [0.11, 0.11, 0.04], [0.055, 0.78, -0.231]);
  block(rig, 'goblinBuckleInset', C.soot, [0.056, 0.055, 0.014], [0.055, 0.78, -0.26]);
  const face = goblinHead(rig, { eyepatch: true });
  face.rotation.z = -0.07;
  shoulderScrap(rig, 'goblin', -1);
  rod(rig, 'goblinWeaponArm', C.skin, [0.27, 1.035, -0.04], [0.46, 0.81, -0.21], 0.088);
  rod(rig, 'goblinFreeArm', C.skinShade, [-0.29, 1.035, -0.015], [-0.405, 0.78, -0.19], 0.084);
  wrappedHand(rig, 'goblinFreeHand', [-0.405, 0.75, -0.21]);
  hookedBlade(rig, 'goblinDagger', [0.46, 0.81, -0.21], [-0.09, 0.06, -0.35]);
  rod(rig, 'goblinSackStrap', C.hideDark, [0.225, 1.12, -0.204], [-0.38, 0.74, -0.208], 0.033);
  rivets(rig, 'goblinStrapStud', [[0.15, 1.065, -0.234], [-0.08, 0.92, -0.235]], U.bronze);
  const sack = orb(rig, 'goblinLootSack', C.hide, [-0.37, 0.66, 0.15], [0.205, 0.27, 0.19]);
  sack.rotation.z = -0.17;
  mesh(rig, 'goblinSackNeck', new THREE.CylinderGeometry(0.07, 0.12, 0.15, 7), C.hide,
    [-0.37, 0.95, 0.15], [0, 0, -0.17]);
  mesh(rig, 'goblinSackTie', new THREE.TorusGeometry(0.085, 0.016, 5, 12), C.bone,
    [-0.37, 0.935, 0.15], [Math.PI / 2, 0, -0.17]);
  for (let index = 0; index < 4; index += 1) block(rig, `goblinSackStitch${index}`,
    C.bone, [0.038, 0.015, 0.012], [-0.38, 0.53 + index * 0.072, -0.041], [0, 0, 0.2]);
  mesh(rig, 'goblinStolenCoin', new THREE.CylinderGeometry(0.06, 0.06, 0.02, 10), U.bronze,
    [-0.33, 1.02, 0.14], [0.15, 0, 0.38]);
  return root;
}
