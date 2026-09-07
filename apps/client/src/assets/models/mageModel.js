import * as THREE from 'three';
import { M, add } from '../../core/scenePrimitives.js';
import { U, capsule, humanoidBase } from './unitModelKit.js';
import { drapedClothGeometry, foldedRobeGeometry, profileGeometry } from './miniatureGeometry.js';

const vestments = U.blueCloth.clone();
vestments.color.setHex(0x594066);
vestments.flatShading = false;
const lining = new THREE.MeshStandardMaterial({ color: 0x231e32, roughness: 0.95, side: THREE.DoubleSide });
const parchment = new THREE.MeshStandardMaterial({ color: 0xc5ad7e, roughness: 0.92 });
const face = new THREE.MeshStandardMaterial({ color: 0xbaa182, roughness: 0.83 });
const ember = new THREE.MeshStandardMaterial({ color: 0xffbc69, emissive: 0xff681e, emissiveIntensity: 1.35, roughness: 0.28 });

function named(geometry, material, parent, position, name, rotation = [0, 0, 0]) {
  const part = add(geometry, material, parent, position, rotation);
  part.name = name;
  return part;
}

function makeHood(rig) {
  const hood = new THREE.Shape();
  hood.moveTo(-0.34, -0.2);
  hood.quadraticCurveTo(-0.43, 0.24, 0, 0.65);
  hood.quadraticCurveTo(0.42, 0.25, 0.34, -0.2);
  hood.lineTo(-0.34, -0.2);
  const opening = new THREE.Path();
  opening.moveTo(-0.18, -0.12);
  opening.lineTo(0.18, -0.12);
  opening.quadraticCurveTo(0.23, 0.14, 0, 0.36);
  opening.quadraticCurveTo(-0.23, 0.14, -0.18, -0.12);
  hood.holes.push(opening);
  const geometry = new THREE.ExtrudeGeometry(hood, { depth: 0.24, bevelEnabled: true, bevelSize: 0.028, bevelThickness: 0.025, bevelSegments: 1, steps: 1, curveSegments: 8 });
  named(geometry, vestments, rig, [0, 1.85, -0.08], 'mageSculptedHood');
  named(new THREE.SphereGeometry(0.19, 12, 8), U.black, rig, [0, 1.98, 0.035], 'mageHoodShadow').scale.set(1, 1.3, 0.75);
  named(new THREE.SphereGeometry(0.145, 12, 8), face, rig, [0, 1.97, 0.115], 'mageFace').scale.set(0.88, 1.26, 0.55);
  named(profileGeometry([[-0.12, 0.05], [0.12, 0.05], [0.07, -0.22], [0, -0.31], [-0.08, -0.18]], 0.04), parchment, rig, [0, 1.88, 0.21], 'mageCarvedBeard');
  for (const side of [-1, 1]) named(new THREE.BoxGeometry(0.045, 0.019, 0.016), ember, rig, [side * 0.063, 2.02, 0.2], 'mageEmberEye');
  named(new THREE.ConeGeometry(0.032, 0.095, 5), face, rig, [0, 1.975, 0.215], 'mageNose', [Math.PI / 2, 0, 0]);
  for (const side of [-1, 1]) named(new THREE.BoxGeometry(0.065, 0.024, 0.025), lining, rig, [side * 0.065, 2.05, 0.185], 'mageBrow', [0, 0, side * -0.16]);
}

