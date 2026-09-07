import * as THREE from 'three';
import { add } from '../../core/scenePrimitives.js';
import { unitBase } from './unitModelKit.js';

const Y_AXIS = new THREE.Vector3(0, 1, 0);

const stone = new THREE.MeshStandardMaterial({ color: 0x77756c, roughness: 1, flatShading: true });
const stoneDark = new THREE.MeshStandardMaterial({ color: 0x5e625d, roughness: 1, flatShading: true });
const stoneLight = new THREE.MeshStandardMaterial({ color: 0x9b9282, roughness: 0.98, flatShading: true });
const agedWood = new THREE.MeshStandardMaterial({ color: 0x5c4032, roughness: 0.96, flatShading: true });
const agedWoodLight = new THREE.MeshStandardMaterial({ color: 0x76513a, roughness: 0.94, flatShading: true });
const freshWood = new THREE.MeshStandardMaterial({ color: 0xb78355, roughness: 0.9, flatShading: true });
const iron = new THREE.MeshStandardMaterial({ color: 0x383935, roughness: 0.48, metalness: 0.55, flatShading: true });

function beamBetween(parent, from, to, radius, material, name) {
  const direction = new THREE.Vector3().subVectors(to, from);
  const midpoint = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
  const beam = add(
    new THREE.CylinderGeometry(radius * 0.94, radius, direction.length(), 8),
    material,
    parent,
    midpoint.toArray()
  );
  beam.quaternion.setFromUnitVectors(Y_AXIS, direction.normalize());
  beam.name = name;
  return beam;
}

function addFoundation(parent) {
  const foundation = add(new THREE.CylinderGeometry(0.62, 0.66, 0.16, 8), stoneDark, parent, [0, 0.08, 0]);
  foundation.name = 'towerFoundation';
}

function addStoneBands(parent, bands) {
  bands.forEach(([y, radius]) => {
    const band = add(new THREE.CylinderGeometry(radius, radius + 0.02, 0.07, 8), stoneLight, parent, [0, y, 0]);
    band.name = 'towerStoneBand';
  });
}

function addDoor(parent) {
  const outline = new THREE.Shape();
  outline.moveTo(-0.17, 0);
  outline.lineTo(0.17, 0);
  outline.lineTo(0.17, 0.4);
  outline.quadraticCurveTo(0.17, 0.59, 0, 0.59);
  outline.quadraticCurveTo(-0.17, 0.59, -0.17, 0.4);
  outline.closePath();
  const door = add(new THREE.ExtrudeGeometry(outline, { depth: 0.065, bevelEnabled: false, curveSegments: 6 }), agedWood, parent, [0, 0.12, 0.595]);
  door.name = 'towerDoor';
  [-0.1, 0, 0.1].forEach(x => add(new THREE.BoxGeometry(0.015, 0.47, 0.017), agedWoodLight, parent, [x, 0.36, 0.666]));
  for (const y of [0.28, 0.49]) add(new THREE.BoxGeometry(0.31, 0.04, 0.026), iron, parent, [0, y, 0.684]);
  for (const side of [-1, 1]) {
    for (let row = 0; row < 3; row += 1) add(new THREE.BoxGeometry(0.115, 0.145, 0.13), stoneLight, parent, [side * 0.238, 0.19 + row * 0.145, 0.638]);
  }
  const arch = new THREE.Group();
  arch.name = 'towerDoorArch';
  for (let index = 0; index < 7; index += 1) {
    const angle = index / 6 * Math.PI;
    const voussoir = add(new THREE.BoxGeometry(0.11, 0.135, 0.145), stoneLight, arch, [Math.cos(angle) * 0.24, 0.55 + Math.sin(angle) * 0.24, 0.65], [0, 0, angle - Math.PI / 2]);
    voussoir.name = 'towerArchStone';
  }
  parent.add(arch);
  add(new THREE.TorusGeometry(0.032, 0.009, 5, 10), iron, parent, [0.08, 0.37, 0.709]);
}

function addMasonryDetails(parent) {
  const masonry = new THREE.InstancedMesh(new THREE.BoxGeometry(0.32, 0.16, 0.045), stoneDark, 32);
  masonry.name = 'towerDressedStoneCourses';
  masonry.castShadow = true;
  masonry.receiveShadow = true;
  const block = new THREE.Object3D();
  for (let row = 0; row < 4; row += 1) {
    const y = 0.39 + row * 0.25;
    const radius = (0.6 - (y - 0.1) / 1.36 * 0.15) * Math.cos(Math.PI / 8) + 0.018;
    for (let side = 0; side < 8; side += 1) {
      const angle = side * Math.PI / 4 + Math.PI / 8;
      block.position.set(Math.sin(angle) * radius, y, Math.cos(angle) * radius);
      block.rotation.y = angle;
      block.updateMatrix();
      masonry.setMatrixAt(row * 8 + side, block.matrix);
      masonry.setColorAt(row * 8 + side, new THREE.Color((row + side) % 3 ? 0xc5c0b4 : 0x8c908c));
    }
  }
  parent.add(masonry);
  for (let index = 0; index < 4; index += 1) {
    const angle = Math.PI / 4 + index * Math.PI / 2;
    const buttress = new THREE.Group();
    buttress.name = 'towerButtress';
    buttress.rotation.y = angle;
    add(new THREE.BoxGeometry(0.17, 0.8, 0.19), stoneDark, buttress, [0, 0.56, 0.56]);
    add(new THREE.BoxGeometry(0.21, 0.14, 0.28), stoneLight, buttress, [0, 0.18, 0.58]);
    add(new THREE.BoxGeometry(0.2, 0.075, 0.23), stoneLight, buttress, [0, 0.97, 0.55], [-0.28, 0, 0]);
    parent.add(buttress);
  }
  for (const side of [-1, 1]) {
    const slit = add(new THREE.BoxGeometry(0.045, 0.23, 0.04), iron, parent, [side * 0.493, 1.065, 0], [0, Math.PI / 2, 0]);
    slit.name = 'towerArrowSlit';
    add(new THREE.BoxGeometry(0.11, 0.04, 0.095), stoneLight, parent, [side * 0.49, 0.94, 0]);
  }
}

