import { createGameRuntime } from './core/createGameRuntime.js';
import { createRenderLoop } from './core/createRenderLoop.js';
import { createAbilityController } from './gameplay/createAbilityController.js';
import { createDevModeController } from './gameplay/createDevModeController.js';
import { createUnitActionController } from './gameplay/createUnitActionController.js';
import { createUnitInteractionController } from './gameplay/createUnitInteractionController.js';
import { createOnlineSession } from './network/createOnlineSession.js';
import { createHandController } from './ui/createHandController.js';
import { createSettingsController } from './ui/createSettingsController.js';
import './style.css';

const {
  app, state, scene, renderer, camera, controls, updateDynamicLighting,
  setSceneGraphicsQuality, cameraTransition, damageEffects,
  tile, half, alliedKeep, enemyKeep, deck3D, topDeckCard, wisps, fireLights,
  updateTerrain, setWorldGraphicsQuality, mageEffects, units, hoverables,
  boardCoordinates, boardPresentation, relations, movementOverlay, deploymentOverlay,
} = createGameRuntime();
const { roads, fires, fireMeshes } = boardPresentation;

const callbacks = {};
const gameError = document.querySelector('#game-error');
let gameErrorTimer;
callbacks.showGameError = message => {
  gameError.textContent = message;
  clearTimeout(gameErrorTimer);
  gameErrorTimer = setTimeout(() => { gameError.textContent = ''; }, 2800);
};

const actions = createUnitActionController({
  state,
  app,
  scene,
  tile,
  half,
  units,
  hoverables,
  fires,
  unitAtCell: boardCoordinates.unitAtCell,
  unitsAtCell: boardCoordinates.unitsAtCell,
  baseSeatAtCell: boardCoordinates.baseSeatAtCell,
  damageEffects,
  relations,
  boardPresentation,
  callbacks,
});
const abilities = createAbilityController({
  state,
  app,
  scene,
  tile,
  half,
  units,
  fires,
  unitAtCell: boardCoordinates.unitAtCell,
  mageEffects,
  relations,
  boardPresentation,
  callbacks,
});
const interaction = createUnitInteractionController({
  state,
  app,
  scene,
  renderer,
  camera,
  controls,
  cameraTransition,
  alliedKeep,
  enemyKeep,
  tile,
  half,
  units,
  hoverables,
  boardCoordinates,
  movementOverlay,
  actions,
  abilities,
  relations,
  callbacks,
});
Object.assign(callbacks, {
  selectUnit: interaction.selectUnit,
  clearMovementGrid: interaction.clearMovementGrid,
  damageLocalUnit: actions.damageLocalUnit,
  syncAbilityBadges: abilities.syncAbilityBadges,
});

// Keep the settings Escape listener ahead of gallery listeners, matching the
// original overlay closing order when both surfaces are reached by keyboard.
createSettingsController({
  state,
  controls,
  cameraTransition,
  setSceneGraphicsQuality,
  setWorldGraphicsQuality,
  resize: () => renderLoop.resize(),
  callbacks,
});

const handController = createHandController({
  state,
  app,
  scene,
  renderer,
  camera,
  controls,
  cameraTransition,
  deck3D,
  tile,
  half,
  units,
  hoverables,
  roads,
  boardCoordinates,
  boardPresentation,
  deploymentOverlay,
  interaction,
  actions,
  abilities,
  callbacks,
});
Object.assign(callbacks, {
  selectedCardElement: handController.selectedCardElement,
  playSelectedCardAtPointer: handController.playSelectedCardAtPointer,
});

const devController = createDevModeController({
  state,
  app,
  scene,
  alliedKeep,
  enemyKeep,
  tile,
  half,
  units,
  hoverables,
  roads,
  boardPresentation,
  relations,
  interaction,
  actions,
  abilities,
  handController,
  cameraTransition,
  callbacks,
});
Object.assign(callbacks, {
  syncDevSettings: devController.syncDevSettings,
  syncDevKingdomHud: devController.syncDevKingdomHud,
});

const renderLoop = createRenderLoop({
  renderer,
  scene,
  camera,
  controls,
  cameraTransition,
  damageEffects,
  mageEffects,
  units,
  fireMeshes,
  wisps,
  fireLights,
  topDeckCard,
  alliedKeep,
  enemyKeep,
  updateDynamicLighting,
  updateTerrain,
  getSelfSeat: () => state.selfSeat,
  getGraphicsQuality: () => state.graphicsQuality,
  getDeckHover: () => state.deckHover,
});

const onlineSession = createOnlineSession({
  state,
  app,
  scene,
  camera,
  controls,
  cameraTransition,
  tile,
  half,
  units,
  hoverables,
  damageEffects,
  boardPresentation,
  relations,
  interaction,
  abilities,
  handController,
  devController,
  callbacks,
});
Object.assign(callbacks, {
  sendOnlineAction: onlineSession.sendAction,
  setOnlinePerspective: onlineSession.setPerspective,
});

interaction.mount();
devController.mount();
handController.mount();
abilities.mount();
onlineSession.start();
renderLoop.start();
