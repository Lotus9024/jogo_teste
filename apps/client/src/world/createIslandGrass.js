import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const GRASS_MODEL = '/assets/models/grass/bermuda-grass.glb';
const GRASS_DIFFUSE = '/assets/textures/grass/bermuda/grass_bermuda_01_diff_4k.jpg';
const GRASS_ALPHA = '/assets/textures/grass/bermuda/grass_bermuda_01_alpha_4k.png';
const ISLAND_RADIUS_X = 16.8;
const ISLAND_RADIUS_Z = 14.25;
const SURFACE_Y = -0.58;
const GRASS_COUNT = 2400;

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function edgeVariation(angle) {
  return 1
    + Math.sin(angle * 3 + 0.7) * 0.035
    + Math.sin(angle * 7 - 1.2) * 0.024
    + Math.sin(angle * 13 + 2.1) * 0.013;
}

function terrainHeight(x, z) {
  const distance = Math.hypot(x / ISLAND_RADIUS_X, z / ISLAND_RADIUS_Z);
  const broad = Math.sin(x * 0.31) * 0.048 + Math.cos(z * 0.27) * 0.04;
  const detail = Math.sin((x + z) * 0.83) * 0.016 + Math.cos((x - z) * 1.17) * 0.01;
  return SURFACE_Y + (broad + detail) * (1 - THREE.MathUtils.smoothstep(distance, 0.12, 1));
}

function createWindMaterial(textures, wind) {
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.diffuse,
    alphaMap: textures.alpha,
    roughness: 0.92,
    metalness: 0,
    side: THREE.DoubleSide
  });
  material.transparent = false;
  material.alphaTest = 0.45;
  material.depthWrite = true;
  material.side = THREE.DoubleSide;
  material.roughness = 0.92;
  material.onBeforeCompile = shader => {
    shader.uniforms.grassWindTime = wind;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float grassWindTime;')
      .replace(
        '#include <begin_vertex>',
        `vec3 transformed = vec3(position);
        float instancePhase = instanceMatrix[3].x * 1.43 + instanceMatrix[3].z * 1.91;
        float bladeTip = clamp(position.y / 0.155, 0.0, 1.0);
        float sway = sin(grassWindTime * 1.15 + instancePhase + position.y * 8.0);
        transformed.x += sway * 0.025 * bladeTip * bladeTip;
        transformed.z += cos(grassWindTime * 0.82 + instancePhase * 0.67) * 0.016 * bladeTip * bladeTip;`
      );
  };
  material.customProgramCacheKey = () => 'bermuda-grass-wind-v1';
  material.needsUpdate = true;
  return material;
}

function distributeGrass(meshes, group, textures, wind) {
  const capacity = Math.ceil(GRASS_COUNT / meshes.length);
  const instanced = meshes.map((mesh, index) => {
    const grass = new THREE.InstancedMesh(mesh.geometry, createWindMaterial(textures, wind), capacity);
    grass.name = `Grama bermuda personalizada ${index + 1}`;
    grass.castShadow = false;
    grass.receiveShadow = true;
    grass.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    group.add(grass);
    return grass;
  });

  const counts = Array(meshes.length).fill(0);
  const random = seededRandom(7319);
  const dummy = new THREE.Object3D();
  let placed = 0;
  while (placed < GRASS_COUNT) {
    const angle = random() * Math.PI * 2;
    const radial = Math.sqrt(random()) * 0.985;
    const organic = edgeVariation(angle);
    const x = Math.cos(angle) * ISLAND_RADIUS_X * radial * organic;
    const z = Math.sin(angle) * ISLAND_RADIUS_Z * radial * organic;
    const insideBoardClearance = Math.abs(x) < 8.75 && Math.abs(z) < 8.75;
    const besideDeck = Math.hypot(x + 8.96, z + 6.61) < 1.85;
    if (insideBoardClearance || besideDeck) continue;

    const variant = placed % instanced.length;
    const scale = 4.2 + random() * 3.1;
    dummy.position.set(x, terrainHeight(x, z) + 0.012, z);
    dummy.rotation.set(0, random() * Math.PI * 2, (random() - 0.5) * 0.05);
    dummy.scale.set(scale * (0.82 + random() * 0.28), scale, scale * (0.82 + random() * 0.28));
    dummy.updateMatrix();
    instanced[variant].setMatrixAt(counts[variant], dummy.matrix);
    counts[variant] += 1;
    placed += 1;
  }

  instanced.forEach((grass, index) => {
    grass.count = counts[index];
    grass.instanceMatrix.needsUpdate = true;
    grass.computeBoundingSphere();
  });
}

export function createIslandGrass(renderer) {
  const group = new THREE.Group();
  const wind = { value: 0 };
  const textureLoader = new THREE.TextureLoader();
  const textures = {
    diffuse: textureLoader.load(GRASS_DIFFUSE),
    alpha: textureLoader.load(GRASS_ALPHA)
  };
  textures.diffuse.colorSpace = THREE.SRGBColorSpace;
  textures.diffuse.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  textures.alpha.colorSpace = THREE.NoColorSpace;
  textures.alpha.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  group.name = 'Grama bermuda personalizada da ilha';
  group.userData.status = 'loading';

  new GLTFLoader().load(
    GRASS_MODEL,
    gltf => {
      const meshes = [];
      gltf.scene.traverse(part => {
        if (part.isMesh) meshes.push(part);
      });
      if (!meshes.length) {
        group.userData.status = 'failed';
        return;
      }
      distributeGrass(meshes, group, textures, wind);
      group.userData.status = 'ready';
      group.userData.count = GRASS_COUNT;
    },
    undefined,
    () => {
      group.userData.status = 'failed';
    }
  );

  return { group, update: elapsed => { wind.value = elapsed; } };
}
