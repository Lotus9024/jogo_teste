import * as THREE from 'three';

export const M = {
  stone: new THREE.MeshStandardMaterial({ color: 0x353c37, emissive: 0x080a08, emissiveIntensity: 0.22, roughness: 0.91, metalness: 0.03 }),
  stoneDark: new THREE.MeshStandardMaterial({ color: 0x202622, emissive: 0x040504, emissiveIntensity: 0.18, roughness: 0.96 }),
  iron: new THREE.MeshStandardMaterial({ color: 0x777b7a, roughness: 0.31, metalness: 0.86 }),
  steel: new THREE.MeshStandardMaterial({ color: 0xa9adaa, roughness: 0.22, metalness: 0.92 }),
  leather: new THREE.MeshStandardMaterial({ color: 0x4a2c20, roughness: 0.72 }),
  darkLeather: new THREE.MeshStandardMaterial({ color: 0x211b19, roughness: 0.82 }),
  skin: new THREE.MeshStandardMaterial({ color: 0xa97156, roughness: 0.72 }),
  red: new THREE.MeshStandardMaterial({ color: 0x682b25, roughness: 0.76 }),
  green: new THREE.MeshStandardMaterial({ color: 0x34443a, roughness: 0.82 }),
  blue: new THREE.MeshStandardMaterial({ color: 0x263a4a, roughness: 0.78 }),
  wood: new THREE.MeshStandardMaterial({ color: 0x5b3821, roughness: 0.7 }),
  cloth: new THREE.MeshStandardMaterial({ color: 0x29282d, roughness: 0.92 }),
  gold: new THREE.MeshStandardMaterial({ color: 0xb08a43, roughness: 0.32, metalness: 0.76 }),
  void: new THREE.MeshStandardMaterial({ color: 0x030405, roughness: 1 }),
  magic: new THREE.MeshBasicMaterial({ color: 0x9473ff }),
  base: new THREE.MeshStandardMaterial({ color: 0x181d1b, roughness: 0.72, metalness: 0.25 })
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
