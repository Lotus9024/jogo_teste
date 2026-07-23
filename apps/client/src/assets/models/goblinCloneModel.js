import * as THREE from 'three';
import { makeGoblin } from './goblinModel.js';

export function makeGoblinClone() {
  const root = makeGoblin();
  root.name = 'Clone Goblin';
  root.userData.name = root.name;
  root.userData.role = 'MAGIA · CLONE GOBLIN';
  root.traverse(object => {
    if (!object.isMesh || !object.material?.clone) return;
    object.material = object.material.clone();
    object.material.color?.offsetHSL(0.08, -0.05, 0.08);
    if ('emissiveIntensity' in object.material) object.material.emissiveIntensity = Math.max(object.material.emissiveIntensity ?? 0, 0.12);
  });
  return root;
}
