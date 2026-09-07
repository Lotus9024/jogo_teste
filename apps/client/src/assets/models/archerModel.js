import * as THREE from 'three';
import { M, add } from '../../core/scenePrimitives.js';
import { U, human, mesh, oval, tailoredTorso, profile, arm, legs, face, belt, foldedCape } from './humanMiniatureKit.js';

function createBowGeometry() {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.1, -0.72, 0), new THREE.Vector3(0.27, -0.5, 0),
    new THREE.Vector3(0.31, -0.2, 0), new THREE.Vector3(0.14, 0, 0),
    new THREE.Vector3(0.31, 0.2, 0), new THREE.Vector3(0.27, 0.5, 0),
    new THREE.Vector3(0.1, 0.72, 0)
  ]);
  return new THREE.TubeGeometry(curve, 24, 0.032, 6, false);
}

function addBowString(parent) {
  const geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0.1, -0.72, 0), new THREE.Vector3(0, 0, -0.28), new THREE.Vector3(0.1, 0.72, 0)
  ]);
  const string = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0xd8d0b8 }));
  string.name = 'archerBowString';
  parent.add(string);
}

function createNockedArrow(parent) {
  const arrow = new THREE.Group();
  arrow.name = 'archerArrow';
  mesh(arrow, 'archerArrowShaft', new THREE.CylinderGeometry(0.012, 0.012, 1.08, 6), M.wood, [0, 0, 0.28], [Math.PI / 2, 0, 0]);
  add(new THREE.ConeGeometry(0.045, 0.14, 6), U.plate, arrow, [0, 0, 0.88], [Math.PI / 2, 0, 0]);
  add(new THREE.PlaneGeometry(0.13, 0.08), U.feather, arrow, [0, 0, -0.24], [Math.PI / 2, 0, 0]);
  parent.add(arrow);
}

function createQuiver(rig) {
  const quiver = new THREE.Group();
  quiver.name = 'archerQuiver';
  quiver.position.set(-0.3, 1.3, -0.28);
  quiver.rotation.set(-0.18, 0, -0.25);
  add(new THREE.CylinderGeometry(0.13, 0.17, 0.82, 8), M.leather, quiver);
  mesh(quiver, 'archerQuiverRim', new THREE.TorusGeometry(0.135, 0.025, 5, 10), U.bronze, [0, 0.38, 0], [Math.PI / 2, 0, 0]);
  for (let index = 0; index < 4; index += 1) {
    const x = -0.08 + index * 0.052;
    add(new THREE.CylinderGeometry(0.011, 0.011, 0.66, 5), M.wood, quiver, [x, 0.57, 0]);
    add(new THREE.PlaneGeometry(0.09, 0.14), U.feather, quiver, [x, 0.88, 0], [0, index * 0.35, 0]);
  }
  rig.add(quiver);
}

export function setArcherMountedState(root, mounted) {
  root.userData.mountedVisual = mounted;
  ['unitPedestal', 'teamPlatform', 'selectionRing'].forEach(name => {
    const part = root.getObjectByName(name);
    if (part) part.visible = !mounted;
  });
}

export function makeArcher() {
  const { root, rig } = human('Arqueiro', 'ARQUEIRO', 0x66866b, { hp: 2, damage: 2, move: 2 });
  legs(rig, 'archer', { material: U.greenCloth, stance: 0.19 });
  tailoredTorso(rig, 'archerHuntingCoat', U.greenCloth, { y: 1.15, height: 0.82, width: 0.88, depth: 0.91 });
  foldedCape(rig, 'archerRangerCloak', U.greenCloth, { top: 1.62, bottom: 0.63, width: 0.47, back: -0.23 });
  profile(rig, 'archerLeatherJerkin', [[-0.22, 0.25], [0.22, 0.25], [0.25, -0.22], [-0.25, -0.22]],
    0.035, M.leather, [0, 1.30, 0.18]);
  for (const side of [-1, 1]) {
    profile(rig, 'archerCoatTail', [[-0.12, 0.16], [0.12, 0.16], [0.15, -0.23], [0, -0.30], [-0.13, -0.23]],
      0.025, U.greenCloth, [side * 0.14, 0.80, 0.20], [0.07, 0, side * 0.1], 0.005);
  }
  belt(rig, 'archer', 1.01, 0.28);
  face(rig, 'archer', 1.90);
  mesh(rig, 'archerHoodCrown', new THREE.SphereGeometry(0.27, 12, 7, 0, Math.PI * 2, 0, Math.PI * 0.56), U.greenCloth,
    [0, 2.025, -0.035], [0.11, 0, 0], [1, 1.08, 1.06]);
  for (const side of [-1, 1]) {
    profile(rig, 'archerHoodDrape', [[-0.055, 0.18], [0.075, 0.14], [0.11, -0.20], [-0.10, -0.24]],
      0.045, U.greenCloth, [side * 0.20, 1.92, 0.09], [0.08, side * -0.50, side * -0.11]);
  }
  mesh(rig, 'archerHoodCowl', new THREE.TorusGeometry(0.225, 0.064, 6, 12), U.greenCloth, [0, 1.68, 0], [Math.PI / 2, 0, 0], [1.20, 1, 1]);
  profile(rig, 'archerCloakClasp', [[0, 0.075], [0.05, 0], [0, -0.075], [-0.05, 0]], 0.025, U.bronze, [-0.10, 1.64, 0.255]);

  const bow = new THREE.Group();
  bow.name = 'archerBow';
  bow.position.set(0.24, 1.50, 0.31);
  const limb = add(createBowGeometry(), M.wood, bow);
  limb.name = 'archerRecurveBow';
  addBowString(bow);
  createNockedArrow(bow);
  mesh(bow, 'archerBowGrip', new THREE.CylinderGeometry(0.045, 0.045, 0.20, 8), M.leather, [0.14, 0, 0]);
  for (const side of [-1, 1]) oval(bow, 'archerBowHornTip', [0.11, side * 0.66, 0], [0.036, 0.075, 0.034], U.bronze);
  rig.add(bow);
  const bowHand = arm(rig, 'archerBow', [0.28, 1.55, 0], [0.39, 1.48, 0.11], [0.38, 1.50, 0.31], U.greenCloth, M.leather);
  bowHand.name = 'archerBowHand';
  const drawHand = arm(rig, 'archerDraw', [-0.28, 1.55, 0], [-0.32, 1.45, -0.15], [0.24, 1.50, 0.03], U.greenCloth, M.leather);
  drawHand.name = 'archerDrawHand';
  profile(rig, 'archerBracer', [[-0.07, -0.13], [0.07, -0.13], [0.09, 0.11], [-0.09, 0.11]],
    0.025, U.plateDark, [0.39, 1.50, 0.19], [Math.PI / 2, 0, 0]);
  createQuiver(rig);
  setArcherMountedState(root, false);
  return root;
}
