import * as THREE from 'three';
import { M, U, human, mesh, oval, tailoredTorso, profile, arm, legs, face, belt, link } from './humanMiniatureKit.js';

export function makeCitizen() {
  const { root, rig } = human('Cidadão', 'HUMANO · CIDADÃO', 0xb99a67, { hp: 1, damage: 1, move: 1 });
  legs(rig, 'citizen', { material: U.tanCloth, stance: 0.17 });
  tailoredTorso(rig, 'citizenWorkShirt', U.tanCloth, { y: 1.08, height: 0.77, width: 0.90 });
  for (const side of [-1, 1]) {
    profile(rig, 'citizenWaistcoatPanel', [[-0.10, 0.28], [0.08, 0.28], [0.12, -0.29], [-0.10, -0.30]],
      0.035, M.leather, [side * 0.14, 1.14, 0.245], [0, side * 0.20, side * 0.10], 0.007);
  }
  belt(rig, 'citizen', 0.95, 0.285);
  arm(rig, 'citizenCarry', [-0.31, 1.36, 0], [-0.44, 1.16, -0.01], [-0.43, 0.91, 0.09], U.tanCloth, M.skin);
  arm(rig, 'citizenFork', [0.31, 1.36, 0], [0.46, 1.16, 0.07], [0.47, 1.04, 0.21], U.tanCloth, M.skin);
  face(rig, 'citizen', 1.72);
  mesh(rig, 'citizenSoftCap', new THREE.SphereGeometry(0.25, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), M.leather, [0.035, 1.92, -0.02], [0, 0, -0.18], [1.12, 0.58, 1]);
  mesh(rig, 'citizenCapBand', new THREE.CylinderGeometry(0.238, 0.235, 0.055, 12), M.darkLeather, [0, 1.91, -0.01]);
  oval(rig, 'citizenProvisionSack', [-0.45, 0.70, 0.02], [0.23, 0.27, 0.20], U.tanCloth);
  mesh(rig, 'citizenSackTie', new THREE.TorusGeometry(0.07, 0.025, 5, 10), M.leather, [-0.44, 0.92, 0.025], [Math.PI / 2, 0, 0]);
  link(rig, 'citizenSackStrap', [-0.27, 1.43, -0.04], [-0.44, 0.92, 0.025], 0.022, M.leather, 1);

  const pitchfork = new THREE.Group();
  pitchfork.name = 'citizenPitchfork';
  pitchfork.position.set(0.47, 0.52, 0.21);
  pitchfork.rotation.z = -0.055;
  mesh(pitchfork, 'citizenPitchforkHandle', new THREE.CylinderGeometry(0.031, 0.041, 1.42, 8), M.wood, [0, 0.55, 0]);
  profile(pitchfork, 'citizenPitchforkShoulder', [[-0.16, 0.05], [-0.10, -0.075], [0.10, -0.075], [0.16, 0.05]],
    0.04, U.plateDark, [0, 1.22, 0], [0, 0, 0], 0.005);
  [-1, 0, 1].forEach(index => profile(pitchfork, 'citizenPitchforkTine', [[-0.023, 0], [0.023, 0], [0.018, 0.24], [0, 0.32], [-0.018, 0.24]],
    0.025, U.plateDark, [index * 0.14, 1.24, 0], [0, 0, index * -0.05], 0.003));
  rig.add(pitchfork);
  return root;
}