function makeStaff(rig) {
  const staff = new THREE.Group();
  staff.name = 'mageStaff';
  staff.position.set(0.48, 0.85, 0.08);
  staff.rotation.z = -0.08;
  const spine = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -0.61, 0), new THREE.Vector3(-0.025, 0, 0.02),
    new THREE.Vector3(0.02, 0.7, 0), new THREE.Vector3(-0.035, 1.35, 0),
  ]);
  named(new THREE.TubeGeometry(spine, 16, 0.045, 7, false), M.wood, staff, [0, 0, 0], 'mageCarvedStaff');
  for (const y of [-0.5, 0.13, 0.3, 0.88, 1.12]) named(new THREE.CylinderGeometry(0.058, 0.06, 0.055, 8), U.bronze, staff, [0, y, 0], 'mageStaffBinding');
  for (const side of [-1, 1]) {
    const branch = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 1.1, 0), new THREE.Vector3(side * 0.18, 1.35, 0),
      new THREE.Vector3(side * 0.2, 1.57, 0), new THREE.Vector3(side * 0.11, 1.72, 0),
    ]);
    named(new THREE.TubeGeometry(branch, 12, 0.032, 6, false), U.bronze, staff, [0, 0, 0], 'mageOrbCage');
  }
  const orb = named(new THREE.IcosahedronGeometry(0.145, 1), ember, staff, [0, 1.48, 0], 'mageFireOrb');
  orb.userData.magic = true;
  named(new THREE.TorusGeometry(0.19, 0.019, 5, 18), U.bronze, staff, [0, 1.48, 0], 'mageOrbEquator', [Math.PI / 2, 0.25, 0]);
  staff.userData.magicAnchor = true;
  rig.add(staff);
}

export function makeMage() {
  const { root, rig } = humanoidBase('Mago', 'MAGO', 0x8056c9, { hp: 2, damage: 2, move: 1 });
  named(foldedRobeGeometry(), vestments, rig, [0, 0, 0], 'magePleatedRobe');
  named(drapedClothGeometry({ topWidth: 0.52, bottomWidth: 0.8, height: 1.34, folds: 6, sweep: -0.14 }), lining, rig, [0, 1.58, -0.24], 'mageLayeredCloak');
  for (const side of [-1, 1]) {
    const stole = named(profileGeometry([[-0.065, 0.48], [0.065, 0.46], [0.09, -0.6], [0, -0.69], [-0.085, -0.58]], 0.025, 0.004), U.bronze, rig, [side * 0.2, 0.91, 0.3], 'mageEmbroideredStole', [0, 0, side * 0.1]);
    for (let index = 0; index < 3; index += 1) named(new THREE.BoxGeometry(0.038, 0.038, 0.011), lining, stole, [0, index * 0.23 - 0.24, 0.025], 'mageStoleSigil', [0, 0, Math.PI / 4]);
    named(new THREE.SphereGeometry(0.22, 10, 6), vestments, rig, [side * 0.31, 1.47, 0], 'mageMantleShoulder').scale.set(1.05, 0.56, 1);
  }
  capsule(0.13, 0.35, vestments, rig, [-0.37, 1.19, 0.06], [0.25, 0, -0.32]);
  capsule(0.13, 0.35, vestments, rig, [0.39, 1.18, 0.05], [0.12, 0, 0.2]);
  named(new THREE.SphereGeometry(0.09, 10, 6), face, rig, [0.48, 0.96, 0.11], 'mageStaffHand');
  named(new THREE.SphereGeometry(0.09, 10, 6), face, rig, [-0.36, 1.03, 0.22], 'mageBookHand');
  const book = new THREE.Group();
  book.name = 'mageGrimoire';
  book.position.set(-0.4, 1.1, 0.28);
  book.rotation.set(-0.35, 0.1, -0.15);
  named(new THREE.BoxGeometry(0.26, 0.35, 0.09), parchment, book, [0, 0, 0], 'mageBookPages');
  for (const z of [-0.055, 0.055]) named(new THREE.BoxGeometry(0.29, 0.39, 0.025), M.leather, book, [0, 0, z], 'mageBookCover');
  named(new THREE.BoxGeometry(0.045, 0.42, 0.026), U.bronze, book, [0, 0, 0.075], 'mageBookClasp');
  rig.add(book);
  makeHood(rig);
  makeStaff(rig);
  root.userData.modelRevision = 'sculpted-dark-fantasy';
  return root;
}
