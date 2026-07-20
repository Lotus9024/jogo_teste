import * as THREE from 'three';

const TERRAIN_RADIUS = 18.8;
const TERRAIN_Y = -0.58;

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function terrainHeight(x, z) {
  const distance = Math.hypot(x, z) / TERRAIN_RADIUS;
  const broad = Math.sin(x * 0.31) * 0.055 + Math.cos(z * 0.27) * 0.045;
  const detail = Math.sin((x + z) * 0.83) * 0.018 + Math.cos((x - z) * 1.17) * 0.012;
  return TERRAIN_Y + (broad + detail) * THREE.MathUtils.smoothstep(distance, 1, 0.15);
}

function createGroundTexture(renderer) {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const context = canvas.getContext('2d');
  const image = context.createImageData(size, size);
  const random = seededRandom(1947);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4;
      const large = Math.sin(x * 0.025) * 5 + Math.cos(y * 0.021) * 4;
      const mottled = Math.sin((x + y) * 0.071) * 3 + Math.cos((x - y) * 0.054) * 3;
      const grain = (random() - 0.5) * 12;
      image.data[index] = 36 + large + mottled + grain;
      image.data[index + 1] = 46 + large * 1.1 + mottled + grain;
      image.data[index + 2] = 42 + large * 0.65 + grain * 0.55;
      image.data[index + 3] = 255;
    }
  }

  context.putImageData(image, 0, 0);
  context.globalAlpha = 0.16;
  for (let i = 0; i < 760; i += 1) {
    const x = random() * size;
    const y = random() * size;
    const radius = 2 + random() * 11;
    context.fillStyle = random() > 0.45 ? '#66705d' : '#202927';
    context.beginPath();
    context.ellipse(x, y, radius, radius * (0.35 + random() * 0.55), random() * Math.PI, 0, Math.PI * 2);
    context.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(8, 8);
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return texture;
}

