import * as THREE from 'three';
import { M, add } from '../core/scenePrimitives.js';
import { createGrainMaps, createMasonryMaps, texturedStandardMaterial } from '../core/darkFantasySurfaces.js';

function createCastleMaterials(accent, enemy) {
  const masonry = createMasonryMaps({
    stone: enemy ? [55, 38, 53] : [43, 42, 58],
    mortar: [11, 8, 16],
    repeat: [2.8, 3.4],
    seed: enemy ? 353 : 337,
    brickWidth: 27,
    brickHeight: 14,
  });
  const blackMasonry = createMasonryMaps({
    stone: [25, 21, 32],
    mortar: [7, 5, 10],
    repeat: [2.4, 2.8],
    seed: enemy ? 383 : 367,
    brickWidth: 24,
    brickHeight: 13,
  });
  const roofMaps = createGrainMaps({ color: enemy ? [70, 32, 58] : [50, 38, 68], repeat: [4, 3], seed: 401 });
  return {
    stone: texturedStandardMaterial(masonry, { color: 0xffffff, roughness: 0.93, metalness: 0.03, bumpScale: 0.075 }),
    dark: texturedStandardMaterial(blackMasonry, { color: 0xffffff, roughness: 0.96, metalness: 0.06, bumpScale: 0.08 }),
    roof: texturedStandardMaterial(roofMaps, { color: 0xffffff, roughness: 0.62, metalness: 0.34, bumpScale: 0.04 }),
    accent: new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 0.2, roughness: 0.68, side: THREE.DoubleSide }),
    glow: new THREE.MeshBasicMaterial({ color: enemy ? 0xb64c9c : 0x966fe8, toneMapped: false }),
    gate: new THREE.MeshStandardMaterial({ color: 0x24212a, roughness: 0.36, metalness: 0.84 }),
  };
}

function addCrenellations(parent, material, axis, fixed, length, y = 1.2) {
  const count = 6;
  for (let index = 0; index < count; index += 1) {
    const along = -length / 2 + (index + 0.5) * (length / count);
    const position = axis === 'x' ? [along, y, fixed] : [fixed, y, along];
    add(new THREE.BoxGeometry(0.27, 0.28, 0.28), material, parent, position);
  }
}

function addArrowSlit(parent, dark, glow, x, y, z, rotationY = 0) {
  const recess = add(new THREE.BoxGeometry(0.13, 0.38, 0.035), dark, parent, [x, y, z], [0, rotationY, 0]);
  recess.name = 'Fresta de arqueiro';
  const light = add(new THREE.BoxGeometry(0.035, 0.22, 0.041), glow, parent, [x, y, z + (rotationY ? 0 : 0.006)], [0, rotationY, 0]);
  light.castShadow = false;
}

function addCornerTower(parent, materials, x, z, enemy) {
  const tower = new THREE.Group();
  tower.position.set(x, 0, z);
  tower.name = 'Torre gótica de canto';
  add(new THREE.CylinderGeometry(0.43, 0.5, 1.72, 10, 5), materials.stone, tower, [0, 1.01, 0]);
  add(new THREE.CylinderGeometry(0.5, 0.48, 0.18, 10), materials.dark, tower, [0, 1.92, 0]);
  add(new THREE.ConeGeometry(0.58, enemy ? 1.18 : 1.02, enemy ? 5 : 10), materials.roof, tower, [0, enemy ? 2.6 : 2.52, 0], [0, Math.PI / 10, 0]);
  add(new THREE.ConeGeometry(0.055, 0.62, 6), materials.gate, tower, [0, 3.31, 0]);
  for (let index = 0; index < 5; index += 1) {
    const angle = index * Math.PI * 2 / 5;
    add(new THREE.BoxGeometry(0.18, 0.24, 0.2), materials.dark, tower, [Math.cos(angle) * 0.39, 2.08, Math.sin(angle) * 0.39], [0, -angle, 0]);
  }
  addArrowSlit(tower, materials.dark, materials.glow, 0, 1.3, 0.47);
  parent.add(tower);
}

function addGatehouse(parent, materials) {
  const gate = new THREE.Group();
  gate.name = 'castleEntrance';
  gate.position.z = 1.39;

  add(new THREE.BoxGeometry(0.78, 0.16, 0.82), materials.dark, gate, [0, 0.08, 0.37]);
  add(new THREE.BoxGeometry(0.62, 0.12, 0.74), materials.stone, gate, [0, 0.2, 0.46]);
  add(new THREE.BoxGeometry(0.76, 1.18, 0.3), materials.stone, gate, [-0.76, 0.72, 0]);
  add(new THREE.BoxGeometry(0.76, 1.18, 0.3), materials.stone, gate, [0.76, 0.72, 0]);
  add(new THREE.BoxGeometry(0.84, 0.36, 0.3), materials.stone, gate, [0, 1.15, 0]);
  add(new THREE.TorusGeometry(0.43, 0.12, 8, 28, Math.PI), materials.stone, gate, [0, 0.84, 0.16], [0, 0, Math.PI]);
  add(new THREE.BoxGeometry(0.7, 0.76, 0.08), M.void, gate, [0, 0.55, 0.17]);

  for (const x of [-0.26, -0.13, 0, 0.13, 0.26]) {
    const bar = add(new THREE.CylinderGeometry(0.022, 0.022, 0.78, 6), materials.gate, gate, [x, 0.58, 0.22]);
    bar.name = 'Grade do portão';
    add(new THREE.ConeGeometry(0.04, 0.15, 4), materials.gate, gate, [x, 0.12, 0.22], [0, 0, Math.PI]);
  }
  for (const y of [0.38, 0.66]) add(new THREE.BoxGeometry(0.66, 0.035, 0.035), materials.gate, gate, [0, y, 0.22]);

  for (const x of [-0.62, 0.62]) {
    add(new THREE.CylinderGeometry(0.035, 0.035, 1.18, 7), materials.gate, gate, [x, 0.72, 0.2], [0, 0, x * 0.12]);
    add(new THREE.TorusGeometry(0.075, 0.018, 6, 12), materials.gate, gate, [x, 0.22, 0.21], [Math.PI / 2, 0, 0]);
  }
  parent.add(gate);
}

