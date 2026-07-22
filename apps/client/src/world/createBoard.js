import * as THREE from 'three';
import { GAME_CONFIG } from '@tronos/shared/game-config';
import { M, add } from '../core/scenePrimitives.js';

export function createBoard(scene, { flameOuter, flameCore }) {
  const fireLights = [];
  const board = new THREE.Group();
  const N = GAME_CONFIG.boardSize;
  const tile = 1.08;
  const half = (N - 1) * tile / 2;

  const boardBase = add(new THREE.BoxGeometry(N * tile + 1, 0.45, N * tile + 1), M.stoneDark, board, [0, -0.32, 0]);
  boardBase.castShadow = false;

  for (let z = 0; z < N; z += 1) {
    for (let x = 0; x < N; x += 1) {
      const material = (x + z) % 2 === 0 ? M.stone : M.stoneDark;
      const slab = add(
        new THREE.BoxGeometry(tile - 0.025, 0.18, tile - 0.025),
        material,
        board,
        [x * tile - half, -0.04, z * tile - half]
      );
      slab.castShadow = false;
      slab.position.y += ((x * 17 + z * 11) % 5) * 0.004;
      slab.rotation.y = (((x * 7 + z * 3) % 3) - 1) * 0.003;
    }
  }

  for (const x of [-1, 1]) {
    for (const z of [-1, 1]) {
      const bx = x * (half + 0.39);
      const bz = z * (half + 0.39);
      add(new THREE.CylinderGeometry(0.12, 0.16, 0.24, 12), M.iron, board, [bx, 0.12, bz]);
      add(new THREE.ConeGeometry(0.11, 0.3, 10), flameOuter, board, [bx, 0.39, bz]);
      add(new THREE.ConeGeometry(0.055, 0.2, 10), flameCore, board, [bx, 0.43, bz]);
      const ember = new THREE.PointLight(0xff7636, 10, 4.4, 2);
      ember.position.set(bx, 0.68, bz);
      ember.userData = { baseIntensity: 10, phase: fireLights.length * 1.73 };
      fireLights.push(ember);
      scene.add(ember);
    }
  }

  return { board, N, tile, half, fireLights };
}
