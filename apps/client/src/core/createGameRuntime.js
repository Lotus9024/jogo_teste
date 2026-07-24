import { GRAPHICS_QUALITY, bootGraphicsQuality, loadGameSettings } from './gameSettings.js';
import { GAME_CONFIG } from '@tronos/shared/game-config';
import { createCinematicCamera } from './createCinematicCamera.js';
import { createGameScene } from './createGameScene.js';
import { createDamageEffects } from '../gameplay/damageEffects.js';
import { createMageEffects } from '../gameplay/mageEffects.js';
import { createBoardCoordinates } from '../gameplay/boardCoordinates.js';
import { createBoardPresentation } from '../gameplay/createBoardPresentation.js';
import { createDeploymentOverlay } from '../gameplay/createDeploymentOverlay.js';
import { createMovementOverlay } from '../gameplay/createMovementOverlay.js';
import { createBattleAnimationController } from '../gameplay/createBattleAnimationController.js';
import { createUnitRelations } from '../gameplay/unitRelations.js';
import { mountGameShell } from '../ui/gameShell.js';
import { createWorld } from '../world/createWorld.js';

export function createGameRuntime() {
  mountGameShell();
  const app = document.querySelector('#game');
  app.focus({ preventScroll: true });
  const settings = loadGameSettings();
  const bootQuality = bootGraphicsQuality();
  const state = {
    graphicsQuality: settings.graphics,
    cameraCentering: settings.cameraCentering,
    selected: null,
    dragged: null,
    dragMoved: false,
    justDragged: false,
    onlineState: null,
    selfSeat: null,
    devMode: false,
    activePlayer: 1,
    round: 1,
    devCardLevel: 1,
    devInstantBuild: false,
    deckRemaining: GAME_CONFIG.deckSize,
    deckHover: false,
    deckHoverSeat: null,
    deckPreviewIndex: 0,
  };
  const gameScene = createGameScene(app, { quality: bootQuality });
  const { scene, renderer, camera, controls } = gameScene;
  const cameraTransition = createCinematicCamera({ camera, controls, app });
  const damageEffects = createDamageEffects(scene);
  const world = createWorld(scene, renderer, { quality: bootQuality });
  const { tile, half } = world;
  const mageEffects = createMageEffects(scene, tile);
  const units = [];
  const hoverables = [];
  const battleAnimations = createBattleAnimationController({
    scene,
    tile,
    half,
    units,
    hoverables,
  });
  const boardCoordinates = createBoardCoordinates({
    getUnits: () => units,
    getBaseLevel: seat => state.onlineState?.state.players.find(player => player.seat === seat)?.baseLevel ?? 1,
    tile,
    half,
  });
  const boardPresentation = createBoardPresentation({
    scene, app, tile, half, baseCellsForSeat: boardCoordinates.baseCellsForSeat, getUnits: () => units,
  });
  const relations = createUnitRelations(units);
  const movementOverlay = createMovementOverlay({
    scene,
    app,
    units,
    tile,
    half,
    unitAtCell: boardCoordinates.unitAtCell,
    baseSeatAtCell: boardCoordinates.baseSeatAtCell,
    baseCellsForSeat: boardCoordinates.baseCellsForSeat,
    getRoads: () => boardPresentation.roads,
    getMatchContext: () => ({
      onlineState: state.onlineState, selfSeat: state.selfSeat, devMode: state.devMode,
    }),
  });
  const deploymentOverlay = createDeploymentOverlay({ scene, tile, half });
  let preferredGraphicsScheduled = false;
  function activatePreferredGraphics() {
    if (preferredGraphicsScheduled || state.graphicsQuality !== GRAPHICS_QUALITY.HIGH) return;
    preferredGraphicsScheduled = true;
    const apply = () => {
      if (state.graphicsQuality !== GRAPHICS_QUALITY.HIGH) return;
      gameScene.setGraphicsQuality(GRAPHICS_QUALITY.HIGH);
      const applyWorldDetails = () => {
        if (state.graphicsQuality === GRAPHICS_QUALITY.HIGH) world.setGraphicsQuality(GRAPHICS_QUALITY.HIGH);
      };
      if (globalThis.requestIdleCallback) globalThis.requestIdleCallback(applyWorldDetails, { timeout: 3200 });
      else setTimeout(applyWorldDetails, 650);
    };
    if (globalThis.requestIdleCallback) globalThis.requestIdleCallback(apply, { timeout: 1800 });
    else setTimeout(apply, 350);
  }
  return {
    app,
    state,
    ...gameScene,
    ...world,
    setSceneGraphicsQuality: gameScene.setGraphicsQuality,
    setWorldGraphicsQuality: world.setGraphicsQuality,
    cameraTransition,
    damageEffects,
    mageEffects,
    battleAnimations,
    units,
    hoverables,
    boardCoordinates,
    boardPresentation,
    relations,
    movementOverlay,
    deploymentOverlay,
    activatePreferredGraphics,
  };
}
