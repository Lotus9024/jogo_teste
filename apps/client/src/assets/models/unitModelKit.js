import * as THREE from 'three';
import { M, add } from '../../core/scenePrimitives.js';

export const U = Object.freeze({
  plate: new THREE.MeshStandardMaterial({ color: 0x9aa19f, roughness: 0.28, metalness: 0.82, flatShading: true }),
  plateDark: new THREE.MeshStandardMaterial({ color: 0x4d5656, roughness: 0.38, metalness: 0.74, flatShading: true }),
  chain: new THREE.MeshStandardMaterial({ color: 0x626b69, roughness: 0.52, metalness: 0.68, flatShading: true }),
  redCloth: new THREE.MeshStandardMaterial({ color: 0x7d2c25, roughness: 0.82, flatShading: true }),
  blueCloth: new THREE.MeshStandardMaterial({ color: 0x294a61, roughness: 0.84, flatShading: true }),
  greenCloth: new THREE.MeshStandardMaterial({ color: 0x344f3b, roughness: 0.88, flatShading: true }),
  tanCloth: new THREE.MeshStandardMaterial({ color: 0x8a7654, roughness: 0.9, flatShading: true }),
  bronze: new THREE.MeshStandardMaterial({ color: 0x9b7338, roughness: 0.4, metalness: 0.68, flatShading: true }),
  feather: new THREE.MeshStandardMaterial({ color: 0xb9aa81, roughness: 0.95, side: THREE.DoubleSide, flatShading: true }),
  black: new THREE.MeshStandardMaterial({ color: 0x111514, roughness: 0.8, flatShading: true })
});

export function capsule(radius, length, material, parent, position, rotation = [0, 0, 0], scale = [1, 1, 1]) {
  return add(new THREE.CapsuleGeometry(radius, length, 8, 12), material, parent, position, rotation, scale);
}

export function unitBase(parent, color = 0xb08a43) {
  add(new THREE.CylinderGeometry(0.54, 0.59, 0.15, 32), M.base, parent, [0, 0.08, 0]);
  const platformMaterial = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.5, metalness: 0.32, roughness: 0.48 });
  const platform = add(new THREE.CylinderGeometry(0.49, 0.53, 0.04, 32), platformMaterial, parent, [0, 0.16, 0]);
  platform.name = 'teamPlatform';
  const ringMaterial = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.75, metalness: 0.52, roughness: 0.28 });
  const ring = add(new THREE.TorusGeometry(0.51, 0.045, 10, 32), ringMaterial, parent, [0, 0.19, 0], [-Math.PI / 2, 0, 0]);
  ring.name = 'selectionRing';
  ring.userData.baseEmissiveIntensity = 0.75;
}

export function humanoidBase(name, role, color, stats) {
  const root = new THREE.Group();
  root.name = name;
  root.userData = { selectable: true, name, role, color, ...stats };
  unitBase(root, color);
  const rig = new THREE.Group();
  rig.name = 'rig';
  rig.position.y = 0.18;
  root.add(rig);
  return { root, rig };
}

export function addArm(rig, side, upperMaterial, lowerMaterial, shoulderY = 1.55, angle = 0.08) {
  add(new THREE.DodecahedronGeometry(0.2, 0), U.plateDark, rig, [side * 0.35, shoulderY, 0], [0, 0, side * 0.08], [1, 0.82, 0.92]);
  capsule(0.09, 0.38, upperMaterial, rig, [side * 0.43, shoulderY - 0.28, 0.04], [0, 0, side * angle]);
  capsule(0.1, 0.28, lowerMaterial, rig, [side * 0.48, shoulderY - 0.59, 0.08], [0, 0, side * angle * 0.55]);
  add(new THREE.SphereGeometry(0.105, 12, 8), M.skin, rig, [side * 0.5, shoulderY - 0.79, 0.1]);
}

export function addArmoredLegs(rig, clothMaterial, wide = 0.18) {
  [-1, 1].forEach(side => {
    capsule(0.13, 0.43, M.darkLeather, rig, [side * wide, 0.48, 0], [0, 0, side * 0.03]);
    add(new THREE.BoxGeometry(0.24, 0.34, 0.23, 2, 2, 2), U.plateDark, rig, [side * wide, 0.7, 0.03]);
    add(new THREE.DodecahedronGeometry(0.14, 0), U.plate, rig, [side * wide, 0.84, 0.13], [0, 0, 0], [1, 0.72, 0.82]);
    add(new THREE.BoxGeometry(0.28, 0.15, 0.42, 2, 1, 2), M.darkLeather, rig, [side * wide, 0.28, 0.1]);
  });
  add(new THREE.CylinderGeometry(0.4, 0.3, 0.62, 8), clothMaterial, rig, [0, 0.9, 0]);
}

export function addHelmetedHead(rig, accent, openFace = true) {
  if (openFace) add(new THREE.SphereGeometry(0.255, 16, 10), M.skin, rig, [0, 2.02, 0.02]);
  add(new THREE.SphereGeometry(0.31, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.68), U.plate, rig, [0, 2.12, 0]);
  add(new THREE.BoxGeometry(0.47, 0.09, 0.09, 3, 1, 1), U.plateDark, rig, [0, 2.08, 0.27]);
  add(new THREE.BoxGeometry(0.32, 0.035, 0.035), U.black, rig, [0, 2.09, 0.32]);
  add(new THREE.ConeGeometry(0.07, 0.4, 7), accent, rig, [0, 2.5, -0.03], [0.05, 0, 0]);
}
