import * as THREE from 'three';
import { createGrainMaps, createMasonryMaps, texturedStandardMaterial } from './darkFantasySurfaces.js';

const weatheredStone = createMasonryMaps({ stone: [61, 57, 70], mortar: [18, 15, 24], repeat: [2.6, 2.6], seed: 83 });
const blackStone = createMasonryMaps({ stone: [34, 31, 43], mortar: [10, 8, 15], repeat: [2.8, 2.8], seed: 97 });
const agedWood = createGrainMaps({ color: [82, 48, 32], repeat: [4, 2], seed: 41, streak: 0.04 });
const wornLeather = createGrainMaps({ color: [67, 39, 33], repeat: [3, 3], seed: 67 });
const darkFabric = createGrainMaps({ color: [43, 36, 51], repeat: [4, 4], seed: 109 });

export const M = {
  stone: texturedStandardMaterial(weatheredStone, { color: 0xffffff, emissive: 0x0b0710, emissiveIntensity: 0.2, roughness: 0.94, metalness: 0.02, bumpScale: 0.055 }),
  stoneDark: texturedStandardMaterial(blackStone, { color: 0xffffff, emissive: 0x08040d, emissiveIntensity: 0.22, roughness: 0.97, bumpScale: 0.065 }),
  iron: new THREE.MeshStandardMaterial({ color: 0x5f626c, roughness: 0.43, metalness: 0.84 }),
  steel: new THREE.MeshStandardMaterial({ color: 0x9da2ad, roughness: 0.3, metalness: 0.9 }),
  leather: texturedStandardMaterial(wornLeather, { color: 0xffffff, roughness: 0.78, bumpScale: 0.025 }),
  darkLeather: texturedStandardMaterial(wornLeather, { color: 0x50434e, roughness: 0.86, bumpScale: 0.03 }),
  skin: new THREE.MeshStandardMaterial({ color: 0xa97156, roughness: 0.72 }),
  red: new THREE.MeshStandardMaterial({ color: 0x682b25, roughness: 0.76 }),
  green: new THREE.MeshStandardMaterial({ color: 0x34443a, roughness: 0.82 }),
  blue: new THREE.MeshStandardMaterial({ color: 0x263a4a, roughness: 0.78 }),
  wood: texturedStandardMaterial(agedWood, { color: 0xffffff, roughness: 0.82, bumpScale: 0.04 }),
  cloth: texturedStandardMaterial(darkFabric, { color: 0xffffff, roughness: 0.96, bumpScale: 0.018 }),
  gold: new THREE.MeshStandardMaterial({ color: 0x9d7542, roughness: 0.38, metalness: 0.74 }),
  void: new THREE.MeshStandardMaterial({ color: 0x030405, roughness: 1 }),
  magic: new THREE.MeshBasicMaterial({ color: 0x9473ff }),
  base: texturedStandardMaterial(blackStone, { color: 0xffffff, roughness: 0.82, metalness: 0.18, bumpScale: 0.045 })
};

export function add(geometry, material, parent, position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1]) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.scale.set(...scale);
  const materials = Array.isArray(material) ? material : [material];
  const isLit = materials.some(item => item?.isMeshStandardMaterial || item?.isMeshPhysicalMaterial || item?.isMeshLambertMaterial || item?.isMeshPhongMaterial);
  mesh.castShadow = isLit;
  mesh.receiveShadow = isLit;
  parent.add(mesh);
  return mesh;
}
