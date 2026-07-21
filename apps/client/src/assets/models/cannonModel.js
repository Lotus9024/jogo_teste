import * as THREE from 'three';
import { M, add } from '../../core/scenePrimitives.js';
import { U, unitBase } from './unitModelKit.js';

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
  [-0.51, 0.51].forEach(x => {
    const wheel = add(new THREE.CylinderGeometry(0.43, 0.43, 0.16, 16), M.wood, builtParts, [x, 0.48, 0.12], [0, 0, Math.PI / 2]);
    wheel.name = 'cannonWheel';
    add(new THREE.CylinderGeometry(0.11, 0.11, 0.22, 12), U.bronze, builtParts, [x, 0.48, 0.12], [0, 0, Math.PI / 2]);
  });
  const barrel = add(new THREE.CylinderGeometry(0.2, 0.29, 1.42, 14), U.plateDark, builtParts, [0, 0.93, -0.18], [Math.PI / 2, 0, 0]);
  barrel.name = 'cannonBarrel';
  add(new THREE.TorusGeometry(0.22, 0.06, 8, 18), U.plate, builtParts, [0, 0.93, -0.91], [Math.PI / 2, 0, 0]);
  add(new THREE.CylinderGeometry(0.13, 0.16, 0.22, 12), U.bronze, builtParts, [0, 0.93, 0.61], [Math.PI / 2, 0, 0]);

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
