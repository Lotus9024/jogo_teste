import * as THREE from 'three';
import { boundaryPoint, createIslandGeometry, EDGE_SEGMENTS, ISLAND_RADIUS_X, ISLAND_RADIUS_Z, seededRandom, SURFACE_Y } from './terrain/terrainGeometry.js';
import { createCliffTexture, createGroundTexture, loadIslandGroundTexture, loadIslandRockTexture } from './terrain/terrainTextures.js';
import { createMossPatches, createRoots, createStrataVeins, createUndersideRocks } from './terrain/terrainUnderside.js';
function createHangingLanterns() {
  const group = new THREE.Group();
  group.name = 'Correntes e lampiões antigos';
  const iron = new THREE.MeshStandardMaterial({ color: 0x25262b, roughness: 0.48, metalness: 0.82 });
  const bronze = new THREE.MeshStandardMaterial({ color: 0x70522d, emissive: 0x241405, emissiveIntensity: 0.35, roughness: 0.42, metalness: 0.72 });
  const glass = new THREE.MeshStandardMaterial({
    color: 0xffb45b,
    emissive: 0xff6b20,
    emissiveIntensity: 2.4,
    transparent: true,
    opacity: 0.54,
    roughness: 0.12,
    metalness: 0.05,
    side: THREE.DoubleSide
  });
  const flame = new THREE.MeshBasicMaterial({ color: 0xffd27d, toneMapped: false });
  const specs = [
    { angle: -2.62, drop: 2.35 }, { angle: -1.72, drop: 3.05 },
    { angle: -0.56, drop: 2.55 }, { angle: 0.52, drop: 2.8 },
    { angle: 1.65, drop: 3.2 }, { angle: 2.58, drop: 2.45 }
  ];
  const chains = [];
  specs.forEach(spec => {
    const links = Math.ceil(spec.drop / 0.23) + 1;
    for (let index = 0; index < links; index += 1) chains.push({ ...spec, index, links });
  });
  const linkMesh = new THREE.InstancedMesh(new THREE.TorusGeometry(0.13, 0.042, 6, 12), iron, chains.length);
  linkMesh.name = 'Elos grossos das correntes';
  linkMesh.castShadow = true;
  linkMesh.receiveShadow = true;
  const dummy = new THREE.Object3D();
  chains.forEach((link, linkIndex) => {
    const t = link.index / (link.links - 1);
    const point = boundaryPoint(link.angle, 0.985 - t * 0.035);
    const tangentX = -Math.sin(link.angle);
    const tangentZ = Math.cos(link.angle);
    const sway = Math.sin(t * Math.PI) * 0.22;
    dummy.position.set(point.x + tangentX * sway, SURFACE_Y - 0.42 - link.drop * t, point.z + tangentZ * sway);
    dummy.rotation.set(0, link.index % 2 ? Math.PI / 2 : 0, link.angle + (link.index % 2 ? 0 : Math.PI / 2));
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    linkMesh.setMatrixAt(linkIndex, dummy.matrix);
  });
  linkMesh.instanceMatrix.needsUpdate = true;
  group.add(linkMesh);

  const lights = [];
  const flames = [];
  specs.forEach((spec, index) => {
    const anchor = boundaryPoint(spec.angle, 0.95);
    const lantern = new THREE.Group();
    lantern.name = `Lampião suspenso ${index + 1}`;
    lantern.position.set(anchor.x, SURFACE_Y - 0.54 - spec.drop, anchor.z);
    const addPart = (geometry, material, position, rotation) => {
      const part = new THREE.Mesh(geometry, material);
      part.position.set(...position);
      if (rotation) part.rotation.set(...rotation);
      part.castShadow = material !== glass && material !== flame;
      part.receiveShadow = material !== flame;
      lantern.add(part);
      return part;
    };
    addPart(new THREE.CylinderGeometry(0.25, 0.3, 0.12, 8), bronze, [0, -0.28, 0]);
    addPart(new THREE.ConeGeometry(0.34, 0.3, 8), bronze, [0, 0.36, 0]);
    addPart(new THREE.CylinderGeometry(0.2, 0.22, 0.48, 8, 1, true), glass, [0, 0, 0]);
    for (const [x, z] of [[-0.21, -0.21], [0.21, -0.21], [-0.21, 0.21], [0.21, 0.21]]) {
      addPart(new THREE.CylinderGeometry(0.025, 0.025, 0.63, 6), iron, [x, 0.02, z]);
    }
    const core = addPart(new THREE.SphereGeometry(0.11, 10, 8), flame, [0, -0.02, 0]);
    core.userData.phase = index * 1.37;
    flames.push(core);
    const light = new THREE.PointLight(0xff8d3d, 7.5, 6.2, 2);
    light.position.set(0, 0.03, 0);
    light.userData = { baseIntensity: 7.5, phase: index * 1.37 };
    lantern.add(light);
    lights.push(light);
    group.add(lantern);
  });
  return { group, lights, flames };
}

