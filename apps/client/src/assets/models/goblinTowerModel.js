import * as THREE from 'three';
import { M, add } from '../../core/scenePrimitives.js';
import { unitBase } from './unitModelKit.js';
import { timberStack, workLadder, worksiteSoil } from './constructionModelKit.js';

const timber = new THREE.MeshStandardMaterial({ color: 0x4d301d, roughness: 0.92, flatShading: true });
const timberLight = new THREE.MeshStandardMaterial({ color: 0x75502d, roughness: 0.88, flatShading: true });
const goblinGreen = new THREE.MeshStandardMaterial({ color: 0x607f43, roughness: 0.86, flatShading: true, side: THREE.DoubleSide });
const bone = new THREE.MeshStandardMaterial({ color: 0xb9aa82, roughness: 0.92, flatShading: true });
const UP = new THREE.Vector3(0, 1, 0);

function timberBetween(parent, from, to, width, name) {
  const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to);
  const direction = b.clone().sub(a);
  const beam = add(new THREE.BoxGeometry(width, direction.length(), width), timberLight, parent, a.add(b).multiplyScalar(0.5).toArray());
  beam.quaternion.setFromUnitVectors(UP, direction.normalize());
  beam.name = name;
}

function addLookoutBasket(parent) {
  const basket = new THREE.Group();
  basket.name = 'goblinTowerTimberParapet';
  for (let side = 0; side < 8; side += 1) {
    const wall = new THREE.Group();
    wall.rotation.y = side * Math.PI / 4;
    for (let board = 0; board < 3; board += 1) {
      const height = 0.53 + ((side + board) % 3) * 0.055;
      add(new THREE.BoxGeometry(0.13, height, 0.075), board % 2 ? timberLight : timber, wall, [(board - 1) * 0.14, 1.69, 0.49], [0, 0, (board - 1) * 0.025]);
    }
    add(new THREE.BoxGeometry(0.43, 0.07, 0.09), M.iron, wall, [0, 1.66, 0.54]);
    for (const x of [-0.14, 0.14]) add(new THREE.SphereGeometry(0.019, 6, 4), bone, wall, [x, 1.66, 0.59]);
    basket.add(wall);
  }
  parent.add(basket);
  for (const x of [-0.35, -0.175, 0, 0.175, 0.35]) add(new THREE.BoxGeometry(0.16, 0.055, 0.85), timber, parent, [x, 1.53, 0]);
}

function addWatchtowerBracing(parent) {
  for (const side of [-1, 1]) {
    timberBetween(parent, [-0.38, 0.28, side * 0.39], [0.38, 1.34, side * 0.39], 0.075, 'goblinTowerDiagonalBrace');
    timberBetween(parent, [side * 0.39, 0.3, -0.38], [side * 0.39, 1.34, 0.38], 0.075, 'goblinTowerDiagonalBrace');
    for (const z of [-0.38, 0.38]) add(new THREE.BoxGeometry(0.22, 0.08, 0.2), M.iron, parent, [side * 0.38, 0.94, z]);
  }
  const ladder = new THREE.Group();
  ladder.name = 'goblinTowerLadder';
  ladder.position.set(0, 0.02, -0.55);
  ladder.rotation.x = 0.11;
  for (const x of [-0.16, 0.16]) add(new THREE.BoxGeometry(0.05, 1.42, 0.05), timber, ladder, [x, 0.77, 0]);
  for (let index = 0; index < 7; index += 1) add(new THREE.BoxGeometry(0.34, 0.044, 0.065), timberLight, ladder, [0, 0.18 + index * 0.19, 0]);
  parent.add(ladder);
}

export function makeGoblinTower() {
  const root = new THREE.Group();
  root.name = 'Torre Goblin';
  root.userData = { selectable: true, name: root.name, role: 'CONSTRUÇÃO · GOBLIN' };
  unitBase(root, 0x6f914e);
  const rig = new THREE.Group();
  rig.name = 'rig';
  rig.position.y = 0.18;
  root.add(rig);
  const built = new THREE.Group();
  built.name = 'goblinTowerBuiltParts';
  rig.add(built);
  const construction = new THREE.Group();
  construction.name = 'goblinTowerConstructionParts';
  rig.add(construction);
  worksiteSoil(construction, 'goblinTowerWorksite', 1.36, 1.35);
  [[-0.38, -0.38], [0.38, -0.38], [-0.38, 0.38], [0.38, 0.38]].forEach(([x, z]) => {
    add(new THREE.CylinderGeometry(0.09, 0.13, 1.45, 7), timber, built, [x, 0.78, z], [0, 0, x * 0.08]);
  });
  add(new THREE.BoxGeometry(0.98, 0.14, 0.98), timberLight, built, [0, 1.43, 0]);
  addLookoutBasket(built);
  addWatchtowerBracing(built);
  const flag = new THREE.Shape();
  flag.moveTo(-0.21, 0.31);
  flag.lineTo(-0.21, -0.31);
  flag.lineTo(-0.09, -0.21);
  flag.lineTo(0.02, -0.31);
  flag.lineTo(0.09, -0.19);
  flag.lineTo(0.21, -0.27);
  flag.lineTo(0.21, 0.31);
  flag.closePath();
  const banner = add(new THREE.ShapeGeometry(flag), goblinGreen, built, [0.02, 2.45, 0.02]);
  banner.name = 'goblinTowerBanner';
  for (const x of [-0.075, 0.075]) add(new THREE.ConeGeometry(0.048, 0.19, 4), bone, banner, [x, 0.02, 0.012], [0, 0, Math.PI]);
  add(new THREE.CylinderGeometry(0.025, 0.025, 1.1, 6), M.wood, built, [-0.22, 2.28, 0.02]);
  timberStack(construction, 'goblinTowerLooseTimber', { position: [0.02, 0.025, -0.05], length: 0.65, count: 5, yaw: -0.12 });
  for (const x of [-0.38, 0.38]) timberBetween(construction, [x, 0.018, 0.25], [x, 0.92, 0.25], 0.11, 'goblinTowerScaffoldPost');
  for (const x of [-0.38, 0.38]) timberBetween(construction, [x, 0.025, -0.36], [x, x < 0 ? 0.78 : 0.63, -0.36], 0.1, 'goblinTowerUnfinishedFrontPost');
  timberBetween(construction, [-0.38, 0.76, -0.36], [-0.38, 0.88, 0.25], 0.065, 'goblinTowerPartialCrossbeam');
  timberBetween(construction, [-0.38, 0.37, 0.25], [0.38, 0.88, 0.25], 0.065, 'goblinTowerScaffoldBrace');
  add(new THREE.BoxGeometry(0.84, 0.065, 0.28), timberLight, construction, [0, 0.88, 0.25]);
  workLadder(construction, 'goblinTowerWorkLadder', { position: [-0.05, 0.025, -0.49], height: 0.72, width: 0.21, lean: 0.14 });
  setGoblinTowerConstructionState(root, false);
  return root;
}

export function setGoblinTowerConstructionState(root, underConstruction) {
  root.getObjectByName('goblinTowerBuiltParts').visible = !underConstruction;
  root.getObjectByName('goblinTowerConstructionParts').visible = underConstruction;
  root.userData.underConstruction = underConstruction;
}
