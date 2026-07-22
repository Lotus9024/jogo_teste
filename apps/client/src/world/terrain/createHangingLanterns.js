import * as THREE from 'three';
import { boundaryPoint, SURFACE_Y } from './terrainGeometry.js';

export function createHangingLanterns() {
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
    { angle: -2.62, drop: 2.35 },
    { angle: -1.72, drop: 3.05 },
    { angle: -0.56, drop: 2.55 },
    { angle: 0.52, drop: 2.8 },
    { angle: 1.65, drop: 3.2 },
    { angle: 2.58, drop: 2.45 }
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
