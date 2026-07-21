import * as THREE from 'three';
import { M, add } from '../../core/scenePrimitives.js';
import { U, addArm, addArmoredLegs, addHelmetedHead, capsule, humanoidBase } from './unitModelKit.js';

function makeKiteShield() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.39, 0.5); shape.lineTo(0.39, 0.5); shape.lineTo(0.43, -0.13);
  shape.lineTo(0, -0.62); shape.lineTo(-0.43, -0.13); shape.closePath();
  const shield = new THREE.Group();
  shield.name = 'guardShield';
  add(new THREE.ExtrudeGeometry(shape, { depth: 0.09, bevelEnabled: true, bevelSegments: 1, bevelSize: 0.035, bevelThickness: 0.025 }), U.plateDark, shield);
  add(new THREE.ShapeGeometry(shape), U.blueCloth, shield, [0, 0, 0.12], [0, 0, 0], [0.78, 0.78, 0.78]);
  add(new THREE.OctahedronGeometry(0.15, 0), U.bronze, shield, [0, 0, 0.16]);
  return shield;
}

export function makeGuard() {
  const { root, rig } = humanoidBase('Guarda', 'GUARDA', 0x496f86, { hp: 4, damage: 1, move: 1 });
  addArmoredLegs(rig, U.blueCloth, 0.2);
  capsule(0.31, 0.62, U.chain, rig, [0, 1.35, 0], [0, 0, 0], [1.05, 1, 0.96]);
  add(new THREE.CylinderGeometry(0.37, 0.32, 0.5, 10), U.plateDark, rig, [0, 1.51, 0]);
  add(new THREE.BoxGeometry(0.3, 0.82, 0.045), U.blueCloth, rig, [0, 1.31, 0.32]);
  add(new THREE.BoxGeometry(0.36, 0.16, 0.08), U.bronze, rig, [0, 1.16, 0.35]);
  addArm(rig, -1, U.chain, U.plateDark, 1.64, 0.16);
  addArm(rig, 1, U.chain, U.plateDark, 1.64, 0.04);
  add(new THREE.SphereGeometry(0.27, 14, 9), M.skin, rig, [0, 1.98, 0.02]);
  addHelmetedHead(rig, U.blueCloth, false);
  add(new THREE.BoxGeometry(0.16, 0.28, 0.2, 2, 2, 2), U.plate, rig, [0, 1.9, 0.25]);

  const shield = makeKiteShield();
  shield.position.set(-0.67, 1.25, 0.18);
  shield.rotation.y = 0.12;
  rig.add(shield);
  add(new THREE.CylinderGeometry(0.025, 0.035, 2.25, 8), M.wood, rig, [0.62, 1.38, 0.03], [0, 0, -0.06]);
  add(new THREE.ConeGeometry(0.095, 0.38, 6), U.plate, rig, [0.69, 2.65, 0.03], [0, 0, -0.06]);
  add(new THREE.CylinderGeometry(0.06, 0.06, 0.22, 8), U.bronze, rig, [0.55, 0.29, 0.03], [0, 0, -0.06]);
  const cloak = add(new THREE.ConeGeometry(0.48, 1.3, 10, 4, true), U.blueCloth, rig, [0, 1.18, -0.3], [0, 0, 0], [1, 1, 0.38]);
  cloak.material.side = THREE.DoubleSide;
  root.rotation.y = -0.12;
  return root;
}
