import * as THREE from 'three';
import { M, add } from '../../core/scenePrimitives.js';
import { humanoidBase } from './unitModelKit.js';

const goblinSkin = new THREE.MeshStandardMaterial({ color: 0x648548, roughness: 0.86, flatShading: true });
const goblinSkinDark = new THREE.MeshStandardMaterial({ color: 0x3f5e34, roughness: 0.9, flatShading: true });

export function makeGoblin() {
  const { root, rig } = humanoidBase('Goblin', 'GOBLIN · SAQUEADOR', 0x6f914e, { hp: 1, damage: 1, move: 1 });
  rig.scale.setScalar(0.82);
  rig.position.y = 0.2;
  add(new THREE.CylinderGeometry(0.28, 0.34, 0.62, 7), M.leather, rig, [0, 0.88, 0]);
  [-1, 1].forEach(side => {
    add(new THREE.CapsuleGeometry(0.085, 0.32, 5, 8), goblinSkin, rig, [side * 0.31, 1.02, 0.03], [0, 0, side * 0.3]);
    add(new THREE.CapsuleGeometry(0.1, 0.34, 5, 8), goblinSkinDark, rig, [side * 0.16, 0.42, 0], [0, 0, side * 0.08]);
  });
  add(new THREE.SphereGeometry(0.31, 10, 7), goblinSkin, rig, [0, 1.55, 0.02], [0.08, 0, 0], [1, 0.88, 0.9]);
  [-1, 1].forEach(side => add(new THREE.ConeGeometry(0.12, 0.42, 5), goblinSkin, rig, [side * 0.31, 1.59, 0], [0, 0, side * -Math.PI / 2]));
  [-1, 1].forEach(side => add(new THREE.SphereGeometry(0.045, 8, 6), M.gold, rig, [side * 0.11, 1.61, 0.27]));
  const dagger = new THREE.Group();
  dagger.name = 'goblinDagger';
  dagger.position.set(0.42, 0.82, 0.05);
  dagger.rotation.z = -0.45;
  rig.add(dagger);
  add(new THREE.BoxGeometry(0.07, 0.62, 0.035), M.iron, dagger, [0, -0.17, 0]);
  add(new THREE.BoxGeometry(0.28, 0.06, 0.08), M.gold, dagger, [0, 0.13, 0]);
  const sack = add(new THREE.SphereGeometry(0.28, 8, 6), M.wood, rig, [-0.28, 0.85, -0.25], [0, 0, 0], [0.9, 1.15, 0.75]);
  sack.name = 'goblinLootSack';
  return root;
}
