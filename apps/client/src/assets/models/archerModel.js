import * as THREE from 'three';
import { M, add } from '../../core/scenePrimitives.js';
import { U, capsule, humanoidBase } from './unitModelKit.js';

function createBowGeometry() {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -0.7, 0), new THREE.Vector3(0.2, -0.48, 0),
    new THREE.Vector3(0.28, 0, 0), new THREE.Vector3(0.2, 0.48, 0), new THREE.Vector3(0, 0.7, 0)
  ]);
  return new THREE.TubeGeometry(curve, 28, 0.026, 8, false);
}

function addBowString(parent) {
  const geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, -0.7, 0), new THREE.Vector3(-0.18, 0, 0.02), new THREE.Vector3(0, 0.7, 0)
  ]);
  parent.add(new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0xd8d0b8 })));
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

  capsule(0.085, 0.5, M.leather, rig, [0.42, 1.43, 0.13], [0, 0, -0.58]);
  capsule(0.085, 0.46, M.skin, rig, [0.62, 1.7, 0.2], [0, 0, -0.2]);
  capsule(0.085, 0.46, M.leather, rig, [-0.33, 1.57, 0.13], [0, 0, 0.68]);
  capsule(0.08, 0.38, M.skin, rig, [-0.1, 1.82, 0.25], [0, 0, -0.55]);
  add(new THREE.BoxGeometry(0.16, 0.3, 0.16, 2, 2, 2), M.leather, rig, [0.52, 1.46, 0.15]);

  const bow = new THREE.Group();
  bow.name = 'archerBow';
  bow.position.set(0.69, 1.54, 0.24);
  bow.rotation.y = 0.12;
  add(createBowGeometry(), M.wood, bow);
  addBowString(bow);
  rig.add(bow);
  add(new THREE.CylinderGeometry(0.012, 0.012, 1.08, 6), M.wood, rig, [0.43, 1.56, 0.29], [0, 0, Math.PI / 2]);
  add(new THREE.ConeGeometry(0.045, 0.13, 6), U.plate, rig, [0.96, 1.56, 0.29], [0, 0, -Math.PI / 2]);

  add(new THREE.CylinderGeometry(0.13, 0.17, 0.82, 10), M.leather, rig, [-0.29, 1.31, -0.28], [-0.18, 0, -0.26]);
  for (let index = 0; index < 5; index += 1) {
    const x = -0.39 + index * 0.052;
    add(new THREE.CylinderGeometry(0.012, 0.012, 0.62, 6), M.wood, rig, [x, 1.76, -0.31], [-0.18, 0, -0.26]);
    add(new THREE.PlaneGeometry(0.1, 0.15), U.feather, rig, [x - 0.09, 2.02, -0.38], [0, 0.3, -0.18]);
  }
  root.rotation.y = 0.2;
  return root;
}
