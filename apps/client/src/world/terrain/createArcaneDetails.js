import * as THREE from 'three';
import {
  boundaryPoint,
  ISLAND_RADIUS_X,
  ISLAND_RADIUS_Z,
  seededRandom,
  SURFACE_Y
} from './terrainGeometry.js';

export function createCrystals() {
  const group = new THREE.Group();
  group.name = 'Cristais arcanos inferiores';
  const materials = [
    new THREE.MeshStandardMaterial({ color: 0xcba3ff, emissive: 0x6424c7, emissiveIntensity: 3.05, roughness: 0.16, metalness: 0.24, flatShading: true }),
    new THREE.MeshStandardMaterial({ color: 0x9d62ee, emissive: 0x8b35e8, emissiveIntensity: 3.25, roughness: 0.14, metalness: 0.2, flatShading: true })
  ];
  const coreMaterials = [
    new THREE.MeshBasicMaterial({ color: 0xd3adff, transparent: true, opacity: 0.4, toneMapped: false }),
    new THREE.MeshBasicMaterial({ color: 0xb879ff, transparent: true, opacity: 0.44, toneMapped: false })
  ];
  const geometries = [new THREE.ConeGeometry(0.16, 0.78, 6, 2), new THREE.ConeGeometry(0.13, 0.61, 6, 2)];
  const random = seededRandom(6143);

  for (let type = 0; type < 2; type += 1) {
    const count = type === 0 ? 13 : 10;
    const crystals = new THREE.InstancedMesh(geometries[type], materials[type], count);
    const cores = new THREE.InstancedMesh(geometries[type], coreMaterials[type], count);
    crystals.castShadow = true;
    const dummy = new THREE.Object3D();
    const coreDummy = new THREE.Object3D();
    for (let index = 0; index < count; index += 1) {
      const angle = (index / count + type * 0.071) * Math.PI * 2 + (random() - 0.5) * 0.22;
      const depth = 0.34 + random() * 0.54;
      const scaleRadius = 1 - depth * 0.34 - depth * depth * 0.5;
      const point = boundaryPoint(angle, scaleRadius);
      dummy.position.set(point.x, SURFACE_Y - 0.72 - depth * 5.35, point.z);
      dummy.rotation.set(0, random() * Math.PI, Math.PI + (random() - 0.5) * 0.3);
      const scale = 0.72 + random() * 0.85;
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      crystals.setMatrixAt(index, dummy.matrix);
      coreDummy.position.copy(dummy.position);
      coreDummy.rotation.copy(dummy.rotation);
      coreDummy.scale.setScalar(scale * 0.54);
      coreDummy.updateMatrix();
      cores.setMatrixAt(index, coreDummy.matrix);
    }
    crystals.instanceMatrix.needsUpdate = true;
    cores.instanceMatrix.needsUpdate = true;
    group.add(crystals, cores);
  }

  [[-5.6, -3.15, 2.8], [5.8, -3.55, -2.5], [0.4, -5.65, 0.2]].forEach(([x, y, z], index) => {
    const light = new THREE.PointLight(index === 1 ? 0xa869ff : 0x7b3fd1, 4.8, 7.2, 2);
    light.position.set(x, y, z);
    light.userData.phase = index * 1.9;
    group.add(light);
  });

  return { group, materials: [...materials, ...coreMaterials] };
}

let sharedStarDustTexture;

function createStarDustTexture(size = 64) {
  if (sharedStarDustTexture) return sharedStarDustTexture;
  const data = new Uint8Array(size * size * 4);
  const center = (size - 1) / 2;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = (x - center) / center;
      const dy = (y - center) / center;
      const distance = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);
      const spikes = Math.abs(Math.cos(angle * 4)) ** 8;
      const boundary = 0.14 + spikes * 0.72;
      const starBody = 1 - THREE.MathUtils.smoothstep(distance, boundary - 0.035, boundary + 0.035);
      const core = Math.max(0, 1 - distance * 2.8) ** 2;
      const halo = Math.max(0, 1 - distance) ** 7;
      const alpha = Math.min(1, starBody * 0.94 + core * 0.75 + halo * 0.18);
      const offset = (y * size + x) * 4;
      data[offset] = 248;
      data[offset + 1] = 232;
      data[offset + 2] = 255;
      data[offset + 3] = Math.round(alpha * 255);
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  sharedStarDustTexture = texture;
  return sharedStarDustTexture;
}

export function createOrbitalSparkles({
  radiusX,
  radiusZ,
  count = 64,
  seed = 9024,
  verticalCenter = -1.8,
  verticalSpread = 4.2,
  radialBase = 1.06,
  radialSpread = 0.24,
  angularJitter = 0.11,
  size = 0.075,
  opacity = 0.54
}) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const random = seededRandom(seed);
  const color = new THREE.Color();

  for (let index = 0; index < count; index += 1) {
    const angle = index / count * Math.PI * 2 + (random() - 0.5) * angularJitter;
    const radial = radialBase + random() * radialSpread;
    const wave = Math.sin(angle * 2.3 + seed * 0.001) * verticalSpread * 0.13;
    positions[index * 3] = Math.cos(angle) * radiusX * radial;
    positions[index * 3 + 1] = verticalCenter + wave + (random() - 0.5) * verticalSpread;
    positions[index * 3 + 2] = Math.sin(angle) * radiusZ * radial;
    color.setHSL(
      0.71 + random() * 0.1,
      0.62 + random() * 0.22,
      0.65 + random() * 0.2
    );
    colors[index * 3] = color.r;
    colors[index * 3 + 1] = color.g;
    colors[index * 3 + 2] = color.b;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeBoundingSphere();
  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    vertexColors: true,
    map: createStarDustTexture(),
    size,
    sizeAttenuation: true,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true,
    toneMapped: false,
    alphaTest: 0.025
  });
  const orbit = new THREE.Points(geometry, material);
  orbit.name = 'Órbita de pequenas estrelas';
  orbit.userData = { count, baseOpacity: opacity };
  return orbit;
}

