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

function addRuinedWall(environment, material, x, z, rotation = 0) {
  const wall = new THREE.Group();
  wall.name = 'Muralha desmoronada fora do tabuleiro';
  wall.position.set(x, -0.5, z);
  wall.rotation.y = rotation;
  const blocks = [
    [-0.86, 0.2, 0, 0.72, 0.4], [-0.28, 0.24, 0.02, 0.5, 0.48],
    [0.22, 0.19, -0.01, 0.48, 0.38], [0.72, 0.14, 0.03, 0.52, 0.28],
    [-0.55, 0.57, 0, 0.5, 0.34], [-0.08, 0.63, 0.01, 0.4, 0.42]
  ];
  blocks.forEach(([bx, by, bz, width, height], index) => {
    add(
      new THREE.BoxGeometry(width, height, 0.34, 2, 2, 1),
      material,
      wall,
      [bx, by, bz],
      [0, (index % 3 - 1) * 0.045, (index % 2 ? -1 : 1) * 0.035]
    );
  });
  add(new THREE.BoxGeometry(0.7, 0.26, 0.32), material, wall, [1.12, 0.08, 0.28], [0.08, 0.42, 0.16]);
  add(new THREE.BoxGeometry(0.46, 0.2, 0.28), material, wall, [-1.22, 0.06, -0.36], [-0.12, -0.28, -0.08]);
  environment.add(wall);
}

function addCollapsedArch(environment, material, x, z, rotation = 0) {
  const arch = new THREE.Group();
  arch.name = 'Arco arruinado fora do tabuleiro';
  arch.position.set(x, -0.5, z);
  arch.rotation.y = rotation;
  for (const side of [-1, 1]) {
    add(new THREE.BoxGeometry(0.42, 1.15, 0.44, 2, 4, 2), material, arch, [side * 0.7, 0.58, 0], [0, 0, side * 0.035]);
    add(new THREE.BoxGeometry(0.56, 0.22, 0.52), material, arch, [side * 0.7, 1.2, 0], [0, 0, side * 0.08]);
  }
  add(new THREE.BoxGeometry(0.72, 0.3, 0.42), material, arch, [-0.24, 1.26, 0], [0, 0, -0.2]);
  add(new THREE.BoxGeometry(0.55, 0.27, 0.4), material, arch, [0.34, 0.14, 0.42], [0.14, -0.24, 0.38]);
  environment.add(arch);
}

function addWatchFires(scene, environment, fireLights, flameOuter, flameCore) {
  for (const [x, z] of [[-12.25, 0], [12.25, 0]]) {
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
      color: 0x705484,
      transparent: true,
      opacity: 0.018 + index * 0.003,
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

  const ashStone = new THREE.MeshStandardMaterial({ color: 0x443b4d, emissive: 0x0d0812, emissiveIntensity: 0.18, roughness: 0.98 });
  [
    [-12.65, -4.4, 1.5, 0.08],
    [-12.4, 3.8, 0.9, -0.13],
    [12.45, -3.7, 1.2, 0.12],
    [12.7, 4.6, 1.65, -0.06],
    [-5.4, 12.35, 0.75, 0.16],
    [5.9, -12.35, 1.05, -0.12]
  ].forEach(args => addBrokenPillar(environment, ashStone, ...args));
  [
    [-12.15, 1.1, -0.1],
    [-11.95, 6.8, 0.15],
    [11.95, -6.7, -0.2],
    [12.15, 1.2, 0.12],
    [11.9, 6.1, -0.08]
  ].forEach(args => addGraveStone(environment, ashStone, ...args));
  [
    [-12.4, -7.2, 0.18],
    [12.45, 7.1, Math.PI + 0.12],
    [-6.8, 12.4, Math.PI / 2 - 0.16]
  ].forEach(args => addRuinedWall(environment, ashStone, ...args));
  [
    [7.4, -12.25, -0.08],
    [-7.6, 12.3, Math.PI + 0.1]
  ].forEach(args => addCollapsedArch(environment, ashStone, ...args));

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
