import * as THREE from 'three';
import { createCrystals, createMagicDust } from './terrain/createArcaneDetails.js';
import { createHangingLanterns } from './terrain/createHangingLanterns.js';
import {
  createIslandGeometry,
  EDGE_SEGMENTS,
  ISLAND_RADIUS_X,
  ISLAND_RADIUS_Z,
  SURFACE_Y
} from './terrain/terrainGeometry.js';
import {
  createCliffTexture,
  createGroundTexture,
  loadIslandGroundTexture,
  loadIslandRockTexture
} from './terrain/terrainTextures.js';
import {
  createAnimatedGrass,
  createMossPatches,
  createRoots,
  createStrataVeins,
  createSurfaceRelief,
  createUndersideRocks
} from './terrain/terrainUnderside.js';

function createTerrainMaterials(renderer, quality) {
  const texture = createGroundTexture(renderer, quality === 'low' ? 384 : 1024);
  const cliffTexture = createCliffTexture(renderer, quality === 'low' ? 256 : 512);
  const terrainMaterial = new THREE.MeshStandardMaterial({
    color: 0x8e8695,
    map: texture,
    bumpMap: texture,
    bumpScale: 0.058,
    emissive: 0x100a16,
    emissiveIntensity: 0.16,
    roughness: 1,
    metalness: 0
  });
  const cliffMaterial = new THREE.MeshStandardMaterial({
    color: 0x97899b,
    map: cliffTexture,
    bumpMap: cliffTexture,
    bumpScale: 0.11,
    emissive: 0x160b1c,
    emissiveIntensity: 0.3,
    roughness: 0.98,
    metalness: 0.01,
    flatShading: true,
    side: THREE.FrontSide
  });
  const earthCoreMaterial = new THREE.MeshStandardMaterial({
    color: 0x8d8093,
    map: cliffTexture,
    bumpMap: cliffTexture,
    bumpScale: 0.14,
    emissive: 0x14091b,
    emissiveIntensity: 0.24,
    roughness: 1,
    metalness: 0,
    side: THREE.DoubleSide
  });
  return { terrainMaterial, cliffMaterial, earthCoreMaterial };
}

function createIslandBody(materials) {
  const terrain = new THREE.Group();
  terrain.name = 'Ilha flutuante arcana';
  const islandBody = new THREE.Mesh(createIslandGeometry(), [materials.terrainMaterial, materials.cliffMaterial]);
  islandBody.name = 'Corpo fechado de terra e rocha da ilha';
  islandBody.castShadow = true;
  islandBody.receiveShadow = true;

  const earthCore = new THREE.Mesh(
    new THREE.CylinderGeometry(ISLAND_RADIUS_X * 0.78, ISLAND_RADIUS_X * 0.21, 6.15, EDGE_SEGMENTS, 12, false),
    materials.earthCoreMaterial
  );
  earthCore.name = 'Núcleo maciço de terra da ilha';
  earthCore.position.y = SURFACE_Y - 3.65;
  earthCore.scale.z = ISLAND_RADIUS_Z / ISLAND_RADIUS_X;
  earthCore.castShadow = true;
  earthCore.receiveShadow = true;
  terrain.add(earthCore, islandBody);
  return { terrain, islandBody, earthCore };
}

export function createMagicTerrain(renderer, { quality = 'high' } = {}) {
  const materials = createTerrainMaterials(renderer, quality);
  let highResolutionTexturesLoaded = false;
  function loadHighResolutionTextures() {
    if (highResolutionTexturesLoaded) return;
    highResolutionTexturesLoaded = true;
    loadIslandGroundTexture(renderer, materials.terrainMaterial);
    loadIslandRockTexture(renderer, [materials.cliffMaterial, materials.earthCoreMaterial]);
  }

  const { terrain, islandBody, earthCore } = createIslandBody(materials);
  const undersideRocks = createUndersideRocks();
  const roots = createRoots();
  const strataVeins = createStrataVeins();
  const topDetails = createMossPatches();
  const surfaceRelief = createSurfaceRelief();
  const animatedGrass = createAnimatedGrass();
  const hanging = createHangingLanterns();
  const crystals = createCrystals();
  terrain.add(
    undersideRocks,
    roots,
    strataVeins,
    topDetails,
    surfaceRelief,
    animatedGrass,
    hanging.group,
    crystals.group
  );

  const magicalLift = new THREE.PointLight(0x7569c7, 7.4, 19, 2);
  magicalLift.name = 'Luz de sustentação arcana';
  magicalLift.position.set(0, -7.2, 0);
  terrain.add(magicalLift);
  const magicDust = createMagicDust();

  let currentQuality = quality;
  function update(elapsed) {
    if (currentQuality === 'low') return;
    animatedGrass.userData.update(elapsed);
    magicDust.position.y = Math.sin(elapsed * 0.2) * 0.07;
    magicDust.userData.field.rotation.y = elapsed * 0.008;
    magicDust.userData.field.material.opacity = 0.35;
    magicDust.userData.featured.rotation.y = elapsed * 0.008;
    magicDust.userData.featured.material.opacity = 0.56;
    magicDust.userData.clusterOrbit.rotation.y = -elapsed * 0.027 - 0.11;
    magicDust.userData.clusterOrbit.material.opacity =
      magicDust.userData.clusterOrbit.userData.baseOpacity;
    magicDust.userData.orbit.rotation.y = -elapsed * 0.032;
    magicDust.userData.orbit.material.opacity = magicDust.userData.orbit.userData.baseOpacity;
    magicDust.userData.twinkleOrbit.rotation.y = -elapsed * 0.036 + 0.18;
    magicDust.userData.twinkleOrbit.material.opacity = 0.46
      + Math.sin(elapsed * 0.95 + 0.8) * 0.12;
    crystals.materials.forEach((material, index) => {
      material.emissiveIntensity = 2.35 + Math.sin(elapsed * 1.05 + index * 1.7) * 0.38;
    });
    crystals.group.children.forEach(child => {
      if (!child.isLight) return;
      child.intensity = 3 + Math.sin(elapsed * 1.3 + child.userData.phase) * 0.45;
    });
    hanging.lights.forEach(light => {
      light.intensity = light.userData.baseIntensity * (0.9 + Math.sin(elapsed * 7.1 + light.userData.phase) * 0.07);
    });
    hanging.flames.forEach(flameCore => {
      const pulse = 0.92 + Math.sin(elapsed * 8.2 + flameCore.userData.phase) * 0.08;
      flameCore.scale.setScalar(pulse);
    });
  }

  function setQuality(nextQuality) {
    currentQuality = nextQuality;
    const high = nextQuality === 'high';
    [undersideRocks, roots, strataVeins, topDetails, surfaceRelief, animatedGrass, hanging.group, crystals.group, magicDust]
      .forEach(detail => { detail.visible = high; });
    magicalLift.visible = high;
    islandBody.castShadow = high;
    earthCore.castShadow = high;
    if (high) loadHighResolutionTextures();
  }

  setQuality(quality);
  return { terrain, magicDust, update, setQuality };
}
