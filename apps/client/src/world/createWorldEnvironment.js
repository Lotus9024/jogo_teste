import * as THREE from 'three';
import { M, add } from '../core/scenePrimitives.js';
import { createIslandRocks } from './createIslandRocks.js';
import { createIslandTrees } from './createIslandTrees.js';
import { createMagicTerrain } from './createMagicTerrain.js';

function addBrokenPillar(environment, material, x, z, height = 1.35, lean = 0) {
  const ruin = new THREE.Group();
  ruin.position.set(x, -0.53, z);
  ruin.rotation.z = lean;
  add(new THREE.CylinderGeometry(0.25, 0.32, 0.18, 10), material, ruin, [0, 0.09, 0]);
  add(new THREE.CylinderGeometry(0.2, 0.23, height, 10), material, ruin, [0, 0.18 + height / 2, 0]);
  add(new THREE.CylinderGeometry(0.3, 0.23, 0.15, 10), material, ruin, [0, height + 0.2, 0], [0.12, 0.08, 0]);
  environment.add(ruin);
}

function addGraveStone(environment, material, x, z, rotation = 0) {
  const grave = new THREE.Group();
  grave.position.set(x, -0.5, z);
  grave.rotation.y = rotation;
  add(new THREE.BoxGeometry(0.48, 0.55, 0.16, 2, 2, 1), material, grave, [0, 0.3, 0], [0, 0, 0.04]);
  add(new THREE.SphereGeometry(0.24, 12, 7, 0, Math.PI * 2, 0, Math.PI / 2), material, grave, [0, 0.58, 0]);
  add(new THREE.BoxGeometry(0.24, 0.035, 0.018), M.iron, grave, [0, 0.37, 0.09]);
  add(new THREE.BoxGeometry(0.035, 0.25, 0.018), M.iron, grave, [0, 0.37, 0.09]);
  environment.add(grave);
}

function addWatchFires(scene, environment, fireLights, flameOuter, flameCore) {
  for (const [x, z] of [[-9.2, 0], [9.2, 0]]) {
    add(new THREE.CylinderGeometry(0.22, 0.29, 0.3, 12), M.iron, environment, [x, -0.35, z]);
    add(new THREE.ConeGeometry(0.19, 0.52, 9), flameOuter, environment, [x, 0.03, z]);
    add(new THREE.ConeGeometry(0.1, 0.34, 9), flameCore, environment, [x, 0.09, z]);
    const fire = new THREE.PointLight(0xff682d, 15, 6.5, 2);
    fire.position.set(x, 0.58, z);
    fire.userData = { baseIntensity: 15, phase: fireLights.length * 1.73 };
    fireLights.push(fire);
    scene.add(fire);
  }
}

function addMist(environment) {
  const wisps = [];
  for (let index = 0; index < 6; index += 1) {
    const material = new THREE.MeshBasicMaterial({
      color: 0x718379,
      transparent: true,
      opacity: 0.012 + index * 0.003,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const mist = add(
      new THREE.CircleGeometry(1.6 + index * 0.18, 32),
      material,
      environment,
      [(index % 2 ? 1 : -1) * (8.7 + (index % 3)), -0.43, -7.2 + index * 2.8],
      [-Math.PI / 2, 0, 0],
      [1.8, 0.7, 1]
    );
    mist.userData = { mist: true, index, baseX: mist.position.x };
    wisps.push(mist);
  }
  return wisps;
}

export function createWorldEnvironment(scene, renderer, { quality, fireLights, flameOuter, flameCore }) {
  const environment = new THREE.Group();
  const {
    terrain,
    magicDust,
    update: updateMagicTerrain,
    setQuality: setTerrainQuality
  } = createMagicTerrain(renderer, { quality });
  const islandRocks = createIslandRocks(renderer, { autoLoad: quality === 'high' });
  const islandTrees = createIslandTrees({ autoLoad: quality === 'high' });
  environment.add(terrain, islandRocks, magicDust, islandTrees);

  const ashStone = new THREE.MeshStandardMaterial({ color: 0x353c36, roughness: 0.98 });
  [
    [-9.25, -3.4, 1.5, 0.08],
    [-9.6, 2.8, 0.9, -0.13],
    [9.35, -2.6, 1.2, 0.12],
    [9.7, 3.7, 1.65, -0.06],
    [-4.2, 9.2, 0.75, 0.16],
    [4.7, -9.15, 1.05, -0.12]
  ].forEach(args => addBrokenPillar(environment, ashStone, ...args));
  [
    [-8.9, 1.1, -0.1],
    [-8.7, 6.3, 0.15],
    [8.7, -6.2, -0.2],
    [8.9, 0.9, 0.12],
    [8.75, 5.4, -0.08]
  ].forEach(args => addGraveStone(environment, ashStone, ...args));

  addWatchFires(scene, environment, fireLights, flameOuter, flameCore);
  const wisps = addMist(environment);
  scene.add(environment);

  const updateTerrain = elapsed => updateMagicTerrain(elapsed);
  let highFidelityScheduled = false;
  function scheduleHighFidelityAssets() {
    if (highFidelityScheduled) return;
    highFidelityScheduled = true;
    const loadRocks = () => islandRocks.userData.load?.();
    const loadTrees = () => islandTrees.userData.load?.();
    if (globalThis.requestIdleCallback) {
      globalThis.requestIdleCallback(loadRocks, { timeout: 2200 });
      globalThis.requestIdleCallback(loadTrees, { timeout: 4200 });
    } else {
      setTimeout(loadRocks, 500);
      setTimeout(loadTrees, 1400);
    }
  }
  function setGraphicsQuality(nextQuality) {
    const high = nextQuality === 'high';
    setTerrainQuality(nextQuality);
    islandRocks.visible = high;
    islandTrees.visible = high;
    wisps.forEach(wisp => { wisp.visible = high; });
    fireLights.forEach(light => { light.visible = high; });
    if (high) scheduleHighFidelityAssets();
  }

  setGraphicsQuality(quality);
  return { environment, wisps, updateTerrain, setGraphicsQuality };
}
