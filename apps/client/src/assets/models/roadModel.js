import * as THREE from 'three';
import { add } from '../../core/scenePrimitives.js';

const roadMaterial = new THREE.MeshStandardMaterial({ color: 0x5b4631, roughness: 1, metalness: 0, flatShading: true });
const edgeMaterial = new THREE.MeshStandardMaterial({ color: 0x756047, roughness: 0.98, metalness: 0, flatShading: true });
const branchMaterial = new THREE.MeshStandardMaterial({ color: 0x6e4325, roughness: 0.94, metalness: 0, flatShading: true });

export function setRoadConstructionState(root, underConstruction) {
  const built = root.getObjectByName('roadBuiltParts');
  const construction = root.getObjectByName('roadConstructionParts');
  if (built) built.visible = !underConstruction;
  if (construction) construction.visible = underConstruction;
  root.userData.underConstruction = underConstruction;
}

export function makeRoad(connections, tile = 1.08, { underConstruction = false } = {}) {
  const root = new THREE.Group();
  root.name = 'Rua';
  const built = new THREE.Group();
  built.name = 'roadBuiltParts';
  root.add(built);
  const construction = new THREE.Group();
  construction.name = 'roadConstructionParts';
  root.add(construction);
  const width = tile * 0.24;
  const center = tile * 0.28;
  add(new THREE.BoxGeometry(center, 0.025, center), roadMaterial, built, [0, 0, 0]);
  const arms = [
    ['north', 0, -tile * 0.32, width, tile * 0.72],
    ['south', 0, tile * 0.32, width, tile * 0.72],
    ['east', tile * 0.32, 0, tile * 0.72, width],
    ['west', -tile * 0.32, 0, tile * 0.72, width]
  ];
  arms.filter(([direction]) => connections[direction]).forEach(([, x, z, sizeX, sizeZ]) => {
    add(new THREE.BoxGeometry(sizeX, 0.024, sizeZ), roadMaterial, built, [x, 0, z]);
  });
  add(new THREE.BoxGeometry(center * 0.72, 0.027, center * 0.72), edgeMaterial, built, [0, 0.002, 0]);
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
