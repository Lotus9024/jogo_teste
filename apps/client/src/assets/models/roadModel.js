import * as THREE from 'three';
import { add } from '../../core/scenePrimitives.js';
import { createCobblestoneMaps, createGrainMaps, texturedStandardMaterial } from '../../core/darkFantasySurfaces.js';

const cobbles = createCobblestoneMaps({ stone: [73, 61, 79], mortar: [22, 17, 27], repeat: [2.8, 2.8], seed: 421 });
const curbMaps = createCobblestoneMaps({ stone: [48, 43, 57], mortar: [14, 11, 19], repeat: [2, 2], seed: 433 });
const timberMaps = createGrainMaps({ color: [87, 49, 34], repeat: [4, 2], seed: 449, streak: 0.035 });
const roadMaterial = texturedStandardMaterial(cobbles, { color: 0xffffff, roughness: 0.98, metalness: 0, bumpScale: 0.045 });
const edgeMaterial = texturedStandardMaterial(curbMaps, { color: 0xffffff, roughness: 0.95, metalness: 0.02, bumpScale: 0.05 });
const branchMaterial = texturedStandardMaterial(timberMaps, { color: 0xffffff, roughness: 0.96, metalness: 0, bumpScale: 0.035, flatShading: true });
const rutMaterial = new THREE.MeshStandardMaterial({ color: 0x1c1721, roughness: 1, metalness: 0 });
const runeMaterial = new THREE.MeshBasicMaterial({ color: 0x7750a6, transparent: true, opacity: 0.62, toneMapped: false });

function addRoadSection(parent, x, z, sizeX, sizeZ, direction) {
  add(new THREE.BoxGeometry(sizeX, 0.03, sizeZ), roadMaterial, parent, [x, 0, z]);
  const horizontal = direction === 'east' || direction === 'west';
  const edgeLength = horizontal ? sizeX : sizeZ;
  for (const side of [-1, 1]) {
    add(
      new THREE.BoxGeometry(horizontal ? edgeLength : 0.045, 0.045, horizontal ? 0.045 : edgeLength),
      edgeMaterial,
      parent,
      [x + (horizontal ? 0 : side * sizeX * 0.42), 0.014, z + (horizontal ? side * sizeZ * 0.42 : 0)]
    );
  }
  for (const side of [-1, 1]) {
    add(
      new THREE.BoxGeometry(horizontal ? edgeLength * 0.82 : 0.012, 0.008, horizontal ? 0.012 : edgeLength * 0.82),
      rutMaterial,
      parent,
      [x + (horizontal ? 0 : side * sizeX * 0.21), 0.019, z + (horizontal ? side * sizeZ * 0.21 : 0)]
    );
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
  const cobblestoneRoad = cardId === 'cobblestone_road';
  const root = new THREE.Group();
  root.name = cobblestoneRoad ? 'Estrada de Pedregulhos' : 'Rua';
  root.userData.cardId = cardId;
  const built = new THREE.Group();
  built.name = 'roadBuiltParts';
  root.add(built);
  const construction = new THREE.Group();
  construction.name = 'roadConstructionParts';
  root.add(construction);
  const width = tile * (cobblestoneRoad ? 0.34 : 0.24);
  const center = tile * (cobblestoneRoad ? 0.38 : 0.28);
  const centerSurface = new THREE.Group();
  centerSurface.name = 'roadCenterSurface';
  addRoadSection(centerSurface, 0, 0, center, center, 'north');
  built.add(centerSurface);
  const arms = [
    ['north', 0, -tile * 0.32, width, tile * 0.72],
    ['south', 0, tile * 0.32, width, tile * 0.72],
    ['east', tile * 0.32, 0, tile * 0.72, width],
    ['west', -tile * 0.32, 0, tile * 0.72, width]
  ];
  arms.filter(([direction]) => connections[direction]).forEach(([direction, x, z, sizeX, sizeZ]) => {
    const arm = new THREE.Group();
    arm.name = `roadArm${direction}`;
    addRoadSection(arm, x, z, sizeX, sizeZ, direction);
    built.add(arm);
  });
  const centerDetail = new THREE.Group();
  centerDetail.name = 'roadCenterDetail';
  add(new THREE.BoxGeometry(center * 0.72, 0.032, center * 0.72), edgeMaterial, centerDetail, [0, 0.004, 0]);
  if (cobblestoneRoad) {
    const stones = [
      [-0.16, -0.1, 0.055], [0.14, -0.12, 0.045], [-0.03, 0.02, 0.06],
      [-0.14, 0.14, 0.04], [0.17, 0.12, 0.052],
    ];
    stones.forEach(([x, z, radius], index) => {
      const stone = add(
        new THREE.DodecahedronGeometry(tile * radius, 0),
        edgeMaterial,
        centerDetail,
        [x * tile, 0.035, z * tile],
        [0, index * 0.71, 0],
        [1.25, 0.42, 0.9],
      );
      stone.name = `cobblestoneRoadStone${index + 1}`;
    });
  } else {
    const rune = add(new THREE.TorusGeometry(center * 0.18, 0.012, 5, 18), runeMaterial, centerDetail, [0, 0.026, 0], [-Math.PI / 2, 0, 0]);
    rune.name = 'roadRune';
    rune.castShadow = false;
  }
  built.add(centerDetail);
  const twigs = [
    [-0.18, -0.12, 0.48], [0.16, -0.15, -0.32], [-0.03, 0.02, 0.08],
    [-0.2, 0.17, -0.52], [0.2, 0.14, 0.38], [0.01, -0.2, 0.72]
  ];
  twigs.forEach(([x, z, angle], index) => {
    const twig = add(new THREE.CylinderGeometry(0.018, 0.026, tile * (0.22 + index % 2 * 0.06), 6), branchMaterial, construction, [x, 0.035, z], [Math.PI / 2, 0, angle]);
    twig.name = `roadConstructionTwig${index + 1}`;
  });
  root.traverse(part => { if (part.isMesh) { part.castShadow = false; part.receiveShadow = true; } });
  setRoadConstructionState(root, underConstruction);
  return root;
}
