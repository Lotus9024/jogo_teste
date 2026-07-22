import * as THREE from 'three';
import { M, add } from '../../core/scenePrimitives.js';
import { unitBase } from './unitModelKit.js';

const wood = new THREE.MeshStandardMaterial({ color: 0x76513a, roughness: 0.94, flatShading: true });
const darkWood = new THREE.MeshStandardMaterial({ color: 0x5c4032, roughness: 0.96, flatShading: true });
const freshWood = new THREE.MeshStandardMaterial({ color: 0xb78355, roughness: 0.9, flatShading: true });
const floorWood = new THREE.MeshStandardMaterial({ color: 0x684530, roughness: 0.95, flatShading: true });
const roofWood = new THREE.MeshStandardMaterial({ color: 0x423832, roughness: 0.98, flatShading: true });
const roofWoodAlt = new THREE.MeshStandardMaterial({ color: 0x574940, roughness: 0.98, flatShading: true });
const chimneyStone = new THREE.MeshStandardMaterial({ color: 0x66665f, roughness: 1, flatShading: true });
const warmWindow = new THREE.MeshStandardMaterial({
  color: 0xe1b66a,
  emissive: 0xf2b866,
  emissiveIntensity: 0.72,
  roughness: 0.36,
  flatShading: true
});

const UP = new THREE.Vector3(0, 1, 0);
const CABIN = Object.freeze({
  halfWidth: 0.68,
  halfDepth: 0.59,
  eaveX: 0.88,
  eaveY: 1.14,
  ridgeY: 1.62,
  roofDepth: 1.58
});

function addLog(parent, length, radius, position, axis, material = wood, name = '') {
  const rotation = axis === 'x'
    ? [0, 0, Math.PI / 2]
    : axis === 'z'
      ? [Math.PI / 2, 0, 0]
      : [0, 0, 0];
  const log = add(new THREE.CylinderGeometry(radius * 0.94, radius, length, 8), material, parent, position, rotation);
  log.name = name;
  return log;
}

function addBeamBetween(parent, from, to, radius, material = freshWood, name = '') {
  const direction = new THREE.Vector3().subVectors(to, from);
  const beam = add(
    new THREE.CylinderGeometry(radius * 0.94, radius, direction.length(), 8),
    material,
    parent,
    new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5).toArray()
  );
  beam.quaternion.setFromUnitVectors(UP, direction.normalize());
  beam.name = name;
  return beam;
}

function createFloor(parent, material) {
  const floor = add(new THREE.BoxGeometry(1.5, 0.1, 1.28), material, parent, [0, 0.13, 0]);
  floor.name = 'houseFloor';
  for (const x of [-0.5, -0.25, 0, 0.25, 0.5]) {
    add(new THREE.BoxGeometry(0.018, 0.012, 1.22), darkWood, parent, [x, 0.186, 0]);
  }
}

function addWallRows(parent, { front, back, left, right }, primary, alternate) {
  const addRows = (count, axis, fixed, prefix) => {
    for (let row = 0; row < count; row += 1) {
      const material = row % 3 === 1 ? alternate : primary;
      const y = 0.29 + row * 0.12;
      const length = axis === 'x' ? 1.52 : 1.32;
      const position = axis === 'x' ? [0, y, fixed] : [fixed, y, 0];
      addLog(parent, length, 0.07, position, axis, material, `${prefix}Log${row + 1}`);
    }
  };
  addRows(front, 'x', -CABIN.halfDepth, 'front');
  addRows(back, 'x', CABIN.halfDepth, 'back');
  addRows(left, 'z', -CABIN.halfWidth, 'left');
  addRows(right, 'z', CABIN.halfWidth, 'right');
}

function createGable(parent, z, material) {
  const shape = new THREE.Shape();
  shape.moveTo(-CABIN.halfWidth, 0);
  shape.lineTo(CABIN.halfWidth, 0);
  shape.lineTo(0, CABIN.ridgeY - CABIN.eaveY);
  shape.closePath();
  const panel = add(new THREE.ShapeGeometry(shape), material, parent, [0, CABIN.eaveY, z]);
  panel.name = 'houseBuiltGable';
}

function createRoofSide(parent, side) {
  const rise = CABIN.ridgeY - CABIN.eaveY;
  const slope = Math.hypot(CABIN.eaveX, rise);
  const angle = Math.atan2(rise, CABIN.eaveX);
  const roof = new THREE.Group();
  roof.name = side < 0 ? 'houseBuiltRoofLeft' : 'houseBuiltRoofRight';
  roof.position.set(side * CABIN.eaveX / 2, (CABIN.ridgeY + CABIN.eaveY) / 2, 0);
  roof.rotation.z = side < 0 ? angle : -angle;
  add(new THREE.BoxGeometry(slope, 0.075, CABIN.roofDepth), roofWood, roof);

  for (let band = 0; band < 4; band += 1) {
    const width = slope / 4 + 0.015;
    const x = -slope / 2 + width / 2 + band * (slope / 4);
    add(
      new THREE.BoxGeometry(width, 0.028, CABIN.roofDepth + 0.025),
      band % 2 ? roofWoodAlt : roofWood,
      roof,
      [x, 0.052 + (band % 2) * 0.008, 0]
    );
  }
  parent.add(roof);
}

