import * as THREE from 'three';
import { add } from '../../core/scenePrimitives.js';

function hippedRoof(width, depth, height, ridgeLength) {
  const x = width / 2, z = depth / 2, ridge = ridgeLength / 2;
  const points = [
    [-x, 0, -z], [x, 0, -z], [x, 0, z], [-x, 0, z],
    [0, height, -ridge], [0, height, ridge],
  ];
  const faces = [[0, 4, 1], [1, 4, 5], [1, 5, 2], [2, 5, 3], [3, 5, 4], [3, 4, 0], [0, 1, 2], [0, 2, 3]];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(faces.flatMap(face => face.flatMap(index => points[index])), 3));
  geometry.computeVertexNormals();
  return geometry;
}

function addRoof(parent, materials, { width, depth, height, ridge, position, name }) {
  const roof = add(hippedRoof(width, depth, height, ridge), materials.roof, parent, position);
  roof.name = name;
  add(new THREE.BoxGeometry(width + 0.025, 0.055, depth + 0.025), materials.roofEdge, parent, position);
  add(new THREE.BoxGeometry(0.065, 0.06, ridge + 0.055), materials.roofEdge, parent, [position[0], position[1] + height, position[2]]);
  return roof;
}

function addWindow(parent, materials, { x, y, z, rotation = 0, warm = false, width = 0.09, height = 0.27 }) {
  const window = new THREE.Group();
  window.name = 'castleWindowRecess';
  window.position.set(x, y, z);
  window.rotation.y = rotation;
  add(new THREE.BoxGeometry(width + 0.075, height + 0.055, 0.025), materials.trim, window);
  add(new THREE.BoxGeometry(width, height, 0.029), warm ? materials.warmWindow : materials.window, window, [0, 0, 0.015]);
  parent.add(window);
}

function addCornerTower(parent, materials, x, z, enemy) {
  const tower = new THREE.Group();
  tower.name = 'Torre gótica de canto';
  tower.position.set(x, 0, z);
  add(new THREE.CylinderGeometry(0.3, 0.32, 0.16, 8), materials.trim, tower, [0, 0.28, 0]);
  add(new THREE.CylinderGeometry(0.275, 0.3, 1.22, 8), materials.stone, tower, [0, 0.96, 0]);
  add(new THREE.CylinderGeometry(0.305, 0.285, 0.09, 8), materials.trim, tower, [0, 1.565, 0]);
  const height = enemy ? 0.6 : 0.54;
  const roof = add(new THREE.ConeGeometry(0.335, height, 8), materials.roof, tower, [0, 1.66 + height / 2, 0], [0, Math.PI / 8, 0]);
  roof.name = 'castleCornerRoof';
  add(new THREE.CylinderGeometry(0.337, 0.337, 0.045, 8), materials.roofEdge, tower, [0, 1.64, 0]);
  addWindow(tower, materials, { x: 0, y: 1.06, z: Math.sign(z) * 0.288, rotation: z < 0 ? Math.PI : 0, width: 0.055, height: 0.3 });
  parent.add(tower);
}

function addCurtainWall(parent, materials, axis, fixed, length = 1.62) {
  const wall = new THREE.Group();
  wall.name = 'castleCurtainWall';
  if (axis === 'z') wall.rotation.y = Math.PI / 2;
  wall.position.set(axis === 'z' ? fixed : 0, 0, axis === 'x' ? fixed : 0);
  add(new THREE.BoxGeometry(length, 0.71, 0.17), materials.stone, wall, [0, 0.65, 0]);
  add(new THREE.BoxGeometry(length, 0.065, 0.235), materials.trim, wall, [0, 1.035, 0]);
  for (const x of [-0.56, -0.185, 0.185, 0.56]) {
    add(new THREE.BoxGeometry(0.2, 0.17, 0.22), materials.stone, wall, [x, 1.15, 0]);
  }
  parent.add(wall);
}

function gatehouseShell() {
  // One U-shaped extrusion makes the passage genuinely open into the courtyard.
  const shape = new THREE.Shape();
  shape.moveTo(-0.47, 0.25);
  shape.lineTo(-0.47, 1.43);
  shape.lineTo(0.47, 1.43);
  shape.lineTo(0.47, 0.25);
  shape.lineTo(0.25, 0.25);
  shape.lineTo(0.25, 0.77);
  shape.quadraticCurveTo(0.25, 1.03, 0, 1.055);
  shape.quadraticCurveTo(-0.25, 1.03, -0.25, 0.77);
  shape.lineTo(-0.25, 0.25);
  shape.closePath();
  return new THREE.ExtrudeGeometry(shape, { depth: 0.36, bevelEnabled: false, curveSegments: 8 });
}

