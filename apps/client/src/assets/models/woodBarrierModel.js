import * as THREE from 'three';
import { M, add } from '../../core/scenePrimitives.js';
import { unitBase } from './unitModelKit.js';

export function makeWoodBarrier() {
  const root = new THREE.Group();
  root.name = 'Barreira de madeira';
  root.userData = { selectable: true, name: root.name, role: 'CONSTRUÇÃO · BARREIRA' };
  unitBase(root, 0x9a6a38);
  const rig = new THREE.Group();
  rig.name = 'rig';
  rig.position.y = 0.18;
  root.add(rig);
  const posts = new THREE.Group();
  posts.name = 'barrierPosts';
  rig.add(posts);
  [-0.61, 0.61].forEach((x) => {
    add(new THREE.BoxGeometry(0.16, 1.35, 0.2), M.wood, posts, [x, 0.78, 0]);
    add(new THREE.ConeGeometry(0.13, 0.28, 4), M.wood, posts, [x, 1.58, 0], [0, Math.PI / 4, 0]);
  });
  const builtParts = new THREE.Group();
  builtParts.name = 'barrierBuiltParts';
  rig.add(builtParts);
  [-0.42, -0.12, 0.18, 0.48].forEach((y, index) => add(
    new THREE.BoxGeometry(1.38, 0.19, 0.18),
    index % 2 ? M.leather : M.wood,
    builtParts,
    [0, 0.85 + y, 0],
    [0, 0, index % 2 ? 0.035 : -0.025]
  ));
  const constructionParts = new THREE.Group();
  constructionParts.name = 'barrierConstructionParts';
  rig.add(constructionParts);
  add(new THREE.BoxGeometry(1.12, 0.13, 0.14), M.wood, constructionParts, [0, 0.43, 0.18], [0, 0, 0.42]);
  add(new THREE.BoxGeometry(1.12, 0.13, 0.14), M.wood, constructionParts, [0, 0.43, -0.18], [0, 0, -0.42]);
  const signalMaterial = new THREE.MeshStandardMaterial({ color: 0xc58a3d, emissive: 0x8b4e16, emissiveIntensity: 0.7, roughness: 0.55, metalness: 0.12 });
  add(new THREE.TorusGeometry(0.32, 0.035, 8, 28), signalMaterial, constructionParts, [0, 1.25, 0.02], [-Math.PI / 2, 0, 0]);
  setWoodBarrierConstructionState(root, false);
  return root;
}

export function setWoodBarrierConstructionState(root, underConstruction) {
  const builtParts = root.getObjectByName('barrierBuiltParts');
  const constructionParts = root.getObjectByName('barrierConstructionParts');
  if (builtParts) builtParts.visible = !underConstruction;
  if (constructionParts) constructionParts.visible = underConstruction;
  root.userData.underConstruction = underConstruction;
}
