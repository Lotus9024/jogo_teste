import * as THREE from 'three';
import { M, add } from '../../core/scenePrimitives.js';

const greenWood = new THREE.MeshStandardMaterial({ color: 0x53683c, roughness: 0.94, flatShading: true });
const darkWood = new THREE.MeshStandardMaterial({ color: 0x342d25, roughness: 0.97, flatShading: true });
const cloth = new THREE.MeshStandardMaterial({ color: 0x73512c, roughness: 0.9, flatShading: true });
const bone = new THREE.MeshStandardMaterial({ color: 0xa99e78, roughness: 0.94, flatShading: true });
const ember = new THREE.MeshStandardMaterial({ color: 0x9c7040, emissive: 0x8e4719, emissiveIntensity: 0.45, roughness: 0.6 });

function addSalvagedRoof(rig) {
  for (const side of [-1, 1]) {
    const width = side < 0 ? 0.6 : 0.98;
    const rise = side < 0 ? 0.57 : 0.48;
    const slope = Math.hypot(width, rise);
    const roof = new THREE.Group();
    roof.name = side < 0 ? 'goblinHouseRoofLeft' : 'goblinHouseRoofRight';
    roof.position.set(-0.18 + side * width / 2, 1.55 - rise / 2, 0);
    roof.rotation.z = -side * Math.atan2(rise, width);
    add(new THREE.BoxGeometry(slope + 0.025, 0.055, 1.32), darkWood, roof);
    const tiles = new THREE.InstancedMesh(new THREE.BoxGeometry(slope / 3 + 0.026, 0.05, 0.26), cloth, 15);
    tiles.name = 'goblinHouseRoofTiles';
    tiles.castShadow = true;
    tiles.receiveShadow = true;
    const part = new THREE.Object3D();
    for (let row = 0; row < 3; row += 1) {
      for (let column = 0; column < 5; column += 1) {
        const index = row * 5 + column;
        part.position.set(-slope / 2 + slope / 6 + row * slope / 3, 0.065 + column % 2 * 0.01, -0.53 + column * 0.255 + row % 2 * 0.025);
        part.rotation.z = ((index % 3) - 1) * 0.035;
        part.updateMatrix();
        tiles.setMatrixAt(index, part.matrix);
        tiles.setColorAt(index, new THREE.Color(index % 4 ? 0xb6aa87 : 0x6d8058));
      }
    }
    roof.add(tiles);
    for (const z of [-0.68, 0.68]) add(new THREE.BoxGeometry(slope + 0.055, 0.075, 0.06), darkWood, roof, [0, 0.02, z]);
    rig.add(roof);
  }
  const ridge = add(new THREE.CylinderGeometry(0.04, 0.06, 1.44, 7), darkWood, rig, [-0.18, 1.57, 0], [Math.PI / 2, 0, 0]);
  ridge.name = 'goblinHouseCrookedRidge';
}

function addHutWalls(rig) {
  add(new THREE.BoxGeometry(1.2, 0.72, 0.095), darkWood, rig, [0, 0.5, 0.49]);
  for (const side of [-1, 1]) {
    add(new THREE.BoxGeometry(0.095, 0.72, 1.02), darkWood, rig, [side * 0.56, 0.5, 0]);
    add(new THREE.BoxGeometry(0.35, 0.72, 0.095), darkWood, rig, [side * 0.425, 0.5, -0.49]);
    for (let index = 0; index < 5; index += 1) {
      const plank = add(new THREE.BoxGeometry(0.065, 0.68 + index % 2 * 0.045, 0.18), greenWood, rig, [side * 0.612, 0.49, -0.41 + index * 0.205], [0, 0, side * 0.025]);
      plank.name = 'goblinHouseWallPlank';
    }
    for (const x of [0.325, 0.465]) add(new THREE.BoxGeometry(0.125, 0.7, 0.06), greenWood, rig, [side * x, 0.49, -0.55], [0, 0, side * 0.025]);
    add(new THREE.BoxGeometry(0.07, 0.82, 0.12), darkWood, rig, [side * 0.25, 0.54, -0.55], [0, 0, -side * 0.08]);
    const fang = add(new THREE.ConeGeometry(0.075, 0.25, 7), bone, rig, [side * 0.19, 0.87, -0.62], [0, 0, Math.PI + side * 0.18]);
    fang.name = 'goblinHouseDoorFang';
  }
  const doorway = add(new THREE.BoxGeometry(0.44, 0.58, 0.05), darkWood, rig, [0, 0.43, -0.33]);
  doorway.name = 'goblinHouseRecessedDoor';
  add(new THREE.BoxGeometry(0.58, 0.15, 0.15), greenWood, rig, [0, 0.87, -0.55], [0, 0, -0.045]);
  const window = add(new THREE.BoxGeometry(0.025, 0.26, 0.3), ember, rig, [0.656, 0.63, 0.12]);
  window.name = 'goblinHouseEmberWindow';
  for (const z of [-0.035, 0.11, 0.265]) add(new THREE.BoxGeometry(0.055, 0.32, 0.028), darkWood, rig, [0.674, 0.63, z]);
  for (const y of [0.46, 0.8]) add(new THREE.BoxGeometry(0.07, 0.045, 0.37), darkWood, rig, [0.665, y, 0.115]);
}

export function makeGoblinHouse() {
  const root = new THREE.Group();
  root.name = 'Casa Goblin';
  root.userData = { selectable: true, name: root.name, role: 'CONSTRUÇÃO · MORADIA GOBLIN' };
  const rig = new THREE.Group();
  rig.name = 'rig';
  rig.position.y = 0.02;
  root.add(rig);

  add(new THREE.BoxGeometry(1.3, 0.12, 1.12), darkWood, rig, [0, 0.08, 0]);
  for (const x of [-0.55, 0.55]) {
    for (const z of [-0.45, 0.45]) add(new THREE.CylinderGeometry(0.08, 0.1, 0.9, 7), greenWood, rig, [x, 0.52, z]);
  }
  addHutWalls(rig);
  addSalvagedRoof(rig);
  add(new THREE.TorusGeometry(0.09, 0.018, 6, 12), M.gold, rig, [0.08, 0.46, -0.366]);
  return root;
}
