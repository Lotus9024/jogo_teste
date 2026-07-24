import * as THREE from 'three';

const colors = Object.freeze({
  base: 0x121217, rim: 0x302d36, skin: 0x8f604e, skinDark: 0x684034,
  cloth: 0x27242d, leather: 0x3d2923, leatherLight: 0x664633,
  iron: 0x343a40, ironLight: 0x777f82, bronze: 0x79552d, linen: 0x676153,
  red: 0x5d222b, blue: 0x26384b, blueLight: 0x40576b,
  green: 0x3f5133, greenDark: 0x293722, yellow: 0x705a2d, black: 0x0d0d10,
});

const material = (color, metalness = 0) => new THREE.MeshStandardMaterial({
  color,
  roughness: metalness ? 0.52 : 0.88,
  metalness,
  flatShading: true,
});

const surfaces = Object.freeze({
  base: material(colors.base), rim: material(colors.rim), skin: material(colors.skin),
  skinDark: material(colors.skinDark), cloth: material(colors.cloth),
  leather: material(colors.leather), leatherLight: material(colors.leatherLight),
  iron: material(colors.iron, 0.48), ironLight: material(colors.ironLight, 0.42),
  bronze: material(colors.bronze, 0.28), linen: material(colors.linen),
  red: material(colors.red), blue: material(colors.blue), blueLight: material(colors.blueLight),
  green: material(colors.green), greenDark: material(colors.greenDark),
  yellow: material(colors.yellow), black: material(colors.black),
});

function add(parent, geometry, surface, position, rotation = [0, 0, 0], name = '') {
  const part = new THREE.Mesh(geometry, surface);
  part.position.set(...position);
  part.rotation.set(...rotation);
  part.castShadow = true;
  part.receiveShadow = true;
  part.name = name;
  parent.add(part);
  return part;
}

const box = (parent, size, position, surface, rotation = [0, 0, 0], name = '') => add(
  parent, new THREE.BoxGeometry(...size), surface, position, rotation, name,
);

const cylinder = (
  parent, top, bottom, height, position, surface, segments = 7, rotation = [0, 0, 0], name = '',
) => add(
  parent,
  new THREE.CylinderGeometry(top, bottom, height, segments),
  surface,
  position,
  rotation,
  name,
);

function between(parent, from, to, radius, surface, name = '') {
  const direction = new THREE.Vector3().subVectors(to, from);
  const part = cylinder(
    parent, radius * 0.88, radius, direction.length(), [0, 0, 0], surface, 6, [0, 0, 0], name,
  );
  part.position.copy(from).add(to).multiplyScalar(0.5);
  part.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  return part;
}

function torsoGeometry(height, shoulder, waist, hem, depth) {
  const levels = [
    { y: -height * 0.5, width: hem, depth: depth * 0.9 },
    { y: 0, width: waist, depth: depth * 0.94 },
    { y: height * 0.5, width: shoulder, depth },
  ];
  const positions = levels.flatMap(level => [
    -level.width, level.y, -level.depth,
    level.width, level.y, -level.depth,
    level.width, level.y, level.depth,
    -level.width, level.y, level.depth,
  ]);
  const indices = [];
  for (let level = 0; level < levels.length - 1; level += 1) {
    const lower = level * 4;
    const upper = (level + 1) * 4;
    for (let side = 0; side < 4; side += 1) {
      const next = (side + 1) % 4;
      indices.push(lower + side, upper + next, lower + next);
      indices.push(lower + side, upper + side, upper + next);
    }
  }
  indices.push(0, 2, 3, 0, 1, 2);
  const top = (levels.length - 1) * 4;
  indices.push(top, top + 2, top + 1, top, top + 3, top + 2);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  const faceted = geometry.toNonIndexed();
  geometry.dispose();
  faceted.computeVertexNormals();
  return faceted;
}

function torso(
  parent,
  {
    height,
    shoulder,
    waist,
    hem,
    depth,
    position,
    rotation = [0, 0, 0],
    surface,
    name,
  },
) {
  return add(
    parent,
    torsoGeometry(height, shoulder, waist, hem, depth),
    surface,
    position,
    rotation,
    name,
  );
}

