import * as THREE from 'three';
import { M, U, human, mesh, oval, tailoredTorso, profile, arm, legs, face, belt } from './humanMiniatureKit.js';

export function makeOperator() {
  const { root, rig } = human('Operador', 'OPERADOR', 0x977947, { hp: 1, damage: 0, move: 1 });
  legs(rig, 'operator', { material: U.tanCloth, stance: 0.20 });
  tailoredTorso(rig, 'operatorShirt', U.tanCloth, { y: 1.16, height: 0.79, width: 1.07, depth: 1.09 });
  profile(rig, 'operatorLeatherApron', [[-0.22, 0.40], [0.22, 0.40], [0.24, 0.09], [0.32, -0.36], [0.04, -0.41], [0, -0.34], [-0.04, -0.41], [-0.32, -0.36]],
    0.045, M.leather, [0, 1.07, 0.26], [0.06, 0, 0]);
  for (const side of [-1, 1]) {
    profile(rig, 'operatorApronSuspender', [[-0.037, -0.20], [0.037, -0.20], [0.035, 0.20], [-0.035, 0.20]], 0.022, M.darkLeather,
      [side * 0.20, 1.44, 0.17], [0.28, 0, side * -0.3], 0.004);
  }
  belt(rig, 'operator', 1.00, 0.32);
  profile(rig, 'operatorApronPocket', [[-0.16, 0.08], [0.16, 0.08], [0.14, -0.09], [-0.14, -0.09]],
    0.035, M.darkLeather, [0, 1.16, 0.31]);
  for (const side of [-1, 1]) {
    oval(rig, 'operatorToolPouch', [side * 0.34, 0.97, 0.08], [0.13, 0.19, 0.12], M.leather);
  }
  arm(rig, 'operatorLeft', [-0.36, 1.46, 0], [-0.46, 1.20, 0.08], [-0.40, 1.03, 0.26], U.tanCloth, M.skin);
  arm(rig, 'operatorRight', [0.36, 1.46, 0], [0.50, 1.20, 0.04], [0.50, 0.95, 0.19], U.tanCloth, M.skin);
  face(rig, 'operator', 1.87, { beard: true });
  mesh(rig, 'operatorCapCrown', new THREE.SphereGeometry(0.29, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), M.leather, [0, 2.04, -0.01], [0.07, 0, -0.05], [1, 0.65, 1]);
  mesh(rig, 'operatorCapBand', new THREE.CylinderGeometry(0.282, 0.288, 0.07, 12), M.darkLeather, [0, 2.04, -0.01]);
  profile(rig, 'operatorCapBrim', [[-0.25, 0.06], [0.25, 0.06], [0.29, -0.10], [0.14, -0.20], [-0.14, -0.20], [-0.29, -0.10]],
    0.028, M.leather, [0, 2.022, 0.20], [Math.PI / 2, 0, 0], 0.009);
  mesh(rig, 'operatorGoggleStrap', new THREE.TorusGeometry(0.21, 0.025, 5, 12), M.darkLeather, [0, 1.925, 0], [Math.PI / 2, 0, 0], [1.10, 1, 1]);
  for (const side of [-1, 1]) {
    mesh(rig, 'operatorGoggleFrame', new THREE.TorusGeometry(0.077, 0.020, 6, 12), U.bronze, [side * 0.098, 1.948, 0.201]);
    oval(rig, 'operatorGoggleLens', [side * 0.098, 1.948, 0.212], [0.058, 0.056, 0.013], U.plateDark);
  }
  const hammer = new THREE.Group();
  hammer.name = 'operatorForgeHammer';
  hammer.position.set(0.50, 0.95, 0.19);
  hammer.rotation.z = 0.16;
  mesh(hammer, 'operatorHammerHandle', new THREE.CylinderGeometry(0.035, 0.045, 0.62, 8), M.wood, [0, -0.06, 0]);
  profile(hammer, 'operatorHammerHead', [[-0.21, -0.06], [-0.19, 0.10], [0.11, 0.10], [0.20, 0.04], [0.22, -0.05], [0.11, -0.07]],
    0.16, U.plateDark, [0, -0.35, 0], [0, 0, 0], 0.02);
  mesh(hammer, 'operatorHammerStrikingFace', new THREE.BoxGeometry(0.018, 0.13, 0.16), U.plate, [-0.212, -0.335, 0]);
  rig.add(hammer);
  return root;
}
