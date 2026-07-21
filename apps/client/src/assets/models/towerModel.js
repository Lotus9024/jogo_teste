import * as THREE from 'three';
import { M, add } from '../../core/scenePrimitives.js';
import { U, unitBase } from './unitModelKit.js';

export function makeTower() {
  const root = new THREE.Group();
  root.name = 'Torre';
  root.userData = { selectable: true, name: root.name, role: 'CONSTRUÇÃO · TORRE' };
  unitBase(root, 0xa58b67);
  const rig = new THREE.Group();
  rig.name = 'rig';
  rig.position.y = 0.18;
  root.add(rig);
  const stone = new THREE.MeshStandardMaterial({ color: 0x71614f, roughness: 0.88, flatShading: true });
  const stoneLight = new THREE.MeshStandardMaterial({ color: 0x9a8566, roughness: 0.84, flatShading: true });
  const rim = new THREE.MeshStandardMaterial({ color: 0x8f7a5e, roughness: 0.84, flatShading: true });
  add(new THREE.CylinderGeometry(0.52, 0.6, 1.28, 10), stone, rig, [0, 0.8, 0]);
  add(new THREE.CylinderGeometry(0.58, 0.58, 0.18, 10), rim, rig, [0, 1.48, 0]);
  for (let i = 0; i < 8; i += 1) {
    const angle = (i / 8) * Math.PI * 2;
    add(new THREE.BoxGeometry(0.2, 0.3, 0.2), stoneLight, rig, [Math.sin(angle) * 0.48, 1.68, Math.cos(angle) * 0.48], [0, angle, 0]);
  }
  add(new THREE.BoxGeometry(0.18, 0.48, 0.08), U.plateDark, rig, [0, 0.7, 0.56]);
  add(new THREE.BoxGeometry(0.12, 0.2, 0.06), U.black, rig, [-0.23, 1.05, 0.51]);
  add(new THREE.BoxGeometry(0.12, 0.2, 0.06), U.black, rig, [0.23, 1.05, 0.51]);
  setTowerConstructionState(root, false);
  return root;
}

export function setTowerConstructionState(root, underConstruction) {
  root.userData.underConstruction = underConstruction;
  root.traverse((object) => {
    if (!object.isMesh) return;
    object.material.transparent = underConstruction;
    object.material.opacity = underConstruction ? 0.45 : 1;
    object.material.depthWrite = !underConstruction;
  });
}
