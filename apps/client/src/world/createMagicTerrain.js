import * as THREE from 'three';

const ISLAND_RADIUS_X = 16.8;
const ISLAND_RADIUS_Z = 14.25;
const SURFACE_Y = -0.58;
const EDGE_SEGMENTS = 128;
const ISLAND_GROUND_TEXTURE = '/assets/textures/grass/coast_sand_rocks_02_diff_4k.jpg';
const CLIFF_COLORS = Object.freeze({
  topsoil: new THREE.Color(0x4a3121),
  earth: new THREE.Color(0x795438),
  packedEarth: new THREE.Color(0x624b3c),
  upperRock: new THREE.Color(0x514d4c),
  lowerRock: new THREE.Color(0x27272e)
});

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

function boundaryPoint(angle, scale = 1) {
  const variation = edgeVariation(angle);
  return {
    x: Math.cos(angle) * ISLAND_RADIUS_X * variation * scale,
    z: Math.sin(angle) * ISLAND_RADIUS_Z * variation * scale
  };
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
      image.data[index] = 47 + large + mottled + grain;
      image.data[index + 1] = 62 + large * 1.12 + mottled + grain;
      image.data[index + 2] = 50 + large * 0.62 + grain * 0.5;
      image.data[index + 3] = 255;
    }
  }

  context.putImageData(image, 0, 0);
  context.globalAlpha = 0.16;
  for (let i = 0; i < 760; i += 1) {
    const x = random() * size;
    const y = random() * size;
    const radius = 2 + random() * 11;
    context.fillStyle = random() > 0.45 ? '#69745c' : '#202a25';
    context.beginPath();
    context.ellipse(x, y, radius, radius * (0.35 + random() * 0.55), random() * Math.PI, 0, Math.PI * 2);
    context.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(8, 7);
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return texture;
}

function loadIslandGroundTexture(renderer, material) {
  new THREE.TextureLoader().load(
    ISLAND_GROUND_TEXTURE,
    texture => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(3.5, 3);
      texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      material.map = texture;
      material.bumpMap = texture;
      material.bumpScale = 0.075;
      material.needsUpdate = true;
    }
  );
}

function createCliffTexture(renderer) {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const context = canvas.getContext('2d');
  const image = context.createImageData(size, size);
  const random = seededRandom(4289);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4;
      const broad = Math.sin(x * 0.031 + Math.sin(y * 0.018) * 2.4) * 11;
      const strata = Math.sin(y * 0.14 + Math.sin(x * 0.021) * 3.2) * 8;
      const fractured = Math.sin((x + y) * 0.082) * 4 + Math.cos((x - y) * 0.047) * 5;
      const grain = (random() - 0.5) * 18;
      image.data[index] = 152 + broad + strata + fractured + grain;
      image.data[index + 1] = 139 + broad * 0.82 + strata + fractured + grain;
      image.data[index + 2] = 124 + broad * 0.58 + strata * 0.72 + fractured + grain;
      image.data[index + 3] = 255;
    }
  }

  context.putImageData(image, 0, 0);
  context.globalAlpha = 0.2;
  for (let index = 0; index < 170; index += 1) {
    const x = random() * size;
    const y = random() * size;
    context.strokeStyle = random() > 0.5 ? '#4a4038' : '#b09a7d';
    context.lineWidth = 1 + random() * 2.5;
    context.beginPath();
    context.moveTo(x, y);
    context.bezierCurveTo(
      x + 12 + random() * 34,
      y + (random() - 0.5) * 8,
      x + 38 + random() * 48,
      y + (random() - 0.5) * 11,
      x + 72 + random() * 54,
      y + (random() - 0.5) * 7
    );
    context.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(5, 3.25);
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return texture;
}

function cliffProfileScale(t, angle) {
  const taper = t * 0.16 + Math.pow(t, 1.68) * 0.6;
  const organic = Math.sin(angle * 5 + t * 11) * 0.018
    + Math.sin(angle * 11 - t * 7) * 0.011
    + Math.sin(angle * 19 + t * 4) * 0.006;
  return 1 - taper + organic * Math.sin(Math.PI * t);
}

