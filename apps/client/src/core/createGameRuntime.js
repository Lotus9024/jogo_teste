import { loadGameSettings } from './gameSettings.js';
import { createCinematicCamera } from './createCinematicCamera.js';
import { createGameScene } from './createGameScene.js';
import { createDamageEffects } from '../gameplay/damageEffects.js';
import { createMageEffects } from '../gameplay/mageEffects.js';
import { createBoardCoordinates } from '../gameplay/boardCoordinates.js';
import { createBoardPresentation } from '../gameplay/createBoardPresentation.js';
import { createDeploymentOverlay } from '../gameplay/createDeploymentOverlay.js';
import { createMovementOverlay } from '../gameplay/createMovementOverlay.js';
import { createUnitRelations } from '../gameplay/unitRelations.js';
import { mountGameShell } from '../ui/gameShell.js';
import { createWorld } from '../world/createWorld.js';

export function createGameRuntime() {
  mountGameShell();
  const app = document.querySelector('#game');
  app.focus({ preventScroll: true });
  const settings = loadGameSettings();
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
    deckRemaining: 28,
    deckHover: false,
    deckPreviewIndex: 0,
  };
  const gameScene = createGameScene(app, { quality: state.graphicsQuality });
  const { scene, renderer, camera, controls } = gameScene;
  const cameraTransition = createCinematicCamera({ camera, controls, app });
  const damageEffects = createDamageEffects(scene);
  const world = createWorld(scene, renderer, { quality: state.graphicsQuality });
  const { tile, half } = world;
  const mageEffects = createMageEffects(scene, tile);
  const units = [];
  const hoverables = [];
  const boardCoordinates = createBoardCoordinates({ getUnits: () => units, tile, half });
  const boardPresentation = createBoardPresentation({
    scene, app, tile, half, baseCellsForSeat: boardCoordinates.baseCellsForSeat,
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
    units,
    hoverables,
    boardCoordinates,
    boardPresentation,
    relations,
    movementOverlay,
    deploymentOverlay,
  };
}
