import * as THREE from 'three';
import { add } from '../../core/scenePrimitives.js';

function hash(x, y) {
  const value = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return value - Math.floor(value);
}

function textureFromPixels(width, height, pixel) {
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const [red, green, blue] = pixel(x, y);
      const offset = (y * width + x) * 4;
      data[offset] = THREE.MathUtils.clamp(Math.round(red), 0, 255);
      data[offset + 1] = THREE.MathUtils.clamp(Math.round(green), 0, 255);
      data[offset + 2] = THREE.MathUtils.clamp(Math.round(blue), 0, 255);
      data[offset + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.85, 1.85);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

const dirtTexture = textureFromPixels(128, 128, (x, y) => {
  const broad = hash(Math.floor(x / 14), Math.floor(y / 14));
  const medium = hash(Math.floor(x / 5), Math.floor(y / 6));
  const fine = hash(x, y);
  const variation = (broad - 0.5) * 25 + (medium - 0.5) * 9 + (fine - 0.5) * 4;
  const dryPatch = Math.sin(x * 0.13 + y * 0.08) * 3;
  return [
    126 + variation + dryPatch,
    77 + variation * 0.68 + dryPatch * 0.6,
    42 + variation * 0.4 + dryPatch * 0.25,
  ];
});

const cobblestoneTexture = textureFromPixels(128, 128, (x, y) => {
  const row = Math.floor(y / 16);
  const offset = row % 2 === 0 ? 0 : 10;
  const shiftedX = x + offset;
  const column = Math.floor(shiftedX / 21);
  const localX = ((shiftedX % 21) + 21) % 21;
  const localY = y % 16;
  const edge = 2 + ((row + column) % 4 === 0 ? 1 : 0);
  if (localX < edge || localY < edge) return [56, 47, 41];
  const palette = [
    [119, 112, 101],
    [132, 121, 104],
    [104, 97, 89],
    [124, 110, 94],
  ];
  const base = palette[Math.abs(row * 3 + column) % palette.length];
  const shade = (hash(x, y) - 0.5) * 9;
  return base.map(value => value + shade);
});

const dirtMaterial = new THREE.MeshStandardMaterial({
  map: dirtTexture,
  bumpMap: dirtTexture,
  bumpScale: 0.018,
  color: 0xffffff,
  roughness: 1,
  metalness: 0,
  flatShading: true,
});

const cobblestoneMaterial = new THREE.MeshStandardMaterial({
  map: cobblestoneTexture,
  bumpMap: cobblestoneTexture,
  bumpScale: 0.032,
  color: 0xffffff,
  roughness: 0.98,
  metalness: 0,
  flatShading: true,
});

const dirtEdgeMaterial = new THREE.MeshStandardMaterial({
  color: 0x493124,
  roughness: 1,
  flatShading: true,
});

const stoneEdgeMaterial = new THREE.MeshStandardMaterial({
  color: 0x514b45,
  roughness: 0.98,
  flatShading: true,
});

const constructionSoilMaterial = new THREE.MeshStandardMaterial({
  color: 0x60402b,
  roughness: 1,
  flatShading: true,
});

const timberMaterial = new THREE.MeshStandardMaterial({
  color: 0x805436,
  roughness: 0.96,
  flatShading: true,
});

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
  shape.moveTo(...points[0]);
  points.slice(1).forEach(point => shape.lineTo(...point));
  shape.closePath();
  return shape;
}

function connectedSurface(connections, tile, width, topMaterial, edgeMaterial, name, depth = 0.05) {
  const geometry = new THREE.ExtrudeGeometry(connectedRoadShape(connections, tile, width), {
    depth,
    bevelEnabled: false,
    curveSegments: 1,
    steps: 1,
  });
  const mesh = new THREE.Mesh(geometry, [topMaterial, edgeMaterial]);
  mesh.name = name;
  mesh.rotation.x = -Math.PI / 2;
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  return mesh;
}

function addConstructionTimbers(parent, tile) {
  const timbers = [
    [-0.13, -0.16, 0.3],
    [0.14, -0.05, -0.42],
    [-0.1, 0.13, 0.74],
    [0.15, 0.19, -0.68],
  ];
  timbers.forEach(([x, z, angle], index) => {
    const timber = add(
      new THREE.CylinderGeometry(0.016, 0.022, tile * (0.28 + index % 2 * 0.05), 6),
      timberMaterial,
      parent,
      [x, 0.046, z],
      [Math.PI / 2, 0, angle],
    );
    timber.name = `roadConstructionTimber${index + 1}`;
    timber.castShadow = false;
  });
}

export function setRoadConstructionState(root, underConstruction) {
  const built = root.getObjectByName('roadBuiltParts');
  const construction = root.getObjectByName('roadConstructionParts');
  if (built) built.visible = !underConstruction;
  if (construction) construction.visible = underConstruction;
  root.userData.underConstruction = underConstruction;
}

export function makeRoad(connections, tile = 1.08, { underConstruction = false, cardId = 'road' } = {}) {
  const cobblestoneRoad = cardId === 'cobblestone_road';
  const root = new THREE.Group();
  root.name = cobblestoneRoad ? 'Estrada de Pedregulhos' : 'Rua de terra';
  root.userData.cardId = cardId;
  root.userData.connections = { ...connections };

  const width = tile * (cobblestoneRoad ? 0.52 : 0.46);
  const built = new THREE.Group();
  built.name = 'roadBuiltParts';
  built.add(connectedSurface(
    connections,
    tile,
    width,
    cobblestoneRoad ? cobblestoneMaterial : dirtMaterial,
    cobblestoneRoad ? stoneEdgeMaterial : dirtEdgeMaterial,
    cobblestoneRoad ? 'cobblestoneRoadSurface' : 'dirtRoadSurface',
  ));
  root.add(built);

  const construction = new THREE.Group();
  construction.name = 'roadConstructionParts';
  construction.add(connectedSurface(
    connections,
    tile,
    width * 0.96,
    constructionSoilMaterial,
    dirtEdgeMaterial,
    'roadConstructionSurface',
    0.032,
  ));
  addConstructionTimbers(construction, tile);
  root.add(construction);

  setRoadConstructionState(root, underConstruction);
  return root;
}
