import * as THREE from 'three';
import { M, add } from '../../core/scenePrimitives.js';
import { U, capsule, humanoidBase } from './unitModelKit.js';

export function makeHenry() {
  const { root, rig } = humanoidBase('Henry', 'HUMANO · ÁGIL', 0xc59a3d, { hp: 1, damage: 1, move: 1 });
  rig.scale.set(0.88, 0.78, 0.88);
  rig.position.y = 0.22;

  [-1, 1].forEach(side => {
    capsule(0.105, 0.25, U.black, rig, [side * 0.16, 0.48, 0.01]);
    add(new THREE.BoxGeometry(0.22, 0.1, 0.34), U.bronze, rig, [side * 0.16, 0.22, 0.08]);
    capsule(0.09, 0.38, M.leather, rig, [side * 0.34, 1.17, 0], [0, 0, side * 0.45]);
  });

  capsule(0.29, 0.62, U.greenCloth, rig, [0, 1.12, 0]);
  add(new THREE.CylinderGeometry(0.32, 0.28, 0.28, 10), M.leather, rig, [0, 1.32, 0]);
  add(new THREE.SphereGeometry(0.25, 12, 8), M.skin, rig, [0, 1.75, 0.02]);
  add(new THREE.ConeGeometry(0.3, 0.48, 9), U.greenCloth, rig, [0, 2.02, -0.02], [0.08, 0, 0]);

  [-1, 1].forEach(side => {
    const blade = new THREE.Group();
    blade.name = side < 0 ? 'henryLeftBlade' : 'henryRightBlade';
    blade.position.set(side * 0.5, 0.88, 0.08);
    blade.rotation.z = side * -0.38;
    add(new THREE.CylinderGeometry(0.035, 0.035, 0.22, 8), U.black, blade);
    add(new THREE.BoxGeometry(0.18, 0.045, 0.07), U.bronze, blade, [0, 0.13, 0]);
    add(new THREE.ConeGeometry(0.065, 0.58, 4), U.plate, blade, [0, 0.45, 0], [0, Math.PI / 4, 0]);
    rig.add(blade);
  });

  const scarf = add(new THREE.TorusGeometry(0.25, 0.055, 8, 22), U.tanCloth, rig, [0, 1.55, 0], [Math.PI / 2, 0, 0]);
  scarf.name = 'henryScarf';
  root.rotation.y = -0.18;
  return root;
}