function pieceBase(accent, name, role, stats) {
  const root = new THREE.Group();
  root.name = name;
  root.userData = {
    selectable: true,
    name,
    role,
    color: accent.color.getHex(),
    modelFrontZ: -1,
    ...stats,
  };

  cylinder(root, 0.7, 0.76, 0.18, [0, 0.09, 0], surfaces.base, 10, [0, 0, 0], 'unitPedestal');
  cylinder(root, 0.68, 0.7, 0.1, [0, 0.22, 0], surfaces.rim, 10, [0, 0, 0], 'pieceRim');

  const platformMaterial = accent.clone();
  platformMaterial.emissive = new THREE.Color(accent.color);
  platformMaterial.emissiveIntensity = 0.16;
  const platform = cylinder(
    root, 0.57, 0.62, 0.075, [0, 0.295, 0], platformMaterial, 10, [0, 0, 0], 'teamPlatform',
  );
  platform.userData.baseColor = accent.color.getHex();

  const ringMaterial = new THREE.MeshStandardMaterial({
    color: accent.color,
    emissive: accent.color,
    emissiveIntensity: 0.34,
    roughness: 0.5,
    metalness: 0.25,
    flatShading: true,
  });
  const ring = add(
    root,
    new THREE.TorusGeometry(0.625, 0.027, 6, 20),
    ringMaterial,
    [0, 0.34, 0],
    [-Math.PI / 2, 0, 0],
    'selectionRing',
  );
  ring.userData.baseColor = accent.color.getHex();
  ring.userData.baseEmissiveIntensity = 0.34;
  return root;
}

function head(parent, y, surface = surfaces.skin, scale = [1, 1, 1]) {
  const face = add(
    parent, new THREE.DodecahedronGeometry(0.27, 0), surface, [0, y, -0.02], [0, 0, 0], 'head',
  );
  face.scale.set(...scale);
}

function eyes(parent, y, z, spacing = 0.095) {
  for (const x of [-spacing, spacing]) {
    add(parent, new THREE.OctahedronGeometry(0.025, 0), surfaces.black, [x, y, z], [0, 0, 0], 'eye');
  }
}

function boot(parent, position, surface, yaw, name, scale = 1) {
  const root = new THREE.Group();
  root.name = name;
  root.position.set(...position);
  root.rotation.y = yaw;
  root.scale.setScalar(scale);
  parent.add(root);
  cylinder(root, 0.105, 0.135, 0.24, [0, 0.04, 0.045], surface, 7, [0.05, 0, 0], `${name}Ankle`);
  const foot = add(
    root,
    new THREE.DodecahedronGeometry(0.19, 0),
    surface,
    [0, -0.055, -0.105],
    [0.03, 0, 0],
    `${name}Foot`,
  );
  foot.scale.set(0.88, 0.58, 1.28);
  return root;
}

function gripHand(
  parent,
  position,
  surface,
  radius = 0.085,
  rotation = [0, 0, 0],
  name = 'grippingHand',
) {
  const hand = new THREE.Group();
  hand.name = name;
  hand.position.set(...position);
  hand.rotation.set(...rotation);
  parent.add(hand);
  cylinder(hand, radius * 0.92, radius, 0.16, [0, 0, 0], surface, 7, [0, 0, 0], `${name}Palm`);
  const thumb = add(
    hand,
    new THREE.DodecahedronGeometry(radius * 0.62, 0),
    surface,
    [-radius * 0.72, 0.015, -radius * 0.45],
    [0, 0, 0],
    `${name}Thumb`,
  );
  thumb.scale.set(0.75, 1.05, 0.72);
  return hand;
}

function shieldShape(scale = 1) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.56 * scale);
  shape.lineTo(-0.39 * scale, 0.32 * scale);
  shape.lineTo(-0.37 * scale, -0.2 * scale);
  shape.lineTo(-0.22 * scale, -0.45 * scale);
  shape.lineTo(0, -0.62 * scale);
  shape.lineTo(0.22 * scale, -0.45 * scale);
  shape.lineTo(0.37 * scale, -0.2 * scale);
  shape.lineTo(0.39 * scale, 0.32 * scale);
  shape.closePath();
  return shape;
}