function addGatehouse(parent, materials) {
  const entrance = new THREE.Group();
  entrance.name = 'castleEntrance';
  entrance.position.z = 0.98;
  const shell = add(gatehouseShell(), materials.stone, entrance, [0, 0, -0.18]);
  shell.name = 'castleGatehousePassage';
  for (const x of [-0.295, 0.295]) add(new THREE.BoxGeometry(0.095, 0.54, 0.085), materials.trim, entrance, [x, 0.515, 0.197]);
  const arch = add(new THREE.TorusGeometry(0.292, 0.047, 5, 18, Math.PI), materials.trim, entrance, [0, 0.775, 0.197]);
  arch.name = 'castleGateArch';
  for (const x of [-0.18, -0.09, 0, 0.09, 0.18]) {
    const bar = add(new THREE.BoxGeometry(0.018, 0.64, 0.028), materials.gate, entrance, [x, 0.6, 0.1]);
    bar.name = 'Grade do portão';
  }
  for (const y of [0.41, 0.72]) add(new THREE.BoxGeometry(0.45, 0.025, 0.033), materials.gate, entrance, [0, y, 0.102]);
  add(new THREE.BoxGeometry(1.01, 0.09, 0.44), materials.trim, entrance, [0, 1.44, 0]);
  addRoof(entrance, materials, { width: 1.08, depth: 0.58, height: 0.36, ridge: 0.2, position: [0, 1.52, 0], name: 'castleGatehouseRoof' });
  for (const x of [-0.365, 0.365]) addWindow(entrance, materials, { x, y: 1.17, z: 0.195, height: 0.145, width: 0.055 });
  parent.add(entrance);
}

function addBanner(parent, materials, x, y, z, scale = 1) {
  const shape = new THREE.Shape();
  shape.moveTo(-0.15, 0);
  shape.lineTo(-0.15, -0.53);
  shape.lineTo(0, -0.45);
  shape.lineTo(0.15, -0.53);
  shape.lineTo(0.15, 0);
  shape.closePath();
  const banner = add(new THREE.ShapeGeometry(shape), materials.accent, parent, [x, y, z], [0, 0, 0], [scale, scale, scale]);
  banner.name = 'Estandarte do reino';
  add(new THREE.BoxGeometry(0.38 * scale, 0.035, 0.045), materials.gate, parent, [x, y + 0.015, z]);
  add(new THREE.BoxGeometry(0.085 * scale, 0.085 * scale, 0.012), materials.trim, parent, [x, y - 0.18 * scale, z + 0.01], [0, 0, Math.PI / 4]);
}

function addCentralKeep(parent, materials, enemy) {
  const keep = new THREE.Group();
  keep.name = 'Torre central sombria';
  keep.position.z = -0.28;
  add(new THREE.BoxGeometry(1.05, 1.69, 0.95), materials.stone, keep, [0, 1.16, 0]);
  add(new THREE.BoxGeometry(1.15, 0.12, 1.04), materials.trim, keep, [0, 0.37, 0]);
  add(new THREE.BoxGeometry(1.15, 0.095, 1.055), materials.trim, keep, [0, 2.05, 0]);
  addRoof(keep, materials, { width: 1.27, depth: 1.19, height: enemy ? 0.71 : 0.62, ridge: 0.63, position: [0, 2.14, 0], name: 'castleMainRoof' });
  for (const x of [-0.425, 0.425]) {
    add(new THREE.BoxGeometry(0.11, 1.38, 0.14), materials.trim, keep, [x, 1.08, 0.48]);
    addWindow(keep, materials, { x: x * 0.68, y: 1.71, z: 0.49, height: 0.25, width: 0.105, warm: true });
  }
  for (const side of [-1, 1]) addWindow(keep, materials, { x: side * 0.535, y: 1.37, z: 0, rotation: side * Math.PI / 2, width: 0.1, height: 0.33 });
  addBanner(keep, materials, 0, 1.51, 0.489);
  parent.add(keep);
}

export function createCastleArchitecture(materials, enemy) {
  const architecture = new THREE.Group();
  architecture.name = 'castleArchitecture';
  addCurtainWall(architecture, materials, 'x', -0.96);
  addCurtainWall(architecture, materials, 'z', -0.96);
  addCurtainWall(architecture, materials, 'z', 0.96);
  for (const x of [-0.64, 0.64]) {
    add(new THREE.BoxGeometry(0.45, 0.71, 0.17), materials.stone, architecture, [x, 0.65, 0.96]);
  }
  for (const x of [-0.8, 0.8]) {
    for (const z of [-0.8, 0.8]) addCornerTower(architecture, materials, x, z, enemy);
  }
  addCentralKeep(architecture, materials, enemy);
  addGatehouse(architecture, materials);
  const levelDetails = new THREE.Group();
  levelDetails.name = 'castleLevelTwoDetails';
  levelDetails.visible = false;
  for (const x of [-0.365, 0.365]) addBanner(levelDetails, materials, x, 1.28, 1.2, 0.45);
  architecture.add(levelDetails);
  return architecture;
}

export function createCastleCourtyard(materials) {
  const courtyard = new THREE.Group();
  courtyard.name = 'castleCourtyard';
  const foundation = add(new THREE.CylinderGeometry(1.42, 1.44, 0.1, 8), materials.dark, courtyard, [0, 0.19, 0]);
  foundation.name = 'Fundação interna do castelo';
  for (const x of [-0.54, 0, 0.54]) {
    for (const z of [0.4, 0.76]) add(new THREE.BoxGeometry(0.48, 0.018, 0.3), materials.trim, courtyard, [x, 0.249, z]);
  }
  add(new THREE.BoxGeometry(0.57, 0.1, 0.35), materials.trim, courtyard, [0, 0.17, 1.24]);
  return courtyard;
}
