import * as THREE from 'three';
import { boundaryPoint, cliffProfileScale, cliffProfileY, edgeVariation, ISLAND_RADIUS_X, ISLAND_RADIUS_Z, seededRandom, SURFACE_Y, terrainHeight } from './terrainGeometry.js';

export function createUndersideRocks() {
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

  for (let index = 0; index < count; index += 1) {
    const angle = random() * Math.PI * 2;
    const depth = index < 52 ? 0.1 + random() * 0.2 : 0.24 + random() * 0.72;
    const profileScale = cliffProfileScale(depth, angle);
    const point = boundaryPoint(angle, profileScale * (1.005 + random() * 0.025));
    const size = 0.24 + random() * 0.52 * (1 - depth * 0.24);
    dummy.position.set(point.x, cliffProfileY(depth, angle), point.z);
    dummy.rotation.set(random() * Math.PI, random() * Math.PI, random() * Math.PI);
    dummy.scale.set(size * (0.72 + random() * 0.5), size * (0.8 + random() * 0.8), size * (0.72 + random() * 0.5));
    dummy.updateMatrix();
    rocks.setMatrixAt(index, dummy.matrix);
    color.setHSL(0.62 + (random() - 0.5) * 0.035, 0.05, 0.22 + random() * 0.11);
    rocks.setColorAt(index, color);
  }
  rocks.instanceMatrix.needsUpdate = true;
  rocks.instanceColor.needsUpdate = true;
  return rocks;
}

export function createRoots() {
  const roots = new THREE.Group();
  roots.name = 'Raízes expostas';
  const material = new THREE.MeshStandardMaterial({ color: 0x3b251c, roughness: 1, metalness: 0 });
  const random = seededRandom(3991);
  for (let index = 0; index < 18; index += 1) {
    const angle = index / 18 * Math.PI * 2 + (random() - 0.5) * 0.24;
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

export function createStrataVeins() {
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

export function createMossPatches() {
  const group = new THREE.Group();
  group.name = 'Musgo das bordas';
  const random = seededRandom(2197);
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  const count = 64;
  const material = new THREE.MeshStandardMaterial({
    color: 0x657c59,
    emissive: 0x1a281c,
    emissiveIntensity: 0.4,
    roughness: 1,
    vertexColors: true
  });
  const moss = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.42, 1), material, count);
  moss.name = 'Placas de musgo';
  moss.castShadow = false;
  moss.receiveShadow = true;
  for (let index = 0; index < count; index += 1) {
    const angle = random() * Math.PI * 2;
    const radial = 0.73 + random() * 0.22;
    const x = Math.cos(angle) * ISLAND_RADIUS_X * radial * edgeVariation(angle);
    const z = Math.sin(angle) * ISLAND_RADIUS_Z * radial * edgeVariation(angle);
    dummy.position.set(x, terrainHeight(x, z) + 0.015, z);
    dummy.rotation.set(random() * 0.12, random() * Math.PI, random() * 0.12);
    const scale = 0.35 + random() * 0.75;
    dummy.scale.set(scale * (0.8 + random() * 0.6), 0.08 + random() * 0.08, scale);
    dummy.updateMatrix();
    moss.setMatrixAt(index, dummy.matrix);
    color.setHSL(0.29 + (random() - 0.5) * 0.05, 0.3 + random() * 0.2, 0.38 + random() * 0.12);
    moss.setColorAt(index, color);
  }
  moss.instanceMatrix.needsUpdate = true;
  moss.instanceColor.needsUpdate = true;
  group.add(moss);
  return group;
}
