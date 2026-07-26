import * as THREE from 'three';

const SKY_ROTATION = -Math.PI * 0.38;

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function addMysticGlow(context, width, height, x, y, radius, color) {
  const glow = context.createRadialGradient(x, y, 0, x, y, radius);
  glow.addColorStop(0, color);
  glow.addColorStop(0.38, color.replace(/,[^,]+\)$/, ', 0.055)'));
  glow.addColorStop(1, 'rgba(20, 6, 42, 0)');
  context.fillStyle = glow;
  context.fillRect(0, 0, width, height);
}

function drawMoon(context, width, height, x, y, radius) {
  context.save();
  context.shadowColor = 'rgba(169, 124, 218, 0.22)';
  context.shadowBlur = radius * 0.34;
  const aura = context.createRadialGradient(x, y, radius * 0.72, x, y, radius * 1.62);
  aura.addColorStop(0, 'rgba(210, 202, 224, 0.14)');
  aura.addColorStop(0.48, 'rgba(105, 62, 145, 0.06)');
  aura.addColorStop(1, 'rgba(53, 20, 91, 0)');
  context.fillStyle = aura;
  context.beginPath();
  context.arc(x, y, radius * 1.62, 0, Math.PI * 2);
  context.fill();
  context.restore();

  context.save();
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.clip();

  const surface = context.createRadialGradient(
    x + radius * 0.35,
    y - radius * 0.18,
    radius * 0.08,
    x,
    y,
    radius * 1.18
  );
  surface.addColorStop(0, '#dddbe3');
  surface.addColorStop(0.38, '#bab6c2');
  surface.addColorStop(0.78, '#817b8c');
  surface.addColorStop(1, '#393441');
  context.fillStyle = surface;
  context.fillRect(x - radius, y - radius, radius * 2, radius * 2);

  const mariaRandom = seededRandom(3207);
  for (let index = 0; index < 17; index += 1) {
    const angle = mariaRandom() * Math.PI * 2;
    const distance = Math.sqrt(mariaRandom()) * radius * 0.64;
    const mariaX = x + Math.cos(angle) * distance;
    const mariaY = y + Math.sin(angle) * distance;
    const mariaWidth = radius * (0.09 + mariaRandom() * 0.2);
    const mariaHeight = mariaWidth * (0.45 + mariaRandom() * 0.5);
    context.save();
    context.translate(mariaX, mariaY);
    context.rotate(mariaRandom() * Math.PI);
    const maria = context.createRadialGradient(0, 0, 0, 0, 0, mariaWidth);
    maria.addColorStop(0, 'rgba(48, 44, 58, 0.28)');
    maria.addColorStop(0.65, 'rgba(66, 60, 76, 0.17)');
    maria.addColorStop(1, 'rgba(70, 62, 84, 0)');
    context.fillStyle = maria;
    context.beginPath();
    context.ellipse(0, 0, mariaWidth, mariaHeight, 0, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  const random = seededRandom(9024);
  for (let index = 0; index < 96; index += 1) {
    const angle = random() * Math.PI * 2;
    const distance = Math.sqrt(random()) * radius * 0.88;
    const craterRadius = radius * (0.012 + random() * 0.075);
    const craterX = x + Math.cos(angle) * distance;
    const craterY = y + Math.sin(angle) * distance;
    const crater = context.createRadialGradient(
      craterX - craterRadius * 0.25,
      craterY - craterRadius * 0.25,
      craterRadius * 0.08,
      craterX,
      craterY,
      craterRadius
    );
    crater.addColorStop(0, 'rgba(235, 232, 239, 0.1)');
    crater.addColorStop(0.42, 'rgba(226, 222, 232, 0.035)');
    crater.addColorStop(0.58, 'rgba(49, 45, 58, 0.31)');
    crater.addColorStop(1, 'rgba(25, 18, 39, 0)');
    context.fillStyle = crater;
    context.beginPath();
    context.arc(craterX, craterY, craterRadius, 0, Math.PI * 2);
    context.fill();
  }

  context.restore();
}

function createStarPointTexture(size = 64) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const context = canvas.getContext('2d');
  const center = size / 2;
  const glow = context.createRadialGradient(center, center, 0, center, center, center);
  glow.addColorStop(0, 'rgba(255,255,255,0.62)');
  glow.addColorStop(0.18, 'rgba(245,232,255,0.4)');
  glow.addColorStop(0.48, 'rgba(197,146,244,0.16)');
  glow.addColorStop(1, 'rgba(145,76,220,0)');
  context.fillStyle = glow;
  context.fillRect(0, 0, size, size);

  context.save();
  context.translate(center, center);
  context.beginPath();
  for (let point = 0; point < 16; point += 1) {
    const angle = -Math.PI / 2 + point / 16 * Math.PI * 2;
    const outerPoint = point % 2 === 0;
    const cardinalPoint = point % 4 === 0;
    const radius = outerPoint
      ? size * (cardinalPoint ? 0.42 : 0.3)
      : size * 0.075;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (point === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.closePath();
  const starFill = context.createRadialGradient(0, 0, 0, 0, 0, size * 0.42);
  starFill.addColorStop(0, 'rgba(255,255,255,1)');
  starFill.addColorStop(0.22, 'rgba(250,244,255,0.98)');
  starFill.addColorStop(0.7, 'rgba(215,174,255,0.88)');
  starFill.addColorStop(1, 'rgba(157,83,227,0.18)');
  context.fillStyle = starFill;
  context.shadowColor = 'rgba(190,120,255,0.7)';
  context.shadowBlur = size * 0.09;
  context.fill();
  context.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  return texture;
}

function createSpaceFocusTexture(size = 256) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const context = canvas.getContext('2d');
  const center = size / 2;
  const halo = context.createRadialGradient(center, center, 0, center, center, center);
  halo.addColorStop(0, 'rgba(246,226,255,0.72)');
  halo.addColorStop(0.055, 'rgba(199,132,255,0.52)');
  halo.addColorStop(0.2, 'rgba(128,62,209,0.23)');
  halo.addColorStop(0.52, 'rgba(75,28,143,0.085)');
  halo.addColorStop(1, 'rgba(31,8,67,0)');
  context.fillStyle = halo;
  context.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

function createSpaceLightFoci(scene) {
  const texture = createSpaceFocusTexture();
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  const group = new THREE.Group();
  group.name = 'Focos de luz violeta no espaço';
  const random = seededRandom(7619);
  const violetTints = [0xb46cff, 0x9b5de5, 0xca87ff, 0x7541c5, 0xd6a1ff];
  const specs = Array.from({ length: 18 }, (_, index) => {
    const angle = index / 18 * Math.PI * 2 + (random() - 0.5) * 0.5;
    const radiusX = 19 + random() * 11;
    const radiusY = 14 + random() * 13;
    return {
      position: [
        Math.cos(angle) * radiusX,
        Math.sin(angle) * radiusY + (random() - 0.5) * 5,
        -38 - random() * 13
      ],
      scale: 5.8 + random() * 7,
      opacity: 0.17 + random() * 0.17,
      phase: random() * Math.PI * 2,
      twinkle: index % 7 === 2,
      color: violetTints[Math.floor(random() * violetTints.length)]
    };
  });
  specs.forEach(spec => {
    const material = new THREE.SpriteMaterial({
      map: texture,
      color: spec.color,
      transparent: true,
      opacity: spec.opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true,
      fog: false,
      toneMapped: false
    });
    const focus = new THREE.Sprite(material);
    focus.position.set(...spec.position);
    focus.scale.setScalar(spec.scale);
    focus.userData = {
      baseOpacity: spec.opacity,
      phase: spec.phase,
      twinkle: spec.twinkle
    };
    group.add(focus);
  });
  scene.add(group);
  return group;
}

function createStarLayer({ count, radius, seed, size, opacity, map, colorA = 0x7c35bd, colorB = 0xdcc8f4 }) {
  const random = seededRandom(seed);
  const positions = [];
  const colors = [];
  const violet = new THREE.Color(colorA);
  const pale = new THREE.Color(colorB);
  const color = new THREE.Color();

  for (let index = 0; index < count; index += 1) {
    const longitude = random() * Math.PI * 2;
    const vertical = random() * 2 - 1;
    const horizontal = Math.sqrt(1 - vertical * vertical);
    const distance = radius - random() * 3;
    positions.push(
      Math.cos(longitude) * horizontal * distance,
      vertical * distance,
      Math.sin(longitude) * horizontal * distance
    );
    color.lerpColors(violet, pale, random() * 0.72);
    color.offsetHSL((random() - 0.5) * 0.025, 0, (random() - 0.5) * 0.12);
    colors.push(color.r, color.g, color.b);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({
    size,
    map,
    vertexColors: true,
    transparent: true,
    opacity,
    depthWrite: false,
    depthTest: true,
    fog: false,
    toneMapped: false,
    sizeAttenuation: false,
    alphaTest: 0.025,
  });
  const stars = new THREE.Points(geometry, material);
  stars.frustumCulled = false;
  stars.renderOrder = -999;
  stars.rotation.y = SKY_ROTATION;
  return stars;
}

function createStellarBandLayer({ count, radius, seed, size, map }) {
  const random = seededRandom(seed);
  const positions = [];
  const colors = [];
  const violet = new THREE.Color(0x8e45df);
  const pale = new THREE.Color(0xd8c4ef);
  const color = new THREE.Color();

  for (let index = 0; index < count; index += 1) {
    const longitude = random() * Math.PI * 2;
    const latitude = (random() - 0.5) * (0.12 + random() * 0.42);
    const distance = radius - random() * 2.4;
    positions.push(
      Math.cos(longitude) * Math.cos(latitude) * distance,
      Math.sin(latitude) * distance,
      Math.sin(longitude) * Math.cos(latitude) * distance
    );
    color.lerpColors(violet, pale, random() * 0.68);
    colors.push(color.r, color.g, color.b);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({
    size,
    map,
    vertexColors: true,
    transparent: true,
    opacity: 0.36,
    depthWrite: false,
    depthTest: true,
    fog: false,
    toneMapped: false,
    sizeAttenuation: false,
    alphaTest: 0.025,
  });
  const band = new THREE.Points(geometry, material);
  band.rotation.set(0.26, SKY_ROTATION, -0.34);
  band.frustumCulled = false;
  band.renderOrder = -999;
  return band;
}

function createDarkFantasyTexture(size) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size / 2;
  const context = canvas.getContext('2d');
  const { width, height } = canvas;

  const night = context.createLinearGradient(0, 0, 0, height);
  night.addColorStop(0, '#010107');
  night.addColorStop(0.42, '#070316');
  night.addColorStop(0.78, '#0b0419');
  night.addColorStop(1, '#020107');
  context.fillStyle = night;
  context.fillRect(0, 0, width, height);

  addMysticGlow(context, width, height, width * 0.2, height * 0.34, height * 0.48, 'rgba(100, 38, 181, 0.07)');
  addMysticGlow(context, width, height, width * 0.52, height * 0.55, height * 0.54, 'rgba(58, 19, 130, 0.06)');
  addMysticGlow(context, width, height, width * 0.82, height * 0.28, height * 0.42, 'rgba(144, 61, 206, 0.055)');

  const vignette = context.createRadialGradient(width * 0.53, height * 0.36, height * 0.12, width * 0.5, height * 0.48, width * 0.62);
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(0.74, 'rgba(0, 0, 0, 0.06)');
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
  context.fillStyle = vignette;
  context.fillRect(0, 0, width, height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  return texture;
}

function createMoonTexture(size) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  drawMoon(context, size, size, size / 2, size / 2, size * 0.25);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  return texture;
}

export function createMagicSky(scene, renderer, app, { quality = 'high' } = {}) {
  scene.background = new THREE.Color(0x010107);
  scene.environment = null;
  scene.environmentIntensity = 0;

  const skyGeometries = {
    low: new THREE.SphereGeometry(68, 32, 16),
    high: new THREE.SphereGeometry(68, 96, 48)
  };
  Object.values(skyGeometries).forEach(geometry => {
    const uvs = geometry.getAttribute('uv');
    for (let index = 0; index < uvs.count; index += 1) uvs.setY(index, 0.5 + uvs.getY(index) * 0.5);
    uvs.needsUpdate = true;
  });

  const textures = {
    low: createDarkFantasyTexture(1024),
    high: createDarkFantasyTexture(2048)
  };
  const skyMaterial = new THREE.MeshBasicMaterial({
    map: textures[quality],
    color: 0xffffff,
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
    fog: false,
    toneMapped: false
  });
  const sky = new THREE.Mesh(skyGeometries[quality], skyMaterial);
  sky.name = 'Dark fantasy moon and violet stars';
  sky.rotation.y = SKY_ROTATION;
  sky.renderOrder = -1000;
  sky.frustumCulled = false;
  scene.add(sky);
  const starPoint = createStarPointTexture();
  const distantStars = createStarLayer({
    count: 1550,
    radius: 63,
    seed: 5021,
    size: 0.52,
    opacity: 0.52,
    map: starPoint,
    colorA: 0x5a247f,
    colorB: 0xaf82d1,
  });
  const fineStars = createStarLayer({
    count: 620,
    radius: 61,
    seed: 7137,
    size: 0.78,
    opacity: 0.7,
    map: starPoint,
    colorA: 0x7e3db8,
    colorB: 0xd7bced,
  });
  const brightStars = createStarLayer({
    count: 96,
    radius: 59,
    seed: 12821,
    size: 3.2,
    opacity: 0.88,
    map: starPoint,
    colorA: 0xa156dc,
    colorB: 0xf0e6f8,
  });
  const stellarBand = createStellarBandLayer({
    count: 940,
    radius: 60,
    seed: 77421,
    size: 0.56,
    map: starPoint,
  });
  scene.add(distantStars, fineStars, brightStars, stellarBand);
  const spaceLightFoci = createSpaceLightFoci(scene);

  const moonMaterial = new THREE.SpriteMaterial({
    map: createMoonTexture(1024),
    color: 0xd2ccd8,
    transparent: true,
    opacity: 0.86,
    depthTest: true,
    depthWrite: false,
    fog: false,
    toneMapped: false
  });
  const moon = new THREE.Sprite(moonMaterial);
  moon.name = 'Fixed mystical full moon';
  moon.position.set(-18.5, 20.5, -44);
  moon.scale.setScalar(5.2);
  moon.renderOrder = -999;
  scene.add(moon);

  function setQuality(nextQuality) {
    const high = nextQuality === 'high';
    sky.geometry = skyGeometries[nextQuality];
    skyMaterial.map = textures[nextQuality];
    skyMaterial.needsUpdate = true;
    distantStars.visible = true;
    fineStars.visible = true;
    brightStars.visible = nextQuality === 'high';
    stellarBand.visible = nextQuality === 'high';
    spaceLightFoci.children.forEach((focus, index) => {
      focus.visible = high || index < 6;
    });
    distantStars.geometry.setDrawRange(0, high ? 1550 : 420);
    fineStars.geometry.setDrawRange(0, high ? 620 : 210);
    brightStars.geometry.setDrawRange(0, high ? 96 : 32);
    stellarBand.geometry.setDrawRange(0, high ? 940 : 300);
    distantStars.material.size = high ? 0.52 : 0.42;
    fineStars.material.size = high ? 0.78 : 0.64;
    brightStars.material.size = high ? 3.2 : 2.35;
    stellarBand.material.size = high ? 0.56 : 0.42;
    app.dataset.skybox = `dark-fantasy-moon-${nextQuality}`;
  }

  setQuality(quality);

  function update(elapsed = 0) {
    distantStars.material.opacity = 0.54;
    fineStars.material.opacity = 0.74;
    brightStars.material.opacity = 0.89 + Math.sin(elapsed * 0.28 + 0.6) * 0.045;
    stellarBand.material.opacity = 0.37;
    spaceLightFoci.children.forEach(focus => {
      focus.material.opacity = focus.userData.baseOpacity
        + (focus.userData.twinkle
          ? Math.sin(elapsed * 0.18 + focus.userData.phase) * 0.035
          : 0);
    });
  }

  return { update, setQuality };
}
