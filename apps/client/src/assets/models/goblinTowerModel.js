import * as THREE from 'three';
import { M, add } from '../../core/scenePrimitives.js';
import { unitBase } from './unitModelKit.js';

const timber = new THREE.MeshStandardMaterial({ color: 0x4d301d, roughness: 0.92, flatShading: true });
const timberLight = new THREE.MeshStandardMaterial({ color: 0x75502d, roughness: 0.88, flatShading: true });
const goblinGreen = new THREE.MeshStandardMaterial({ color: 0x607f43, roughness: 0.86, flatShading: true });

export function makeGoblinTower() {
  const root = new THREE.Group();
  root.name = 'Torre Goblin';
  root.userData = { selectable: true, name: root.name, role: 'CONSTRUÇÃO · GOBLIN' };
  unitBase(root, 0x6f914e);
  const rig = new THREE.Group();
  rig.name = 'rig';
  rig.position.y = 0.18;
  root.add(rig);
  const built = new THREE.Group();
  built.name = 'goblinTowerBuiltParts';
  rig.add(built);
  const construction = new THREE.Group();
  construction.name = 'goblinTowerConstructionParts';
  rig.add(construction);
  [[-0.38, -0.38], [0.38, -0.38], [-0.38, 0.38], [0.38, 0.38]].forEach(([x, z]) => {
    add(new THREE.CylinderGeometry(0.09, 0.13, 1.45, 7), timber, built, [x, 0.78, z], [0, 0, x * 0.08]);
  });
  add(new THREE.BoxGeometry(0.98, 0.14, 0.98), timberLight, built, [0, 1.43, 0]);
  add(new THREE.CylinderGeometry(0.52, 0.62, 0.62, 8), M.stoneDark, built, [0, 1.72, 0]);
  for (let index = 0; index < 8; index += 1) {
    const angle = index / 8 * Math.PI * 2;
    add(new THREE.BoxGeometry(0.18, 0.28, 0.18), M.stone, built, [Math.sin(angle) * 0.45, 2.08, Math.cos(angle) * 0.45], [0, angle, 0]);
  }
  const banner = add(new THREE.PlaneGeometry(0.42, 0.62), goblinGreen, built, [0.02, 2.45, 0.02], [0, 0, 0]);
  banner.name = 'goblinTowerBanner';
  add(new THREE.CylinderGeometry(0.025, 0.025, 1.1, 6), M.wood, built, [-0.22, 2.28, 0.02]);
  [[-0.28, -0.15, 0.35], [0.22, -0.12, -0.42], [-0.05, 0.18, 0.08], [0.3, 0.22, 0.5]].forEach(([x, z, rotation]) => {
    add(new THREE.CylinderGeometry(0.035, 0.05, 0.72, 6), timberLight, construction, [x, 0.28, z], [Math.PI / 2, 0, rotation]);
  });
  setGoblinTowerConstructionState(root, false);
  return root;
}

export function setGoblinTowerConstructionState(root, underConstruction) {
  root.getObjectByName('goblinTowerBuiltParts').visible = !underConstruction;
  root.getObjectByName('goblinTowerConstructionParts').visible = underConstruction;
  root.userData.underConstruction = underConstruction;
}
