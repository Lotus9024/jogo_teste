import * as THREE from 'three';
import { M, add } from '../core/scenePrimitives.js';
import { createIslandRocks } from './createIslandRocks.js';
import { createIslandTrees } from './createIslandTrees.js';
import { createMagicTerrain } from './createMagicTerrain.js';

function createRuinMaterials() {
  const stones = [0x5a5361, 0x47414f, 0x6a626d, 0x38333f].map((color, index) => {
    const material = M.stone.clone();
    material.color.setHex(color);
    material.roughness = 0.96 + index * 0.01;
    material.metalness = 0;
    material.emissive.setHex(0x08050b);
    material.emissiveIntensity = 0.08;
    return material;
  });
  const crack = new THREE.MeshBasicMaterial({ color: 0x0b080d, toneMapped: false });
  const charredWood = M.wood.clone();
  charredWood.color.setHex(0x251a18);
  charredWood.emissive.setHex(0x040203);
  charredWood.emissiveIntensity = 0.05;
  charredWood.roughness = 1;
  return { stones, crack, charredWood };
}

function addRubble(parent, materials, scale = 1) {
  const pieces = [
    [-1.02, 0.02, 0.38, 0.18], [-0.72, 0.01, -0.45, 0.13], [-0.34, 0.03, 0.5, 0.11],
    [0.2, 0.02, -0.42, 0.16], [0.63, 0.04, 0.44, 0.12], [1.02, 0.03, -0.23, 0.2]
  ];
  pieces.forEach(([x, y, z, radius], index) => {
    add(
      new THREE.DodecahedronGeometry(radius * scale, 0),
      materials.stones[(index + 1) % materials.stones.length],
      parent,
      [x * scale, y + radius * scale * 0.62, z * scale],
      [index * 0.31, index * 0.67, index * 0.18],
      [1.2, 0.7, 0.9]
    );
  });
}

function addBrokenPillar(environment, materials, x, z, height = 1.35, lean = 0) {
  const ruin = new THREE.Group();
  ruin.name = 'Coluna antiga quebrada';
  ruin.position.set(x, -0.53, z);
  ruin.rotation.y = lean * 2.4;
  const standingHeight = height * 0.62;
  add(new THREE.CylinderGeometry(0.29, 0.36, 0.18, 9), materials.stones[2], ruin, [0, 0.09, 0], [0, 0.08, 0]);
  add(new THREE.CylinderGeometry(0.2, 0.24, standingHeight, 9), materials.stones[0], ruin, [0, 0.18 + standingHeight / 2, 0], [0.03, 0, lean]);
  add(new THREE.CylinderGeometry(0.23, 0.19, 0.13, 9), materials.stones[1], ruin, [lean * standingHeight, standingHeight + 0.2, 0], [0.14, 0.06, lean]);
  add(new THREE.BoxGeometry(0.025, standingHeight * 0.36, 0.014), materials.crack, ruin, [0.205, standingHeight * 0.72, 0], [0, 0, -0.34]);
  const fallen = add(
    new THREE.CylinderGeometry(0.18, 0.21, height * 0.48, 9),
    materials.stones[3],
    ruin,
    [0.62, 0.19, 0.34],
    [Math.PI / 2 - 0.08, 0.2, Math.PI / 2 + 0.18]
  );
  fallen.scale.z = 0.86;
  add(new THREE.CylinderGeometry(0.29, 0.22, 0.14, 9), materials.stones[1], ruin, [0.98, 0.16, 0.42], [Math.PI / 2, 0.18, Math.PI / 2]);
  addRubble(ruin, materials, 0.66);
  environment.add(ruin);
}

function addGraveStone(environment, materials, x, z, rotation = 0) {
  const grave = new THREE.Group();
  grave.name = 'Lápide rachada antiga';
  grave.position.set(x, -0.5, z);
  grave.rotation.y = rotation;
  add(new THREE.BoxGeometry(0.58, 0.12, 0.31), materials.stones[3], grave, [0, 0.06, 0], [0, 0.05, 0]);
  add(new THREE.BoxGeometry(0.46, 0.55, 0.16, 2, 3, 1), materials.stones[1], grave, [0, 0.35, 0], [0, 0, 0.075]);
  add(new THREE.SphereGeometry(0.23, 9, 6, 0, Math.PI * 2, 0, Math.PI / 2), materials.stones[0], grave, [-0.015, 0.63, 0], [0, 0, 0.075]);
  add(new THREE.BoxGeometry(0.025, 0.34, 0.012), materials.crack, grave, [0.08, 0.44, 0.087], [0, 0, -0.42]);
  add(new THREE.BoxGeometry(0.18, 0.02, 0.012), materials.crack, grave, [-0.01, 0.5, 0.089], [0, 0, 0.22]);
  add(new THREE.BoxGeometry(0.22, 0.035, 0.018), M.iron, grave, [0, 0.36, 0.1]);
  add(new THREE.BoxGeometry(0.035, 0.23, 0.018), M.iron, grave, [0, 0.36, 0.1]);
  addRubble(grave, materials, 0.34);
  environment.add(grave);
}

