import * as THREE from 'three';
import { M, add } from '../../core/scenePrimitives.js';
import { U, capsule, humanoidBase } from './unitModelKit.js';

const Y_AXIS = new THREE.Vector3(0, 1, 0);

function createBowGeometry() {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.1, -0.72, 0), new THREE.Vector3(0.27, -0.5, 0),
    new THREE.Vector3(0.31, -0.2, 0), new THREE.Vector3(0.14, 0, 0),
    new THREE.Vector3(0.31, 0.2, 0), new THREE.Vector3(0.27, 0.5, 0),
    new THREE.Vector3(0.1, 0.72, 0)
  ]);
  return new THREE.TubeGeometry(curve, 36, 0.027, 8, false);
}

function addBowString(parent) {
  const geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0.1, -0.72, 0),
    new THREE.Vector3(0, 0, -0.28),
    new THREE.Vector3(0.1, 0.72, 0)
  ]);
  const string = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0xd8d0b8 }));
  string.name = 'archerBowString';
  parent.add(string);
}

function addLimbBetween(parent, start, end, radius, material, name) {
  const direction = end.clone().sub(start);
  const mesh = new THREE.Mesh(
    new THREE.CapsuleGeometry(radius, Math.max(0.04, direction.length() - radius * 2), 8, 12),
    material
  );
  mesh.name = name;
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(Y_AXIS, direction.normalize());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addHand(parent, position, name) {
  const hand = add(new THREE.DodecahedronGeometry(0.105, 0), M.skin, parent, position.toArray(), [0, 0, 0], [0.82, 1, 0.74]);
  hand.name = name;
  return hand;
}

function createNockedArrow(parent) {
  const arrow = new THREE.Group();
  arrow.name = 'archerArrow';
  const shaft = add(new THREE.CylinderGeometry(0.012, 0.012, 1.22, 6), M.wood, arrow, [0, 0, 0.34], [Math.PI / 2, 0, 0]);
  shaft.name = 'archerArrowShaft';
  add(new THREE.ConeGeometry(0.045, 0.14, 6), U.plate, arrow, [0, 0, 1], [Math.PI / 2, 0, 0]);
  add(new THREE.PlaneGeometry(0.13, 0.08), U.feather, arrow, [0, 0, -0.24], [Math.PI / 2, 0, 0]);
  parent.add(arrow);
  return arrow;
}

function createQuiver(rig) {
  const quiver = new THREE.Group();
  quiver.name = 'archerQuiver';
  quiver.position.set(-0.3, 1.3, -0.28);
  quiver.rotation.set(-0.18, 0, -0.25);
  add(new THREE.CylinderGeometry(0.13, 0.17, 0.82, 10), M.leather, quiver);
  for (let index = 0; index < 4; index += 1) {
    const x = -0.08 + index * 0.052;
    add(new THREE.CylinderGeometry(0.011, 0.011, 0.66, 6), M.wood, quiver, [x, 0.57, 0]);
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
  const { root, rig } = humanoidBase('Arqueiro', 'ARQUEIRO', 0x66866b, { hp: 2, damage: 2, move: 2 });
  [-1, 1].forEach(side => {
    capsule(0.105, 0.5, M.darkLeather, rig, [side * 0.16, 0.49, 0], [0, 0, side * 0.06]);
    add(new THREE.BoxGeometry(0.23, 0.14, 0.38), M.darkLeather, rig, [side * 0.16, 0.27, 0.12]);
  });
  add(new THREE.CylinderGeometry(0.38, 0.29, 0.7, 9), U.greenCloth, rig, [0, 0.94, 0]);
  capsule(0.24, 0.52, U.tanCloth, rig, [0, 1.38, 0]);
  add(new THREE.BoxGeometry(0.38, 0.62, 0.055), M.leather, rig, [0, 1.37, 0.26], [0, 0, -0.04]);
  add(new THREE.TorusGeometry(0.27, 0.04, 8, 24), M.leather, rig, [0, 1.1, 0], [Math.PI / 2, 0, 0]);
  add(new THREE.SphereGeometry(0.25, 14, 9), M.skin, rig, [0, 1.99, 0.04]);
  add(new THREE.SphereGeometry(0.31, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.65), U.greenCloth, rig, [0, 2.08, -0.02]);
  add(new THREE.ConeGeometry(0.25, 0.64, 10), U.greenCloth, rig, [0, 2.25, -0.15], [-0.45, 0, 0]);
  add(new THREE.BoxGeometry(0.34, 0.07, 0.13), M.leather, rig, [0, 1.65, -0.18]);

  const bow = new THREE.Group();
  bow.name = 'archerBow';
  bow.position.set(0.6, 1.52, 0.3);
  add(createBowGeometry(), M.wood, bow);
  addBowString(bow);
  createNockedArrow(bow);
  rig.add(bow);

  const bowShoulder = new THREE.Vector3(0.29, 1.64, 0.02);
  const bowElbow = new THREE.Vector3(0.48, 1.58, 0.16);
  const bowHandPosition = new THREE.Vector3(0.74, 1.52, 0.3);
  const drawShoulder = new THREE.Vector3(-0.29, 1.64, 0.01);
  const drawElbow = new THREE.Vector3(0.02, 1.69, -0.04);
  const drawHandPosition = new THREE.Vector3(0.6, 1.52, 0.02);
  add(new THREE.DodecahedronGeometry(0.17, 0), U.greenCloth, rig, bowShoulder.toArray(), [0, 0, 0], [1, 0.82, 0.9]);
  add(new THREE.DodecahedronGeometry(0.17, 0), U.greenCloth, rig, drawShoulder.toArray(), [0, 0, 0], [1, 0.82, 0.9]);
  addLimbBetween(rig, bowShoulder, bowElbow, 0.085, M.leather, 'archerBowUpperArm');
  addLimbBetween(rig, bowElbow, bowHandPosition, 0.078, M.skin, 'archerBowForearm');
  addLimbBetween(rig, drawShoulder, drawElbow, 0.085, M.leather, 'archerDrawUpperArm');
  addLimbBetween(rig, drawElbow, drawHandPosition, 0.078, M.skin, 'archerDrawForearm');
  addHand(rig, bowHandPosition, 'archerBowHand');
  addHand(rig, drawHandPosition, 'archerDrawHand');
  add(new THREE.BoxGeometry(0.16, 0.22, 0.16), M.leather, rig, [0.5, 1.55, 0.17]);

  createQuiver(rig);
  root.rotation.y = 0.2;
  setArcherMountedState(root, false);
  return root;
}
