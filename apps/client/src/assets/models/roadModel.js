import * as THREE from 'three';
import { add } from '../../core/scenePrimitives.js';
import { createGrainMaps, texturedStandardMaterial } from '../../core/darkFantasySurfaces.js';

const dirtMaps = createGrainMaps({ color: [112, 88, 61], repeat: [1.7, 1.7], seed: 251, streak: 0.024 });
const paverMaps = createGrainMaps({ color: [176, 180, 164], repeat: [1, 1], seed: 263, streak: 0.01 });
const dirtMaterial = texturedStandardMaterial(dirtMaps, { color: 0xffffff, roughness: 1, bumpScale: 0.016 });
const cobbleMaterial = new THREE.MeshStandardMaterial({ color: 0x55574d, roughness: 1 });
const soilMaterial = new THREE.MeshStandardMaterial({ color: 0x574938, roughness: 1 });
const dirtEdge = new THREE.MeshStandardMaterial({ color: 0x433b2e, roughness: 1 });
const stoneEdge = new THREE.MeshStandardMaterial({ color: 0x5e6058, roughness: 1 });
const stoneMaterial = texturedStandardMaterial(paverMaps, { color: 0xd2d5c7, roughness: 0.96, bumpScale: 0.008, flatShading: true });
const timberMaterial = new THREE.MeshStandardMaterial({ color: 0x8b7251, roughness: 1 });
const rutMaterial = new THREE.MeshStandardMaterial({ color: 0x594a35, roughness: 1 });
const DIRECTIONS = Object.freeze([
  ['north', 0, -1], ['east', 1, 0], ['south', 0, 1], ['west', -1, 0],
]);

function connectedRoadShape(connections, tile, width) {
  const halfWidth = width * 0.5;
  const edge = tile * 0.51;
  const points = [
    [-halfWidth, -halfWidth],
    ...(connections.north ? [[-halfWidth, -edge], [halfWidth, -edge]] : []),
    [halfWidth, -halfWidth],
    ...(connections.east ? [[edge, -halfWidth], [edge, halfWidth]] : []),
    [halfWidth, halfWidth],
    ...(connections.south ? [[halfWidth, edge], [-halfWidth, edge]] : []),
    [-halfWidth, halfWidth],
    ...(connections.west ? [[-edge, halfWidth], [-edge, -halfWidth]] : []),
  ];
  const shape = new THREE.Shape();
  points.forEach(([x, z], index) => index ? shape.lineTo(x, z) : shape.moveTo(x, z));
  shape.closePath();
  return shape;
}

function horizontalExtrusion(shape, depth) {
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled: false, curveSegments: 1, steps: 1,
  });
  // Shape Y is board Z. Build in XZ directly so north remains negative Z.
  // The lower cap becomes the upward surface without mirroring its normals.
  geometry.rotateX(Math.PI / 2);
  geometry.translate(0, depth, 0);
  return geometry;
}

function connectedSurface(connections, tile, width, topMaterial, edgeMaterial, name, depth = 0.05) {
  const surface = new THREE.Mesh(horizontalExtrusion(connectedRoadShape(connections, tile, width), depth), [topMaterial, edgeMaterial]);
  surface.name = name;
  surface.receiveShadow = true;
  surface.castShadow = false;
  return surface;
}

function addPart(parent, name, geometry, material, position, rotation = [0, 0, 0]) {
  const part = add(geometry, material, parent, position, rotation);
  part.name = name;
  return part;
}

function fitsFootprint(x, z, connections, tile, halfWidth) {
  if (Math.abs(x) <= halfWidth && Math.abs(z) <= halfWidth) return true;
  return DIRECTIONS.some(([key, dx, dz]) => {
    if (!connections[key]) return false;
    const along = x * dx + z * dz;
    const across = Math.abs(x * dz - z * dx);
    return across <= halfWidth && along >= 0 && along <= tile * 0.51;
  });
}

function paverGeometry(tile) {
  const x = tile * 0.072, z = tile * 0.057, chamfer = tile * 0.013;
  const shape = new THREE.Shape();
  [[-x + chamfer, -z], [x - chamfer, -z], [x, -z + chamfer], [x, z - chamfer],
    [x - chamfer, z], [-x + chamfer, z], [-x, z - chamfer], [-x, -z + chamfer]]
    .forEach(([a, b], index) => index ? shape.lineTo(a, b) : shape.moveTo(a, b));
  shape.closePath();
  return horizontalExtrusion(shape, tile * 0.022);
}

function addPavers(surface, connections, tile, width) {
  const positions = [];
  for (let row = -3; row <= 3; row += 1) {
    for (let column = -3; column <= 3; column += 1) {
      const x = (column * 0.157 + (Math.abs(row) % 2) * 0.075) * tile;
      const z = row * 0.133 * tile;
      if ([-1, 1].every(dx => [-1, 1].every(dz => fitsFootprint(x + dx * tile * 0.073, z + dz * tile * 0.058, connections, tile, width / 2)))) {
        positions.push([x, 0.05, z]);
      }
    }
  }
  const stones = new THREE.InstancedMesh(paverGeometry(tile), stoneMaterial, positions.length);
  stones.name = 'roadDressedPavers';
  stones.castShadow = stones.receiveShadow = true;
  const transform = new THREE.Object3D();
  positions.forEach((position, index) => {
    transform.position.set(...position);
    transform.scale.set(1, 0.8 + index % 3 * 0.12, 1);
    transform.updateMatrix();
    stones.setMatrixAt(index, transform.matrix);
    stones.setColorAt(index, new THREE.Color().setScalar(0.79 + (index * 7 % 5) * 0.043));
  });
  stones.computeBoundingBox();
  stones.computeBoundingSphere();
  surface.add(stones);
  const curbLength = tile * 0.49 - width / 2;
  for (const [key, dx, dz] of DIRECTIONS) {
    if (!connections[key]) continue;
    for (const side of [-1, 1]) {
      const along = width / 2 + curbLength / 2;
      addPart(surface, `roadCurb-${key}-${side}`,
        new THREE.BoxGeometry(tile * 0.036, tile * 0.023, curbLength), stoneEdge,
        [dx * along + dz * width * 0.458 * side, 0.062, dz * along + dx * width * 0.458 * side],
        [0, dx ? Math.PI / 2 : 0, 0]);
    }
  }
}

