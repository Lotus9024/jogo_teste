import * as THREE from 'three';

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function createIslandGeometry({ radiusX, radiusZ, depth, lobes, phase, seed }) {
  const segments = 36;
  const sideLevels = 5;
  const positions = [0, 0, 0];
  const uvs = [0.5, 0.5];
  const topIndices = [];
  const sideIndices = [];
  const random = seededRandom(seed);
  const edge = [];

  for (let segment = 0; segment < segments; segment += 1) {
    const angle = segment / segments * Math.PI * 2;
    const irregularity = 1
      + Math.sin(angle * lobes + phase) * 0.13
      + Math.sin(angle * (lobes + 3) - phase * 0.7) * 0.055
      + (random() - 0.5) * 0.045;
    const x = Math.cos(angle) * radiusX * irregularity;
    const z = Math.sin(angle) * radiusZ * irregularity;
    const y = Math.sin(angle * 3 + phase) * 0.08;
    edge.push({ x, y, z, angle });
    positions.push(x, y, z);
    uvs.push(x / (radiusX * 2.4) + 0.5, z / (radiusZ * 2.4) + 0.5);
    topIndices.push(0, 1 + (segment + 1) % segments, 1 + segment);
  }

  let upperStart = 1;
  for (let level = 1; level <= sideLevels; level += 1) {
    const t = level / sideLevels;
    const ringStart = positions.length / 3;
    edge.forEach(({ x, y, z, angle }) => {
      const taper = 1 - t * 0.34 - t * t * 0.42;
      const twist = Math.sin(angle * 5 + t * 4 + phase) * 0.06 * Math.sin(Math.PI * t);
      positions.push(x * (taper + twist), y - depth * t, z * (taper - twist * 0.5));
      uvs.push(angle / (Math.PI * 2), t);
    });
    for (let segment = 0; segment < segments; segment += 1) {
      const next = (segment + 1) % segments;
      sideIndices.push(upperStart + segment, upperStart + next, ringStart + segment);
      sideIndices.push(upperStart + next, ringStart + next, ringStart + segment);
    }
    upperStart = ringStart;
  }

  const bottom = positions.length / 3;
  positions.push(0, -depth * 1.1, 0);
  uvs.push(0.5, 1);
  for (let segment = 0; segment < segments; segment += 1) {
    sideIndices.push(upperStart + segment, upperStart + (segment + 1) % segments, bottom);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex([...topIndices, ...sideIndices]);
  geometry.addGroup(0, topIndices.length, 0);
  geometry.addGroup(topIndices.length, sideIndices.length, 1);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function addSurfaceDetails(island, radiusX, radiusZ, seed, materials) {
  const random = seededRandom(seed);
  const rockCount = 2 + Math.floor(random() * 3);
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

  const crystal = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.18 + random() * 0.12, 0),
    materials.crystal
  );
  crystal.position.set(radiusX * (random() - 0.5) * 0.65, 0.32, radiusZ * (random() - 0.5) * 0.65);
  crystal.scale.y = 2.4;
  crystal.rotation.y = random() * Math.PI;
  island.add(crystal);
}

export function createDistantIslands() {
  const group = new THREE.Group();
  group.name = 'Ilhas flutuantes distantes';

  const materials = {
    surface: new THREE.MeshStandardMaterial({
      color: 0x594763,
      emissive: 0x241034,
      emissiveIntensity: 0.62,
      roughness: 1
    }),
    cliff: new THREE.MeshStandardMaterial({
      color: 0x463b55,
      emissive: 0x28123a,
      emissiveIntensity: 1.08,
      roughness: 0.98,
      flatShading: true
    }),
    rock: new THREE.MeshStandardMaterial({
      color: 0x51485d,
      emissive: 0x150b20,
      emissiveIntensity: 0.42,
      roughness: 1,
      flatShading: true
    }),
    crystal: new THREE.MeshStandardMaterial({
      color: 0x8c55c7,
      emissive: 0x6f2bb5,
      emissiveIntensity: 1.9,
      roughness: 0.38
    })
  };

  const specs = [
    { position: [-17.2, -21, -11.2], radiusX: 2.8, radiusZ: 1.8, depth: 3.4, lobes: 3, phase: 0.5, seed: 401, light: 0.96, tilt: [0.04, 0.03] },
    { position: [16.2, -30.6, -4.1], radiusX: 2.35, radiusZ: 3, depth: 4, lobes: 5, phase: 1.7, seed: 733, light: 0.82, tilt: [-0.08, 0.05] },
    { position: [6.7, -26, -29.8], radiusX: 2.6, radiusZ: 1.4, depth: 2.8, lobes: 4, phase: 2.8, seed: 991, light: 0.68, tilt: [0.1, -0.04] },
    { position: [-20, -29, -25], radiusX: 1.55, radiusZ: 1.05, depth: 2.35, lobes: 6, phase: 3.9, seed: 1241, light: 0.56, tilt: [-0.14, 0.1] },
    { position: [-2, -38, -45], radiusX: 1.2, radiusZ: 1.75, depth: 2.7, lobes: 4, phase: 5.1, seed: 1607, light: 0.48, tilt: [0.12, -0.12] }
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
        clone.color.multiplyScalar(spec.light);
        if (clone.emissive) clone.emissive.multiplyScalar(0.7 + spec.light * 0.3);
        if ('emissiveIntensity' in clone) clone.emissiveIntensity *= 0.72 + spec.light * 0.28;
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
    addSurfaceDetails(island, spec.radiusX, spec.radiusZ, spec.seed + 20, islandMaterials);
    group.add(island);
  });

  function update(elapsed) {
    group.children.forEach(island => {
      island.position.y = island.userData.baseY
        + Math.sin(elapsed * 0.12 + island.userData.phase) * island.userData.amplitude;
    });
  }

  return { group, update };
}