function hatBrimShape() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.29, 0.08);
  shape.lineTo(-0.3, -0.11);
  shape.lineTo(-0.2, -0.28);
  shape.lineTo(-0.09, -0.35);
  shape.lineTo(0.09, -0.35);
  shape.lineTo(0.2, -0.28);
  shape.lineTo(0.3, -0.11);
  shape.lineTo(0.29, 0.08);
  shape.closePath();
  return shape;
}

export function makeWarrior() {
  const root = pieceBase(surfaces.red, 'Guerreiro', 'GUERREIRO', { hp: 3, damage: 2, move: 2 });
  const rig = new THREE.Group();
  rig.name = 'rig';
  root.add(rig);

  between(rig, new THREE.Vector3(-0.19, 0.34, 0.02), new THREE.Vector3(-0.23, 0.86, 0.02), 0.115, surfaces.leather);
  between(rig, new THREE.Vector3(0.19, 0.34, 0.02), new THREE.Vector3(0.25, 0.88, -0.03), 0.115, surfaces.leather);
  boot(rig, [-0.23, 0.48, -0.03], surfaces.leather, 0.08, 'warriorLeftBoot');
  boot(rig, [0.25, 0.48, -0.08], surfaces.leather, -0.08, 'warriorRightBoot');
  torso(rig, {
    height: 0.8,
    shoulder: 0.39,
    waist: 0.28,
    hem: 0.34,
    depth: 0.23,
    position: [0, 1.23, 0],
    surface: surfaces.red,
    name: 'warriorTunic',
  });
  for (const side of [-1, 1]) {
    const pauldron = add(
      rig,
      new THREE.DodecahedronGeometry(0.19, 0),
      surfaces.iron,
      [side * 0.39, 1.52, -0.01],
      [0, 0, side * 0.08],
      'warriorPauldron',
    );
    pauldron.scale.set(1.22, 0.65, 1.02);
  }
  box(rig, [0.68, 0.13, 0.47], [0, 1.03, 0], surfaces.leather, [0, 0, 0], 'belt');
  box(rig, [0.13, 0.18, 0.12], [0.17, 1.03, -0.29], surfaces.bronze);
  between(rig, new THREE.Vector3(-0.36, 1.43, 0), new THREE.Vector3(-0.48, 1.01, -0.18), 0.105, surfaces.skinDark);
  between(rig, new THREE.Vector3(0.36, 1.43, 0), new THREE.Vector3(0.52, 1.04, -0.28), 0.105, surfaces.skin);
  head(rig, 1.87, surfaces.skin, [0.95, 1.04, 0.93]);
  eyes(rig, 1.91, -0.255);
  cylinder(rig, 0.31, 0.33, 0.24, [0, 2.07, -0.01], surfaces.iron, 7, [0, 0, 0], 'helmet');
  box(rig, [0.08, 0.26, 0.5], [0, 2.26, 0.02], surfaces.red, [0.12, 0, 0], 'helmetCrest');

  const sword = new THREE.Group();
  sword.name = 'warriorSword';
  sword.position.set(0.52, 1.04, -0.28);
  sword.rotation.set(0.12, 0, -0.28);
  cylinder(sword, 0.043, 0.043, 0.42, [0, 0, 0], surfaces.leather, 6, [0, 0, 0], 'swordGrip');
  gripHand(sword, [0, -0.035, 0], surfaces.skin, 0.09, [0, 0, 0], 'warriorSwordHand');
  add(sword, new THREE.OctahedronGeometry(0.09, 0), surfaces.bronze, [0, -0.26, 0], [0, 0, 0], 'swordPommel');
  box(sword, [0.36, 0.065, 0.09], [0, 0.245, 0], surfaces.bronze, [0, 0, 0], 'swordGuard');
  const blade = add(
    sword,
    new THREE.ConeGeometry(0.11, 0.92, 4),
    surfaces.ironLight,
    [0, 0.735, 0],
    [0, Math.PI / 4, 0],
    'swordBlade',
  );
  blade.scale.z = 0.42;
  rig.add(sword);
  return root;
}