function addBattlements(parent) {
  for (let index = 0; index < 8; index += 1) {
    const angle = index / 8 * Math.PI * 2;
    const merlon = add(
      new THREE.BoxGeometry(0.2, 0.29, 0.2),
      index % 2 ? stoneLight : stone,
      parent,
      [Math.sin(angle) * 0.5, 1.76, Math.cos(angle) * 0.5],
      [0, angle, 0]
    );
    merlon.name = 'towerMerlon';
  }
}

function createBuiltParts() {
  const parts = new THREE.Group();
  parts.name = 'towerBuiltParts';
  addFoundation(parts);

  const body = add(new THREE.CylinderGeometry(0.45, 0.6, 1.36, 8), stone, parts, [0, 0.78, 0]);
  body.name = 'towerOctagonalBody';
  addStoneBands(parts, [[0.31, 0.58], [0.76, 0.53], [1.2, 0.48]]);
  addMasonryDetails(parts);

  const gallery = add(new THREE.CylinderGeometry(0.66, 0.47, 0.17, 8), stoneDark, parts, [0, 1.5, 0]);
  gallery.name = 'towerUpperGallery';
  const topFloor = add(new THREE.CylinderGeometry(0.56, 0.56, 0.06, 8), agedWood, parts, [0, 1.62, 0]);
  topFloor.name = 'towerTopFloor';
  for (let index = 0; index < 8; index += 1) {
    const angle = index * Math.PI / 4;
    const corbel = add(new THREE.BoxGeometry(0.11, 0.24, 0.16), stoneLight, parts, [Math.sin(angle) * 0.5, 1.38, Math.cos(angle) * 0.5], [0, angle, 0]);
    corbel.name = 'towerGalleryCorbel';
  }

  addBattlements(parts);
  addDoor(parts);
  return parts;
}

function addScaffoldRing(parent, y) {
  const edge = 0.51;
  [-edge, edge].forEach(z => beamBetween(
    parent,
    new THREE.Vector3(-edge, y, z),
    new THREE.Vector3(edge, y, z),
    0.035,
    freshWood,
    'towerScaffoldRail'
  ));
  [-edge, edge].forEach(x => beamBetween(
    parent,
    new THREE.Vector3(x, y, -edge),
    new THREE.Vector3(x, y, edge),
    0.035,
    freshWood,
    'towerScaffoldRail'
  ));
}

function createConstructionParts() {
  const parts = new THREE.Group();
  parts.name = 'towerConstructionParts';
  addFoundation(parts);

  const body = add(new THREE.CylinderGeometry(0.54, 0.6, 0.72, 8), stone, parts, [0, 0.44, 0]);
  body.name = 'towerPartialMasonry';
  addStoneBands(parts, [[0.31, 0.58], [0.76, 0.53]]);

  const edge = 0.51;
  [-edge, edge].forEach(x => {
    [-edge, edge].forEach(z => beamBetween(
      parts,
      new THREE.Vector3(x, 0, z),
      new THREE.Vector3(x, 1.54, z),
      0.042,
      freshWood,
      'towerScaffoldPost'
    ));
  });
  addScaffoldRing(parts, 0.72);
  addScaffoldRing(parts, 1.51);
  beamBetween(parts, new THREE.Vector3(-edge, 0.72, -edge), new THREE.Vector3(edge, 1.51, -edge), 0.03, freshWood, 'towerScaffoldBrace');
  beamBetween(parts, new THREE.Vector3(edge, 0.72, edge), new THREE.Vector3(-edge, 1.51, edge), 0.03, freshWood, 'towerScaffoldBrace');
  beamBetween(parts, new THREE.Vector3(-edge, 0.72, edge), new THREE.Vector3(-edge, 1.51, -edge), 0.03, freshWood, 'towerScaffoldBrace');
  beamBetween(parts, new THREE.Vector3(edge, 0.72, -edge), new THREE.Vector3(edge, 1.51, edge), 0.03, freshWood, 'towerScaffoldBrace');
  const partialDeck = add(new THREE.BoxGeometry(0.46, 0.055, 0.92), freshWood, parts, [0.28, 1.48, 0]);
  partialDeck.name = 'towerPartialDeck';
  return parts;
}

export function makeTower() {
  const root = new THREE.Group();
  root.name = 'Torre';
  root.userData = { selectable: true, name: root.name, role: 'CONSTRUÇÃO · TORRE' };
  unitBase(root, 0xa58b67);

  const rig = new THREE.Group();
  rig.name = 'rig';
  rig.position.y = 0.18;
  root.add(rig);

  rig.add(createBuiltParts(), createConstructionParts());
  const archerMount = new THREE.Object3D();
  archerMount.name = 'archerMount';
  archerMount.position.set(0, 1.42, 0);
  rig.add(archerMount);

  setTowerConstructionState(root, false);
  return root;
}

export function setTowerConstructionState(root, underConstruction) {
  const builtParts = root.getObjectByName('towerBuiltParts');
  const constructionParts = root.getObjectByName('towerConstructionParts');
  if (builtParts) builtParts.visible = !underConstruction;
  if (constructionParts) constructionParts.visible = underConstruction;
  root.userData.underConstruction = underConstruction;
}
