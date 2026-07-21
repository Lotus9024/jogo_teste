import * as THREE from 'three';
import { add } from '../../core/scenePrimitives.js';

const roadMaterial = new THREE.MeshStandardMaterial({ color: 0x5b4631, roughness: 1, metalness: 0, flatShading: true });
const edgeMaterial = new THREE.MeshStandardMaterial({ color: 0x756047, roughness: 0.98, metalness: 0, flatShading: true });

export function makeRoad(connections, tile = 1.08) {
  const root = new THREE.Group();
  root.name = 'Rua';
  const width = tile * 0.24;
  const center = tile * 0.28;
  add(new THREE.BoxGeometry(center, 0.025, center), roadMaterial, root, [0, 0, 0]);
  const arms = [
    ['north', 0, -tile * 0.32, width, tile * 0.72],
    ['south', 0, tile * 0.32, width, tile * 0.72],
    ['east', tile * 0.32, 0, tile * 0.72, width],
    ['west', -tile * 0.32, 0, tile * 0.72, width]
  ];
  arms.filter(([direction]) => connections[direction]).forEach(([, x, z, sizeX, sizeZ]) => {
    add(new THREE.BoxGeometry(sizeX, 0.024, sizeZ), roadMaterial, root, [x, 0, z]);
  });
  add(new THREE.BoxGeometry(center * 0.72, 0.027, center * 0.72), edgeMaterial, root, [0, 0.002, 0]);
  root.traverse(part => { if (part.isMesh) { part.castShadow = false; part.receiveShadow = true; } });
  return root;
}