function addCentralKeep(parent, materials, enemy) {
  const keep = new THREE.Group();
  keep.name = 'Torre central sombria';
  add(new THREE.BoxGeometry(1.22, 2.05, 1.18, 3, 6, 3), materials.stone, keep, [0, 1.32, -0.14]);
  add(new THREE.BoxGeometry(1.38, 0.22, 1.34), materials.dark, keep, [0, 2.4, -0.14]);
  add(new THREE.ConeGeometry(0.83, enemy ? 1.55 : 1.38, enemy ? 5 : 8), materials.roof, keep, [0, enemy ? 3.25 : 3.16, -0.14], [0, Math.PI / 8, 0]);
  add(new THREE.ConeGeometry(0.07, 0.8, 6), materials.gate, keep, [0, 4.26, -0.14]);
  addArrowSlit(keep, materials.dark, materials.glow, -0.28, 1.44, 0.46);
  addArrowSlit(keep, materials.dark, materials.glow, 0.28, 1.44, 0.46);

  const banner = add(new THREE.PlaneGeometry(0.52, 0.92, 3, 5), materials.accent, keep, [0, 2.04, 0.472]);
  banner.name = 'Estandarte do reino';
  add(new THREE.CylinderGeometry(0.025, 0.025, 0.78, 8), materials.gate, keep, [0, 2.49, 0.49], [0, 0, Math.PI / 2]);
  parent.add(keep);
}

function createKeep(tile, accent, enemy = false) {
  const keep = new THREE.Group();
  const materials = createCastleMaterials(accent, enemy);

  add(new THREE.BoxGeometry(tile * 3 - 0.06, 0.22, tile * 3 - 0.06), M.base, keep, [0, 0.02, 0]);
  add(new THREE.BoxGeometry(tile * 3 - 0.2, 0.14, tile * 3 - 0.2), materials.dark, keep, [0, 0.18, 0]);
  add(new THREE.BoxGeometry(2.82, 0.88, 0.28), materials.stone, keep, [0, 0.67, -1.34]);
  add(new THREE.BoxGeometry(0.28, 0.88, 2.82), materials.stone, keep, [-1.34, 0.67, 0]);
  add(new THREE.BoxGeometry(0.28, 0.88, 2.82), materials.stone, keep, [1.34, 0.67, 0]);
  add(new THREE.BoxGeometry(0.78, 0.88, 0.28), materials.stone, keep, [-1.02, 0.67, 1.34]);
  add(new THREE.BoxGeometry(0.78, 0.88, 0.28), materials.stone, keep, [1.02, 0.67, 1.34]);

  addCrenellations(keep, materials.dark, 'x', -1.36, 2.85);
  addCrenellations(keep, materials.dark, 'z', -1.36, 2.85);
  addCrenellations(keep, materials.dark, 'z', 1.36, 2.85);
  for (const x of [-1.18, 1.18]) add(new THREE.BoxGeometry(0.28, 0.28, 0.3), materials.dark, keep, [x, 1.2, 1.36]);

  for (const x of [-1.2, 1.2]) {
    for (const z of [-1.2, 1.2]) addCornerTower(keep, materials, x, z, enemy);
  }
  for (const x of [-1.36, 1.36]) {
    add(new THREE.BoxGeometry(0.34, 0.95, 0.42), materials.dark, keep, [x, 0.64, 0.5]);
    add(new THREE.BoxGeometry(0.34, 0.95, 0.42), materials.dark, keep, [x, 0.64, -0.5]);
  }

  addGatehouse(keep, materials);
  addCentralKeep(keep, materials, enemy);

  const gateLight = new THREE.PointLight(enemy ? 0xb83f86 : 0x8d63e6, 5.2, 3.6, 2);
  gateLight.name = 'Luz violeta do portão';
  gateLight.position.set(0, 1.1, 1.72);
  keep.add(gateLight);

  keep.name = enemy ? 'Cidadela da Noite Rubra' : 'Fortaleza do Corvo Negro';
  keep.userData = {
    hoverable: true,
    name: keep.name,
    role: 'BASE 3×3 · NÍVEL 1',
    hp: enemy ? 16 : 18,
    maxHp: 20,
    damage: 0,
    move: 0,
    cost: '—',
    ability: enemy ? 'Pacto de Sangue' : 'Vigia do Corvo',
    abilityUsed: false,
    entranceLocalDirection: [0, 0, 1],
    description: enemy
      ? 'A cidadela alimenta suas tropas com a névoa violeta.'
      : 'As sentinelas do corvo revelam invasores nas casas vizinhas.',
  };
  return keep;
}

export function createCastleKeeps(board, { tile, half }) {
  const alliedKeep = createKeep(tile, 0x49356f);
  const enemyKeep = createKeep(tile, 0x713154, true);
  alliedKeep.position.set(0, 0.06, half - tile);
  enemyKeep.position.set(0, 0.06, -half + tile);

  // Both gates are authored on local +Z. Rotate only the southern castle so
  // the entrances face one another across the center of the board.
  alliedKeep.rotation.y = Math.PI;
  enemyKeep.rotation.y = 0;
  board.add(alliedKeep, enemyKeep);
  return { alliedKeep, enemyKeep };
}
