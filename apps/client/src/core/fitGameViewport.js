import { GAME_CONFIG } from '@tronos/shared/game-config';

/** Preserve camera pose/zoom while keeping the board inside narrow viewports. */
export function fitGameViewport(camera, width, height) {
  const aspect = Math.max(1, width) / Math.max(1, height);
  const baseView = width < 700 ? 12.6 : 11.45;
  camera.updateMatrixWorld();
  const right = camera.matrixWorld.elements;
  const boardHalfExtent = (GAME_CONFIG.boardSize * 1.08 + 1) / 2;
  const projectedHalfWidth = boardHalfExtent * (Math.abs(right[0]) + Math.abs(right[2])) + 0.55;
  const view = Math.max(baseView, projectedHalfWidth / aspect);
  camera.left = -view * aspect;
  camera.right = view * aspect;
  camera.top = view;
  camera.bottom = -view;
  camera.updateProjectionMatrix();
}
