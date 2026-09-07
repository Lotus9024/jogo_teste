import * as THREE from 'three';
import { M, add } from '../../core/scenePrimitives.js';
import { U, unitBase } from './unitModelKit.js';

function addCarriageWheel(parent, x) {
  const wheel = new THREE.Group();
  wheel.name = 'cannonWheel';
  wheel.position.set(x, 0.48, 0.12);
  parent.add(wheel);
  add(new THREE.TorusGeometry(0.355, 0.068, 6, 16), M.wood, wheel, [0, 0, 0], [0, Math.PI / 2, 0]);
  add(new THREE.TorusGeometry(0.419, 0.022, 5, 16), U.plateDark, wheel, [0, 0, 0], [0, Math.PI / 2, 0]);
  const spokes = new THREE.Group();
  spokes.name = 'cannonWheelSpokes';
  for (let index = 0; index < 4; index += 1) {
    add(new THREE.BoxGeometry(0.09, 0.66, 0.055), M.wood, spokes, [0, 0, 0], [index * Math.PI / 4, 0, 0]);
  }
  wheel.add(spokes);
  add(new THREE.CylinderGeometry(0.11, 0.13, 0.2, 10), U.bronze, wheel, [0, 0, 0], [0, 0, Math.PI / 2]);
  add(new THREE.CylinderGeometry(0.05, 0.05, 0.025, 8), U.plate, wheel, [Math.sign(x) * 0.112, 0, 0], [0, 0, Math.PI / 2]);
}

function addHollowBarrel(parent) {
  // The profile returns through the bore, creating a true open muzzle and an
  // interior wall. The game's forward direction stays on negative Z.
  const profile = [
    [0, 0.65], [0.19, 0.65], [0.25, 0.55], [0.275, 0.1],
    [0.235, -0.57], [0.27, -0.64], [0.27, -0.73],
    [0.165, -0.73], [0.15, -0.62], [0.13, -0.16], [0, -0.16]
  ].map(([radius, height]) => new THREE.Vector2(radius, height)).reverse();
  const barrel = add(new THREE.LatheGeometry(profile, 20), U.plateDark, parent, [0, 0.93, -0.18], [Math.PI / 2, 0, 0]);
  barrel.name = 'cannonBarrel';
  const muzzle = add(new THREE.TorusGeometry(0.218, 0.049, 7, 20), U.plate, parent, [0, 0.93, -0.91]);
  muzzle.name = 'cannonMuzzle';
  const bore = add(new THREE.CircleGeometry(0.13, 20), U.black, parent, [0, 0.93, -0.343], [0, Math.PI, 0]);
  bore.name = 'cannonBore';
  for (const z of [-0.62, 0.13, 0.36]) {
    add(new THREE.TorusGeometry(z < 0 ? 0.247 : 0.258, 0.022, 6, 20), U.bronze, parent, [0, 0.93, z]);
  }
  const trunnion = add(new THREE.CylinderGeometry(0.085, 0.085, 0.9, 12), U.plate, parent, [0, 0.88, 0.07], [0, 0, Math.PI / 2]);
  trunnion.name = 'cannonTrunnion';
  add(new THREE.CylinderGeometry(0.1, 0.14, 0.17, 10), U.bronze, parent, [0, 0.93, 0.53], [Math.PI / 2, 0, 0]);
}

function addCarriage(parent) {
  for (const x of [-0.31, 0.31]) {
    const cheek = add(new THREE.BoxGeometry(0.14, 0.31, 1.08), M.wood, parent, [x, 0.63, 0.02]);
    cheek.name = 'cannonCarriageCheek';
    for (const z of [-0.36, 0.36]) {
      add(new THREE.BoxGeometry(0.165, 0.35, 0.075), U.plateDark, parent, [x, 0.64, z]);
      add(new THREE.SphereGeometry(0.025, 6, 4), U.bronze, parent, [x + Math.sign(x) * 0.09, 0.69, z]);
    }
  }
  add(new THREE.CylinderGeometry(0.05, 0.05, 1.12, 8), U.plateDark, parent, [0, 0.48, 0.12], [0, 0, Math.PI / 2]);
  const wedge = add(new THREE.BoxGeometry(0.28, 0.12, 0.35), M.wood, parent, [0, 0.76, 0.36], [-0.2, 0, 0]);
  wedge.name = 'cannonElevationWedge';
}

export function makeCannon() {
  const root = new THREE.Group();
  root.name = 'Canhão';
  root.userData = { selectable: true, name: root.name, role: 'MÁQUINA · CERCO' };
  unitBase(root, 0x6e7e61);
  const rig = new THREE.Group();
  rig.name = 'rig';
  rig.position.y = 0.18;
  root.add(rig);

  const builtParts = new THREE.Group();
  builtParts.name = 'cannonBuiltParts';
  rig.add(builtParts);
  add(new THREE.BoxGeometry(0.82, 0.25, 1.18), M.wood, builtParts, [0, 0.52, 0.02]);
  [-0.51, 0.51].forEach(x => addCarriageWheel(builtParts, x));
  addCarriage(builtParts);
  addHollowBarrel(builtParts);

  const constructionParts = new THREE.Group();
  constructionParts.name = 'cannonConstructionParts';
  rig.add(constructionParts);
  add(new THREE.BoxGeometry(0.9, 0.17, 1.0), M.wood, constructionParts, [0, 0.36, 0]);
  add(new THREE.CylinderGeometry(0.16, 0.16, 0.95, 10), U.plateDark, constructionParts, [0, 0.68, 0], [Math.PI / 2, 0, 0]);
  const signal = new THREE.MeshStandardMaterial({ color: 0xd3983e, emissive: 0x8c5016, emissiveIntensity: 0.75, roughness: 0.5 });
  add(new THREE.TorusGeometry(0.3, 0.04, 8, 24), signal, constructionParts, [0, 1.34, 0], [-Math.PI / 2, 0, 0]);
  setCannonConstructionState(root, false);
  return root;
}

export function setCannonConstructionState(root, underConstruction) {
  const builtParts = root.getObjectByName('cannonBuiltParts');
  const constructionParts = root.getObjectByName('cannonConstructionParts');
  if (builtParts) builtParts.visible = !underConstruction;
  if (constructionParts) constructionParts.visible = underConstruction;
  root.userData.underConstruction = underConstruction;
}
