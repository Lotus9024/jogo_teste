import * as THREE from 'three';
import { add } from '../../core/scenePrimitives.js';
import { createGrainMaps, texturedStandardMaterial } from '../../core/darkFantasySurfaces.js';
import { U, humanoidBase } from './unitModelKit.js';

const hide = createGrainMaps({ color: [164, 151, 119], repeat: [2, 3], seed: 227, streak: 0.025 });
const rust = createGrainMaps({ color: [163, 141, 113], repeat: [2, 2], seed: 239, streak: 0.08 });

export const C = Object.freeze({
  skin: new THREE.MeshStandardMaterial({ color: 0x71804f, roughness: 0.83 }),
  skinShade: new THREE.MeshStandardMaterial({ color: 0x414f32, roughness: 0.9 }),
  ear: new THREE.MeshStandardMaterial({ color: 0x8b7954, roughness: 0.91 }),
  ashSkin: new THREE.MeshStandardMaterial({ color: 0x87936d, roughness: 0.8 }),
  hide: texturedStandardMaterial(hide, { color: 0x67503b, roughness: 0.94, bumpScale: 0.014 }),
  hideDark: texturedStandardMaterial(hide, { color: 0x302c25, roughness: 0.95, bumpScale: 0.012 }),
  scrap: texturedStandardMaterial(rust, { color: 0x777466, roughness: 0.63, metalness: 0.55, bumpScale: 0.017 }),
  bone: new THREE.MeshStandardMaterial({ color: 0xd1c39a, roughness: 0.79 }),
  amber: new THREE.MeshStandardMaterial({ color: 0xc9a154, roughness: 0.52 }),
  soot: new THREE.MeshStandardMaterial({ color: 0x171c1a, roughness: 0.97 }),
  powder: texturedStandardMaterial(hide, { color: 0x5d2921, roughness: 0.92, bumpScale: 0.014 }),
  ember: new THREE.MeshStandardMaterial({ color: 0xd98132, emissive: 0xc64812, emissiveIntensity: 0.65, roughness: 0.62 }),
  rune: new THREE.MeshStandardMaterial({ color: 0x9c93bc, emissive: 0x574374, emissiveIntensity: 0.42, roughness: 0.54, metalness: 0.18 }),
});

export function mesh(parent, name, geometry, material, position, rotation = [0, 0, 0], scale = [1, 1, 1]) {
  const part = add(geometry, material, parent, position, rotation, scale);
  part.name = name;
  return part;
}

export function orb(parent, name, material, position, scale, radius = 1) {
  return mesh(parent, name, new THREE.SphereGeometry(radius, 12, 8), material, position, [0, 0, 0], scale);
}

export function block(parent, name, material, size, position, rotation = [0, 0, 0]) {
  return mesh(parent, name, new THREE.BoxGeometry(...size), material, position, rotation);
}

export function rod(parent, name, material, from, to, radius, radialSegments = 8) {
  const start = new THREE.Vector3(...from), end = new THREE.Vector3(...to);
  const delta = end.clone().sub(start);
  const part = mesh(parent, name, new THREE.CylinderGeometry(radius * 0.88, radius, delta.length(), radialSegments), material, [0, 0, 0]);
  part.position.copy(start).add(end).multiplyScalar(0.5);
  part.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
  return part;
}

export function plate(parent, name, material, points, position, depth = 0.035, rotation = [0, 0, 0]) {
  const shape = new THREE.Shape();
  points.forEach(([x, y], index) => index ? shape.lineTo(x, y) : shape.moveTo(x, y));
  shape.closePath();
  return mesh(parent, name, new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled: true, bevelSegments: 1, steps: 1, bevelSize: 0.008, bevelThickness: 0.006,
  }), material, position, rotation);
}

export function rivets(parent, prefix, points, material = U.bronze, radius = 0.022) {
  points.forEach((point, index) => mesh(parent, `${prefix}${index + 1}`, new THREE.OctahedronGeometry(radius), material, point));
}

export function creatureBase(name, role, color) {
  const result = humanoidBase(name, role, color, { hp: 1, damage: 1, move: 1 });
  result.root.userData.modelFrontZ = -1;
  result.root.userData.miniatureStyle = 'ruin-forged-creatures';
  result.root.userData.modelVersion = 2;
  return result;
}

