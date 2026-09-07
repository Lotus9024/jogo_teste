import * as THREE from 'three';
import { M, U, human, mesh, oval, tailoredTorso, profile, arm, legs, face, belt, foldedCape } from './humanMiniatureKit.js';

export function makeWarrior() {
  const { root, rig } = human('Guerreiro', 'GUERREIRO', 0x853342, { hp: 3, damage: 2, move: 2 });
  legs(rig, 'warrior', { armored: true, stance: 0.22 });
  tailoredTorso(rig, 'warriorTunic', U.redCloth, { width: 1.03 });
  foldedCape(rig, 'warriorBattleMantle', U.redCloth, { bottom: 0.69, width: 0.43 });
  for (const side of [-1, 1]) {
    profile(rig, 'warriorSplitTabard', [[-0.12, 0.18], [0.12, 0.18], [0.13, -0.22], [0, -0.29], [-0.11, -0.21]],
      0.03, U.redCloth, [side * 0.15, 0.77, 0.235], [0.07, 0, side * -0.08], 0.007);
  }
  profile(rig, 'warriorBreastplate', [[0, -0.29], [-0.25, -0.14], [-0.32, 0.22], [-0.18, 0.30], [0.18, 0.30], [0.32, 0.22], [0.25, -0.14]],
    0.075, U.plateDark, [0, 1.32, 0.20]);
  profile(rig, 'warriorBreastplateRidge', [[-0.026, -0.23], [0.026, -0.23], [0.045, 0.20], [0, 0.25], [-0.045, 0.20]],
    0.025, U.plate, [0, 1.32, 0.258]);
  belt(rig, 'warrior', 1.01, 0.31);
  arm(rig, 'warriorFree', [-0.34, 1.49, 0], [-0.48, 1.20, 0.02], [-0.43, 0.99, 0.16], M.leather, U.plateDark);
  arm(rig, 'warriorWeapon', [0.34, 1.49, 0], [0.50, 1.23, 0.02], [0.53, 1.18, 0.25], M.leather, U.plateDark).removeFromParent();
  for (const side of [-1, 1]) {
    oval(rig, 'warriorPauldron', [side * 0.40, 1.51, 0], [0.225, 0.15, 0.26], U.plateDark);
    for (let tier = 0; tier < 2; tier += 1) {
      profile(rig, 'warriorShoulderLame', [[-0.14, 0.035], [0.14, 0.035], [0.10, -0.065], [-0.10, -0.065]], 0.045,
        tier ? U.plateDark : U.plate, [side * (0.43 + tier * 0.025), 1.48 - tier * 0.08, 0.12], [0.1, side * 0.13, side * 0.28]);
    }
  }
  face(rig, 'warrior', 1.91, { beard: true });
  mesh(rig, 'warriorHelmet', new THREE.SphereGeometry(0.258, 12, 7, 0, Math.PI * 2, 0, Math.PI * 0.57), U.plateDark, [0, 2.01, 0]);
  for (const side of [-1, 1]) {
    profile(rig, 'warriorHelmetCheek', [[-0.065, 0.11], [0.065, 0.11], [0.055, -0.08], [0, -0.17], [-0.07, -0.09]],
      0.025, U.plate, [side * 0.18, 1.91, 0.14], [0, side * -0.5, 0]);
  }
  profile(rig, 'warriorHelmetCrest', [[-0.22, -0.05], [0.23, -0.05], [0.18, 0.18], [0.02, 0.28], [-0.2, 0.14]],
    0.065, U.redCloth, [0, 2.27, -0.03], [0, Math.PI / 2, 0]);
  const sword = new THREE.Group();
  sword.name = 'warriorSword';
  sword.position.set(0.53, 1.18, 0.25);
  sword.rotation.z = -0.16;
  mesh(sword, 'swordGrip', new THREE.CylinderGeometry(0.043, 0.048, 0.32, 8), M.leather, [0, 0, 0]);
  oval(sword, 'warriorSwordHand', [0, -0.04, 0], [0.092, 0.10, 0.083], M.skin);
  oval(sword, 'swordPommel', [0, -0.24, 0], [0.075, 0.09, 0.055], U.bronze);
  profile(sword, 'swordGuard', [[-0.22, -0.025], [-0.2, 0.055], [-0.065, 0.09], [0.065, 0.09], [0.2, 0.055], [0.22, -0.025]],
    0.065, U.bronze, [0, 0.18, 0]);
  profile(sword, 'swordBlade', [[-0.085, 0], [0.085, 0], [0.085, 0.60], [0, 0.83], [-0.085, 0.60]],
    0.035, U.plate, [0, 0.25, 0], [0, 0, 0], 0.007);
  mesh(sword, 'swordFuller', new THREE.BoxGeometry(0.018, 0.52, 0.005), U.plateDark, [0, 0.54, 0.023]);
  rig.add(sword);
  return root;
}
