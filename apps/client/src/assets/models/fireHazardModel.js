import * as THREE from 'three';
import { add } from '../../core/scenePrimitives.js';

export function makeFireHazard(tileSize = 1.08) {
  const root = new THREE.Group();
  root.name = 'Fogo arcano';
  const glow = new THREE.MeshBasicMaterial({ color: 0xff3b18, transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide });
  add(new THREE.CircleGeometry(tileSize * 0.36, 18), glow, root, [0, 0, 0], [-Math.PI / 2, 0, 0]);
  const colors = [0xff2f12, 0xff8a1f, 0xffca55];
  for (let index = 0; index < 7; index += 1) {
    const material = new THREE.MeshBasicMaterial({ color: colors[index % colors.length], transparent: true, opacity: 0.88 });
    const angle = index / 7 * Math.PI * 2;
    const flame = add(new THREE.ConeGeometry(0.07 + index % 2 * 0.025, 0.32 + index % 3 * 0.08, 6), material, root, [Math.cos(angle) * 0.23, 0.17, Math.sin(angle) * 0.23]);
    flame.userData.flame = true;
    flame.userData.phase = index * 0.71;
  }
  return root;
}