export function bootsAndLegs(rig, prefix, { stride = 0, lean = 0 } = {}) {
  for (const side of [-1, 1]) {
    const z = side * stride;
    rod(rig, `${prefix}Thigh${side}`, C.hideDark, [side * 0.16, 0.67, 0.04], [side * 0.22, 0.39, z - 0.035], 0.105);
    rod(rig, `${prefix}Shin${side}`, C.skinShade, [side * 0.22, 0.39, z - 0.035], [side * 0.24 + lean, 0.13, z + 0.03], 0.078);
    const boot = orb(rig, side < 0 ? `${prefix}LeftBoot` : `${prefix}RightBoot`, C.hideDark,
      [side * 0.24 + lean, 0.11, z - 0.085], [0.13, 0.095, 0.225]);
    boot.rotation.y = -side * 0.18;
    mesh(rig, `${prefix}BootCuff${side}`, new THREE.CylinderGeometry(0.108, 0.116, 0.06, 8), C.hide,
      [side * 0.24 + lean, 0.17, z + 0.007]);
    orb(rig, `${prefix}BootToeCap${side}`, C.scrap,
      [side * 0.24 + lean, 0.103, z - 0.225], [0.099, 0.055, 0.064]);
    for (const y of [0.19, 0.255]) block(rig, `${prefix}LegWrap${side}-${y}`, C.bone,
      [0.15, 0.028, 0.12], [side * 0.24 + lean, y, z + 0.015], [0.05, 0, side * 0.055]);
  }
}

export function goblinHead(rig, { prefix = 'goblin', position = [0, 1.39, -0.055], skin = C.skin, earLength = 1, eyepatch = false } = {}) {
  const face = new THREE.Group();
  face.name = `${prefix}Face`;
  face.position.set(...position);
  rig.add(face);
  orb(face, 'head', skin, [0, 0, 0], [0.29, 0.255, 0.235]);
  orb(face, `${prefix}Jaw`, skin, [0.005, -0.135, -0.14], [0.225, 0.12, 0.16]);
  for (const side of [-1, 1]) {
    const ear = plate(face, side < 0 ? `${prefix}LeftEar` : `${prefix}RightEar`, skin,
      [[0, -0.11], [0.14 * side, -0.07], [0.37 * side * earLength, 0.135], [0.16 * side, 0.085], [0, 0.09]],
      [side * 0.245, 0.035, -0.01], 0.04, [0, side * 0.08, side * 0.1]);
    ear.userData.creatureEar = true;
    plate(face, `${prefix}InnerEar${side}`, C.ear,
      [[0, -0.044], [side * 0.27 * earLength, 0.107], [side * 0.09, 0.026]],
      [side * 0.27, 0.035, -0.024], 0.006);
    const cheek = orb(face, `${prefix}Cheek${side}`, skin, [side * 0.185, -0.060, -0.18], [0.093, 0.047, 0.062]);
    cheek.rotation.z = side * -0.25;
    orb(face, `${prefix}EyeSocket${side}`, C.soot, [side * 0.113, 0.039, -0.209], [0.072, 0.056, 0.025]);
    if (!(eyepatch && side < 0)) {
      const eye = orb(face, `${prefix}Eye${side}`, C.amber, [side * 0.115, 0.038, -0.232], [0.043, 0.026, 0.014]);
      eye.rotation.z = side * 0.2;
      orb(face, `${prefix}Pupil${side}`, C.soot, [side * 0.115, 0.039, -0.244], [0.009, 0.022, 0.006]);
    }
    const brow = orb(face, `${prefix}Brow${side}`, skin, [side * 0.116, 0.091, -0.212], [0.095, 0.04, 0.045]);
    brow.rotation.z = side * 0.18;
    mesh(face, `${prefix}Tusk${side}`, new THREE.ConeGeometry(0.027, 0.105, 7), C.bone,
      [side * 0.105, -0.145, -0.29], [0.18, 0, -side * 0.14]);
  }
  orb(face, `${prefix}Nose`, skin, [0, -0.052, -0.25], [0.077, 0.1, 0.142]);
  block(face, `${prefix}Mouth`, C.soot, [0.20, 0.025, 0.014], [0, -0.17, -0.291], [0, 0, -0.055]);
  mesh(face, `${prefix}EarRing`, new THREE.TorusGeometry(0.058, 0.012, 5, 12), U.bronze,
    [0.345, -0.04, -0.018], [0.12, 0.2, 0]);
  if (eyepatch) {
    orb(face, `${prefix}EyePatch`, C.hideDark, [-0.116, 0.046, -0.244], [0.082, 0.067, 0.02]);
    rod(face, `${prefix}EyePatchStrap`, C.hideDark, [-0.24, 0.11, -0.14], [0.15, 0.185, -0.14], 0.016);
  }
  return face;
}