function cliffProfileY(t, angle) {
  const strata = Math.sin(angle * 6 + t * 18) * 0.055
    + Math.sin(angle * 13 - t * 9) * 0.025;
  return SURFACE_Y - 0.2 - Math.pow(t, 0.96) * 6.25 + strata * Math.sin(Math.PI * t);
}

function cliffColor(t, angle, target) {
  if (t < 0.07) target.lerpColors(CLIFF_COLORS.topsoil, CLIFF_COLORS.earth, t / 0.07);
  else if (t < 0.2) target.lerpColors(CLIFF_COLORS.earth, CLIFF_COLORS.packedEarth, (t - 0.07) / 0.13);
  else if (t < 0.36) target.lerpColors(CLIFF_COLORS.packedEarth, CLIFF_COLORS.upperRock, (t - 0.2) / 0.16);
  else target.lerpColors(CLIFF_COLORS.upperRock, CLIFF_COLORS.lowerRock, (t - 0.36) / 0.64);

  const sedimentBand = Math.sin(t * 112 + angle * 7) * 0.022;
  const rockVariation = Math.sin(angle * 17 + t * 31) * 0.018;
  target.offsetHSL(0, 0, sedimentBand + rockVariation);
  return target;
}

export function createIslandGeometry() {
  const rings = 42;
  const cliffLevels = 30;
  const positions = [0, terrainHeight(0, 0), 0];
  const uvs = [0.5, 0.5];
  const colors = [1, 1, 1];
  const topIndices = [];
  const cliffIndices = [];
  const bottomIndices = [];
  const color = new THREE.Color();

  for (let ring = 1; ring <= rings; ring += 1) {
    const radial = ring / rings;
    const organicBlend = THREE.MathUtils.smoothstep(radial, 0.42, 1);
    for (let segment = 0; segment < EDGE_SEGMENTS; segment += 1) {
      const angle = segment / EDGE_SEGMENTS * Math.PI * 2;
      const organicRadius = THREE.MathUtils.lerp(1, edgeVariation(angle), organicBlend);
      const x = Math.cos(angle) * ISLAND_RADIUS_X * radial * organicRadius;
      const z = Math.sin(angle) * ISLAND_RADIUS_Z * radial * organicRadius;
      const edgeDrop = THREE.MathUtils.smoothstep(radial, 0.86, 1) * 0.2;
      positions.push(x, terrainHeight(x, z) - edgeDrop, z);
      uvs.push(x / (ISLAND_RADIUS_X * 2) + 0.5, z / (ISLAND_RADIUS_Z * 2) + 0.5);
      if (ring === rings) cliffColor(0, angle, color);
      else color.setRGB(1, 1, 1);
      colors.push(color.r, color.g, color.b);
    }
  }

  for (let segment = 0; segment < EDGE_SEGMENTS; segment += 1) {
    topIndices.push(0, 1 + (segment + 1) % EDGE_SEGMENTS, 1 + segment);
  }
  for (let ring = 1; ring < rings; ring += 1) {
    const inner = 1 + (ring - 1) * EDGE_SEGMENTS;
    const outer = inner + EDGE_SEGMENTS;
    for (let segment = 0; segment < EDGE_SEGMENTS; segment += 1) {
      const next = (segment + 1) % EDGE_SEGMENTS;
      topIndices.push(inner + segment, inner + next, outer + segment);
      topIndices.push(inner + next, outer + next, outer + segment);
    }
  }

  // Keep cylindrical cliff UVs while joining them to the actual top ring with
  // a narrow soil collar. The collar makes the mesh watertight instead of
  // leaving two coincident, disconnected boundary loops at the island rim.
  const outerRingStart = 1 + (rings - 1) * EDGE_SEGMENTS;
  let upperRingStart = positions.length / 3;
  for (let segment = 0; segment < EDGE_SEGMENTS; segment += 1) {
    const angle = segment / EDGE_SEGMENTS * Math.PI * 2;
    const point = boundaryPoint(angle, 0.997);
    const topY = positions[(outerRingStart + segment) * 3 + 1];
    const soilDepth = 0.075 + Math.sin(angle * 7 + 0.4) * 0.01;
    positions.push(point.x, topY - soilDepth, point.z);
    uvs.push(segment / EDGE_SEGMENTS, 0);
    cliffColor(0, angle, color);
    colors.push(color.r, color.g, color.b);
  }
  for (let segment = 0; segment < EDGE_SEGMENTS; segment += 1) {
    const next = (segment + 1) % EDGE_SEGMENTS;
    cliffIndices.push(outerRingStart + segment, outerRingStart + next, upperRingStart + segment);
    cliffIndices.push(outerRingStart + next, upperRingStart + next, upperRingStart + segment);
  }
  for (let level = 1; level <= cliffLevels; level += 1) {
    const t = level / cliffLevels;
    const lowerRingStart = positions.length / 3;
    for (let segment = 0; segment < EDGE_SEGMENTS; segment += 1) {
      const angle = segment / EDGE_SEGMENTS * Math.PI * 2;
      const point = boundaryPoint(angle, cliffProfileScale(t, angle));
      positions.push(point.x, cliffProfileY(t, angle), point.z);
      uvs.push(segment / EDGE_SEGMENTS, t);
      cliffColor(t, angle, color);
      colors.push(color.r, color.g, color.b);
    }
    for (let segment = 0; segment < EDGE_SEGMENTS; segment += 1) {
      const next = (segment + 1) % EDGE_SEGMENTS;
      cliffIndices.push(upperRingStart + segment, upperRingStart + next, lowerRingStart + segment);
      cliffIndices.push(upperRingStart + next, lowerRingStart + next, lowerRingStart + segment);
    }
    upperRingStart = lowerRingStart;
  }

  const bottomCenter = positions.length / 3;
  positions.push(0, SURFACE_Y - 7.12, 0);
  uvs.push(0.5, 1);
  cliffColor(1, 0, color);
  colors.push(color.r, color.g, color.b);
  for (let segment = 0; segment < EDGE_SEGMENTS; segment += 1) {
    const next = (segment + 1) % EDGE_SEGMENTS;
    bottomIndices.push(upperRingStart + segment, upperRingStart + next, bottomCenter);
  }

  const indices = [...topIndices, ...cliffIndices, ...bottomIndices];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.addGroup(0, topIndices.length, 0);
  geometry.addGroup(topIndices.length, cliffIndices.length + bottomIndices.length, 1);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function createUndersideRocks() {
  const count = 180;
  const geometry = new THREE.DodecahedronGeometry(0.62, 0);
  const material = new THREE.MeshStandardMaterial({
    color: 0x48474b,
    emissive: 0x101019,
    emissiveIntensity: 0.38,
    roughness: 0.96,
    metalness: 0.03,
    vertexColors: true
  });
  const rocks = new THREE.InstancedMesh(geometry, material, count);
  rocks.name = 'Formações rochosas inferiores';
  rocks.castShadow = true;
  rocks.receiveShadow = true;
  const random = seededRandom(8821);
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();

  for (let i = 0; i < count; i += 1) {
    const angle = random() * Math.PI * 2;
    const depth = i < 52 ? 0.1 + random() * 0.2 : 0.24 + random() * 0.72;
    const profileScale = cliffProfileScale(depth, angle);
    const point = boundaryPoint(angle, profileScale * (1.005 + random() * 0.025));
    const size = 0.24 + random() * 0.52 * (1 - depth * 0.24);
    dummy.position.set(point.x, cliffProfileY(depth, angle), point.z);
    dummy.rotation.set(random() * Math.PI, random() * Math.PI, random() * Math.PI);
    dummy.scale.set(size * (0.72 + random() * 0.5), size * (0.8 + random() * 0.8), size * (0.72 + random() * 0.5));
    dummy.updateMatrix();
    rocks.setMatrixAt(i, dummy.matrix);
    color.setHSL(0.62 + (random() - 0.5) * 0.035, 0.05, 0.22 + random() * 0.11);
    rocks.setColorAt(i, color);
  }
  rocks.instanceMatrix.needsUpdate = true;
  rocks.instanceColor.needsUpdate = true;
  return rocks;
}

function createRoots() {
  const roots = new THREE.Group();
  roots.name = 'Raízes expostas';
  const material = new THREE.MeshStandardMaterial({ color: 0x3b251c, roughness: 1, metalness: 0 });
  const random = seededRandom(3991);
  for (let i = 0; i < 18; i += 1) {
    const angle = i / 18 * Math.PI * 2 + (random() - 0.5) * 0.24;
    const start = boundaryPoint(angle, 0.98);
    const middle = boundaryPoint(angle + (random() - 0.5) * 0.08, 0.78);
    const end = boundaryPoint(angle + (random() - 0.5) * 0.15, 0.52);
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(start.x, SURFACE_Y - 0.08, start.z),
      new THREE.Vector3(start.x * 0.91, SURFACE_Y - 0.72 - random() * 0.3, start.z * 0.91),
      new THREE.Vector3(middle.x, SURFACE_Y - 2.25 - random() * 0.55, middle.z),
      new THREE.Vector3(end.x, SURFACE_Y - 4.15 - random() * 1.15, end.z)
    ]);
    const root = new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.055 + random() * 0.045, 6, false), material);
    root.castShadow = true;
    root.receiveShadow = true;
    roots.add(root);
  }
  return roots;
}