function createCrystals() {
  const group = new THREE.Group();
  group.name = 'Cristais arcanos inferiores';
  const materials = [
    new THREE.MeshStandardMaterial({ color: 0x8eeaff, emissive: 0x247cc6, emissiveIntensity: 2.6, roughness: 0.2, metalness: 0.18 }),
    new THREE.MeshStandardMaterial({ color: 0xd0a0ff, emissive: 0x7132c7, emissiveIntensity: 2.4, roughness: 0.2, metalness: 0.18 })
  ];
  const geometries = [new THREE.ConeGeometry(0.15, 0.72, 5), new THREE.ConeGeometry(0.12, 0.55, 5)];
  const random = seededRandom(6143);

  for (let type = 0; type < 2; type += 1) {
    const count = type === 0 ? 13 : 10;
    const crystals = new THREE.InstancedMesh(geometries[type], materials[type], count);
    crystals.castShadow = false;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i += 1) {
      const angle = (i / count + type * 0.071) * Math.PI * 2 + (random() - 0.5) * 0.22;
      const depth = 0.34 + random() * 0.54;
      const scaleRadius = 1 - depth * 0.34 - depth * depth * 0.5;
      const point = boundaryPoint(angle, scaleRadius);
      dummy.position.set(point.x, SURFACE_Y - 0.72 - depth * 5.35, point.z);
      dummy.rotation.set(0, random() * Math.PI, Math.PI + (random() - 0.5) * 0.3);
      const scale = 0.72 + random() * 0.85;
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      crystals.setMatrixAt(i, dummy.matrix);
    }
    crystals.instanceMatrix.needsUpdate = true;
    group.add(crystals);
  }

  [[-5.6, -3.15, 2.8], [5.8, -3.55, -2.5], [0.4, -5.65, 0.2]].forEach(([x, y, z], index) => {
    const light = new THREE.PointLight(index === 1 ? 0x8d55ff : 0x4cbcff, 3.8, 6.4, 2);
    light.position.set(x, y, z);
    light.userData.phase = index * 1.9;
    group.add(light);
  });
  return { group, materials };
}

function createMagicDust() {
  const count = 132;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const random = seededRandom(5021);
  const color = new THREE.Color();
  for (let i = 0; i < count; i += 1) {
    const angle = random() * Math.PI * 2;
    const radial = 1.02 + random() * 0.2;
    positions[i * 3] = Math.cos(angle) * ISLAND_RADIUS_X * radial;
    positions[i * 3 + 1] = -6.4 + random() * 8.2;
    positions[i * 3 + 2] = Math.sin(angle) * ISLAND_RADIUS_Z * radial;
    color.setHSL(random() > 0.46 ? 0.53 : 0.75, 0.72, 0.72);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    vertexColors: true,
    size: 0.085,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.58,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false
  });
  const dust = new THREE.Points(geometry, material);
  dust.name = 'Energia mágica da ilha';
  return dust;
}

