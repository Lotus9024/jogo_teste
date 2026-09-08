import * as THREE from 'three';
import { createMasonryMaps, texturedStandardMaterial } from '../../core/darkFantasySurfaces.js';

export function createCastleMaterials(accent, enemy) {
  const masonry = createMasonryMaps({
    stone: enemy ? [82, 73, 75] : [75, 78, 82],
    mortar: [42, 40, 43],
    repeat: [1.2, 1.4],
    seed: enemy ? 353 : 337,
    brickWidth: 42,
    brickHeight: 23,
  });
  return {
    stone: texturedStandardMaterial(masonry, { color: 0xffffff, roughness: 0.94, metalness: 0.01, bumpScale: 0.022 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x3b3c40, roughness: 0.96 }),
    trim: new THREE.MeshStandardMaterial({ color: enemy ? 0x8e8279 : 0x8c8c84, roughness: 0.91 }),
    roof: new THREE.MeshStandardMaterial({ color: enemy ? 0x46363d : 0x343d4a, roughness: 0.88, metalness: 0.08, flatShading: true }),
    roofEdge: new THREE.MeshStandardMaterial({ color: 0x23282e, roughness: 0.75, metalness: 0.18 }),
    accent: new THREE.MeshStandardMaterial({ color: accent, roughness: 0.97, side: THREE.DoubleSide }),
    gate: new THREE.MeshStandardMaterial({ color: 0x30343a, roughness: 0.58, metalness: 0.62 }),
    window: new THREE.MeshStandardMaterial({ color: 0x1b1b1d, roughness: 1 }),
    warmWindow: new THREE.MeshStandardMaterial({ color: 0xb89a67, emissive: 0x61431f, emissiveIntensity: 0.22, roughness: 0.8 }),
  };
}
