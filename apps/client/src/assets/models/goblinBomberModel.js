import * as THREE from 'three';
import { U } from './unitModelKit.js';
import { C, block, bootsAndLegs, creatureBase, goblinHead, mesh, orb, plate, rivets, rod, wrappedHand } from './creatureMiniatureKit.js';

export function makeGoblinBomber() {
  const { root, rig } = creatureBase('Goblin Bombardeiro', 'GOBLIN · BOMBARDEIRO', 0x806046);
  bootsAndLegs(rig, 'bomber', { stride: 0.07 });
  mesh(rig, 'bomberLeatherCoat', new THREE.CylinderGeometry(0.28, 0.34, 0.58, 9), C.hideDark,
    [0, 0.83, 0.015], [0.11, 0, 0], [1, 1, 0.72]);
  plate(rig, 'bomberBlastApron', C.scrap,
    [[-0.24, 0.24], [-0.28, -0.21], [-0.15, -0.31], [0.03, -0.25], [0.22, -0.3], [0.27, 0.22]],
    [0, 0.825, -0.235], 0.04, [0.08, 0, 0.04]);
  block(rig, 'bomberApronPatch', C.powder, [0.14, 0.13, 0.028], [-0.065, 0.69, -0.274], [0, 0, -0.16]);
  rivets(rig, 'bomberApronRivet', [[-0.19, 0.99, -0.265], [0.19, 0.97, -0.265], [-0.16, 0.59, -0.289], [0.16, 0.59, -0.286]]);
  for (const side of [-1, 1]) {
    rod(rig, `bomberHarness${side}`, C.hide, [side * 0.19, 1.12, -0.20], [-side * 0.19, 0.65, -0.27], 0.032);
    rod(rig, `bomberArm${side}`, C.skinShade, [side * 0.29, 1.035, -0.01], [side * 0.36, 0.785, -0.16], 0.088);
  }
  wrappedHand(rig, 'bomberLeftHand', [-0.38, 0.77, -0.18]);
  wrappedHand(rig, 'bomberBombHand', [0.36, 0.76, -0.19]);
  const face = goblinHead(rig, { prefix: 'bomber', position: [0, 1.345, -0.1], earLength: 0.82 });
  mesh(face, 'bomberLeatherCap', new THREE.SphereGeometry(0.283, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.43),
    C.hideDark, [0, 0.072, 0.012], [0, 0, -0.05], [1.04, 0.69, 0.93]);
  for (const side of [-1, 1]) {
    mesh(face, `bomberGoggleFrame${side}`, new THREE.TorusGeometry(0.071, 0.018, 6, 12), U.bronze,
      [side * 0.113, 0.049, -0.239], [0, 0, side * 0.1]);
    orb(face, `bomberGoggleLens${side}`, C.amber, [side * 0.113, 0.049, -0.244], [0.052, 0.046, 0.012]);
  }
  rod(face, 'bomberGoggleBridge', C.scrap, [-0.043, 0.055, -0.25], [0.043, 0.055, -0.25], 0.014);

  const backpack = new THREE.Group();
  backpack.name = 'bomberExplosiveBackpack';
  backpack.position.set(0, 0.88, 0.285);
  rig.add(backpack);
  block(backpack, 'bomberPackFrame', C.hideDark, [0.50, 0.70, 0.12], [0, 0, 0]);
  for (const [index, x] of [-0.19, 0, 0.19].entries()) {
    const y = index === 1 ? 0.07 : -0.015;
    mesh(backpack, `bomberPowderCanister${index}`, new THREE.CylinderGeometry(0.10, 0.105, 0.58, 9), C.powder,
      [x, y, 0.14], [0, 0, (index - 1) * -0.07]);
    for (const bandY of [-0.17, 0.19]) mesh(backpack, `bomberCanisterBand${index}-${bandY}`,
      new THREE.CylinderGeometry(0.112, 0.112, 0.047, 9), C.scrap, [x, y + bandY, 0.14]);
    mesh(backpack, `bomberCanisterCap${index}`, new THREE.CylinderGeometry(0.053, 0.063, 0.057, 8), U.bronze,
      [x, y + 0.32, 0.14]);
    rod(backpack, `bomberPackFuse${index}`, C.bone, [x, y + 0.345, 0.14], [x * 0.7, y + 0.42, 0.185], 0.013, 6);
  }
  rod(backpack, 'bomberPackCrossBrace', C.hide, [-0.27, -0.26, 0.28], [0.27, 0.23, 0.28], 0.029);
  orb(backpack, 'bomberSpareBomb', C.soot, [0, -0.285, 0.15], [0.19, 0.17, 0.17]);
  mesh(backpack, 'bomberBackpackSeal', new THREE.CylinderGeometry(0.064, 0.064, 0.029, 8), U.bronze,
    [0, -0.04, 0.275], [Math.PI / 2, 0, 0]);

  const bomb = orb(rig, 'goblinBomb', C.soot, [0.455, 0.765, -0.29], [0.255, 0.25, 0.245]);
  mesh(bomb, 'bomberBombSeam', new THREE.TorusGeometry(0.98, 0.055, 5, 16), C.scrap, [0, 0, 0], [0, 0, 0.28]);
  mesh(rig, 'bomberBombSocket', new THREE.CylinderGeometry(0.060, 0.076, 0.082, 9), U.bronze,
    [0.455, 1.035, -0.29], [0, 0, -0.1]);
  rod(rig, 'bomberHandFuseStem', C.bone, [0.455, 1.07, -0.29], [0.52, 1.155, -0.30], 0.014, 6);
  rod(rig, 'bomberHandFuseTip', C.bone, [0.52, 1.155, -0.30], [0.555, 1.13, -0.32], 0.013, 6);
  const ember = mesh(rig, 'bomberFuseEmber', new THREE.OctahedronGeometry(0.034), C.ember, [0.56, 1.135, -0.32]);
  ember.castShadow = false;
  block(rig, 'bomberBeltPouch', C.hide, [0.16, 0.20, 0.13], [-0.32, 0.63, 0.03], [0, 0, 0.1]);
  return root;
}
