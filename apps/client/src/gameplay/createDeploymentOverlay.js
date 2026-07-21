import * as THREE from 'three';
import { GAME_CONFIG } from '@tronos/shared/game-config';
import { isDeploymentCell } from '@tronos/shared/cards';

const TEAM_COLORS = Object.freeze({ 1: 0x168cff, 2: 0xff352f });

export function createDeploymentOverlay({ scene, tile, half }) {
  const markers = [];
  const geometry = new THREE.PlaneGeometry(tile * 0.84, tile * 0.84);

  function clear() {
    markers.splice(0).forEach(marker => {
      scene.remove(marker);
      marker.material.dispose();
    });
  }

  function show(seat, emphasized = false) {
    clear();
    for (const markerSeat of [1, 2]) {
      for (let x = 0; x < GAME_CONFIG.boardSize; x += 1) {
        for (let z = 0; z < GAME_CONFIG.boardSize; z += 1) {
          if (!isDeploymentCell(markerSeat, x, z, GAME_CONFIG.boardSize)) continue;
          const material = new THREE.MeshBasicMaterial({
            color: TEAM_COLORS[markerSeat], transparent: true, opacity: emphasized && markerSeat === seat ? 0.2 : 0.1,
            depthWrite: false, side: THREE.DoubleSide
          });
          const marker = new THREE.Mesh(geometry, material);
          marker.rotation.x = -Math.PI / 2;
          marker.position.set(x * tile - half, 0.074, z * tile - half);
          scene.add(marker);
          markers.push(marker);
        }
      }
    }
  }

  return { clear, show };
}
