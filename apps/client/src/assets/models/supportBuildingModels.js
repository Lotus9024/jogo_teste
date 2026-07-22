import * as THREE from 'three';
import { M, add } from '../../core/scenePrimitives.js';
import { unitBase } from './unitModelKit.js';

const goblinGlow = new THREE.MeshStandardMaterial({ color: 0x6ea646, emissive: 0x3c7a24, emissiveIntensity: 1.2, roughness: 0.35 });
const mageGlow = new THREE.MeshStandardMaterial({ color: 0x8062cf, emissive: 0x4e2caa, emissiveIntensity: 1.35, roughness: 0.25 });
const paleStone = new THREE.MeshStandardMaterial({ color: 0x596159, roughness: 0.88, flatShading: true });

function supportRoot(name, color) {
  const root = new THREE.Group();
  root.name = name;
  unitBase(root, color);
  const rig = new THREE.Group();
  rig.name = 'rig';
  rig.position.y = 0.18;
  root.add(rig);
  const built = new THREE.Group();
  built.name = 'supportBuiltParts';
  rig.add(built);
  const construction = new THREE.Group();
  construction.name = 'supportConstructionParts';
  rig.add(construction);
  [[-0.34, -0.2, 0.25], [0.32, 0.04, -0.5], [-0.08, 0.28, 0.1]].forEach(([x, z, rotation]) => {
    add(new THREE.CylinderGeometry(0.045, 0.06, 0.78, 6), M.wood, construction, [x, 0.22, z], [Math.PI / 2, 0, rotation]);
  });
  return { root, built };
}

function addAltar(built, glow, spireCount) {
  add(new THREE.CylinderGeometry(0.54, 0.68, 0.24, 8), M.stoneDark, built, [0, 0.12, 0]);
  add(new THREE.CylinderGeometry(0.42, 0.52, 0.28, 8), paleStone, built, [0, 0.36, 0]);
  for (let index = 0; index < spireCount; index += 1) {
    const angle = index / spireCount * Math.PI * 2;
    add(new THREE.ConeGeometry(0.09, 0.48, 6), M.stone, built, [Math.sin(angle) * 0.38, 0.7, Math.cos(angle) * 0.38], [0, 0, -Math.sin(angle) * 0.22]);
  }
  const core = add(new THREE.OctahedronGeometry(0.24, 1), glow, built, [0, 0.72, 0]);
  core.name = 'altarCore';
}

export function makeGoblinAltar() {
  const { root, built } = supportRoot('Altar Goblin', 0x6f914e);
  addAltar(built, goblinGlow, 5);
  add(new THREE.TorusGeometry(0.34, 0.035, 8, 24), goblinGlow, built, [0, 0.47, 0], [Math.PI / 2, 0, 0]);
  setSupportConstructionState(root, false);
  return root;
}

export function makeMageAltar() {
  const { root, built } = supportRoot('Altar Mago', 0x6f5ca5);
  addAltar(built, mageGlow, 4);
  [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([x, z]) => add(new THREE.SphereGeometry(0.075, 10, 8), mageGlow, built, [x * 0.42, 0.5, z * 0.42]));
  setSupportConstructionState(root, false);
  return root;
}

export function makeBuilderArea() {
  const { root, built } = supportRoot('Área de construtor', 0x9a7845);
  add(new THREE.BoxGeometry(1.12, 0.12, 0.92), M.wood, built, [0, 0.06, 0]);
  add(new THREE.BoxGeometry(0.78, 0.12, 0.32), M.wood, built, [0, 0.48, 0]);
  [[-0.3, -0.08], [0.3, -0.08]].forEach(([x, z]) => add(new THREE.BoxGeometry(0.09, 0.72, 0.09), M.wood, built, [x, 0.25, z]));
  add(new THREE.BoxGeometry(0.08, 0.65, 0.1), M.iron, built, [-0.14, 0.92, 0], [0, 0, -0.55]);
  add(new THREE.BoxGeometry(0.3, 0.12, 0.12), M.iron, built, [0.02, 1.13, 0], [0, 0, -0.55]);
  add(new THREE.CylinderGeometry(0.12, 0.16, 0.5, 8), M.stoneDark, built, [0.37, 0.81, 0]);
  setSupportConstructionState(root, false);
  return root;
}

export function setSupportConstructionState(root, underConstruction) {
  root.getObjectByName('supportBuiltParts').visible = !underConstruction;
  root.getObjectByName('supportConstructionParts').visible = underConstruction;
  root.userData.underConstruction = underConstruction;
}
