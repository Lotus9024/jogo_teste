import * as THREE from 'three';
import { M, add } from '../../core/scenePrimitives.js';
import { U, addArm, capsule, humanoidBase } from './unitModelKit.js';

const robe = new THREE.MeshStandardMaterial({ color: 0x37275f, roughness: 0.82, flatShading: true });
const robeDark = new THREE.MeshStandardMaterial({ color: 0x19112d, roughness: 0.9, flatShading: true });
const fire = new THREE.MeshBasicMaterial({ color: 0xff6b24 });

export function makeMage() {
  const { root, rig } = humanoidBase('Mago', 'MAGO', 0x8056c9, { hp: 2, damage: 2, move: 1 });
  add(new THREE.ConeGeometry(0.43, 1.2, 12), robe, rig, [0, 0.83, 0]);
  add(new THREE.CylinderGeometry(0.3, 0.4, 0.32, 10), robeDark, rig, [0, 1.35, 0]);
  addArm(rig, -1, robe, robeDark, 1.53, 0.2);
  addArm(rig, 1, robe, robeDark, 1.53, 0.16);
  add(new THREE.SphereGeometry(0.25, 14, 10), M.skin, rig, [0, 2.02, 0.02]);
  add(new THREE.ConeGeometry(0.42, 0.98, 12), robe, rig, [0, 2.48, 0], [0, 0, -0.1]);
  add(new THREE.TorusGeometry(0.33, 0.055, 8, 24), U.bronze, rig, [0, 2.08, 0], [Math.PI / 2, 0, 0]);

  const staff = new THREE.Group();
  staff.name = 'mageStaff';
  staff.position.set(0.48, 0.85, 0.08);
  staff.rotation.z = -0.08;
  capsule(0.04, 1.48, M.wood, staff, [0, 0.64, 0]);
  add(new THREE.TorusGeometry(0.19, 0.045, 8, 20), U.bronze, staff, [0, 1.48, 0]);
  const orb = add(new THREE.IcosahedronGeometry(0.15, 1), fire, staff, [0, 1.48, 0]);
  orb.name = 'mageFireOrb';
  orb.userData.magic = true;
  staff.userData.magicAnchor = true;
  rig.add(staff);
  return root;
}
