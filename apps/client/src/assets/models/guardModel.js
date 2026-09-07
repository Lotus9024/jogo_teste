import * as THREE from 'three';
import { M, U, human, mesh, oval, tailoredTorso, profile, arm, legs, face, belt, foldedCape } from './humanMiniatureKit.js';

export function makeGuard() {
  const { root, rig } = human('Guarda', 'GUARDA', 0x354f74, { hp: 4, damage: 1, move: 1 });
  legs(rig, 'guard', { armored: true, stance: 0.19 });
  tailoredTorso(rig, 'guardCoat', U.blueCloth, { y: 1.21, height: 0.88, width: 1.02 });
  foldedCape(rig, 'guardWatchCloak', U.blueCloth, { top: 1.58, bottom: 0.58, width: 0.48 });
  profile(rig, 'guardCuirass', [[-0.26, -0.25], [0.26, -0.25], [0.31, 0.18], [0.20, 0.27], [-0.20, 0.27], [-0.31, 0.18]],
    0.065, U.plate, [0, 1.35, 0.21]);
  for (let row = 0; row < 3; row += 1) {
    profile(rig, 'guardFauldPlate', [[-0.28, 0.035], [0.28, 0.035], [0.26, -0.05], [-0.26, -0.05]], 0.03,
      U.plateDark, [0, 1.11 - row * 0.09, 0.22]);
  }
  belt(rig, 'guard', 0.97, 0.315);
  arm(rig, 'guardShieldArm', [-0.33, 1.53, 0], [-0.49, 1.31, 0.02], [-0.48, 1.18, 0.23], U.blueCloth, U.plateDark).removeFromParent();
  arm(rig, 'guardSpearArm', [0.33, 1.53, 0], [0.49, 1.26, 0.04], [0.56, 1.16, 0.14], U.blueCloth, U.plateDark).removeFromParent();
  for (const side of [-1, 1]) {
    oval(rig, 'guardPauldron', [side * 0.39, 1.59, 0], [0.22, 0.14, 0.25], U.plate);
    profile(rig, 'guardShoulderFlange', [[-0.12, 0.02], [0.12, 0.02], [0.1, -0.10], [-0.1, -0.10]],
      0.04, U.plateDark, [side * 0.45, 1.46, 0.16], [0, 0, side * 0.18]);
  }
  face(rig, 'guard', 1.99);
  mesh(rig, 'guardHelmet', new THREE.SphereGeometry(0.272, 12, 7, 0, Math.PI * 2, 0, Math.PI * 0.70), U.plateDark, [0, 2.07, -0.015]);
  profile(rig, 'guardVisor', [[-0.215, 0.075], [0.215, 0.075], [0.19, -0.06], [0.07, -0.18], [-0.07, -0.18], [-0.19, -0.06]],
    0.035, U.plate, [0, 2.035, 0.21]);
  mesh(rig, 'guardVisorSlit', new THREE.BoxGeometry(0.32, 0.028, 0.013), U.black, [0, 2.059, 0.248]);
  profile(rig, 'guardHelmetRidge', [[-0.19, -0.03], [0.20, -0.03], [0.17, 0.10], [0, 0.16], [-0.17, 0.09]],
    0.045, U.bronze, [0, 2.33, 0], [0, Math.PI / 2, 0]);

  const shield = new THREE.Group();
  shield.name = 'guardShield';
  shield.position.set(-0.46, 1.21, 0.31);
  shield.rotation.set(-0.04, -0.15, 0.04);
  const outline = [[-0.34, 0.42], [-0.19, 0.57], [0, 0.52], [0.19, 0.57], [0.34, 0.42], [0.31, -0.23], [0, -0.62], [-0.31, -0.23]];
  profile(shield, 'shieldIronRim', outline, 0.085, U.plateDark, [0, 0, 0]);
  profile(shield, 'shieldFace', outline.map(([x, y]) => [x * 0.84, y * 0.88]), 0.025, U.blueCloth, [0, 0, 0.065]);
  profile(shield, 'shieldSpine', [[-0.027, -0.49], [0.027, -0.49], [0.035, 0.45], [-0.035, 0.45]], 0.03, U.bronze, [0, 0, 0.092]);
  profile(shield, 'guardHeraldicChevron', [[-0.22, 0.21], [0, 0.08], [0.22, 0.21], [0.22, 0.11], [0, -0.03], [-0.22, 0.11]], 0.025, U.bronze, [0, 0.04, 0.09]);
  oval(shield, 'shieldBoss', [0, 0.13, 0.12], [0.09, 0.11, 0.065], U.plate);
  for (const [x, y] of [[-0.26, 0.38], [0.26, 0.38], [-0.22, -0.21], [0.22, -0.21]]) {
    mesh(shield, 'shieldRivet', new THREE.OctahedronGeometry(0.023), U.bronze, [x, y, 0.062]);
  }
  oval(shield, 'guardShieldHand', [0, -0.07, -0.10], [0.095, 0.1, 0.08], M.skin);
  rig.add(shield);

  const spear = new THREE.Group();
  spear.name = 'guardSpear';
  spear.position.set(0.56, 1.49, 0.14);
  spear.rotation.z = -0.025;
  mesh(spear, 'guardSpearShaft', new THREE.CylinderGeometry(0.035, 0.04, 2.32, 8), M.wood, [0, 0, 0]);
  mesh(spear, 'guardSpearSocket', new THREE.CylinderGeometry(0.055, 0.035, 0.17, 8), U.plateDark, [0, 1.14, 0]);
  profile(spear, 'guardSpearBlade', [[0, 0.44], [0.115, 0.16], [0.04, 0], [-0.04, 0], [-0.115, 0.16]],
    0.035, U.plate, [0, 1.22, 0], [0, 0, 0], 0.008);
  oval(spear, 'guardSpearHand', [0, -0.33, 0], [0.082, 0.105, 0.08], M.skin);
  rig.add(spear);
  return root;
}