export function makeGuard() {
  const root = pieceBase(surfaces.blue, 'Guarda', 'GUARDA', { hp: 4, damage: 1, move: 1 });
  const rig = new THREE.Group();
  rig.name = 'rig';
  root.add(rig);

  for (const side of [-1, 1]) {
    between(rig, new THREE.Vector3(side * 0.18, 0.34, 0), new THREE.Vector3(side * 0.18, 0.92, 0), 0.115, surfaces.blue);
    boot(
      rig,
      [side * 0.18, 0.48, -0.06],
      surfaces.blue,
      side * 0.035,
      side < 0 ? 'guardLeftBoot' : 'guardRightBoot',
    );
  }
  torso(rig, {
    height: 0.9,
    shoulder: 0.39,
    waist: 0.3,
    hem: 0.37,
    depth: 0.235,
    position: [0, 1.25, 0],
    surface: surfaces.blue,
    name: 'guardCoat',
  });
  box(rig, [0.68, 0.1, 0.5], [0, 1.12, 0], surfaces.leather);
  for (const side of [-1, 1]) {
    const pauldron = add(
      rig,
      new THREE.DodecahedronGeometry(0.185, 0),
      surfaces.iron,
      [side * 0.39, 1.57, 0],
      [0, 0, side * 0.06],
      'guardPauldron',
    );
    pauldron.scale.set(1.25, 0.68, 1.04);
  }
  head(rig, 1.98, surfaces.skin, [0.94, 1, 0.92]);
  eyes(rig, 2, -0.252);
  cylinder(rig, 0.31, 0.34, 0.3, [0, 2.17, 0], surfaces.iron, 8, [0, 0, 0], 'guardHelmet');
  box(rig, [0.08, 0.18, 0.46], [0, 2.36, 0.02], surfaces.blueLight, [0.1, 0, 0], 'guardCrest');
  between(rig, new THREE.Vector3(-0.36, 1.52, 0), new THREE.Vector3(-0.48, 1.18, -0.18), 0.1, surfaces.iron);

  const shield = new THREE.Group();
  shield.name = 'guardShield';
  shield.position.set(-0.52, 1.24, -0.34);
  shield.rotation.set(-0.04, 0.12, -0.07);
  add(
    shield,
    new THREE.ExtrudeGeometry(shieldShape(), {
      depth: 0.085,
      bevelEnabled: false,
      curveSegments: 1,
    }),
    surfaces.iron,
    [0, 0, 0],
    [0, 0, 0],
    'shieldIronRim',
  );
  add(
    shield,
    new THREE.ShapeGeometry(shieldShape(0.86), 1),
    surfaces.blueLight,
    [0, -0.01, -0.012],
    [0, 0, 0],
    'shieldFace',
  );
  box(shield, [0.065, 0.91, 0.045], [0, 0.01, -0.045], surfaces.bronze, [0, 0, 0], 'shieldSpine');
  cylinder(shield, 0.115, 0.135, 0.09, [0, 0.08, -0.075], surfaces.ironLight, 7, [Math.PI / 2, 0, 0], 'shieldBoss');
  for (const [x, y] of [[-0.25, 0.29], [0.25, 0.29], [-0.2, -0.29], [0.2, -0.29]]) {
    add(shield, new THREE.OctahedronGeometry(0.035, 0), surfaces.bronze, [x, y, -0.055], [0, 0, 0], 'shieldRivet');
  }
  box(shield, [0.28, 0.08, 0.07], [0, -0.08, 0.12], surfaces.leather, [0, 0, 0], 'shieldRearGrip');
  gripHand(shield, [0, -0.08, 0.12], surfaces.skin, 0.085, [0, 0, Math.PI / 2], 'guardShieldHand');
  rig.add(shield);

  between(rig, new THREE.Vector3(0.36, 1.5, 0), new THREE.Vector3(0.5, 1.16, -0.08), 0.1, surfaces.iron);
  const spear = new THREE.Group();
  spear.name = 'guardSpear';
  spear.position.set(0.52, 1.49, -0.1);
  spear.rotation.z = -0.04;
  cylinder(spear, 0.035, 0.04, 2.32, [0, 0, 0], surfaces.leatherLight, 7, [0, 0, 0], 'guardSpearShaft');
  gripHand(spear, [0, -0.33, 0], surfaces.skin, 0.085, [0, 0, 0], 'guardSpearHand');
  add(spear, new THREE.ConeGeometry(0.12, 0.42, 4), surfaces.ironLight, [0, 1.37, 0], [0, Math.PI / 4, 0]);
  rig.add(spear);
  return root;
}

