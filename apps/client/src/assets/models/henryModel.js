import * as THREE from 'three';
import { U } from './unitModelKit.js';
import { C, block, bootsAndLegs, creatureBase, goblinHead, hookedBlade, mesh, plate, rivets, rod, shoulderScrap } from './creatureMiniatureKit.js';

export function makeHenry() {
  // Keep the legacy presentation role; createCardUnit applies the catalog role.
  const { root, rig } = creatureBase('Henry', 'HUMANO · ÁGIL', 0x8b793f);
  bootsAndLegs(rig, 'henry', { stride: 0.105, lean: 0.025 });
  mesh(rig, 'henryScoutCoat', new THREE.CylinderGeometry(0.255, 0.30, 0.57, 10), U.greenCloth,
    [0.015, 0.84, 0], [0.035, 0, -0.05], [1, 1, 0.71]);
  plate(rig, 'henryCoatTailLeft', U.greenCloth,
    [[-0.14, 0.17], [-0.19, -0.16], [0, -0.29], [0.09, 0.16]],
    [-0.15, 0.63, 0.14], 0.025, [0.21, -0.18, -0.08]);
  plate(rig, 'henryCoatTailRight', C.hideDark,
    [[-0.11, 0.16], [-0.06, -0.19], [0.18, -0.24], [0.15, 0.14]],
    [0.15, 0.63, 0.14], 0.025, [0.15, 0.18, 0.1]);
  block(rig, 'henryCrossBelt', C.hideDark, [0.105, 0.61, 0.045], [0, 0.88, -0.218], [0, 0, -0.51]);
  block(rig, 'henryWaistBelt', C.hide, [0.535, 0.078, 0.44], [0.013, 0.715, 0]);
  block(rig, 'henryBuckle', U.bronze, [0.12, 0.095, 0.034], [0.03, 0.715, -0.24]);
  rivets(rig, 'henryBeltStud', [[0.12, 0.96, -0.25], [-0.085, 0.78, -0.25]]);
  shoulderScrap(rig, 'henry', 1, 1.07);
  const face = goblinHead(rig, { prefix: 'henry', position: [0.025, 1.38, -0.045], skin: C.ashSkin, earLength: 0.68 });
  face.rotation.y = -0.09;
  // Split hood panels leave the sculpted face and ears readable from the game camera.
  mesh(face, 'henryHoodBack', new THREE.SphereGeometry(0.291, 12, 8, 0, Math.PI),
    U.greenCloth, [0, 0.025, 0.035], [0, 0, 0], [1.05, 1.08, 0.95]);
  mesh(face, 'henryHoodCrown', new THREE.SphereGeometry(0.286, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.47),
    U.greenCloth, [0, 0.11, 0.028], [0.05, 0, -0.035], [1.04, 0.72, 0.96]);
  plate(face, 'henryHoodBrow', U.greenCloth,
    [[-0.245, 0.05], [-0.13, 0.12], [0.09, 0.11], [0.24, 0.04], [0.105, -0.017], [-0.13, -0.005]],
    [0, 0.13, -0.2], 0.038);
  const scarf = mesh(rig, 'henryScarf', new THREE.TorusGeometry(0.22, 0.063, 6, 15), U.tanCloth,
    [0.015, 1.18, -0.025], [Math.PI / 2, 0, 0], [1, 1, 0.9]);
  scarf.userData.fabric = true;
  plate(rig, 'henryScarfTail', U.tanCloth,
    [[-0.07, 0.14], [-0.09, -0.04], [0.06, -0.29], [0.19, -0.23], [0.13, -0.07], [0.07, 0.14]],
    [-0.22, 1.105, 0.11], 0.016, [-0.24, -0.17, 0.23]);
  for (const side of [-1, 1]) {
    const hand = [side * 0.475, 0.85 + side * 0.035, -0.24];
    rod(rig, `henryUpperArm${side}`, U.greenCloth, [side * 0.255, 1.09, -0.02], [side * 0.35, 0.89, -0.15], 0.076);
    rod(rig, `henryForearm${side}`, C.ashSkin, [side * 0.35, 0.89, -0.15], hand, 0.068);
    rod(rig, `henryBracer${side}`, C.hideDark, [side * 0.365, 0.883, -0.17], [side * 0.434, hand[1] + 0.01, -0.22], 0.082);
    hookedBlade(rig, side < 0 ? 'henryLeftBlade' : 'henryRightBlade', hand,
      [side * 0.13, side * -0.1, side * -0.40], { length: side < 0 ? 0.43 : 0.58, skin: C.ashSkin });
  }
  block(rig, 'henryThrowingKnifeSheath', C.hideDark, [0.095, 0.32, 0.09], [0.235, 0.69, 0.20], [0, 0, -0.25]);
  rod(rig, 'henryThrowingKnifeGrip', U.bronze, [0.26, 0.80, 0.20], [0.285, 0.91, 0.20], 0.024);
  return root;
}