function createStrataVeins() {
  const group = new THREE.Group();
  group.name = 'Veios naturais das camadas rochosas';
  const materials = [
    new THREE.MeshStandardMaterial({ color: 0x745b47, emissive: 0x241714, emissiveIntensity: 0.48, roughness: 0.96 }),
    new THREE.MeshStandardMaterial({ color: 0x5f5b60, emissive: 0x1c1925, emissiveIntensity: 0.58, roughness: 0.92 }),
    new THREE.MeshStandardMaterial({ color: 0x45434d, emissive: 0x1e1830, emissiveIntensity: 0.68, roughness: 0.9 }),
    new THREE.MeshStandardMaterial({ color: 0x373540, emissive: 0x211738, emissiveIntensity: 0.78, roughness: 0.88 })
  ];
  const layers = [
    { scale: 0.94, y: -1.18, radius: 0.09 },
    { scale: 0.79, y: -2.35, radius: 0.08 },
    { scale: 0.6, y: -3.72, radius: 0.072 },
    { scale: 0.37, y: -5.16, radius: 0.06 }
  ];
  layers.forEach((layer, layerIndex) => {
    const points = [];
    for (let segment = 0; segment < 64; segment += 1) {
      const angle = segment / 64 * Math.PI * 2;
      const irregular = 1 + Math.sin(angle * (7 + layerIndex * 2) + layerIndex) * 0.018;
      const point = boundaryPoint(angle, layer.scale * irregular);
      points.push(new THREE.Vector3(point.x, layer.y + Math.sin(angle * 5 + layerIndex) * 0.055, point.z));
    }
    const curve = new THREE.CatmullRomCurve3(points, true, 'centripetal');
    const vein = new THREE.Mesh(new THREE.TubeGeometry(curve, 128, layer.radius, 6, true), materials[layerIndex]);
    vein.castShadow = false;
    vein.receiveShadow = true;
    group.add(vein);
  });
  return group;
}

