import * as THREE from 'three';
import { M, add } from '../../core/scenePrimitives.js';
import { unitBase } from './unitModelKit.js';

const goblinGlow = new THREE.MeshStandardMaterial({ color: 0x6ea646, emissive: 0x3c7a24, emissiveIntensity: 1.2, roughness: 0.35 });
const mageGlow = new THREE.MeshStandardMaterial({ color: 0x8062cf, emissive: 0x4e2caa, emissiveIntensity: 1.35, roughness: 0.25 });
const paleStone = new THREE.MeshStandardMaterial({ color: 0x596159, roughness: 0.88, flatShading: true });
const bone = new THREE.MeshStandardMaterial({ color: 0xb0a080, roughness: 0.94, flatShading: true });
const oldTimber = new THREE.MeshStandardMaterial({ color: 0x5d4332, roughness: 0.94, flatShading: true });
const canopyCloth = new THREE.MeshStandardMaterial({ color: 0x71604b, roughness: 0.96, flatShading: true, side: THREE.DoubleSide });

function supportRoot(name, color) {
  const root = new THREE.Group();
  root.name = name;
  unitBase(root, color);
  const rig = new THREE.Group();
  rig.name = 'rig';
  rig.position.y = 0.18;
  root.add(rig);
  const built = new THREE.Group();
  built.name = 'supportBuiltParts';
  rig.add(built);
  const construction = new THREE.Group();
  construction.name = 'supportConstructionParts';
  rig.add(construction);
  [[-0.34, -0.2, 0.25], [0.32, 0.04, -0.5], [-0.08, 0.28, 0.1]].forEach(([x, z, rotation]) => {
    add(new THREE.CylinderGeometry(0.045, 0.06, 0.78, 6), M.wood, construction, [x, 0.22, z], [Math.PI / 2, 0, rotation]);
  });
  return { root, built, construction };
}

function addAltarFoundation(built) {
  add(new THREE.CylinderGeometry(0.54, 0.68, 0.24, 8), M.stoneDark, built, [0, 0.12, 0]);
  for (let index = 0; index < 8; index += 1) {
    const angle = index * Math.PI / 4 + Math.PI / 8;
    const stone = add(new THREE.BoxGeometry(0.28, 0.12, 0.065), paleStone, built, [Math.sin(angle) * 0.57, 0.135, Math.cos(angle) * 0.57], [0, angle, 0]);
    stone.name = 'altarFoundationStone';
  }
}

export function makeGoblinAltar() {
  const { root, built, construction } = supportRoot('Altar Goblin', 0x6f914e);
  addAltarFoundation(built);
  const cairn = new THREE.Group();
  cairn.name = 'goblinAltarCairn';
  for (let index = 0; index < 6; index += 1) {
    const angle = index * Math.PI / 3;
    add(new THREE.DodecahedronGeometry(0.21, 0), index % 2 ? paleStone : M.stoneDark, cairn, [Math.sin(angle) * 0.24, 0.32, Math.cos(angle) * 0.24], [index * 0.17, angle, 0], [1.2, 0.75, 1]);
  }
  built.add(cairn);
  add(new THREE.CylinderGeometry(0.35, 0.3, 0.11, 8), M.iron, built, [0, 0.46, 0]);
  add(new THREE.CylinderGeometry(0.28, 0.28, 0.025, 16), goblinGlow, built, [0, 0.525, 0]);
  const core = add(new THREE.OctahedronGeometry(0.2, 0), goblinGlow, built, [0, 0.76, 0], [0.13, 0.24, 0.1], [0.8, 1.25, 0.85]);
  core.name = 'altarCore';
  const tusks = new THREE.Group();
  tusks.name = 'goblinAltarBoneCircle';
  for (let index = 0; index < 5; index += 1) {
    const angle = index * Math.PI * 2 / 5;
    const stake = new THREE.Group();
    stake.position.set(Math.sin(angle) * 0.45, 0.3, Math.cos(angle) * 0.45);
    stake.rotation.y = angle;
    add(new THREE.CylinderGeometry(0.055, 0.085, 0.36, 7), M.wood, stake, [0, 0.14, 0]);
    add(new THREE.CylinderGeometry(0.073, 0.073, 0.065, 7), M.iron, stake, [0, 0.22, 0]);
    add(new THREE.ConeGeometry(0.07, 0.34, 7), bone, stake, [0, 0.43, -0.04], [-0.3, 0, 0]);
    tusks.add(stake);
  }
  built.add(tusks);
  const idol = new THREE.Group();
  idol.name = 'goblinAltarScrapIdol';
  idol.position.set(0, 0.38, -0.46);
  add(new THREE.DodecahedronGeometry(0.13, 0), bone, idol, [0, 0.06, 0], [0, 0.2, 0], [1.2, 0.9, 0.58]);
  for (const x of [-0.055, 0.055]) {
    add(new THREE.BoxGeometry(0.045, 0.027, 0.02), M.void, idol, [x, 0.077, -0.074], [0, 0, Math.sign(x) * 0.2]);
    add(new THREE.ConeGeometry(0.026, 0.1, 5), bone, idol, [x, -0.048, -0.027], [0, 0, Math.PI]);
  }
  for (const x of [-0.25, 0.25]) add(new THREE.BoxGeometry(0.1, 0.23, 0.035), M.gold, built, [x, 0.38, -0.43], [0.15, Math.sign(x) * 0.35, Math.sign(x) * 0.2]);
  built.add(idol);
  for (const x of [-0.24, 0, 0.24]) add(new THREE.DodecahedronGeometry(0.17, 0), paleStone, construction, [x, 0.11, 0.1], [0, x, 0], [1, 0.65, 1]);
  setSupportConstructionState(root, false);
  return root;
}

