import * as THREE from 'three';
import { add } from '../../core/scenePrimitives.js';
import { unitBase } from './unitModelKit.js';

const Y_AXIS = new THREE.Vector3(0, 1, 0);
const freshWood = new THREE.MeshStandardMaterial({ color: 0xb78355, roughness: 0.92, flatShading: true });
const freshWoodLight = new THREE.MeshStandardMaterial({ color: 0xc99661, roughness: 0.9, flatShading: true });
const agedWood = new THREE.MeshStandardMaterial({ color: 0x5c4032, roughness: 0.98, flatShading: true });
const agedWoodLight = new THREE.MeshStandardMaterial({ color: 0x76513a, roughness: 0.96, flatShading: true });

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

function addStake(parent, { x, height, z = 0, pointed = true, material }) {
  const radius = 0.075;
  const tipHeight = pointed ? 0.16 : 0;
  const bodyHeight = height - tipHeight;
  const body = add(
    new THREE.CylinderGeometry(radius * 0.94, radius, bodyHeight, 8),
    material,
    parent,
    [x, bodyHeight * 0.5, z]
  );
  body.name = pointed ? 'barrierStake' : 'barrierFlatStake';

  if (pointed) {
    const tip = add(new THREE.ConeGeometry(radius * 1.02, tipHeight, 8), material, parent, [x, bodyHeight + tipHeight * 0.5, z]);
    tip.name = 'barrierStakeTip';
  }
}

function addRearSupports(parent, material) {
  beamBetween(
    parent,
    new THREE.Vector3(-0.66, 0.72, -0.03),
    new THREE.Vector3(-0.82, 0, -0.38),
    0.052,
    material,
    'barrierGroundSupport'
  );
  beamBetween(
    parent,
    new THREE.Vector3(0.66, 0.72, -0.03),
    new THREE.Vector3(0.82, 0, -0.38),
    0.052,
    material,
    'barrierGroundSupport'
  );
}

function createBuiltParts() {
  const parts = new THREE.Group();
  parts.name = 'barrierBuiltParts';
  const heights = [1.03, 0.98, 1.06, 1, 1.08, 1.04, 0.99, 1.06, 1.01, 1.05, 0.98];
  const zOffsets = [0.006, -0.008, 0.01, -0.006, 0.008, -0.01, 0.009, -0.007, 0.006, -0.009, 0.008];
  heights.forEach((height, index) => addStake(parts, {
    x: -0.76 + index * 0.152,
    height,
    z: zOffsets[index],
    material: index % 3 === 1 ? agedWoodLight : agedWood,
  }));

  beamBetween(parts, new THREE.Vector3(-0.78, 0.34, 0.09), new THREE.Vector3(0.78, 0.34, 0.09), 0.05, agedWoodLight, 'barrierLowerRail');
  beamBetween(parts, new THREE.Vector3(-0.78, 0.68, 0.09), new THREE.Vector3(0.78, 0.68, 0.09), 0.05, agedWoodLight, 'barrierUpperRail');
  beamBetween(parts, new THREE.Vector3(-0.69, 0.2, 0.145), new THREE.Vector3(0.69, 0.84, 0.145), 0.038, agedWood, 'barrierDiagonalBrace');
  addRearSupports(parts, agedWoodLight);
  return parts;
}

function createConstructionParts() {
  const parts = new THREE.Group();
  parts.name = 'barrierConstructionParts';
  [
    { x: -0.76, height: 1.03, z: 0.006, pointed: true },
    { x: -0.608, height: 0.94, z: -0.008, pointed: false },
    { x: -0.456, height: 1.07, z: 0.009, pointed: true },
    { x: -0.304, height: 0.88, z: -0.007, pointed: false },
    { x: 0.304, height: 0.93, z: 0.008, pointed: false },
    { x: 0.76, height: 1.05, z: -0.006, pointed: true },
  ].forEach((stake, index) => addStake(parts, {
    ...stake,
    material: index % 2 ? freshWoodLight : freshWood,
  }));

  beamBetween(parts, new THREE.Vector3(-0.78, 0.34, 0.09), new THREE.Vector3(0.78, 0.34, 0.09), 0.05, freshWood, 'barrierConstructionLowerRail');
  beamBetween(parts, new THREE.Vector3(-0.78, 0.66, 0.09), new THREE.Vector3(-0.304, 0.66, 0.09), 0.046, freshWoodLight, 'barrierPartialUpperRail');
  beamBetween(parts, new THREE.Vector3(0.304, 0.25, 0.14), new THREE.Vector3(0.76, 0.75, 0.14), 0.038, freshWoodLight, 'barrierConstructionBrace');
  addRearSupports(parts, freshWood);
  return parts;
}

export function makeWoodBarrier() {
  const root = new THREE.Group();
  root.name = 'Barreira de madeira';
  root.userData = { selectable: true, name: root.name, role: 'CONSTRUÇÃO · BARREIRA' };
  unitBase(root, 0x9a6a38);

  const rig = new THREE.Group();
  rig.name = 'rig';
  rig.position.y = 0.18;
  root.add(rig);
  rig.add(createBuiltParts(), createConstructionParts());

  setWoodBarrierConstructionState(root, false);
  return root;
}

export function setWoodBarrierConstructionState(root, underConstruction) {
  const builtParts = root.getObjectByName('barrierBuiltParts');
  const constructionParts = root.getObjectByName('barrierConstructionParts');
  if (builtParts) builtParts.visible = !underConstruction;
  if (constructionParts) constructionParts.visible = underConstruction;
  root.userData.underConstruction = underConstruction;
}
