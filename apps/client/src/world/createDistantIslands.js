import * as THREE from 'three';
import {
  createBarkMaps,
  createGrainMaps,
  createRockMaps,
  texturedStandardMaterial,
} from '../core/darkFantasySurfaces.js';
import { createOrbitalSparkles } from './terrain/createArcaneDetails.js';

const distantSurfaceMaps = createGrainMaps({
  size: 128, color: [51, 45, 59], repeat: [8, 7], streak: 0.18, seed: 811,
});
const distantCliffMaps = createRockMaps({
  size: 256, rock: [58, 51, 69], mineral: [92, 72, 108], repeat: [5.2, 3.1], strata: 1.15, seed: 829,
});
const distantRockMaps = createRockMaps({
  rock: [64, 58, 72], mineral: [106, 91, 120], repeat: [2.8, 2.8], strata: 0.65, seed: 853,
});
const distantRuinMaps = createRockMaps({
  rock: [76, 68, 84], mineral: [111, 94, 123], repeat: [2.2, 3.4], strata: 0.45, seed: 877,
});
const distantMossMaps = createGrainMaps({ color: [58, 55, 67], repeat: [4, 4], seed: 907, streak: 0.11 });
const distantRootMaps = createBarkMaps({
  bark: [37, 25, 29], highlight: [70, 50, 55], repeat: [5.4, 2.8], seed: 929,
});
const CLIFF_COLORS = [
  new THREE.Color(0x4a3121),
  new THREE.Color(0x795438),
  new THREE.Color(0x624b3c),
  new THREE.Color(0x514d4c),
  new THREE.Color(0x27272e),
];

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function createIslandGeometry({ radiusX, radiusZ, depth, lobes, phase, seed }) {
  const segments = 64;
  const topRings = 12;
  const sideLevels = 12;
  const positions = [0, 0.035, 0];
  const uvs = [0.5, 0.5];
  const colors = [1, 1, 1];
  const topIndices = [];
  const sideIndices = [];
  const random = seededRandom(seed);
  const edge = Array.from({ length: segments }, (_, segment) => {
    const angle = segment / segments * Math.PI * 2;
    return {
      angle,
      irregularity: 1
        + Math.sin(angle * lobes + phase) * 0.13
        + Math.sin(angle * (lobes + 3) - phase * 0.7) * 0.055
        + (random() - 0.5) * 0.045,
    };
  });
  const color = new THREE.Color();

  for (let ring = 1; ring <= topRings; ring += 1) {
    const radial = ring / topRings;
    const organicBlend = THREE.MathUtils.smoothstep(radial, 0.35, 1);
    edge.forEach(({ angle, irregularity }) => {
      const organicRadius = THREE.MathUtils.lerp(1, irregularity, organicBlend);
      const x = Math.cos(angle) * radiusX * radial * organicRadius;
      const z = Math.sin(angle) * radiusZ * radial * organicRadius;
      const broad = Math.sin(x * 1.2 + phase) * 0.045 + Math.cos(z * 1.05 - phase) * 0.038;
      const detail = Math.sin((x + z) * 2.4) * 0.014;
      const edgeDrop = THREE.MathUtils.smoothstep(radial, 0.82, 1) * 0.11;
      const y = (broad + detail) * (1 - radial * 0.42) - edgeDrop;
      positions.push(x, y, z);
      uvs.push(x / (radiusX * 2.2) + 0.5, z / (radiusZ * 2.2) + 0.5);
      colors.push(1, 1, 1);
    });
  }

  for (let segment = 0; segment < segments; segment += 1) {
    topIndices.push(0, 1 + (segment + 1) % segments, 1 + segment);
  }
  for (let ring = 1; ring < topRings; ring += 1) {
    const inner = 1 + (ring - 1) * segments;
    const outer = inner + segments;
    for (let segment = 0; segment < segments; segment += 1) {
      const next = (segment + 1) % segments;
      topIndices.push(inner + segment, inner + next, outer + segment);
      topIndices.push(inner + next, outer + next, outer + segment);
    }
  }

  let upperStart = 1 + (topRings - 1) * segments;
  for (let level = 1; level <= sideLevels; level += 1) {
    const t = level / sideLevels;
    const ringStart = positions.length / 3;
    edge.forEach(({ angle, irregularity }) => {
      const taper = 1 - t * 0.24 - Math.pow(t, 1.65) * 0.51;
      const twist = (
        Math.sin(angle * 5 + t * 9 + phase) * 0.032
        + Math.sin(angle * 11 - t * 6) * 0.018
      ) * Math.sin(Math.PI * t);
      const scale = irregularity * (taper + twist);
      const x = Math.cos(angle) * radiusX * scale;
      const z = Math.sin(angle) * radiusZ * (scale - twist * 0.35);
      const strata = Math.sin(angle * 7 + t * 25) * 0.045 * Math.sin(Math.PI * t);
      positions.push(x, -0.1 - depth * t + strata, z);
      uvs.push(angle / (Math.PI * 2), t);
      if (t < 0.08) color.lerpColors(CLIFF_COLORS[0], CLIFF_COLORS[1], t / 0.08);
      else if (t < 0.22) color.lerpColors(CLIFF_COLORS[1], CLIFF_COLORS[2], (t - 0.08) / 0.14);
      else if (t < 0.4) color.lerpColors(CLIFF_COLORS[2], CLIFF_COLORS[3], (t - 0.22) / 0.18);
      else color.lerpColors(CLIFF_COLORS[3], CLIFF_COLORS[4], (t - 0.4) / 0.6);
      color.offsetHSL(0, 0, Math.sin(t * 90 + angle * 8) * 0.025);
      colors.push(color.r, color.g, color.b);
    });
    for (let segment = 0; segment < segments; segment += 1) {
      const next = (segment + 1) % segments;
      sideIndices.push(upperStart + segment, upperStart + next, ringStart + segment);
      sideIndices.push(upperStart + next, ringStart + next, ringStart + segment);
    }
    upperStart = ringStart;
  }

  const bottom = positions.length / 3;
  positions.push(0, -depth * 1.08, 0);
  uvs.push(0.5, 1);
  colors.push(CLIFF_COLORS[4].r, CLIFF_COLORS[4].g, CLIFF_COLORS[4].b);
  for (let segment = 0; segment < segments; segment += 1) {
    sideIndices.push(upperStart + segment, upperStart + (segment + 1) % segments, bottom);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex([...topIndices, ...sideIndices]);
  geometry.addGroup(0, topIndices.length, 0);
  geometry.addGroup(topIndices.length, sideIndices.length, 1);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function createDryRoot(start, end, radius, material) {
  const direction = new THREE.Vector3().subVectors(end, start);
  const root = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.46, radius, direction.length(), 6, 2),
    material
  );
  root.position.addVectors(start, end).multiplyScalar(0.5);
  root.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.clone().normalize()
  );
  root.castShadow = true;
  root.receiveShadow = true;
  return root;
}

