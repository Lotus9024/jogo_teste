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
  surface.addColorStop(0, '#eeeaff');
  surface.addColorStop(0.47, '#c9c4dc');
  surface.addColorStop(0.82, '#847b9c');
  surface.addColorStop(1, '#332b43');
  context.fillStyle = surface;
  context.fillRect(x - radius, y - radius, radius * 2, radius * 2);

  const random = seededRandom(9024);
  for (let index = 0; index < 48; index += 1) {
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
    crater.addColorStop(0.52, 'rgba(70, 60, 91, 0.2)');
    crater.addColorStop(1, 'rgba(25, 18, 39, 0)');
    context.fillStyle = crater;
    context.beginPath();
    context.arc(craterX, craterY, craterRadius, 0, Math.PI * 2);
    context.fill();
  }

  // A dark offset disc leaves a narrow, natural crescent without adding any
  // figurative element to the requested moon-and-stars composition.
  const shadowX = x - radius * 0.39;
  const shadowY = y + radius * 0.03;
  const shadow = context.createRadialGradient(
    shadowX - radius * 0.24,
    shadowY,
    radius * 0.1,
    shadowX,
    shadowY,
    radius * 1.03
  );
  shadow.addColorStop(0, 'rgba(2, 1, 9, 0.99)');
  shadow.addColorStop(0.82, 'rgba(4, 2, 13, 0.985)');
  shadow.addColorStop(1, 'rgba(23, 10, 42, 0.9)');
  context.fillStyle = shadow;
  context.beginPath();
  context.arc(shadowX, shadowY, radius * 0.96, 0, Math.PI * 2);
  context.fill();
  context.restore();
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

export function createMagicSky(scene, renderer, app, { quality = 'high', camera } = {}) {
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

  const moonMaterial = new THREE.SpriteMaterial({
    map: createMoonTexture(512),
    transparent: true,
    depthTest: true,
    depthWrite: false,
    fog: false,
    toneMapped: false
  });
  const moon = new THREE.Sprite(moonMaterial);
  moon.name = 'Mystic textured crescent moon';
  moon.position.set(-15.5, 6, -80);
  moon.scale.setScalar(6);
  moon.renderOrder = -999;
  camera.add(moon);

  function setQuality(nextQuality) {
    sky.geometry = skyGeometries[nextQuality];
    skyMaterial.map = textures[nextQuality];
    skyMaterial.needsUpdate = true;
    app.dataset.skybox = `dark-fantasy-moon-${nextQuality}`;
  }

  setQuality(quality);

  function update() {}

  return { update, setQuality };
}
