import * as THREE from 'three';
import { M, add } from '../../core/scenePrimitives.js';
import { U, addArm, capsule, humanoidBase } from './unitModelKit.js';

export function makeCitizen() {
  const { root, rig } = humanoidBase('Cidadão', 'HUMANO · CIDADÃO', 0xb99a67, { hp: 1, damage: 1, move: 1 });
  [-1, 1].forEach(side => {
    capsule(0.11, 0.43, M.darkLeather, rig, [side * 0.17, 0.48, 0]);
    addArm(rig, side, U.tanCloth, M.skin, 1.42, side * -0.05);
  });
  add(new THREE.CylinderGeometry(0.33, 0.28, 0.78, 9), U.tanCloth, rig, [0, 1.02, 0]);
  add(new THREE.SphereGeometry(0.25, 10, 7), M.skin, rig, [0, 1.62, 0]);
  add(new THREE.ConeGeometry(0.29, 0.24, 10), M.leather, rig, [0, 1.86, 0]);
  const pitchfork = new THREE.Group();
  pitchfork.name = 'citizenPitchfork';
  pitchfork.position.set(0.46, 0.62, 0.05);
  add(new THREE.CylinderGeometry(0.035, 0.035, 1.28, 7), M.wood, pitchfork, [0, 0.64, 0]);
  [-1, 0, 1].forEach(index => add(new THREE.BoxGeometry(0.035, 0.38, 0.035), M.iron, pitchfork, [index * 0.1, 1.35, 0]));
  add(new THREE.BoxGeometry(0.24, 0.035, 0.035), M.iron, pitchfork, [0, 1.19, 0]);
  rig.add(pitchfork);
  return root;
}
