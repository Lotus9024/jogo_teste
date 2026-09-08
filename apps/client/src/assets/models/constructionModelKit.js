import * as THREE from 'three';
import { M, add } from '../../core/scenePrimitives.js';

const UP = new THREE.Vector3(0, 1, 0);
export const WORK = Object.freeze({
  earth: new THREE.MeshStandardMaterial({ color: 0x454036, roughness: 1, flatShading: true }),
  timber: new THREE.MeshStandardMaterial({ color: 0x83654a, roughness: 0.96, flatShading: true }),
  timberEnd: new THREE.MeshStandardMaterial({ color: 0xa58a64, roughness: 0.98, flatShading: true }),
  stone: new THREE.MeshStandardMaterial({ color: 0x797a6f, roughness: 0.98, flatShading: true }),
  mortar: new THREE.MeshStandardMaterial({ color: 0x9c9985, roughness: 1 }),
  rope: new THREE.MeshStandardMaterial({ color: 0x978369, roughness: 1 }),
  cloth: new THREE.MeshStandardMaterial({ color: 0x665d48, roughness: 1 }),
});

function named(parent, name, geometry, material, position, rotation = [0, 0, 0]) {
  const part = add(geometry, material, parent, position, rotation);
  part.name = name;
  return part;
}

export function siteBeam(parent, name, from, to, width = 0.05, material = WORK.timber) {
  const start = new THREE.Vector3(...from), end = new THREE.Vector3(...to);
  const direction = end.clone().sub(start);
  const beam = named(parent, name, new THREE.BoxGeometry(width, direction.length(), width), material, start.add(end).multiplyScalar(0.5).toArray());
  beam.quaternion.setFromUnitVectors(UP, direction.normalize());
  return beam;
}

export function worksiteSoil(parent, name, width = 1.2, depth = 1.1) {
  const patch = named(parent, name, new THREE.CylinderGeometry(0.49, 0.5, 0.018, 8), WORK.earth, [0, 0.009, 0]);
  patch.scale.set(width, 1, depth);
  return patch;
}

export function timberStack(parent, name, { position = [0, 0, 0], length = 0.5, count = 4, yaw = 0, width = 0.09 } = {}) {
  const stack = new THREE.Group();
  stack.name = name;
  stack.position.set(...position);
  stack.rotation.y = yaw;
  parent.add(stack);
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(length, 0.055, width), WORK.timber, count);
  mesh.name = `${name}Boards`;
  mesh.castShadow = mesh.receiveShadow = true;
  const matrix = new THREE.Object3D();
  for (let index = 0; index < count; index += 1) {
    matrix.position.set((index % 3 - 1) * 0.023, 0.031 + Math.floor(index / 2) * 0.058, (index % 2 - 0.5) * (width + 0.016));
    matrix.rotation.y = (index % 3 - 1) * 0.025;
    matrix.updateMatrix();
    mesh.setMatrixAt(index, matrix.matrix);
  }
  mesh.computeBoundingBox();
  mesh.computeBoundingSphere();
  stack.add(mesh);
  return stack;
}

export function masonryStack(parent, name, { position = [0, 0, 0], yaw = 0, rows = 2 } = {}) {
  const stack = new THREE.Group();
  stack.name = name;
  stack.position.set(...position);
  stack.rotation.y = yaw;
  parent.add(stack);
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < 3 - row; column += 1) {
      named(stack, `${name}Block${row}-${column}`, new THREE.BoxGeometry(0.17, 0.095, 0.14), WORK.stone,
        [(column - (2 - row) / 2) * 0.181, 0.05 + row * 0.102, row % 2 ? 0.018 : 0], [0, (column - 1) * 0.025, 0]);
    }
  }
  return stack;
}

export function workLadder(parent, name, { position = [0, 0, 0], height = 1.1, width = 0.25, lean = 0.17, yaw = 0 } = {}) {
  const ladder = new THREE.Group();
  ladder.name = name;
  ladder.position.set(...position);
  ladder.rotation.set(lean, yaw, 0);
  parent.add(ladder);
  for (const x of [-width / 2, width / 2]) siteBeam(ladder, `${name}Rail`, [x, 0, 0], [x, height, 0], 0.043);
  const steps = Math.max(3, Math.floor(height / 0.19));
  for (let index = 0; index < steps; index += 1) siteBeam(ladder, `${name}Rung${index + 1}`,
    [-width / 2, 0.12 + index * (height - 0.2) / steps, -0.015], [width / 2, 0.12 + index * (height - 0.2) / steps, -0.015], 0.033, WORK.timberEnd);
  return ladder;
}

export function trestle(parent, name, { position = [0, 0, 0], width = 0.62, height = 0.35, depth = 0.3 } = {}) {
  const stand = new THREE.Group();
  stand.name = name;
  stand.position.set(...position);
  parent.add(stand);
  for (const x of [-width * 0.34, width * 0.34]) {
    for (const side of [-1, 1]) siteBeam(stand, `${name}Leg`, [x, 0.022, side * depth / 2], [x, height - 0.025, 0], 0.06);
  }
  named(stand, `${name}Top`, new THREE.BoxGeometry(width, 0.065, 0.09), WORK.timberEnd, [0, height, 0]);
  return stand;
}

export function siteMallet(parent, name, { position = [0, 0, 0], yaw = 0 } = {}) {
  const tool = new THREE.Group();
  tool.name = name;
  tool.position.set(...position);
  tool.rotation.y = yaw;
  parent.add(tool);
  named(tool, `${name}Handle`, new THREE.CylinderGeometry(0.019, 0.024, 0.28, 6), WORK.timberEnd, [0, 0.036, 0.015], [Math.PI / 2, 0, 0]);
  named(tool, `${name}Head`, new THREE.BoxGeometry(0.16, 0.075, 0.078), M.iron, [0, 0.039, -0.12]);
  return tool;
}

export function mortarTub(parent, name, position = [0, 0, 0]) {
  const bucket = new THREE.Group();
  bucket.name = name;
  bucket.position.set(...position);
  parent.add(bucket);
  named(bucket, `${name}Wall`, new THREE.CylinderGeometry(0.12, 0.10, 0.13, 9), WORK.timber, [0, 0.069, 0]);
  named(bucket, `${name}Mortar`, new THREE.CylinderGeometry(0.103, 0.103, 0.008, 9), WORK.mortar, [0, 0.13, 0]);
  named(bucket, `${name}Rim`, new THREE.TorusGeometry(0.112, 0.009, 5, 12), M.iron, [0, 0.135, 0], [Math.PI / 2, 0, 0]);
  return bucket;
}
