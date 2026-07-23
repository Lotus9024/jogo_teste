import * as THREE from 'three';
import { M, add } from '../../core/scenePrimitives.js';
import { humanoidBase } from './unitModelKit.js';

const skin = new THREE.MeshStandardMaterial({ color: 0x648548, roughness: 0.86, flatShading: true });
const fuse = new THREE.MeshStandardMaterial({ color: 0xe25a27, emissive: 0xff3c12, emissiveIntensity: 1.4 });

export function makeGoblinBomber() {
  const { root, rig } = humanoidBase('Goblin Bombardeiro', 'GOBLIN · BOMBARDEIRO', 0x7d5b39, { hp: 1, damage: 1, move: 1 });
  rig.scale.setScalar(0.84);
  rig.position.y = 0.2;
  add(new THREE.CylinderGeometry(0.29, 0.35, 0.62, 7), M.darkLeather, rig, [0, 0.88, 0]);
  add(new THREE.SphereGeometry(0.31, 10, 7), skin, rig, [0, 1.55, 0.02]);
  [-1, 1].forEach(side => {
    add(new THREE.ConeGeometry(0.12, 0.42, 5), skin, rig, [side * 0.31, 1.59, 0], [0, 0, side * -Math.PI / 2]);
    add(new THREE.CapsuleGeometry(0.09, 0.32, 5, 8), skin, rig, [side * 0.31, 1.02, 0.03], [0, 0, side * 0.25]);
    add(new THREE.CapsuleGeometry(0.1, 0.34, 5, 8), M.darkLeather, rig, [side * 0.16, 0.42, 0]);
  });
  const bomb = add(new THREE.SphereGeometry(0.35, 12, 8), M.iron, rig, [0.42, 0.9, 0.15]);
  bomb.name = 'goblinBomb';
  add(new THREE.TorusGeometry(0.09, 0.025, 6, 12, Math.PI), M.gold, rig, [0.42, 1.2, 0.15], [0, 0, Math.PI / 2]);
  add(new THREE.SphereGeometry(0.055, 8, 6), fuse, rig, [0.5, 1.33, 0.15]);
  return root;
}