function addSurfaceDetails(
  island,
  radiusX,
  radiusZ,
  depth,
  seed,
  materials,
  { compact = false, lightAccent = true } = {}
) {
  const random = seededRandom(seed);
  const rockCount = (compact ? 3 : 7) + Math.floor(random() * (compact ? 2 : 3));
  for (let index = 0; index < rockCount; index += 1) {
    const angle = random() * Math.PI * 2;
    const radial = 0.25 + random() * 0.48;
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.24 + random() * 0.34, 0),
      materials.rock
    );
    rock.position.set(
      Math.cos(angle) * radiusX * radial,
      0.12 + rock.geometry.parameters.radius * 0.35,
      Math.sin(angle) * radiusZ * radial
    );
    rock.rotation.set(random() * 1.2, random() * Math.PI, random() * 0.8);
    rock.scale.set(0.7 + random() * 0.8, 0.65 + random() * 0.7, 0.7 + random() * 0.9);
    rock.castShadow = true;
    island.add(rock);
  }

  const pebbleCount = (compact ? 5 : 13) + Math.floor(random() * (compact ? 3 : 6));
  for (let index = 0; index < pebbleCount; index += 1) {
    const angle = random() * Math.PI * 2;
    const radial = 0.18 + random() * 0.66;
    const pebble = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.06 + random() * 0.11, 0),
      materials.rock
    );
    pebble.position.set(
      Math.cos(angle) * radiusX * radial,
      0.045 + random() * 0.035,
      Math.sin(angle) * radiusZ * radial
    );
    pebble.rotation.set(random() * Math.PI, random() * Math.PI, random() * Math.PI);
    pebble.scale.set(1.2 + random(), 0.45 + random() * 0.45, 0.75 + random() * 0.7);
    pebble.castShadow = true;
    pebble.receiveShadow = true;
    island.add(pebble);
  }

  const patchCount = compact ? 2 : 5;
  for (let patchIndex = 0; patchIndex < patchCount; patchIndex += 1) {
    const patch = new THREE.Mesh(
      new THREE.CircleGeometry(0.3 + random() * 0.42, 11),
      materials.surfaceAccent
    );
    patch.position.set(
      radiusX * (random() - 0.5) * 0.86,
      0.025 + patchIndex * 0.006,
      radiusZ * (random() - 0.5) * 0.86
    );
    patch.rotation.x = -Math.PI / 2;
    patch.scale.set(1.5, 0.65 + random() * 0.5, 1);
    island.add(patch);
  }

  const fissures = new THREE.Group();
  fissures.name = 'Fissuras e placas rochosas';
  const fissureCount = compact ? 3 : 7;
  for (let fissureIndex = 0; fissureIndex < fissureCount; fissureIndex += 1) {
    const angle = random() * Math.PI * 2;
    const radial = 0.12 + random() * 0.62;
    const length = 0.28 + random() * 0.46;
    const fissure = new THREE.Mesh(
      new THREE.BoxGeometry(length, 0.016, 0.018 + random() * 0.018),
      materials.fissure
    );
    fissure.position.set(
      Math.cos(angle) * radiusX * radial,
      0.052 + fissureIndex * 0.0015,
      Math.sin(angle) * radiusZ * radial
    );
    fissure.rotation.y = angle + (random() - 0.5) * 1.1;
    fissures.add(fissure);

    if (fissureIndex < (compact ? 1 : 3)) {
      const branch = fissure.clone();
      branch.scale.x = 0.46 + random() * 0.25;
      branch.position.add(new THREE.Vector3(
        Math.cos(angle + Math.PI / 2) * length * 0.28,
        0.002,
        Math.sin(angle + Math.PI / 2) * length * 0.28
      ));
      branch.rotation.y += 0.72 + random() * 0.35;
      fissures.add(branch);
    }
  }
  island.add(fissures);

  const crystalOrigin = new THREE.Vector3(
    radiusX * (random() - 0.5) * 0.58,
    0.22,
    radiusZ * (random() - 0.5) * 0.58
  );
  if (lightAccent) {
    for (let shardIndex = 0; shardIndex < 4; shardIndex += 1) {
      const crystal = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.12 + random() * 0.12, 0),
        shardIndex === 0 ? materials.crystalCore : materials.crystal
      );
      crystal.position.copy(crystalOrigin).add(new THREE.Vector3(
        (random() - 0.5) * 0.42,
        shardIndex === 0 ? 0.18 : 0.06 + random() * 0.12,
        (random() - 0.5) * 0.42
      ));
      crystal.scale.set(0.62 + random() * 0.4, 1.8 + random() * 1.55, 0.62 + random() * 0.4);
      crystal.rotation.set((random() - 0.5) * 0.22, random() * Math.PI, (random() - 0.5) * 0.28);
      island.add(crystal);
    }

    const arcaneLight = new THREE.PointLight(0x8d4ee6, 2.15, 3.8, 2);
    arcaneLight.position.copy(crystalOrigin).add(new THREE.Vector3(0, 0.55, 0));
    island.add(arcaneLight);
  }

  const ruin = new THREE.Group();
  ruin.position.set(
    -crystalOrigin.x * 0.48,
    0.04,
    -crystalOrigin.z * 0.48
  );
  ruin.rotation.y = random() * Math.PI;
  for (const side of [-1, 1]) {
    const pillar = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.52 + random() * 0.32, 0.2, 2, 3, 2),
      materials.ruin
    );
    pillar.position.set(side * 0.32, pillar.geometry.parameters.height / 2, 0);
    pillar.rotation.z = side * (0.05 + random() * 0.1);
    ruin.add(pillar);
  }
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.16, 0.22, 3, 1, 2), materials.ruin);
  lintel.position.set(0.04, 0.64, 0);
  lintel.rotation.z = 0.12;
  ruin.add(lintel);
  island.add(ruin);

  const strataCount = compact ? 5 : 10;
  for (let layer = 0; layer < strataCount; layer += 1) {
    const angle = layer / strataCount * Math.PI * 2 + random() * 0.16;
    const stratum = new THREE.Mesh(
      new THREE.BoxGeometry(0.34 + random() * 0.24, 0.09, 0.13),
      materials.strata
    );
    stratum.position.set(
      Math.cos(angle) * radiusX * (0.69 - layer * 0.018),
      -0.38 - layer * 0.14,
      Math.sin(angle) * radiusZ * (0.69 - layer * 0.018)
    );
    stratum.rotation.set((random() - 0.5) * 0.18, -angle, (random() - 0.5) * 0.22);
    island.add(stratum);
  }

  const ledges = new THREE.Group();
  ledges.name = 'Lajes expostas das falésias';
  const ledgeCount = compact ? 4 : 9;
  for (let ledgeIndex = 0; ledgeIndex < ledgeCount; ledgeIndex += 1) {
    const angle = ledgeIndex / ledgeCount * Math.PI * 2 + random() * 0.24;
    const ledge = new THREE.Mesh(
      new THREE.BoxGeometry(0.42 + random() * 0.38, 0.08 + random() * 0.04, 0.18),
      materials.strata
    );
    ledge.position.set(
      Math.cos(angle) * radiusX * (0.76 + random() * 0.08),
      -0.18 - random() * 0.72,
      Math.sin(angle) * radiusZ * (0.76 + random() * 0.08)
    );
    ledge.rotation.set((random() - 0.5) * 0.22, -angle, (random() - 0.5) * 0.2);
    ledge.scale.z = 0.8 + random() * 0.8;
    ledge.castShadow = true;
    ledge.receiveShadow = true;
    ledges.add(ledge);
  }
  island.add(ledges);

  const hangingShardCount = compact ? 4 : 8;
  for (let shardIndex = 0; shardIndex < hangingShardCount; shardIndex += 1) {
    const angle = shardIndex / hangingShardCount * Math.PI * 2 + random() * 0.35;
    const shard = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.18 + random() * 0.16, 0),
      materials.cliff
    );
    shard.position.set(
      Math.cos(angle) * radiusX * (0.46 + random() * 0.18),
      -0.58 - random() * 0.8,
      Math.sin(angle) * radiusZ * (0.46 + random() * 0.18)
    );
    shard.rotation.set(random() * 0.7, random() * Math.PI, random() * 0.7);
    shard.scale.set(0.75 + random() * 0.5, 1.6 + random() * 1.35, 0.75 + random() * 0.5);
    shard.castShadow = true;
    shard.receiveShadow = true;
    island.add(shard);
  }

  const undersideRockCount = compact ? 18 : 28;
  const undersideRocks = new THREE.InstancedMesh(
    new THREE.DodecahedronGeometry(0.2, 0),
    materials.rock,
    undersideRockCount
  );
  undersideRocks.name = 'Formações rochosas inferiores';
  undersideRocks.castShadow = true;
  undersideRocks.receiveShadow = true;
  const rockDummy = new THREE.Object3D();
  for (let rockIndex = 0; rockIndex < undersideRockCount; rockIndex += 1) {
    const angle = random() * Math.PI * 2;
    const depthFactor = 0.08 + random() * 0.78;
    const taper = 1 - depthFactor * 0.28 - Math.pow(depthFactor, 1.55) * 0.45;
    const size = 0.22 + random() * 0.28 * (1 - depthFactor * 0.28);
    rockDummy.position.set(
      Math.cos(angle) * radiusX * taper * (0.96 + random() * 0.09),
      -0.15 - depth * depthFactor,
      Math.sin(angle) * radiusZ * taper * (0.96 + random() * 0.09)
    );
    rockDummy.rotation.set(random() * Math.PI, random() * Math.PI, random() * Math.PI);
    rockDummy.scale.set(
      size * (0.68 + random() * 0.7),
      size * (0.9 + random() * 1.15),
      size * (0.68 + random() * 0.7)
    );
    rockDummy.updateMatrix();
    undersideRocks.setMatrixAt(rockIndex, rockDummy.matrix);
  }
  undersideRocks.instanceMatrix.needsUpdate = true;
  undersideRocks.computeBoundingSphere();
  island.add(undersideRocks);

  const dryRoots = new THREE.Group();
  dryRoots.name = 'Raízes secas suspensas';
  const rootCount = compact ? 3 : 7;
  for (let rootIndex = 0; rootIndex < rootCount; rootIndex += 1) {
    const angle = rootIndex / rootCount * Math.PI * 2 + random() * 0.42;
    const start = new THREE.Vector3(
      Math.cos(angle) * radiusX * (0.62 + random() * 0.12),
      -0.12 - random() * 0.18,
      Math.sin(angle) * radiusZ * (0.62 + random() * 0.12)
    );
    const middle = start.clone().add(new THREE.Vector3(
      (random() - 0.5) * 0.22,
      -(0.44 + random() * 0.55),
      (random() - 0.5) * 0.22
    ));
    const end = middle.clone().add(new THREE.Vector3(
      (random() - 0.5) * 0.24,
      -(0.24 + random() * 0.52),
      (random() - 0.5) * 0.24
    ));
    dryRoots.add(createDryRoot(start, middle, 0.055 + random() * 0.025, materials.root));
    dryRoots.add(createDryRoot(middle, end, 0.028 + random() * 0.018, materials.root));
  }
  island.add(dryRoots);

  const silhouettes = new THREE.Group();
  silhouettes.name = 'Árvores secas e monólitos das ilhas';
  const treeCount = compact ? 1 : 2 + Math.floor(random() * 2);
  for (let treeIndex = 0; treeIndex < treeCount; treeIndex += 1) {
    const angle = random() * Math.PI * 2;
    const radial = 0.18 + random() * 0.38;
    const base = new THREE.Vector3(
      Math.cos(angle) * radiusX * radial,
      0.04,
      Math.sin(angle) * radiusZ * radial
    );
    const height = 0.58 + random() * (compact ? 0.32 : 0.62);
    const crown = base.clone().add(new THREE.Vector3(
      (random() - 0.5) * 0.12,
      height,
      (random() - 0.5) * 0.12
    ));
    silhouettes.add(createDryRoot(base, crown, 0.065 + random() * 0.025, materials.root));
    const branchCount = compact ? 2 : 3;
    for (let branchIndex = 0; branchIndex < branchCount; branchIndex += 1) {
      const branchAngle = angle + branchIndex / branchCount * Math.PI * 2 + random() * 0.45;
      const branchStart = base.clone().lerp(crown, 0.54 + branchIndex * 0.1);
      const branchEnd = branchStart.clone().add(new THREE.Vector3(
        Math.cos(branchAngle) * (0.22 + random() * 0.2),
        0.18 + random() * 0.24,
        Math.sin(branchAngle) * (0.22 + random() * 0.2)
      ));
      silhouettes.add(createDryRoot(branchStart, branchEnd, 0.025 + random() * 0.014, materials.root));
    }
  }

  const monolithCount = compact ? 2 : 4;
  for (let monolithIndex = 0; monolithIndex < monolithCount; monolithIndex += 1) {
    const angle = monolithIndex / monolithCount * Math.PI * 2 + random() * 0.55;
    const monolith = new THREE.Mesh(
      new THREE.ConeGeometry(0.12 + random() * 0.1, 0.48 + random() * 0.48, 5, 2),
      materials.ruin
    );
    monolith.position.set(
      Math.cos(angle) * radiusX * (0.48 + random() * 0.2),
      monolith.geometry.parameters.height * 0.46,
      Math.sin(angle) * radiusZ * (0.48 + random() * 0.2)
    );
    monolith.rotation.set((random() - 0.5) * 0.2, random() * Math.PI, (random() - 0.5) * 0.24);
    monolith.scale.set(0.72 + random() * 0.5, 1, 0.65 + random() * 0.45);
    monolith.castShadow = true;
    monolith.receiveShadow = true;
    silhouettes.add(monolith);
  }
  island.add(silhouettes);

  const edgeShardCount = compact ? 10 : 18;
  const edgeShards = new THREE.InstancedMesh(
    new THREE.TetrahedronGeometry(0.1, 0),
    materials.strata,
    edgeShardCount
  );
  edgeShards.name = 'Fragmentos minerais nas bordas';
  edgeShards.castShadow = true;
  edgeShards.receiveShadow = true;
  const shardDummy = new THREE.Object3D();
  for (let shardIndex = 0; shardIndex < edgeShardCount; shardIndex += 1) {
    const angle = shardIndex / edgeShardCount * Math.PI * 2 + (random() - 0.5) * 0.18;
    const size = 0.62 + random() * 0.9;
    shardDummy.position.set(
      Math.cos(angle) * radiusX * (0.82 + random() * 0.08),
      -0.08 - random() * 0.42,
      Math.sin(angle) * radiusZ * (0.82 + random() * 0.08)
    );
    shardDummy.rotation.set(random() * Math.PI, -angle, random() * Math.PI);
    shardDummy.scale.set(size, size * (1.15 + random()), size);
    shardDummy.updateMatrix();
    edgeShards.setMatrixAt(shardIndex, shardDummy.matrix);
  }
  edgeShards.instanceMatrix.needsUpdate = true;
  edgeShards.computeBoundingSphere();
  island.add(edgeShards);
}