export function makeMageAltar() {
  const { root, built, construction } = supportRoot('Altar Mago', 0x6f5ca5);
  addAltarFoundation(built);
  add(new THREE.CylinderGeometry(0.44, 0.5, 0.09, 8), paleStone, built, [0, 0.285, 0]);
  const obelisk = new THREE.Group();
  obelisk.name = 'mageAltarObelisk';
  add(new THREE.CylinderGeometry(0.135, 0.25, 0.74, 4), M.stoneDark, obelisk, [0, 0.68, 0], [0, Math.PI / 4, 0]);
  add(new THREE.BoxGeometry(0.3, 0.055, 0.3), M.gold, obelisk, [0, 1.025, 0]);
  for (let side = 0; side < 4; side += 1) {
    const panel = new THREE.Group();
    panel.name = 'mageAltarInscription';
    panel.rotation.y = side * Math.PI / 2;
    add(new THREE.BoxGeometry(0.19, 0.43, 0.025), paleStone, panel, [0, 0.66, -0.16]);
    add(new THREE.BoxGeometry(0.016, 0.3, 0.012), mageGlow, panel, [0, 0.66, -0.18]);
    for (const direction of [-1, 1]) {
      add(new THREE.BoxGeometry(0.11, 0.016, 0.012), mageGlow, panel, [direction * 0.032, 0.715, -0.181], [0, 0, direction * 0.7]);
      add(new THREE.BoxGeometry(0.065, 0.014, 0.012), mageGlow, panel, [direction * 0.023, 0.565, -0.181], [0, 0, -direction * 0.65]);
    }
    obelisk.add(panel);
  }
  built.add(obelisk);
  for (const x of [-0.34, 0.34]) {
    for (const z of [-0.34, 0.34]) {
      const pillar = new THREE.Group();
      pillar.name = 'mageAltarSentinelPillar';
      pillar.position.set(x, 0.3, z);
      add(new THREE.BoxGeometry(0.145, 0.5, 0.145), paleStone, pillar, [0, 0.24, 0]);
      add(new THREE.BoxGeometry(0.18, 0.05, 0.18), M.gold, pillar, [0, 0.49, 0]);
      add(new THREE.ConeGeometry(0.11, 0.22, 4), M.stoneDark, pillar, [0, 0.625, 0], [0, Math.PI / 4, 0]);
      built.add(pillar);
    }
  }
  const core = add(new THREE.OctahedronGeometry(0.23, 0), mageGlow, built, [0, 1.32, 0], [0, Math.PI / 4, 0], [0.8, 1.2, 0.8]);
  core.name = 'altarCore';
  const crystalCage = add(new THREE.TorusGeometry(0.26, 0.022, 6, 20), M.gold, built, [0, 1.22, 0], [Math.PI / 2, 0, Math.PI / 4]);
  crystalCage.name = 'mageAltarCrystalSetting';
  add(new THREE.CylinderGeometry(0.3, 0.42, 0.18, 4), paleStone, construction, [0, 0.11, 0], [0, Math.PI / 4, 0]);
  for (const x of [-0.34, 0.34]) add(new THREE.BoxGeometry(0.13, 0.42, 0.13), paleStone, construction, [x, 0.23, 0.3]);
  setSupportConstructionState(root, false);
  return root;
}

