import * as THREE from 'three';

export const ISLAND_RADIUS_X = 16.8;
export const ISLAND_RADIUS_Z = 14.25;
export const SURFACE_Y = -0.58;
export const EDGE_SEGMENTS = 128;

const CLIFF_COLORS = Object.freeze({
  topsoil: new THREE.Color(0x4a3121),
  earth: new THREE.Color(0x795438),
  packedEarth: new THREE.Color(0x624b3c),
  upperRock: new THREE.Color(0x514d4c),
  lowerRock: new THREE.Color(0x27272e)
});

export function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function edgeVariation(angle) {
  return 1
    + Math.sin(angle * 3 + 0.7) * 0.035
    + Math.sin(angle * 7 - 1.2) * 0.024
    + Math.sin(angle * 13 + 2.1) * 0.013;
}

export function terrainHeight(x, z) {
  const distance = Math.hypot(x / ISLAND_RADIUS_X, z / ISLAND_RADIUS_Z);
  const broad = Math.sin(x * 0.31) * 0.048 + Math.cos(z * 0.27) * 0.04;
  const detail = Math.sin((x + z) * 0.83) * 0.016 + Math.cos((x - z) * 1.17) * 0.01;
  return SURFACE_Y + (broad + detail) * (1 - THREE.MathUtils.smoothstep(distance, 0.12, 1));
}

export function boundaryPoint(angle, scale = 1) {
  const variation = edgeVariation(angle);
  return {
    x: Math.cos(angle) * ISLAND_RADIUS_X * variation * scale,
    z: Math.sin(angle) * ISLAND_RADIUS_Z * variation * scale
  };
}

export function cliffProfileScale(t, angle) {
  const taper = t * 0.16 + Math.pow(t, 1.68) * 0.6;
  const organic = Math.sin(angle * 5 + t * 11) * 0.018
    + Math.sin(angle * 11 - t * 7) * 0.011
    + Math.sin(angle * 19 + t * 4) * 0.006;
  return 1 - taper + organic * Math.sin(Math.PI * t);
}

export function cliffProfileY(t, angle) {
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