function createMossAndPlants() {
  const group = new THREE.Group();
  group.name = 'Musgo e vegetação das bordas';
  const random = seededRandom(2197);
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();

  const mossCount = 64;
  const mossMaterial = new THREE.MeshStandardMaterial({
    color: 0x657c59,
    emissive: 0x1a281c,
    emissiveIntensity: 0.4,
    roughness: 1,
    vertexColors: true
  });
  const moss = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.42, 1), mossMaterial, mossCount);
  moss.name = 'Placas de musgo';
  moss.castShadow = false;
  moss.receiveShadow = true;
  for (let i = 0; i < mossCount; i += 1) {
    const angle = random() * Math.PI * 2;
    const radial = 0.73 + random() * 0.22;
    const x = Math.cos(angle) * ISLAND_RADIUS_X * radial * edgeVariation(angle);
    const z = Math.sin(angle) * ISLAND_RADIUS_Z * radial * edgeVariation(angle);
    dummy.position.set(x, terrainHeight(x, z) + 0.015, z);
    dummy.rotation.set(random() * 0.12, random() * Math.PI, random() * 0.12);
    const scale = 0.35 + random() * 0.75;
    dummy.scale.set(scale * (0.8 + random() * 0.6), 0.08 + random() * 0.08, scale);
    dummy.updateMatrix();
    moss.setMatrixAt(i, dummy.matrix);
    color.setHSL(0.29 + (random() - 0.5) * 0.05, 0.3 + random() * 0.2, 0.38 + random() * 0.12);
    moss.setColorAt(i, color);
  }
  moss.instanceMatrix.needsUpdate = true;
  moss.instanceColor.needsUpdate = true;

  const plantCount = 96;
  const plantMaterial = new THREE.MeshStandardMaterial({
    color: 0x7f9271,
    emissive: 0x1d291e,
    emissiveIntensity: 0.34,
    roughness: 0.94,
    side: THREE.DoubleSide,
    vertexColors: true
  });
  const plants = new THREE.InstancedMesh(new THREE.ConeGeometry(0.11, 0.38, 5), plantMaterial, plantCount);
  plants.name = 'Pequenas plantas silvestres';
  plants.castShadow = false;
  plants.receiveShadow = true;
  for (let i = 0; i < plantCount; i += 1) {
    const angle = random() * Math.PI * 2;
    const radial = 0.77 + random() * 0.17;
    const x = Math.cos(angle) * ISLAND_RADIUS_X * radial * edgeVariation(angle);
    const z = Math.sin(angle) * ISLAND_RADIUS_Z * radial * edgeVariation(angle);
    dummy.position.set(x, terrainHeight(x, z) + 0.18, z);
    dummy.rotation.set((random() - 0.5) * 0.18, random() * Math.PI, (random() - 0.5) * 0.18);
    const scale = 0.58 + random() * 0.72;
    dummy.scale.set(scale, scale, scale);
    dummy.updateMatrix();
    plants.setMatrixAt(i, dummy.matrix);
    color.setHSL(0.25 + (random() - 0.5) * 0.055, 0.24 + random() * 0.18, 0.31 + random() * 0.12);
    plants.setColorAt(i, color);
  }
  plants.instanceMatrix.needsUpdate = true;
  plants.instanceColor.needsUpdate = true;
  group.add(moss, plants);
  return group;
}

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