function createTerrainGeometry() {
  const rings = 46;
  const segments = 128;
  const positions = [0, terrainHeight(0, 0), 0];
  const uvs = [0.5, 0.5];
  const indices = [];

  for (let ring = 1; ring <= rings; ring += 1) {
    const radius = TERRAIN_RADIUS * ring / rings;
    for (let segment = 0; segment < segments; segment += 1) {
      const angle = segment / segments * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      positions.push(x, terrainHeight(x, z), z);
      uvs.push(x / (TERRAIN_RADIUS * 2) + 0.5, z / (TERRAIN_RADIUS * 2) + 0.5);
    }
  }

  for (let segment = 0; segment < segments; segment += 1) {
    indices.push(0, 1 + (segment + 1) % segments, 1 + segment);
  }
  for (let ring = 1; ring < rings; ring += 1) {
    const inner = 1 + (ring - 1) * segments;
    const outer = inner + segments;
    for (let segment = 0; segment < segments; segment += 1) {
      const next = (segment + 1) % segments;
      indices.push(inner + segment, inner + next, outer + segment);
      indices.push(inner + next, outer + next, outer + segment);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function createGrassGeometry() {
  const width = 0.13;
  const height = 0.48;
  const positions = [
    -width, 0, 0, width, 0, 0, -width * 0.28, height, 0, width * 0.28, height, 0,
    0, 0, -width, 0, 0, width, 0, height, -width * 0.28, 0, height, width * 0.28
  ];
  const uvs = [0, 0, 1, 0, 0.35, 1, 0.65, 1, 0, 0, 1, 0, 0.35, 1, 0.65, 1];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex([0, 1, 2, 2, 1, 3, 4, 5, 6, 6, 5, 7]);
  geometry.computeVertexNormals();
  return geometry;
}

function createGrass() {
  const count = 1700;
  const material = new THREE.MeshStandardMaterial({
    color: 0x63775c,
    emissive: 0x172219,
    emissiveIntensity: 0.24,
    roughness: 0.92,
    metalness: 0,
    side: THREE.DoubleSide,
    vertexColors: true
  });
  const wind = { value: 0 };
  material.onBeforeCompile = shader => {
    shader.uniforms.windTime = wind;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float windTime;')
      .replace(
        '#include <begin_vertex>',
        `vec3 transformed = vec3(position);
        float instancePhase = instanceMatrix[3].x * 1.71 + instanceMatrix[3].z * 1.29;
        float bladeTip = clamp(position.y / ${0.48.toFixed(2)}, 0.0, 1.0);
        transformed.x += sin(windTime * 1.12 + instancePhase + position.y * 2.3) * 0.055 * bladeTip * bladeTip;
        transformed.z += cos(windTime * 0.78 + instancePhase * 0.73) * 0.026 * bladeTip * bladeTip;`
      );
  };
  material.customProgramCacheKey = () => 'low-grass-vertex-wind-v1';

  const grass = new THREE.InstancedMesh(createGrassGeometry(), material, count);
  grass.name = 'Grama baixa instanciada com vento';
  grass.castShadow = false;
  grass.receiveShadow = true;
  grass.frustumCulled = false;
  grass.instanceMatrix.setUsage(THREE.StaticDrawUsage);

  const random = seededRandom(7319);
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  let placed = 0;
  while (placed < count) {
    const angle = random() * Math.PI * 2;
    const radius = Math.sqrt(random()) * 17.65;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const insideBoardClearance = Math.abs(x) < 8.75 && Math.abs(z) < 8.75;
    const besideDeck = Math.hypot(x + 8.96, z + 6.61) < 1.85;
    if (insideBoardClearance || besideDeck) continue;

    const horizontal = 0.72 + random() * 0.48;
    const vertical = 0.58 + random() * 0.72;
    dummy.position.set(x, terrainHeight(x, z) + 0.015, z);
    dummy.rotation.set(0, random() * Math.PI, (random() - 0.5) * 0.08);
    dummy.scale.set(horizontal, vertical, horizontal);
    dummy.updateMatrix();
    grass.setMatrixAt(placed, dummy.matrix);
    color.setHSL(0.27 + (random() - 0.5) * 0.055, 0.18 + random() * 0.16, 0.27 + random() * 0.15);
    grass.setColorAt(placed, color);
    placed += 1;
  }
  grass.instanceMatrix.needsUpdate = true;
  grass.instanceColor.needsUpdate = true;
  return { grass, wind };
}

function createMagicDust() {
  const count = 54;
  const positions = new Float32Array(count * 3);
  const random = seededRandom(5021);
  for (let i = 0; i < count; i += 1) {
    const angle = random() * Math.PI * 2;
    const radius = 9.4 + random() * 7.7;
    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = 0.15 + random() * 2.8;
    positions[i * 3 + 2] = Math.sin(angle) * radius;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: 0x9fe7ff,
    size: 0.075,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.48,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false
  });
  const dust = new THREE.Points(geometry, material);
  dust.name = 'Poeira feérica';
  return dust;
}

export function createMagicTerrain(renderer) {
  const texture = createGroundTexture(renderer);
  const terrainMaterial = new THREE.MeshStandardMaterial({
    color: 0x8a9384,
    map: texture,
    bumpMap: texture,
    bumpScale: 0.035,
    roughness: 0.96,
    metalness: 0
  });
  const terrain = new THREE.Mesh(createTerrainGeometry(), terrainMaterial);
  terrain.name = 'Terreno gramado jogável';
  terrain.castShadow = false;
  terrain.receiveShadow = true;

  const { grass, wind } = createGrass();
  const magicDust = createMagicDust();

  function update(elapsed) {
    wind.value = elapsed;
    magicDust.rotation.y = elapsed * 0.012;
    magicDust.position.y = Math.sin(elapsed * 0.24) * 0.08;
    magicDust.material.opacity = 0.42 + Math.sin(elapsed * 0.47) * 0.08;
  }

  return { terrain, grass, magicDust, update };
}