export function createMagicDust() {
  const group = new THREE.Group();
  group.name = 'Estrelas espaciais e órbita da ilha principal';
  const count = 2600;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const random = seededRandom(5021);
  const color = new THREE.Color();

  let index = 0;
  let attempts = 0;
  while (index < count && attempts < count * 30) {
    attempts += 1;
    const x = (random() * 2 - 1) * 46;
    const y = -23 + random() * 40;
    const z = (random() * 2 - 1) * 42;
    const normalizedRadius = Math.hypot(x / ISLAND_RADIUS_X, z / ISLAND_RADIUS_Z);
    const crossesBoardView = y > -3.2
      && Math.abs(x) < ISLAND_RADIUS_X * 1.18
      && z > -ISLAND_RADIUS_Z * 1.12
      && z < ISLAND_RADIUS_Z * 1.38;
    const intersectsIsland = normalizedRadius < 1.04 && y > -8;
    const tooNearCamera = Math.hypot(x - 3.1, y - 14.8, z - 10.2) < 11;
    if (crossesBoardView || intersectsIsland || tooNearCamera) continue;

    positions[index * 3] = x;
    positions[index * 3 + 1] = y;
    positions[index * 3 + 2] = z;
    const distanceFade = THREE.MathUtils.clamp(normalizedRadius / 2.8, 0, 1);
    const lightness = 0.58 + random() * 0.18 + distanceFade * 0.04;
    color.setHSL(0.72 + random() * 0.08, 0.58 + random() * 0.22, lightness);
    colors[index * 3] = color.r;
    colors[index * 3 + 1] = color.g;
    colors[index * 3 + 2] = color.b;
    index += 1;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeBoundingSphere();
  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    vertexColors: true,
    map: createStarDustTexture(),
    size: 0.075,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.35,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true,
    toneMapped: false,
    alphaTest: 0.025
  });
  const field = new THREE.Points(geometry, material);
  field.name = 'Campo de pequenas estrelas no espaço';
  field.userData.count = count;
  field.userData.boardClearZone = {
    halfWidth: ISLAND_RADIUS_X * 1.18,
    nearZ: -ISLAND_RADIUS_Z * 1.12,
    farZ: ISLAND_RADIUS_Z * 1.38,
    minimumY: -3.2
  };
  const featuredCount = 180;
  const featuredPositions = new Float32Array(featuredCount * 3);
  const featuredColors = new Float32Array(featuredCount * 3);
  for (let featuredIndex = 0; featuredIndex < featuredCount; featuredIndex += 1) {
    const sourceIndex = (featuredIndex * 13 + 7) % count;
    for (let axis = 0; axis < 3; axis += 1) {
      featuredPositions[featuredIndex * 3 + axis] = positions[sourceIndex * 3 + axis];
      featuredColors[featuredIndex * 3 + axis] = Math.min(
        1,
        colors[sourceIndex * 3 + axis] * 1.14
      );
    }
  }
  const featuredGeometry = new THREE.BufferGeometry();
  featuredGeometry.setAttribute('position', new THREE.BufferAttribute(featuredPositions, 3));
  featuredGeometry.setAttribute('color', new THREE.BufferAttribute(featuredColors, 3));
  featuredGeometry.computeBoundingSphere();
  const featured = new THREE.Points(
    featuredGeometry,
    new THREE.PointsMaterial({
      color: 0xffffff,
      vertexColors: true,
      map: createStarDustTexture(),
      size: 0.19,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.56,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true,
      toneMapped: false,
      alphaTest: 0.05
    })
  );
  featured.name = 'Estrelinhas definidas em primeiro plano';
  featured.userData.count = featuredCount;
  const orbit = createOrbitalSparkles({
    radiusX: ISLAND_RADIUS_X,
    radiusZ: ISLAND_RADIUS_Z,
    count: 1800,
    seed: 6412,
    verticalCenter: -2.45,
    verticalSpread: 4.8,
    radialBase: 1.055,
    radialSpread: 0.15,
    angularJitter: 0.045,
    size: 0.115,
    opacity: 0.54
  });
  orbit.name = 'Órbita estelar permanente da ilha principal';
  orbit.rotation.set(-0.035, 0, 0.045);
  const twinkleOrbit = createOrbitalSparkles({
    radiusX: ISLAND_RADIUS_X * 1.02,
    radiusZ: ISLAND_RADIUS_Z * 1.02,
    count: 112,
    seed: 9173,
    verticalCenter: -2.35,
    verticalSpread: 5.2,
    radialBase: 1.045,
    radialSpread: 0.17,
    angularJitter: 0.06,
    size: 0.15,
    opacity: 0.46
  });
  twinkleOrbit.name = 'Poucas estrelas cintilantes da órbita principal';
  twinkleOrbit.rotation.set(-0.042, 0.18, 0.052);
  group.add(field, featured, orbit, twinkleOrbit);
  group.userData = {
    count: count + featuredCount + orbit.userData.count + twinkleOrbit.userData.count,
    field,
    featured,
    orbit,
    twinkleOrbit,
    boardClearZone: field.userData.boardClearZone
  };
  return group;
}