export function makeGoblin() {
  const root = pieceBase(
    surfaces.green,
    'Goblin',
    'GOBLIN · SAQUEADOR',
    { hp: 1, damage: 1, move: 1 },
  );
  const rig = new THREE.Group();
  rig.name = 'rig';
  rig.rotation.z = -0.035;
  root.add(rig);

  between(rig, new THREE.Vector3(-0.16, 0.33, 0.04), new THREE.Vector3(-0.25, 0.76, -0.02), 0.095, surfaces.greenDark);
  between(rig, new THREE.Vector3(0.15, 0.33, 0.02), new THREE.Vector3(0.21, 0.72, 0.03), 0.095, surfaces.greenDark);
  boot(rig, [-0.27, 0.465, -0.08], surfaces.leather, 0.18, 'goblinLeftBoot', 0.9);
  boot(rig, [0.23, 0.465, -0.04], surfaces.leather, -0.12, 'goblinRightBoot', 0.88);
  torso(rig, {
    height: 0.62,
    shoulder: 0.33,
    waist: 0.26,
    hem: 0.35,
    depth: 0.22,
    position: [0, 1, 0.02],
    rotation: [0, 0, 0.05],
    surface: surfaces.leather,
    name: 'goblinTunic',
  });
  box(rig, [0.62, 0.11, 0.43], [0, 0.87, -0.01], surfaces.black, [0, 0, 0.05]);
  head(rig, 1.48, surfaces.green, [1.12, 0.86, 0.94]);
  for (const side of [-1, 1]) {
    const ear = add(
      rig,
      new THREE.ConeGeometry(0.12, 0.48, 4),
      surfaces.green,
      [side * 0.36, 1.5, -0.01],
      [0, 0, side * -Math.PI / 2],
      'goblinEar',
    );
    ear.scale.z = 0.55;
  }
  eyes(rig, 1.52, -0.265, 0.11);
  const nose = add(
    rig,
    new THREE.DodecahedronGeometry(0.085, 0),
    surfaces.greenDark,
    [0.015, 1.42, -0.27],
    [0.05, 0, 0],
    'goblinNose',
  );
  nose.scale.set(0.72, 0.62, 0.82);
  between(rig, new THREE.Vector3(-0.28, 1.18, 0), new THREE.Vector3(-0.43, 0.86, -0.18), 0.085, surfaces.green);
  between(rig, new THREE.Vector3(0.29, 1.17, 0), new THREE.Vector3(0.48, 0.95, -0.2), 0.085, surfaces.green);

  const dagger = new THREE.Group();
  dagger.name = 'goblinDagger';
  dagger.position.set(0.48, 0.9, -0.2);
  dagger.rotation.z = -0.62;
  cylinder(dagger, 0.045, 0.05, 0.26, [0, 0, 0], surfaces.leatherLight, 5, [0, 0, 0], 'goblinDaggerGrip');
  gripHand(dagger, [0, 0.035, 0], surfaces.green, 0.076, [0, 0, 0], 'goblinDaggerHand');
  box(dagger, [0.22, 0.055, 0.07], [0, 0.13, 0], surfaces.bronze);
  const blade = add(
    dagger,
    new THREE.ConeGeometry(0.09, 0.48, 4),
    surfaces.ironLight,
    [0, 0.42, 0],
    [0, Math.PI / 4, 0],
  );
  blade.scale.z = 0.4;
  rig.add(dagger);

  between(
    rig,
    new THREE.Vector3(0.22, 1.34, 0.14),
    new THREE.Vector3(-0.4, 1.04, 0.12),
    0.022,
    surfaces.leatherLight,
    'goblinSackStrap',
  );
  const sack = add(
    rig,
    new THREE.DodecahedronGeometry(0.35, 0),
    surfaces.leatherLight,
    [-0.43, 0.84, 0.08],
    [0.12, 0.08, -0.12],
    'goblinLootSack',
  );
  sack.scale.set(0.68, 0.88, 0.55);
  return root;
}