function createBuiltCabin(parent) {
  createFloor(parent, floorWood);
  addWallRows(parent, { front: 8, back: 8, left: 8, right: 8 }, wood, darkWood);
  createGable(parent, -CABIN.halfDepth - 0.006, darkWood);
  createGable(parent, CABIN.halfDepth + 0.006, wood);
  createRoofSide(parent, -1);
  createRoofSide(parent, 1);
  addLog(parent, CABIN.roofDepth + 0.1, 0.05, [0, CABIN.ridgeY + 0.03, 0], 'z', darkWood, 'houseBuiltRidge');

  const door = add(new THREE.BoxGeometry(0.43, 0.72, 0.065), darkWood, parent, [0.24, 0.61, -0.675]);
  door.name = 'houseBuiltDoor';
  for (const x of [0.1, 0.24, 0.38]) {
    add(new THREE.BoxGeometry(0.025, 0.65, 0.018), wood, parent, [x, 0.61, -0.714]);
  }
  add(new THREE.BoxGeometry(0.39, 0.045, 0.025), M.iron, parent, [0.24, 0.75, -0.723]);

  const window = add(new THREE.BoxGeometry(0.3, 0.31, 0.055), warmWindow, parent, [-0.42, 0.78, -0.682]);
  window.name = 'houseBuiltWindow';
  add(new THREE.BoxGeometry(0.035, 0.37, 0.04), darkWood, parent, [-0.42, 0.78, -0.72]);
  add(new THREE.BoxGeometry(0.36, 0.035, 0.04), darkWood, parent, [-0.42, 0.78, -0.72]);

  for (let stone = 0; stone < 3; stone += 1) {
    add(
      new THREE.BoxGeometry(0.2 + (stone % 2) * 0.025, 0.2, 0.2),
      chimneyStone,
      parent,
      [0.48 + (stone % 2) * 0.015, 1.22 + stone * 0.18, 0.22],
      [0, stone % 2 ? 0.08 : -0.05, 0]
    );
  }
}

function createConstructionRoof(parent) {
  const plateY = 1.2;
  const ridgeY = CABIN.ridgeY;
  const eaveX = 0.78;
  const eaveY = 1.13;
  const frameDepth = 0.56;
  const stations = [-frameDepth, -0.28, 0, 0.28, frameDepth];

  for (const x of [-CABIN.halfWidth, CABIN.halfWidth]) {
    addLog(parent, frameDepth * 2 + 0.14, 0.047, [x, plateY, 0], 'z', freshWood, 'houseConstructionWallPlate');
  }
  addLog(parent, frameDepth * 2 + 0.18, 0.048, [0, ridgeY, 0], 'z', freshWood, 'houseConstructionRidge');

  for (const z of stations) {
    addBeamBetween(parent, new THREE.Vector3(-eaveX, eaveY, z), new THREE.Vector3(0, ridgeY, z), 0.038);
    addBeamBetween(parent, new THREE.Vector3(0, ridgeY, z), new THREE.Vector3(eaveX, eaveY, z), 0.038);
  }

  for (const z of [-frameDepth, 0, frameDepth]) {
    addBeamBetween(parent, new THREE.Vector3(-0.64, plateY, z), new THREE.Vector3(0.64, plateY, z), 0.032);
  }
  for (const z of [-frameDepth, frameDepth]) {
    addBeamBetween(parent, new THREE.Vector3(0, plateY, z), new THREE.Vector3(0, ridgeY, z), 0.031);
  }

  const rise = ridgeY - eaveY;
  const slope = Math.hypot(eaveX, rise);
  const patch = new THREE.Group();
  patch.name = 'houseConstructionRoofPatch';
  patch.position.set(eaveX / 2, (ridgeY + eaveY) / 2, 0.36);
  patch.rotation.z = -Math.atan2(rise, eaveX);
  add(new THREE.BoxGeometry(slope, 0.06, 0.42), freshWood, patch, [0, 0.06, 0]);
  parent.add(patch);
}

function createConstructionCabin(parent) {
  createFloor(parent, freshWood);
  addWallRows(parent, { front: 2, back: 7, left: 4, right: 5 }, freshWood, wood);

  for (const x of [-CABIN.halfWidth, CABIN.halfWidth]) {
    for (const z of [-0.56, 0.56]) {
      addLog(parent, 1.02, 0.052, [x, 0.7, z], 'y', freshWood, 'houseConstructionPost');
    }
  }
  createConstructionRoof(parent);
}

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
  createBuiltCabin(built);

  const construction = new THREE.Group();
  construction.name = 'houseConstructionParts';
  rig.add(construction);
  createConstructionCabin(construction);

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
