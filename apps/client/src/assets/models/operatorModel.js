import * as THREE from 'three';
import { M, add } from '../../core/scenePrimitives.js';
import { U, addArm, addHelmetedHead, capsule, humanoidBase } from './unitModelKit.js';

export function makeOperator() {
  const { root, rig } = humanoidBase('Operador', 'OPERADOR', 0xa98245, { hp: 1, damage: 0, move: 1 });
  [-1, 1].forEach(side => {
    capsule(0.12, 0.44, M.darkLeather, rig, [side * 0.17, 0.49, 0]);
    add(new THREE.BoxGeometry(0.25, 0.16, 0.4), M.darkLeather, rig, [side * 0.17, 0.26, 0.1]);
  });
  add(new THREE.CylinderGeometry(0.34, 0.28, 0.82, 10), U.tanCloth, rig, [0, 1.02, 0]);
  add(new THREE.BoxGeometry(0.62, 0.13, 0.16), U.bronze, rig, [0, 1.15, 0.28]);
  addArm(rig, -1, U.tanCloth, M.darkLeather, 1.5, 0.16);
  addArm(rig, 1, U.tanCloth, M.darkLeather, 1.5, 0.16);
  addHelmetedHead(rig, U.tanCloth, true);

  const wrench = new THREE.Group();
  wrench.name = 'operatorWrench';
  wrench.position.set(0.49, 0.72, 0.12);
  wrench.rotation.z = -0.28;
  add(new THREE.CylinderGeometry(0.045, 0.045, 0.78, 8), U.plateDark, wrench, [0, 0.38, 0]);
  add(new THREE.TorusGeometry(0.14, 0.045, 7, 12, Math.PI * 1.42), U.plate, wrench, [0, 0.84, 0], [0, 0, 0.66]);
  rig.add(wrench);
  root.rotation.y = -0.12;
  return root;
}