export function makeOperator() {
  const root = pieceBase(
    surfaces.yellow,
    'Operador',
    'OPERADOR',
    { hp: 1, damage: 0, move: 1 },
  );
  const rig = new THREE.Group();
  rig.name = 'rig';
  root.add(rig);

  for (const side of [-1, 1]) {
    between(rig, new THREE.Vector3(side * 0.17, 0.34, 0), new THREE.Vector3(side * 0.18, 0.88, 0), 0.11, surfaces.cloth);
    boot(
      rig,
      [side * 0.18, 0.48, -0.06],
      surfaces.cloth,
      side * 0.025,
      side < 0 ? 'operatorLeftBoot' : 'operatorRightBoot',
    );
  }
  torso(rig, {
    height: 0.82,
    shoulder: 0.35,
    waist: 0.29,
    hem: 0.37,
    depth: 0.23,
    position: [0, 1.19, 0],
    surface: surfaces.linen,
    name: 'operatorShirt',
  });
  box(rig, [0.65, 0.13, 0.45], [0, 1.01, 0], surfaces.leatherLight);
  for (const x of [-0.22, 0, 0.22]) {
    cylinder(
      rig,
      0.035,
      0.04,
      0.3,
      [x, 0.91, -0.31],
      x === 0 ? surfaces.iron : surfaces.bronze,
      6,
      [0, 0, x * 0.5],
    );
  }
  between(rig, new THREE.Vector3(-0.34, 1.43, 0), new THREE.Vector3(-0.48, 1.03, -0.18), 0.1, surfaces.linen);
  const leftHand = add(
    rig,
    new THREE.DodecahedronGeometry(0.105, 0),
    surfaces.skin,
    [-0.48, 1, -0.19],
    [-0.04, 0, 0],
    'operatorLeftHand',
  );
  leftHand.scale.set(0.9, 1.08, 0.86);
  between(rig, new THREE.Vector3(0.34, 1.43, 0), new THREE.Vector3(0.42, 0.98, -0.02), 0.1, surfaces.linen);
  const rightHand = add(
    rig,
    new THREE.DodecahedronGeometry(0.105, 0),
    surfaces.skin,
    [0.42, 0.95, -0.03],
    [0.05, 0, 0],
    'operatorRightHand',
  );
  rightHand.scale.set(0.9, 1.08, 0.86);
  head(rig, 1.87, surfaces.skin, [0.96, 1.04, 0.94]);
  eyes(rig, 1.9, -0.257);
  add(
    rig,
    new THREE.SphereGeometry(0.34, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2),
    surfaces.yellow,
    [0, 2.08, 0],
    [0, 0, 0],
    'operatorCapCrown',
  );
  cylinder(rig, 0.342, 0.342, 0.075, [0, 2.075, 0], surfaces.leather, 8, [0, 0, 0], 'operatorCapBand');
  add(
    rig,
    new THREE.ExtrudeGeometry(hatBrimShape(), {
      depth: 0.055,
      bevelEnabled: false,
      curveSegments: 1,
    }),
    surfaces.yellow,
    [0, 2.065, 0.025],
    [Math.PI / 2, 0, 0],
    'operatorCapBrim',
  );
  box(rig, [0.5, 0.09, 0.08], [0, 1.94, -0.27], surfaces.leather);
  for (const x of [-0.13, 0.13]) {
    cylinder(rig, 0.095, 0.095, 0.06, [x, 1.96, -0.315], surfaces.iron, 8, [Math.PI / 2, 0, 0]);
    cylinder(rig, 0.065, 0.065, 0.065, [x, 1.96, -0.35], surfaces.blueLight, 8, [Math.PI / 2, 0, 0]);
  }
  return root;
}