function addDirtTracks(surface, connections, tile, width) {
  for (const [key, dx, dz] of DIRECTIONS) {
    if (!connections[key]) continue;
    for (const side of [-1, 1]) {
      addPart(surface, `roadWheelRut-${key}-${side}`,
        new THREE.BoxGeometry(tile * 0.023, 0.004, tile * 0.47), rutMaterial,
        [dx * tile * 0.272 + dz * width * 0.25 * side, 0.052, dz * tile * 0.272 + dx * width * 0.25 * side],
        [0, dx ? Math.PI / 2 : 0, 0]);
    }
  }
  const gravel = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(tile * 0.023, 0), stoneEdge, 4);
  gravel.name = 'roadEdgeGravel';
  gravel.castShadow = gravel.receiveShadow = true;
  const transform = new THREE.Object3D();
  [[-0.17, -0.14], [0.16, -0.12], [-0.14, 0.16], [0.17, 0.14]].forEach(([x, z], index) => {
    transform.position.set(x * tile, 0.060, z * tile);
    transform.rotation.y = index * 0.7;
    transform.scale.set(1.1, 0.37, 0.85);
    transform.updateMatrix();
    gravel.setMatrixAt(index, transform.matrix);
  });
  gravel.computeBoundingBox();
  gravel.computeBoundingSphere();
  surface.add(gravel);
}

function addRoadWorks(construction, tile, cobblestone) {
  for (const [index, x] of [-0.19, 0.19].entries()) {
    const stake = addPart(construction, `roadSurveyStake${index + 1}`, new THREE.CylinderGeometry(tile * 0.01, tile * 0.014, tile * 0.07, 5),
      timberMaterial, [x * tile, tile * 0.054, tile * 0.15]);
    stake.castShadow = false;
  }
  if (cobblestone) {
    const pavers = new THREE.InstancedMesh(paverGeometry(tile), stoneMaterial, 6);
    pavers.name = 'roadUnfinishedPavers';
    pavers.castShadow = pavers.receiveShadow = true;
    const transform = new THREE.Object3D();
    for (let index = 0; index < 6; index += 1) {
      transform.position.set((index % 2 - 0.5) * tile * 0.15, 0.033 + Math.floor(index / 4) * tile * 0.025, (Math.floor(index / 2) % 2 - 0.5) * tile * 0.125);
      transform.updateMatrix();
      pavers.setMatrixAt(index, transform.matrix);
    }
    pavers.computeBoundingBox();
    pavers.computeBoundingSphere();
    construction.add(pavers);
  } else {
    for (let index = 0; index < 3; index += 1) addPart(construction, `roadConstructionTimber${index + 1}`,
      new THREE.BoxGeometry(tile * 0.31, tile * 0.023, tile * 0.036), timberMaterial,
      [tile * 0.01, 0.037 + index % 2 * tile * 0.027, (-0.085 + index * 0.042) * tile], [0, 0.16, 0]);
  }
}

export function setRoadConstructionState(root, underConstruction) {
  const built = root.getObjectByName('roadBuiltParts');
  const construction = root.getObjectByName('roadConstructionParts');
  if (built) built.visible = !underConstruction;
  if (construction) construction.visible = underConstruction;
  root.userData.underConstruction = underConstruction;
}

export function makeRoad(connections, tile = 1.08, { underConstruction = false, cardId = 'road' } = {}) {
  const cobblestone = cardId === 'cobblestone_road';
  const root = new THREE.Group();
  root.name = cobblestone ? 'Estrada de Pedregulhos' : 'Rua de terra';
  root.userData.cardId = cardId;
  root.userData.connections = { ...connections };
  const width = tile * (cobblestone ? 0.52 : 0.46);
  const built = new THREE.Group();
  built.name = 'roadBuiltParts';
  const surface = connectedSurface(connections, tile, width, cobblestone ? cobbleMaterial : dirtMaterial,
    cobblestone ? stoneEdge : dirtEdge, cobblestone ? 'cobblestoneRoadSurface' : 'dirtRoadSurface');
  if (cobblestone) addPavers(surface, connections, tile, width);
  else addDirtTracks(surface, connections, tile, width);
  built.add(surface);
  root.add(built);
  const construction = new THREE.Group();
  construction.name = 'roadConstructionParts';
  construction.add(connectedSurface(connections, tile, width * 0.96, soilMaterial, dirtEdge, 'roadConstructionSurface', 0.032));
  addRoadWorks(construction, tile, cobblestone);
  root.add(construction);
  setRoadConstructionState(root, underConstruction);
  return root;
}
