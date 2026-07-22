import * as THREE from 'three';
import { M, add } from '../core/scenePrimitives.js';

function createKeep(tile, accent, enemy = false) {
  const keep = new THREE.Group();
  const themeStone = new THREE.MeshStandardMaterial({ color: enemy ? 0x3b2323 : 0x2b3438, roughness: 0.84, metalness: 0.08 });
  const themeDark = new THREE.MeshStandardMaterial({ color: enemy ? 0x1e0d0f : 0x121a1e, roughness: 0.92, metalness: 0.12 });
  const roofMaterial = new THREE.MeshStandardMaterial({ color: enemy ? 0x57191b : 0x263a46, roughness: 0.46, metalness: 0.48 });
  const bannerMaterial = new THREE.MeshStandardMaterial({ color: accent, roughness: 0.72, side: THREE.DoubleSide });
  const glowMaterial = new THREE.MeshBasicMaterial({ color: enemy ? 0xd34b38 : 0x6fa9c7 });

  add(new THREE.BoxGeometry(tile * 3 - 0.07, 0.2, tile * 3 - 0.07), M.base, keep, [0, 0.03, 0]);
  add(new THREE.BoxGeometry(tile * 3 - 0.18, 0.12, tile * 3 - 0.18), themeDark, keep, [0, 0.18, 0]);
  add(new THREE.BoxGeometry(2.86, 0.78, 0.26), themeStone, keep, [0, 0.64, -1.38]);
  add(new THREE.BoxGeometry(2.86, 0.78, 0.26), themeStone, keep, [0, 0.64, 1.38]);
  add(new THREE.BoxGeometry(0.26, 0.78, 2.86), themeStone, keep, [-1.38, 0.64, 0]);
  add(new THREE.BoxGeometry(0.26, 0.78, 2.86), themeStone, keep, [1.38, 0.64, 0]);

  add(new THREE.BoxGeometry(0.68, 0.62, 0.08), M.void, keep, [0, 0.48, 1.53]);
  add(new THREE.TorusGeometry(0.34, 0.08, 10, 24, Math.PI), themeDark, keep, [0, 0.79, 1.55], [0, 0, Math.PI]);
  add(new THREE.OctahedronGeometry(0.1, 0), glowMaterial, keep, [0, 1.04, 1.55]);

  for (const position of [-1.12, -0.56, 0, 0.56, 1.12]) {
    add(new THREE.BoxGeometry(0.26, 0.22, 0.3), themeDark, keep, [position, 1.12, -1.4]);
    add(new THREE.BoxGeometry(0.26, 0.22, 0.3), themeDark, keep, [position, 1.12, 1.4]);
    if (Math.abs(position) > 0.2) {
      add(new THREE.BoxGeometry(0.3, 0.22, 0.26), themeDark, keep, [-1.4, 1.12, position]);
      add(new THREE.BoxGeometry(0.3, 0.22, 0.26), themeDark, keep, [1.4, 1.12, position]);
    }
  }

  add(new THREE.BoxGeometry(1.18, 1.5, 1.18, 3, 4, 3), themeStone, keep, [0, 1.02, 0]);
  for (const x of [-0.46, 0, 0.46]) {
    for (const z of [-0.46, 0.46]) add(new THREE.BoxGeometry(0.22, 0.25, 0.22), themeDark, keep, [x, 1.9, z]);
  }

  for (const x of [-1.23, 1.23]) {
    for (const z of [-1.23, 1.23]) {
      if (enemy) {
        add(new THREE.BoxGeometry(0.62, 1.58, 0.62, 2, 4, 2), themeStone, keep, [x, 1.02, z]);
        add(new THREE.ConeGeometry(0.5, 0.88, 4), roofMaterial, keep, [x, 2.24, z], [0, Math.PI / 4, 0]);
        for (const side of [-1, 1]) {
          add(new THREE.ConeGeometry(0.07, 0.55, 6), glowMaterial, keep, [x + side * 0.2, 2.52, z], [0, 0, side * 0.2]);
        }
      } else {
        add(new THREE.CylinderGeometry(0.39, 0.45, 1.48, 10), themeStone, keep, [x, 0.98, z]);
        add(new THREE.ConeGeometry(0.52, 0.72, 10), roofMaterial, keep, [x, 2.08, z]);
      }
    }
  }

  add(new THREE.CylinderGeometry(0.04, 0.045, 2.3, 10), M.iron, keep, [0, 3.35, 0.12]);
  add(new THREE.SphereGeometry(0.075, 12, 8), M.gold, keep, [0, 4.52, 0.12]);
  add(new THREE.PlaneGeometry(0.72, 0.9, 4, 4), bannerMaterial, keep, [0.4, 4.02, 0.13], [0, enemy ? Math.PI : 0, 0]);

  if (enemy) {
    add(new THREE.ConeGeometry(0.34, 1.42, 5), roofMaterial, keep, [0, 2.52, 0], [0, Math.PI / 5, 0]);
    for (const side of [-1, 1]) {
      add(new THREE.TorusGeometry(0.28, 0.045, 7, 24, Math.PI * 1.25), M.iron, keep, [side * 0.72, 1.32, 0.64], [Math.PI / 2, side * 0.3, 0]);
    }
  } else {
    add(new THREE.ConeGeometry(0.42, 1.05, 8), roofMaterial, keep, [0, 2.42, 0]);
    for (const side of [-1, 1]) {
      add(new THREE.BoxGeometry(0.78, 0.1, 0.22), roofMaterial, keep, [side * 0.47, 2.05, 0.03], [0, side * 0.22, side * 0.28]);
    }
  }

  keep.name = enemy ? 'Castelo Carmesim' : 'Fortaleza do Corvo';
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
    description: enemy
      ? 'As torres carmesins fortalecem tropas feridas próximas.'
      : 'As sentinelas do corvo revelam invasores nas casas vizinhas.'
  };
  keep.rotation.y = enemy ? Math.PI : 0;
  return keep;
}

export function createCastleKeeps(board, { tile, half }) {
  const alliedKeep = createKeep(tile, 0x3d5974);
  const enemyKeep = createKeep(tile, 0x7b2825, true);
  alliedKeep.position.set(0, 0.06, half - tile);
  enemyKeep.position.set(0, 0.06, -half + tile);
  board.add(alliedKeep, enemyKeep);
  return { alliedKeep, enemyKeep };
}
