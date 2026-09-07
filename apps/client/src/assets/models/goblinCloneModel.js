import * as THREE from 'three';
import { makeGoblin } from './goblinModel.js';
import { C, mesh, plate, rod } from './creatureMiniatureKit.js';

export function makeGoblinClone() {
  const root = makeGoblin();
  root.name = 'Clone Goblin';
  root.userData.name = root.name;
  root.userData.role = 'MAGIA · CLONE GOBLIN';
  root.userData.clonePresentation = 'etched-runes';
  // Clone only the affected body materials, never team colors or source materials.
  const replacements = new Map();
  for (const [source, color] of [[C.skin, 0x7c877c], [C.skinShade, 0x465654], [C.hide, 0x55515d]]) {
    const replacement = source.clone();
    replacement.color.setHex(color);
    replacements.set(source, replacement);
  }
  const rig = root.getObjectByName('rig');
  rig.traverse(object => {
    if (object.isMesh && replacements.has(object.material)) object.material = replacements.get(object.material);
  });
  const face = root.getObjectByName('goblinFace');
  for (const [index, from, to] of [
    [0, [0.015, 0.12, -0.226], [0.015, 0.21, -0.185]],
    [1, [0.015, 0.175, -0.20], [-0.036, 0.165, -0.215]],
    [2, [0.015, 0.15, -0.218], [0.06, 0.165, -0.204]],
  ]) rod(face, `cloneForeheadRune${index}`, C.rune, from, to, 0.007, 5);
  const seal = mesh(rig, 'cloneChestSeal', new THREE.TorusGeometry(0.079, 0.009, 5, 12), C.rune,
    [0.095, 0.994, -0.237], [0, 0, 0.18]);
  seal.castShadow = false;
  rod(rig, 'cloneChestRune', C.rune, [0.075, 0.95, -0.243], [0.11, 1.04, -0.243], 0.007, 5);
  for (const side of [-1, 1]) {
    const fragment = plate(rig, `cloneEchoShard${side}`, C.rune,
      [[-0.023, -0.07], [-0.042, 0.0], [0.008, 0.115], [0.036, 0.016]],
      [side * 0.53, 0.55 + side * 0.08, 0.14], 0.008, [0.12, side * 0.26, side * -0.20]);
    fragment.castShadow = false;
    fragment.userData.cloneAccent = true;
  }
  return root;
}