export function createDistantIslands() {
  const group = new THREE.Group();
  group.name = 'Ilhas flutuantes distantes';

  const materials = {
    surface: texturedStandardMaterial(distantSurfaceMaps, {
      color: 0x8e8695,
      emissive: 0x100a16,
      emissiveIntensity: 0.16,
      roughness: 0.96,
      bumpScale: 0.065,
      vertexColors: true,
    }),
    cliff: texturedStandardMaterial(distantCliffMaps, {
      color: 0x97899b,
      emissive: 0x160b1c,
      emissiveIntensity: 0.3,
      roughness: 0.98,
      flatShading: true,
      bumpScale: 0.12,
      vertexColors: true,
    }),
    rock: texturedStandardMaterial(distantRockMaps, {
      color: 0xffffff,
      emissive: 0x150b20,
      emissiveIntensity: 0.24,
      roughness: 1,
      flatShading: true,
      bumpScale: 0.1,
    }),
    crystal: new THREE.MeshStandardMaterial({
      color: 0x8c55c7,
      emissive: 0x6f2bb5,
      emissiveIntensity: 2.35,
      roughness: 0.28,
      flatShading: true
    }),
    crystalCore: new THREE.MeshBasicMaterial({ color: 0xe0c2ff, toneMapped: false }),
    surfaceAccent: texturedStandardMaterial(distantMossMaps, {
      color: 0xffffff,
      emissive: 0x12091c,
      emissiveIntensity: 0.28,
      roughness: 1,
      bumpScale: 0.03,
    }),
    ruin: texturedStandardMaterial(distantRuinMaps, {
      color: 0xffffff,
      emissive: 0x15091d,
      emissiveIntensity: 0.32,
      roughness: 0.98,
      flatShading: true,
      bumpScale: 0.075,
    }),
    strata: texturedStandardMaterial(distantCliffMaps, {
      color: 0xc4b4ce,
      emissive: 0x13091a,
      emissiveIntensity: 0.24,
      roughness: 1,
      flatShading: true,
      bumpScale: 0.07,
    }),
    fissure: new THREE.MeshStandardMaterial({
      color: 0x160e1d,
      emissive: 0x2f1245,
      emissiveIntensity: 0.42,
      roughness: 1,
      metalness: 0,
    }),
    root: texturedStandardMaterial(distantRootMaps, {
      color: 0x8b737b,
      emissive: 0x10070c,
      emissiveIntensity: 0.1,
      roughness: 1,
      flatShading: true,
      bumpScale: 0.08,
    }),
  };

  const specs = [
    { position: [-17.2, -21, -11.2], radiusX: 2.8, radiusZ: 1.8, depth: 3.4, lobes: 3, phase: 0.5, seed: 401, light: 0.96, tilt: [0.04, 0.03] },
    { position: [16.2, -30.6, -4.1], radiusX: 2.35, radiusZ: 3, depth: 4, lobes: 5, phase: 1.7, seed: 733, light: 0.82, tilt: [-0.08, 0.05] },
    { position: [6.7, -26, -29.8], radiusX: 2.6, radiusZ: 1.4, depth: 2.8, lobes: 4, phase: 2.8, seed: 991, light: 0.68, tilt: [0.1, -0.04] },
    { position: [-20, -29, -25], radiusX: 1.55, radiusZ: 1.05, depth: 2.35, lobes: 6, phase: 3.9, seed: 1241, light: 0.56, tilt: [-0.14, 0.1] },
    { position: [-2, -38, -45], radiusX: 1.2, radiusZ: 1.75, depth: 2.7, lobes: 4, phase: 5.1, seed: 1607, light: 0.48, tilt: [0.12, -0.12] },
    { position: [-27.5, -26.5, -15.5], radiusX: 1.9, radiusZ: 1.25, depth: 2.85, lobes: 5, phase: 6.2, seed: 1879, light: 0.58, tilt: [-0.08, 0.12], compact: true, lightAccent: false },
    { position: [25.8, -34, -21.5], radiusX: 2.05, radiusZ: 1.45, depth: 3.15, lobes: 4, phase: 7.4, seed: 2111, light: 0.52, tilt: [0.11, -0.08], compact: true, lightAccent: false },
    { position: [-15.8, -42.5, -40.5], radiusX: 1.35, radiusZ: 1.9, depth: 3.2, lobes: 6, phase: 8.6, seed: 2381, light: 0.44, tilt: [-0.13, -0.09], compact: true, lightAccent: false },
    { position: [21.5, -45, -48], radiusX: 1.65, radiusZ: 1.05, depth: 2.65, lobes: 3, phase: 9.8, seed: 2671, light: 0.4, tilt: [0.09, 0.14], compact: true, lightAccent: false }
  ];

  specs.forEach((spec, index) => {
    const island = new THREE.Group();
    island.name = `Ilha flutuante distante ${index + 1}`;
    island.position.set(...spec.position);
    island.rotation.x = spec.tilt[0];
    island.rotation.y = spec.phase * 0.48;
    island.rotation.z = spec.tilt[1];
    island.userData = {
      baseY: spec.position[1],
      phase: spec.phase,
      amplitude: 0.08 + index * 0.025
    };
    const islandMaterials = Object.fromEntries(
      Object.entries(materials).map(([name, material]) => {
        const clone = material.clone();
        clone.color.multiplyScalar(0.68 + spec.light * 0.38);
        if (clone.emissive) clone.emissive.multiplyScalar(0.86 + spec.light * 0.28);
        if ('emissiveIntensity' in clone) clone.emissiveIntensity *= 0.88 + spec.light * 0.24;
        for (const textureProperty of ['map', 'bumpMap']) {
          if (!clone[textureProperty]) continue;
          clone[textureProperty] = clone[textureProperty].clone();
          clone[textureProperty].center.set(0.5, 0.5);
          clone[textureProperty].offset.set(
            (spec.seed % 23) / 23,
            (spec.seed % 17) / 17
          );
          clone[textureProperty].rotation = spec.phase * 0.13;
          clone[textureProperty].needsUpdate = true;
        }
        return [name, clone];
      })
    );
    const body = new THREE.Mesh(
      createIslandGeometry(spec),
      [islandMaterials.surface, islandMaterials.cliff]
    );
    body.castShadow = true;
    body.receiveShadow = true;
    island.add(body);
    addSurfaceDetails(
      island,
      spec.radiusX,
      spec.radiusZ,
      spec.depth,
      spec.seed + 20,
      islandMaterials,
      { compact: spec.compact, lightAccent: spec.lightAccent !== false }
    );
    const orbit = createOrbitalSparkles({
      radiusX: spec.radiusX,
      radiusZ: spec.radiusZ,
      count: spec.compact ? 132 : 220,
      seed: spec.seed + 701,
      verticalCenter: -spec.depth * 0.42,
      verticalSpread: spec.depth * (spec.compact ? 0.78 : 1.02),
      size: spec.compact ? 0.058 : 0.078,
      opacity: 0.35 + spec.light * 0.1
    });
    orbit.name = `Órbita de estrelas da ilha ${index + 1}`;
    orbit.rotation.set(spec.tilt[0] * 0.35, spec.phase * 0.2, spec.tilt[1] * 0.35);
    orbit.userData.speed = (0.038 + index * 0.003) * (index % 2 ? -1 : 1);
    island.userData.orbit = orbit;
    island.add(orbit);
    group.add(island);
  });

  function update(elapsed) {
    group.children.forEach((island, index) => {
      island.position.y = island.userData.baseY
        + Math.sin(elapsed * 0.12 + island.userData.phase) * island.userData.amplitude;
      const orbit = island.userData.orbit;
      orbit.rotation.y = island.userData.phase * 0.2 + elapsed * orbit.userData.speed;
      orbit.material.opacity = orbit.userData.baseOpacity;
    });
  }

  return { group, update };
}
