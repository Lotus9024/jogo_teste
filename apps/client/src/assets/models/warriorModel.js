import * as THREE from 'three';
import { add } from '../../core/scenePrimitives.js';
import { U, addArm, addArmoredLegs, addHelmetedHead, capsule, humanoidBase } from './unitModelKit.js';

export function makeWarrior() {
  const { root, rig } = humanoidBase('Guerreiro', 'GUERREIRO', 0xb55746, { hp: 3, damage: 2, move: 2 });
  addArmoredLegs(rig, U.redCloth, 0.17);
  capsule(0.28, 0.58, U.chain, rig, [0, 1.34, 0]);
  add(new THREE.CylinderGeometry(0.34, 0.3, 0.48, 10), U.plate, rig, [0, 1.48, 0]);
  add(new THREE.BoxGeometry(0.25, 0.72, 0.035), U.redCloth, rig, [0, 1.31, 0.31]);
  add(new THREE.TorusGeometry(0.29, 0.045, 8, 24), U.bronze, rig, [0, 1.12, 0], [Math.PI / 2, 0, 0]);
  addArm(rig, -1, U.chain, U.plate, 1.62, 0.12);
  addArm(rig, 1, U.chain, U.plate, 1.62, 0.08);
  addHelmetedHead(rig, U.redCloth, true);

  const sword = new THREE.Group();
  sword.name = 'warriorSword';
  sword.position.set(0.5, 0.83, 0.1);
  sword.rotation.z = -0.1;
  add(new THREE.CylinderGeometry(0.055, 0.055, 0.28, 8), U.black, sword);
  add(new THREE.DodecahedronGeometry(0.085, 0), U.bronze, sword, [0, -0.18, 0]);
  add(new THREE.BoxGeometry(0.38, 0.075, 0.09), U.bronze, sword, [0, 0.18, 0]);
  add(new THREE.BoxGeometry(0.09, 1.08, 0.045), U.plate, sword, [0, 0.75, 0]);
  add(new THREE.ConeGeometry(0.072, 0.24, 4), U.plate, sword, [0, 1.41, 0], [0, Math.PI / 4, 0]);
  rig.add(sword);
  const cape = add(new THREE.ConeGeometry(0.46, 1.38, 12, 4, true), U.redCloth, rig, [0, 1.18, -0.29], [0, 0, 0], [1, 1, 0.42]);
  cape.material.side = THREE.DoubleSide;
  root.rotation.y = -0.25;
  return root;
}
