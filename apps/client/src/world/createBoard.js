import * as THREE from 'three';
import { GAME_CONFIG } from '@tronos/shared/game-config';
import { M, add } from '../core/scenePrimitives.js';
import { createMasonryMaps, texturedStandardMaterial } from '../core/darkFantasySurfaces.js';

function addPerimeterFrame(board, size, material) {
  const frame = new THREE.Group();
  frame.name = 'Moldura de pedra rúnica';
  const offset = size / 2 + 0.36;
  for (const z of [-offset, offset]) {
    add(new THREE.BoxGeometry(size + 0.92, 0.34, 0.38, 4, 1, 1), material, frame, [0, -0.03, z]);
  }
  for (const x of [-offset, offset]) {
    add(new THREE.BoxGeometry(0.38, 0.34, size + 0.16, 1, 1, 4), material, frame, [x, -0.03, 0]);
  }

  const rivetMaterial = new THREE.MeshStandardMaterial({ color: 0x55515f, roughness: 0.4, metalness: 0.78 });
  for (let index = -4; index <= 4; index += 1) {
    const spacing = size / 9;
    for (const [x, z] of [[index * spacing, -offset - 0.2], [index * spacing, offset + 0.2], [-offset - 0.2, index * spacing], [offset + 0.2, index * spacing]]) {
      add(new THREE.CylinderGeometry(0.055, 0.065, 0.05, 8), rivetMaterial, frame, [x, 0.17, z]);
    }
  }
  board.add(frame);
}

function addRunicInlays(board, tile, half, size) {
  const runeMaterial = new THREE.MeshBasicMaterial({ color: 0x8f63d8, transparent: true, opacity: 0.5, toneMapped: false });
  const centralRing = add(new THREE.TorusGeometry(tile * 1.06, 0.018, 6, 64), runeMaterial, board, [0, 0.062, 0], [-Math.PI / 2, 0, 0]);
  centralRing.name = 'Selo violeta central';
  centralRing.castShadow = false;

  for (let index = 0; index < 8; index += 1) {
    const angle = index * Math.PI / 4;
    const radius = tile * 0.74;
    const glyph = add(
      new THREE.BoxGeometry(tile * 0.28, 0.012, 0.025),
      runeMaterial,
      board,
      [Math.cos(angle) * radius, 0.063, Math.sin(angle) * radius],
      [0, -angle, 0]
    );
    glyph.castShadow = false;
  }

  const crackMaterial = new THREE.MeshBasicMaterial({ color: 0x5f3b88, transparent: true, opacity: 0.32, toneMapped: false });
  for (let index = 0; index < size; index += 1) {
    const x = ((index * 5) % size) * tile - half;
    const z = ((index * 7 + 2) % size) * tile - half;
    const crack = add(new THREE.BoxGeometry(tile * 0.42, 0.009, 0.015), crackMaterial, board, [x, 0.06, z], [0, index * 0.63, 0]);
    crack.castShadow = false;
  }
}

export function createBoard(scene, { flameOuter, flameCore }) {
  const fireLights = [];
  const board = new THREE.Group();
  const N = GAME_CONFIG.boardSize;
  const tile = 1.08;
  const half = (N - 1) * tile / 2;
  const boardSize = N * tile;

  const paleStoneMaps = createMasonryMaps({ stone: [58, 53, 67], mortar: [16, 12, 22], repeat: [1.4, 1.4], seed: 211 });
  const darkStoneMaps = createMasonryMaps({ stone: [37, 33, 47], mortar: [10, 8, 15], repeat: [1.5, 1.5], seed: 227 });
  const frameMaps = createMasonryMaps({ stone: [29, 25, 38], mortar: [8, 6, 12], repeat: [6, 1.3], seed: 241 });
  const paleStone = texturedStandardMaterial(paleStoneMaps, { color: 0xffffff, roughness: 0.94, metalness: 0.02, bumpScale: 0.055 });
  const darkStone = texturedStandardMaterial(darkStoneMaps, { color: 0xffffff, roughness: 0.97, metalness: 0.01, bumpScale: 0.06 });
  const frameStone = texturedStandardMaterial(frameMaps, { color: 0xffffff, roughness: 0.9, metalness: 0.08, bumpScale: 0.07 });

  const boardBase = add(new THREE.BoxGeometry(boardSize + 1, 0.48, boardSize + 1), M.stoneDark, board, [0, -0.34, 0]);
  boardBase.castShadow = false;

  for (let z = 0; z < N; z += 1) {
    for (let x = 0; x < N; x += 1) {
      const material = (x + z) % 2 === 0 ? paleStone : darkStone;
      const slab = add(
        new THREE.BoxGeometry(tile - 0.035, 0.18, tile - 0.035, 2, 1, 2),
        material,
        board,
        [x * tile - half, -0.04, z * tile - half]
      );
      slab.castShadow = false;
      slab.position.y += (((x * 17 + z * 11) % 5) - 2) * 0.004;
      slab.rotation.y = (((x * 7 + z * 3) % 5) - 2) * 0.0025;
    }
  }

  addPerimeterFrame(board, boardSize, frameStone);
  addRunicInlays(board, tile, half, N);

  for (const x of [-1, 1]) {
    for (const z of [-1, 1]) {
      const bx = x * (half + 0.39);
      const bz = z * (half + 0.39);
      add(new THREE.BoxGeometry(0.34, 0.2, 0.34), frameStone, board, [bx, 0.08, bz]);
      add(new THREE.CylinderGeometry(0.12, 0.17, 0.3, 12), M.iron, board, [bx, 0.31, bz]);
      add(new THREE.ConeGeometry(0.11, 0.3, 10), flameOuter, board, [bx, 0.39, bz]);
      add(new THREE.ConeGeometry(0.055, 0.2, 10), flameCore, board, [bx, 0.43, bz]);
      const ember = new THREE.PointLight(0xb06aff, 9.5, 4.8, 2);
      ember.position.set(bx, 0.68, bz);
      ember.userData = { baseIntensity: 9.5, phase: fireLights.length * 1.73 };
      fireLights.push(ember);
      scene.add(ember);
    }
  }

  return { board, N, tile, half, fireLights };
}