export function createMagicTerrain(renderer) {
  const texture = createGroundTexture(renderer);
  const cliffTexture = createCliffTexture(renderer);
  const terrainMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: texture,
    bumpMap: texture,
    bumpScale: 0.035,
    roughness: 0.96,
    metalness: 0
  });
  loadIslandGroundTexture(renderer, terrainMaterial);
  const cliffMaterial = new THREE.MeshStandardMaterial({
    vertexColors: true,
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
    color: 0x7a5539,
    map: cliffTexture,
    bumpMap: cliffTexture,
    bumpScale: 0.14,
    emissive: 0x120a05,
    emissiveIntensity: 0.18,
    roughness: 1,
    metalness: 0,
    side: THREE.DoubleSide
  });

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
  const topDetails = createMossAndPlants();
  const hanging = createHangingLanterns();
  const crystals = createCrystals();
  terrain.add(earthCore, islandBody, undersideRocks, roots, strataVeins, topDetails, hanging.group, crystals.group);
  const magicalLift = new THREE.PointLight(0x7569c7, 7.4, 19, 2);
  magicalLift.name = 'Luz de sustentação arcana';
  magicalLift.position.set(0, -7.2, 0);
  terrain.add(magicalLift);

  const magicDust = createMagicDust();

  function update(elapsed) {
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

  return { terrain, magicDust, update };
}
