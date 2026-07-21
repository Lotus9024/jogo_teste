import * as THREE from 'three';
import { M, add } from '../../core/scenePrimitives.js';
import { unitBase } from './unitModelKit.js';

const plaster = new THREE.MeshStandardMaterial({ color: 0x9a8665, roughness: 0.94, flatShading: true });
const roof = new THREE.MeshStandardMaterial({ color: 0x573026, roughness: 0.88, flatShading: true });
const warmWindow = new THREE.MeshStandardMaterial({ color: 0xe5a54b, emissive: 0xa65418, emissiveIntensity: 0.7, roughness: 0.5 });

export function makeWoodenHouse() {
  const root = new THREE.Group();
  root.name = 'Casa de madeira';
  root.userData = { selectable: true, name: root.name, role: 'CONSTRUÇÃO · MORADIA' };
  unitBase(root, 0x9a6a38);
  const rig = new THREE.Group();
  rig.name = 'rig';
  rig.position.y = 0.18;
  root.add(rig);

  const built = new THREE.Group();
  built.name = 'houseBuiltParts';
  rig.add(built);
  add(new THREE.BoxGeometry(1.3, 1.05, 1.05), plaster, built, [0, 0.72, 0]);
  [-0.54, 0.54].forEach(x => add(new THREE.BoxGeometry(0.12, 1.15, 1.12), M.wood, built, [x, 0.75, 0]));
  [-0.38, 0.38].forEach(x => add(new THREE.BoxGeometry(0.11, 1.14, 0.08), M.wood, built, [x, 0.75, 0.57]));
  add(new THREE.BoxGeometry(1.34, 0.1, 0.08), M.wood, built, [0, 0.42, 0.57]);
  add(new THREE.BoxGeometry(0.34, 0.62, 0.08), M.darkLeather, built, [0, 0.52, 0.58]);
  add(new THREE.BoxGeometry(0.24, 0.24, 0.06), warmWindow, built, [-0.4, 0.85, 0.6]);
  const roofMesh = add(new THREE.ConeGeometry(0.6, 0.72, 4), roof, built, [0, 1.58, 0], [0, Math.PI / 4, 0], [1.12, 1, 0.9]);
  roofMesh.castShadow = true;
  add(new THREE.BoxGeometry(0.22, 0.65, 0.22), M.stoneDark, built, [0.42, 1.58, -0.2]);

  const construction = new THREE.Group();
  construction.name = 'houseConstructionParts';
  rig.add(construction);
  [-0.52, 0.52].forEach(x => [-0.42, 0.42].forEach(z => add(new THREE.BoxGeometry(0.12, 1.05, 0.12), M.wood, construction, [x, 0.62, z])));
  add(new THREE.BoxGeometry(1.18, 0.12, 0.12), M.wood, construction, [0, 0.35, 0.43]);
  add(new THREE.BoxGeometry(1.18, 0.12, 0.12), M.wood, construction, [0, 0.82, -0.43]);
  setWoodenHouseConstructionState(root, false);
  return root;
}

export function setWoodenHouseConstructionState(root, underConstruction) {
  const built = root.getObjectByName('houseBuiltParts');
  const construction = root.getObjectByName('houseConstructionParts');
  if (built) built.visible = !underConstruction;
  if (construction) construction.visible = underConstruction;
  root.userData.underConstruction = underConstruction;
}
