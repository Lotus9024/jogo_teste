import * as THREE from 'three';
import { M, add } from '../../core/scenePrimitives.js';
import { U, humanoidBase } from './unitModelKit.js';
import { profileGeometry } from './miniatureGeometry.js';

export { M, U };
// Shared immutable anatomy geometry keeps repeated miniatures from allocating a
// new vertex buffer for every joint, face, glove and boot.
const OVAL_GEOMETRY = new THREE.SphereGeometry(1, 8, 6);

export function human(name, role, color, stats) {
  const model = humanoidBase(name, role, color, stats);
  model.root.userData.modelFrontZ = 1;
  model.root.userData.miniatureStyle = 'sculpted-human-v2';
  return model;
}

export function mesh(parent, name, geometry, material, position, rotation = [0, 0, 0], scale = [1, 1, 1]) {
  const part = add(geometry, material, parent, position, rotation, scale);
  part.name = name;
  return part;
}

export function oval(parent, name, position, scale, material) {
  return mesh(parent, name, OVAL_GEOMETRY, material, position, [0, 0, 0], scale);
}

/** Elliptical rings produce an anatomical chest/waist, with outward-facing facets. */
export function tailoredTorso(parent, name, material, { y = 1.17, height = 0.8, width = 1, depth = 1 } = {}) {
  const rings = [[-0.5, 0.32, 0.205], [-0.15, 0.275, 0.19], [0.29, 0.395, 0.235], [0.5, 0.30, 0.185]];
  const vertices = [];
  const uvs = [];
  const indices = [];
  const segments = 12;
  rings.forEach(([level, x, z], row) => {
    for (let index = 0; index < segments; index += 1) {
      const angle = index / segments * Math.PI * 2;
      vertices.push(Math.cos(angle) * x * width, level * height, Math.sin(angle) * z * depth);
      uvs.push(index / segments, row / (rings.length - 1));
    }
  });
  for (let row = 0; row < rings.length - 1; row += 1) {
    for (let index = 0; index < segments; index += 1) {
      const a = row * segments + index;
      const b = row * segments + (index + 1) % segments;
      indices.push(a, a + segments, b, b, a + segments, b + segments);
    }
  }
  const bottom = vertices.length / 3;
  vertices.push(0, -height / 2, 0, 0, height / 2, 0);
  uvs.push(0.5, 0, 0.5, 1);
  for (let index = 0; index < segments; index += 1) {
    const next = (index + 1) % segments;
    indices.push(bottom, index, next, bottom + 1, 36 + next, 36 + index);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return mesh(parent, name, geometry, material, [0, y, 0]);
}

export function profile(parent, name, points, thickness, material, position, rotation = [0, 0, 0], bevel = 0.015) {
  const geometry = profileGeometry(points, thickness, bevel);
  return mesh(parent, name, geometry, material, position, rotation);
}

export function link(parent, name, from, to, radius, material, taper = 0.83) {
  const start = new THREE.Vector3(...from);
  const end = new THREE.Vector3(...to);
  const direction = end.clone().sub(start);
  const part = mesh(parent, name, new THREE.CylinderGeometry(radius * taper, radius, direction.length(), 8), material, start.add(end).multiplyScalar(0.5).toArray());
  part.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  return part;
}

export function arm(parent, name, shoulder, elbow, hand, sleeve, forearm = M.leather) {
  oval(parent, name + 'Shoulder', shoulder, [0.16, 0.17, 0.16], sleeve);
  link(parent, name + 'UpperArm', shoulder, elbow, 0.11, sleeve);
  oval(parent, name + 'Elbow', elbow, [0.09, 0.1, 0.095], forearm);
  link(parent, name + 'Forearm', elbow, hand, 0.085, forearm);
  return oval(parent, name + 'Hand', hand, [0.085, 0.1, 0.078], M.skin);
}

export function legs(parent, name, { armored = false, material = M.darkLeather, stance = 0.19 } = {}) {
  for (const side of [-1, 1]) {
    const stride = side > 0 ? 0.09 : -0.07;
    link(parent, name + 'Thigh', [side * 0.16, 0.91, 0], [side * stance, 0.57, stride], 0.14, material);
    link(parent, name + 'Shin', [side * stance, 0.57, stride], [side * (stance + 0.03), 0.21, stride + 0.03], 0.105, M.darkLeather);
    oval(parent, name + 'Boot', [side * (stance + 0.03), 0.145, stride + 0.13], [0.14, 0.115, 0.25], M.darkLeather);
    if (armored) {
      oval(parent, name + 'Knee', [side * stance, 0.57, stride + 0.1], [0.13, 0.13, 0.07], U.plate);
      profile(parent, name + 'Greave', [[-0.09, -0.13], [0.09, -0.13], [0.12, 0.13], [0, 0.18], [-0.12, 0.13]], 0.05, U.plateDark, [side * stance, 0.34, stride + 0.115]);
    }
  }
}

export function face(parent, name, y = 1.87, { beard = false } = {}) {
  link(parent, name + 'Neck', [0, y - 0.31, 0], [0, y - 0.19, 0], 0.1, M.skin, 1);
  oval(parent, name + 'Head', [0, y, 0.005], [0.215, 0.275, 0.20], M.skin);
  oval(parent, name + 'Jaw', [0, y - 0.135, 0.085], [0.15, 0.105, 0.135], beard ? M.darkLeather : M.skin);
  profile(parent, name + 'Nose', [[-0.032, -0.025], [0.032, -0.025], [0.017, 0.08], [-0.017, 0.08]], 0.075, M.skin, [0, y - 0.01, 0.215], [0.16, 0, 0], 0.004);
  for (const side of [-1, 1]) {
    oval(parent, name + 'Ear', [side * 0.205, y - 0.015, 0], [0.045, 0.07, 0.055], M.skin);
    mesh(parent, name + 'Eye', new THREE.BoxGeometry(0.047, 0.022, 0.018), U.black, [side * 0.073, y + 0.045, 0.185]);
  }
}

export function belt(parent, name, y = 1.01, width = 0.30) {
  mesh(parent, name + 'Belt', new THREE.CylinderGeometry(width, width + 0.025, 0.10, 12), M.leather, [0, y, 0], [0, 0, 0], [1, 1, 0.73]);
  profile(parent, name + 'Buckle', [[-0.067, -0.05], [0.067, -0.05], [0.067, 0.05], [-0.067, 0.05]], 0.025, U.bronze, [0.05, y, width * 0.75]);
}

export function foldedCape(parent, name, material, { top = 1.61, bottom = 0.69, width = 0.5, back = -0.31 } = {}) {
  const positions = [];
  const uvs = [];
  const indices = [];
  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column <= 8; column += 1) {
      const u = column / 8 * 2 - 1;
      const spread = 0.48 + row * 0.26;
      const tear = row === 2 ? (column % 2) * 0.055 : 0;
      positions.push(u * width * spread, top + (bottom - top) * row / 2 + tear, back - row * 0.08 + Math.cos(column * Math.PI) * 0.035);
      uvs.push(column / 8, 1 - row / 2);
    }
  }
  for (let row = 0; row < 2; row += 1) {
    for (let column = 0; column < 8; column += 1) {
      const a = row * 9 + column;
      indices.push(a, a + 1, a + 9, a + 1, a + 10, a + 9);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const cloth = material.clone();
  cloth.side = THREE.DoubleSide;
  return mesh(parent, name, geometry, cloth, [0, 0, 0]);
}
