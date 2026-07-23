import * as THREE from 'three';
import { M, add } from '../../core/scenePrimitives.js';

const greenWood = new THREE.MeshStandardMaterial({ color: 0x53683c, roughness: 0.94, flatShading: true });
const darkWood = new THREE.MeshStandardMaterial({ color: 0x342d25, roughness: 0.97, flatShading: true });
const cloth = new THREE.MeshStandardMaterial({ color: 0x73512c, roughness: 0.9, flatShading: true });

export function makeGoblinHouse() {
  const root = new THREE.Group();
  root.name = 'Casa Goblin';
  root.userData = { selectable: true, name: root.name, role: 'CONSTRUÇÃO · MORADIA GOBLIN' };
  const rig = new THREE.Group();
  rig.name = 'rig';
  rig.position.y = 0.02;
  root.add(rig);

  add(new THREE.BoxGeometry(1.3, 0.12, 1.12), darkWood, rig, [0, 0.08, 0]);
  for (const x of [-0.55, 0.55]) {
    for (const z of [-0.45, 0.45]) add(new THREE.CylinderGeometry(0.08, 0.1, 0.9, 7), greenWood, rig, [x, 0.52, z]);
  }
  add(new THREE.BoxGeometry(1.2, 0.72, 1.02), greenWood, rig, [0, 0.5, 0]);
  const roof = add(new THREE.ConeGeometry(0.98, 0.72, 4), cloth, rig, [0, 1.18, 0], [0, Math.PI / 4, 0]);
  roof.scale.z = 0.86;
  add(new THREE.BoxGeometry(0.42, 0.58, 0.06), darkWood, rig, [0, 0.43, -0.55]);
  add(new THREE.TorusGeometry(0.16, 0.035, 8, 18), M.gold, rig, [0, 0.75, -0.57], [Math.PI / 2, 0, 0]);
  return root;
}