export function createMagicTerrain(renderer, { quality = 'high' } = {}) {
  const texture = createGroundTexture(renderer, quality === 'low' ? 384 : 1024);
  const cliffTexture = createCliffTexture(renderer, quality === 'low' ? 256 : 512);
  const terrainMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: texture,
    bumpMap: texture,
    bumpScale: 0.035,
    roughness: 0.96,
    metalness: 0
  });
  const cliffMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: cliffTexture,
    bumpMap: cliffTexture,
    bumpScale: 0.11,
    emissive: 0x120d0b,
    emissiveIntensity: 0.24,
    roughness: 0.98,
    metalness: 0.01,
    flatShading: true,
    side: THREE.FrontSide
  });
  const earthCoreMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: cliffTexture,
    bumpMap: cliffTexture,
    bumpScale: 0.14,
    emissive: 0x120a05,
    emissiveIntensity: 0.18,
    roughness: 1,
    metalness: 0,
    side: THREE.DoubleSide
  });
  let highResolutionTexturesLoaded = false;
  function loadHighResolutionTextures() {
    if (highResolutionTexturesLoaded) return;
    highResolutionTexturesLoaded = true;
    loadIslandGroundTexture(renderer, terrainMaterial);
    loadIslandRockTexture(renderer, [cliffMaterial, earthCoreMaterial]);
  }

  const terrain = new THREE.Group();
  terrain.name = 'Ilha flutuante arcana';
  const islandBody = new THREE.Mesh(createIslandGeometry(), [terrainMaterial, cliffMaterial]);
  islandBody.name = 'Corpo fechado de terra e rocha da ilha';
  islandBody.castShadow = true;
  islandBody.receiveShadow = true;
  // A second, opaque mass sits just behind the sculpted cliff shell. Besides
  // giving the underside a warmer soil layer, it guarantees that steep camera
  // angles never reveal the sky through the narrow bottom cap.
  const earthCore = new THREE.Mesh(
    new THREE.CylinderGeometry(ISLAND_RADIUS_X * 0.78, ISLAND_RADIUS_X * 0.21, 6.15, EDGE_SEGMENTS, 12, false),
    earthCoreMaterial
  );
  earthCore.name = 'Núcleo maciço de terra da ilha';
  earthCore.position.y = SURFACE_Y - 3.65;
  earthCore.scale.z = ISLAND_RADIUS_Z / ISLAND_RADIUS_X;
  earthCore.castShadow = true;
  earthCore.receiveShadow = true;
  const undersideRocks = createUndersideRocks();
  const roots = createRoots();
  const strataVeins = createStrataVeins();
  const topDetails = createMossPatches();
  const hanging = createHangingLanterns();
  const crystals = createCrystals();
  terrain.add(earthCore, islandBody, undersideRocks, roots, strataVeins, topDetails, hanging.group, crystals.group);
  const magicalLift = new THREE.PointLight(0x7569c7, 7.4, 19, 2);
  magicalLift.name = 'Luz de sustentação arcana';
  magicalLift.position.set(0, -7.2, 0);
  terrain.add(magicalLift);

  const magicDust = createMagicDust();

  let currentQuality = quality;
  function update(elapsed) {
    if (currentQuality === 'low') return;
    magicDust.rotation.y = elapsed * 0.014;
    magicDust.position.y = Math.sin(elapsed * 0.24) * 0.09;
    magicDust.material.opacity = 0.5 + Math.sin(elapsed * 0.47) * 0.1;
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
    [undersideRocks, roots, strataVeins, topDetails, hanging.group, crystals.group, magicDust].forEach(detail => { detail.visible = high; });
    magicalLift.visible = high;
    islandBody.castShadow = high;
    earthCore.castShadow = high;
    if (high) loadHighResolutionTextures();
  }

  setQuality(quality);
  return { terrain, magicDust, update, setQuality };
}