export function makeBuilderArea() {
  const { root, built, construction } = supportRoot('Área de construtor', 0x9a7845);
  add(new THREE.BoxGeometry(1.12, 0.12, 0.92), M.wood, built, [0, 0.06, 0]);
  const bench = new THREE.Group();
  bench.name = 'builderWorkbench';
  for (const x of [-0.36, 0.36]) {
    for (const z of [-0.3, 0.02]) add(new THREE.BoxGeometry(0.08, 0.54, 0.08), oldTimber, bench, [x, 0.38, z]);
  }
  for (let index = 0; index < 5; index += 1) add(new THREE.BoxGeometry(0.19, 0.09, 0.46), index % 2 ? oldTimber : M.wood, bench, [-0.4 + index * 0.2, 0.69, -0.14]);
  add(new THREE.BoxGeometry(0.91, 0.07, 0.06), oldTimber, bench, [0, 0.36, -0.31]);
  add(new THREE.BoxGeometry(0.84, 0.065, 0.3), M.wood, bench, [0, 0.28, -0.1]);
  for (const x of [-0.36, 0.36]) {
    for (const z of [-0.3, 0.02]) add(new THREE.SphereGeometry(0.019, 6, 4), M.iron, bench, [x, 0.74, z]);
  }
  built.add(bench);

  const canopy = new THREE.Group();
  canopy.name = 'builderCanopy';
  for (const x of [-0.47, 0.47]) {
    add(new THREE.BoxGeometry(0.085, 1.24, 0.085), oldTimber, canopy, [x, 0.73, 0.34]);
    add(new THREE.BoxGeometry(0.055, 0.35, 0.055), M.wood, canopy, [x - Math.sign(x) * 0.1, 1.19, 0.34], [0, 0, -Math.sign(x) * 0.7]);
  }
  add(new THREE.BoxGeometry(1.08, 0.08, 0.08), M.wood, canopy, [0, 1.36, 0.34]);
  const awning = new THREE.Group();
  awning.name = 'builderCanvasAwning';
  awning.position.set(0, 1.405, 0.085);
  awning.rotation.x = 0.08;
  add(new THREE.BoxGeometry(1.15, 0.04, 0.69), canopyCloth, awning);
  for (const x of [-0.52, -0.26, 0, 0.26, 0.52]) add(new THREE.BoxGeometry(0.026, 0.013, 0.7), oldTimber, awning, [x, 0.026, 0]);
  for (const x of [-0.46, -0.23, 0, 0.23, 0.46]) {
    const flap = new THREE.Shape();
    flap.moveTo(-0.105, 0);
    flap.lineTo(0, -0.13);
    flap.lineTo(0.105, 0);
    flap.closePath();
    add(new THREE.ShapeGeometry(flap), canopyCloth, awning, [x, 0, -0.35]);
  }
  canopy.add(awning);
  built.add(canopy);

  const tools = new THREE.Group();
  tools.name = 'builderTools';
  const rack = add(new THREE.BoxGeometry(0.96, 0.085, 0.065), oldTimber, tools, [0, 1.17, 0.335]);
  rack.name = 'builderToolRack';
  const hammer = new THREE.Group();
  hammer.name = 'builderBenchHammer';
  hammer.position.set(0.19, 0.77, -0.15);
  hammer.rotation.y = -0.55;
  add(new THREE.CylinderGeometry(0.026, 0.032, 0.35, 7), oldTimber, hammer, [0, 0, 0], [Math.PI / 2, 0, 0]);
  add(new THREE.BoxGeometry(0.2, 0.075, 0.09), M.iron, hammer, [0, 0.018, -0.15]);
  tools.add(hammer);
  const vise = new THREE.Group();
  vise.name = 'builderBenchVise';
  vise.position.set(-0.34, 0.765, -0.33);
  for (const z of [-0.04, 0.07]) add(new THREE.BoxGeometry(0.16, 0.1, 0.055), M.iron, vise, [0, 0, z]);
  add(new THREE.CylinderGeometry(0.018, 0.018, 0.23, 8), M.steel, vise, [0, -0.045, -0.075], [Math.PI / 2, 0, 0]);
  add(new THREE.CylinderGeometry(0.014, 0.014, 0.2, 7), M.iron, vise, [0, -0.045, -0.19], [0, 0, Math.PI / 2]);
  tools.add(vise);
  for (const x of [0.24, 0.37]) {
    add(new THREE.CylinderGeometry(0.025, 0.025, 0.26, 7), bone, tools, [x, 0.77, 0.025], [Math.PI / 2, 0, 0]);
  }
  for (const x of [-0.23, 0.05, 0.31]) {
    const hanging = new THREE.Group();
    hanging.position.set(x, 1.08, 0.29);
    hanging.name = 'builderHangingTool';
    add(new THREE.CylinderGeometry(0.02, 0.025, 0.23, 7), oldTimber, hanging);
    add(new THREE.TorusGeometry(0.024, 0.008, 5, 10), M.iron, hanging, [0, 0.1, -0.025]);
    add(new THREE.BoxGeometry(0.12, 0.075, 0.045), M.iron, hanging, [0, -0.11, -0.015]);
    tools.add(hanging);
  }
  built.add(tools);
  add(new THREE.BoxGeometry(0.96, 0.065, 0.35), oldTimber, construction, [0, 0.16, -0.15]);
  for (const x of [-0.44, 0.44]) add(new THREE.BoxGeometry(0.08, 0.54, 0.08), M.wood, construction, [x, 0.3, 0.27]);
  setSupportConstructionState(root, false);
  return root;
}

export function setSupportConstructionState(root, underConstruction) {
  root.getObjectByName('supportBuiltParts').visible = !underConstruction;
  root.getObjectByName('supportConstructionParts').visible = underConstruction;
  root.userData.underConstruction = underConstruction;
}
