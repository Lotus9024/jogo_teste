import * as THREE from 'three';
import { createBoard } from './createBoard.js';
import { createCastleKeeps } from './createCastleKeeps.js';
import { createPhysicalDeck } from './createPhysicalDeck.js';
import { createWorldEnvironment } from './createWorldEnvironment.js';

export function createWorld(scene, renderer, { quality = 'high' } = {}) {
  const flameOuter = new THREE.MeshBasicMaterial({ color: 0xa75ce2, toneMapped: false });
  const flameCore = new THREE.MeshBasicMaterial({ color: 0xffc985, toneMapped: false });
  const { board, N, tile, half, fireLights } = createBoard(scene, { flameOuter, flameCore });
  const { alliedKeep, enemyKeep } = createCastleKeeps(board, { tile, half });
  const { deck3D, topDeckCard } = createPhysicalDeck(scene, half);
  const { wisps, updateTerrain, setGraphicsQuality } = createWorldEnvironment(scene, renderer, {
    quality,
    fireLights,
    flameOuter,
    flameCore
  });

  scene.add(board);
  return {
    board,
    N,
    tile,
    half,
    alliedKeep,
    enemyKeep,
    deck3D,
    topDeckCard,
    wisps,
    fireLights,
    updateTerrain,
    setGraphicsQuality
  };
}