function addRuinedWall(environment, materials, x, z, rotation = 0) {
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
    const block = add(
      new THREE.BoxGeometry(width, height, 0.34, 2, 2, 1),
      materials.stones[index % materials.stones.length],
      wall,
      [bx, by, bz],
      [0, (index % 3 - 1) * 0.045, (index % 2 ? -1 : 1) * 0.035]
    );
    block.scale.z = 0.88 + (index % 3) * 0.09;
  });
  add(new THREE.BoxGeometry(0.7, 0.26, 0.32), materials.stones[1], wall, [1.12, 0.08, 0.28], [0.08, 0.42, 0.16]);
  add(new THREE.BoxGeometry(0.46, 0.2, 0.28), materials.stones[3], wall, [-1.22, 0.06, -0.36], [-0.12, -0.28, -0.08]);
  add(new THREE.BoxGeometry(0.034, 0.42, 0.012), materials.crack, wall, [-0.48, 0.45, 0.18], [0, 0, -0.52]);
  add(new THREE.BoxGeometry(1.1, 0.13, 0.16), materials.charredWood, wall, [0.35, 0.13, -0.38], [0.2, 0.36, -0.12]);
  add(new THREE.CylinderGeometry(0.025, 0.025, 0.38, 7), M.iron, wall, [-0.56, 0.47, -0.19], [0, 0, -0.65]);
  addRubble(wall, materials, 0.82);
  environment.add(wall);
}

function addCollapsedArch(environment, materials, x, z, rotation = 0) {
  const arch = new THREE.Group();
  arch.name = 'Arco arruinado fora do tabuleiro';
  arch.position.set(x, -0.5, z);
  arch.rotation.y = rotation;
  for (const side of [-1, 1]) {
    for (let level = 0; level < 3; level += 1) {
      add(
        new THREE.BoxGeometry(0.45 + (level % 2) * 0.04, 0.39, 0.46, 2, 2, 2),
        materials.stones[(level + (side > 0 ? 1 : 0)) % materials.stones.length],
        arch,
        [side * (0.7 + (level % 2) * 0.025), 0.2 + level * 0.4, 0],
        [0, level * side * 0.025, side * (0.025 + level * 0.012)]
      );
    }
  }
  for (let index = 0; index < 7; index += 1) {
    if (index === 4 || index === 6) continue;
    const angle = 0.18 + index * (Math.PI - 0.36) / 6;
    add(
      new THREE.BoxGeometry(0.4, 0.28, 0.44, 2, 2, 2),
      materials.stones[(index + 2) % materials.stones.length],
      arch,
      [Math.cos(angle) * 0.72, 1.12 + Math.sin(angle) * 0.72, 0],
      [0, 0, angle - Math.PI / 2]
    );
  }
  add(new THREE.BoxGeometry(0.48, 0.29, 0.42), materials.stones[2], arch, [0.5, 0.16, 0.52], [0.15, -0.32, 0.42]);
  add(new THREE.BoxGeometry(0.72, 0.12, 0.14), materials.charredWood, arch, [-0.3, 0.3, -0.34], [0.18, -0.15, 0.75]);
  add(new THREE.BoxGeometry(0.03, 0.32, 0.012), materials.crack, arch, [-0.68, 0.63, 0.24], [0, 0, 0.28]);
  addRubble(arch, materials, 0.76);
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

  const ruinMaterials = createRuinMaterials();
  [
    [-12.65, -4.4, 1.5, 0.08],
    [-12.4, 3.8, 0.9, -0.13],
    [12.45, -3.7, 1.2, 0.12],
    [12.7, 4.6, 1.65, -0.06],
    [-5.4, 12.35, 0.75, 0.16],
    [5.9, -12.35, 1.05, -0.12]
  ].forEach(args => addBrokenPillar(environment, ruinMaterials, ...args));
  [
    [-12.15, 1.1, -0.1],
    [-11.95, 6.8, 0.15],
    [11.95, -6.7, -0.2],
    [12.15, 1.2, 0.12],
    [11.9, 6.1, -0.08]
  ].forEach(args => addGraveStone(environment, ruinMaterials, ...args));
  [
    [-12.4, -7.2, 0.18],
    [12.45, 7.1, Math.PI + 0.12],
    [-6.8, 12.4, Math.PI / 2 - 0.16]
  ].forEach(args => addRuinedWall(environment, ruinMaterials, ...args));
  [
    [7.4, -12.25, -0.08],
    [-7.6, 12.3, Math.PI + 0.1]
  ].forEach(args => addCollapsedArch(environment, ruinMaterials, ...args));

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