export function wrappedHand(parent, name, position, skin = C.skin, rotation = [0, 0, 0]) {
  const hand = orb(parent, name, skin, position, [0.086, 0.095, 0.077]);
  hand.rotation.set(...rotation);
  for (let index = 0; index < 3; index += 1) {
    block(hand, `${name}Finger${index}`, C.skinShade, [0.12, 0.085, 0.9], [-0.44 + index * 0.43, 0.13, -0.13]);
  }
  return hand;
}

export function hookedBlade(rig, name, position, rotation, { length = 0.51, skin = C.skin, reverse = false } = {}) {
  const weapon = new THREE.Group();
  weapon.name = name;
  weapon.position.set(...position);
  weapon.rotation.set(...rotation);
  rig.add(weapon);
  rod(weapon, `${name}Grip`, C.hideDark, [0, -0.12, 0], [0, 0.15, 0], 0.034);
  for (let index = 0; index < 4; index += 1) mesh(weapon, `${name}GripWrap${index}`,
    new THREE.TorusGeometry(0.036, 0.009, 4, 8), C.hide, [0, -0.1 + index * 0.052, 0], [Math.PI / 2, 0, 0]);
  block(weapon, `${name}Guard`, U.bronze, [0.23, 0.052, 0.09], [0, 0.135, 0]);
  const shape = [[-0.067, 0], [-0.055, length * 0.59], [-0.005, length], [0.14, length * 0.83], [0.072, length * 0.74], [0.072, 0]];
  plate(weapon, `${name}Blade`, C.scrap, shape, [0, 0.17, -0.022], 0.042, [0, 0, reverse ? Math.PI : 0]);
  plate(weapon, `${name}HonedFacet`, U.plate,
    [[-0.067, 0], [-0.055, length * 0.59], [-0.005, length], [0.027, length * 0.88], [-0.025, length * 0.58], [-0.026, 0]],
    [0, 0.17, -0.042], 0.004, [0, 0, reverse ? Math.PI : 0]);
  rod(weapon, `${name}BladeEdge`, U.plate, [-0.061, 0.18, -0.03], [-0.008, 0.17 + length * 0.96, -0.03], 0.009, 5);
  const handName = name === 'goblinDagger' ? 'goblinDaggerHand' : `${name}Hand`;
  wrappedHand(weapon, handName, [0, 0.015, -0.015], skin);
  mesh(weapon, `${name}Pommel`, new THREE.OctahedronGeometry(0.055), U.bronze, [0, -0.16, 0]);
  return weapon;
}

export function shoulderScrap(rig, prefix, side, y = 1.075) {
  const pauldron = plate(rig, `${prefix}ShoulderPlate`, C.scrap,
    [[-0.13, -0.075], [-0.16, 0.07], [0.03, 0.145], [0.15, 0.06], [0.13, -0.1]],
    [side * 0.305, y, -0.065], 0.095, [0.27, 0, -side * 0.2]);
  rivets(pauldron, `${prefix}ShoulderRivet`, [[-0.085, 0.01, -0.012], [0.075, 0.028, -0.012]], U.bronze, 0.023);
  mesh(pauldron, `${prefix}ShoulderSpike`, new THREE.ConeGeometry(0.045, 0.18, 5), C.bone, [0.015, 0.17, 0.04], [0.2, 0, side * 0.2]);
  return pauldron;
}
