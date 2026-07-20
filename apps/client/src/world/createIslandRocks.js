import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const ROCK_MODEL = '/assets/models/rocks/moonrock.glb';
const ROCK_DIFFUSE = '/assets/textures/rocks/moonrock/moon_rock_06_diff_4k.jpg';
const ISLAND_RADIUS_X = 16.8;
const ISLAND_RADIUS_Z = 14.25;
const SURFACE_Y = -0.58;
const ROCK_SPOTS = [
  [-11, 7, 0.55], [-7.6, 9.3, 0.75], [-3.1, -9.4, 0.42],
  [2.2, 9.6, 0.5], [8.7, -8.8, 0.72], [11.8, -6, 0.48],
  [11.5, 6.8, 0.65], [-12.2, 2.8, 0.45], [12, -1.6, 0.52]
];

function terrainHeight(x, z) {
  const distance = Math.hypot(x / ISLAND_RADIUS_X, z / ISLAND_RADIUS_Z);
  const broad = Math.sin(x * 0.31) * 0.048 + Math.cos(z * 0.27) * 0.04;
  const detail = Math.sin((x + z) * 0.83) * 0.016 + Math.cos((x - z) * 1.17) * 0.01;
  return SURFACE_Y + (broad + detail) * (1 - THREE.MathUtils.smoothstep(distance, 0.12, 1));
}

function createRockMaterial(renderer) {
  const texture = new THREE.TextureLoader().load(ROCK_DIFFUSE);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: texture,
    roughness: 0.86,
    metalness: 0.03
  });
}

export function createIslandRocks(renderer) {
  const group = new THREE.Group();
  group.name = 'Moonrocks da superfície da ilha';
  group.userData.status = 'loading';

  new GLTFLoader().load(
    ROCK_MODEL,
    gltf => {
      let sourceMesh;
      gltf.scene.traverse(part => {
        if (!sourceMesh && part.isMesh) sourceMesh = part;
      });
      if (!sourceMesh) {
        group.userData.status = 'failed';
        return;
      }

      const rocks = new THREE.InstancedMesh(sourceMesh.geometry, createRockMaterial(renderer), ROCK_SPOTS.length);
      const dummy = new THREE.Object3D();
      rocks.name = 'Moonrocks personalizadas';
      rocks.castShadow = true;
      rocks.receiveShadow = true;
      rocks.instanceMatrix.setUsage(THREE.StaticDrawUsage);

      ROCK_SPOTS.forEach(([x, z, size], index) => {
        const scale = size * 18;
        dummy.position.set(x, terrainHeight(x, z) + 0.012, z);
        dummy.rotation.set(index * 0.17, index * 0.74, index * 0.11);
        dummy.scale.setScalar(scale);
        dummy.updateMatrix();
        rocks.setMatrixAt(index, dummy.matrix);
      });
      rocks.instanceMatrix.needsUpdate = true;
      rocks.computeBoundingSphere();
      group.add(rocks);
      group.userData.status = 'ready';
      group.userData.count = ROCK_SPOTS.length;
    },
    undefined,
    () => {
      group.userData.status = 'failed';
    }
  );

  return group;
}
