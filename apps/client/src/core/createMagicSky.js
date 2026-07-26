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
  context.shadowColor = 'rgba(183, 135, 255, 0.5)';
  context.shadowBlur = radius * 0.58;
  const aura = context.createRadialGradient(x, y, radius * 0.65, x, y, radius * 1.75);
  aura.addColorStop(0, 'rgba(218, 207, 255, 0.26)');
  aura.addColorStop(0.48, 'rgba(113, 60, 173, 0.12)');
  aura.addColorStop(1, 'rgba(53, 20, 91, 0)');
  context.fillStyle = aura;
  context.beginPath();
  context.arc(x, y, radius * 1.75, 0, Math.PI * 2);
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
  surface.addColorStop(0, '#f3f1f8');
  surface.addColorStop(0.38, '#d7d3df');
  surface.addColorStop(0.78, '#9992a7');
  surface.addColorStop(1, '#4c4559');
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
    maria.addColorStop(0, 'rgba(65, 59, 78, 0.2)');
    maria.addColorStop(0.65, 'rgba(80, 72, 94, 0.12)');
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
    crater.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
    crater.addColorStop(0.42, 'rgba(255, 255, 255, 0.05)');
    crater.addColorStop(0.58, 'rgba(62, 56, 73, 0.24)');
    crater.addColorStop(1, 'rgba(25, 18, 39, 0)');
    context.fillStyle = crater;
    context.beginPath();
    context.arc(craterX, craterY, craterRadius, 0, Math.PI * 2);
    context.fill();
  }

  context.restore();
}

function createStarLayer({ count, radius, seed, size, opacity }) {
  const random = seededRandom(seed);
  const positions = [];
  const colors = [];
  const violet = new THREE.Color(0xa557ff);
  const pale = new THREE.Color(0xeee7ff);
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
    vertexColors: true,
    transparent: true,
    opacity,
    depthWrite: false,
    depthTest: true,
    fog: false,
    toneMapped: false,
    sizeAttenuation: false
  });
  const stars = new THREE.Points(geometry, material);
  stars.frustumCulled = false;
  stars.renderOrder = -999;
  stars.rotation.y = SKY_ROTATION;
  return stars;
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

  addMysticGlow(context, width, height, width * 0.2, height * 0.34, height * 0.62, 'rgba(100, 38, 181, 0.12)');
  addMysticGlow(context, width, height, width * 0.52, height * 0.55, height * 0.72, 'rgba(58, 19, 130, 0.1)');
  addMysticGlow(context, width, height, width * 0.82, height * 0.28, height * 0.5, 'rgba(144, 61, 206, 0.09)');

  const random = seededRandom(19027);
  const starCount = Math.round(size * 0.65);
  for (let index = 0; index < starCount; index += 1) {
    const x = random() * width;
    const y = Math.pow(random(), 1.24) * height * 0.84;
    const bright = random() > 0.82;
    const radius = (bright ? 1.1 + random() * 1.9 : 0.35 + random() * 0.8) * size / 2048;
    const alpha = bright ? 0.78 + random() * 0.22 : 0.36 + random() * 0.46;
    context.fillStyle = random() > 0.18
      ? `rgba(194, 96, 255, ${alpha})`
      : `rgba(224, 205, 255, ${alpha * 0.85})`;
    if (bright) {
      context.shadowColor = 'rgba(167, 73, 255, 0.92)';
      context.shadowBlur = radius * 6;
    }
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
    context.shadowBlur = 0;
  }

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
  const fineStars = createStarLayer({
    count: quality === 'low' ? 230 : 720,
    radius: 61,
    seed: 7137,
    size: quality === 'low' ? 0.8 : 1.05,
    opacity: 0.78
  });
  const brightStars = createStarLayer({
    count: quality === 'low' ? 34 : 92,
    radius: 59,
    seed: 12821,
    size: quality === 'low' ? 1.35 : 1.8,
    opacity: 0.92
  });
  scene.add(fineStars, brightStars);

  const moonMaterial = new THREE.SpriteMaterial({
    map: createMoonTexture(1024),
    transparent: true,
    depthTest: true,
    depthWrite: false,
    fog: false,
    toneMapped: false
  });
  const moon = new THREE.Sprite(moonMaterial);
  moon.name = 'Fixed mystical full moon';
  moon.position.set(-17.3, -34.4, -19.5);
  moon.scale.setScalar(4.3);
  moon.renderOrder = -999;
  scene.add(moon);

  function setQuality(nextQuality) {
    sky.geometry = skyGeometries[nextQuality];
    skyMaterial.map = textures[nextQuality];
    skyMaterial.needsUpdate = true;
    fineStars.visible = true;
    brightStars.visible = nextQuality === 'high';
    app.dataset.skybox = `dark-fantasy-moon-${nextQuality}`;
  }

  setQuality(quality);

  function update() {}

  return { update, setQuality };
}
