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

export function createMagicDust() {
  const count = 132;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const random = seededRandom(5021);
  const color = new THREE.Color();

  for (let index = 0; index < count; index += 1) {
    const angle = random() * Math.PI * 2;
    const radial = 1.02 + random() * 0.2;
    positions[index * 3] = Math.cos(angle) * ISLAND_RADIUS_X * radial;
    positions[index * 3 + 1] = -6.4 + random() * 8.2;
    positions[index * 3 + 2] = Math.sin(angle) * ISLAND_RADIUS_Z * radial;
    color.setHSL(random() > 0.46 ? 0.53 : 0.75, 0.72, 0.72);
    colors[index * 3] = color.r;
    colors[index * 3 + 1] = color.g;
    colors[index * 3 + 2] = color.b;
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
