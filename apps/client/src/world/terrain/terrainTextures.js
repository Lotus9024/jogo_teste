import * as THREE from 'three';

const ISLAND_GROUND_TEXTURE = '/assets/textures/grass/coast_sand_rocks_02_diff_4k.jpg';
const ISLAND_ROCK_TEXTURE = '/assets/textures/rock-island/rock_face_03_diff_4k.jpg';

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function createGroundTexture(renderer, size = 1024) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const context = canvas.getContext('2d');
  const image = context.createImageData(size, size);
  const random = seededRandom(1947);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4;
      const large = Math.sin(x * 0.025) * 7 + Math.cos(y * 0.021) * 6;
      const mottled = Math.sin((x + y) * 0.071) * 4.5 + Math.cos((x - y) * 0.054) * 4;
      const mineral = Math.sin(x * 0.19 + Math.sin(y * 0.043) * 3.4) * 2.8;
      const grain = (random() - 0.5) * 18;
      image.data[index] = 51 + large + mottled + grain;
      image.data[index + 1] = 45 + large * 0.82 + mottled + mineral + grain;
      image.data[index + 2] = 59 + large * 1.05 + mineral * 0.7 + grain * 0.5;
      image.data[index + 3] = 255;
    }
  }

  context.putImageData(image, 0, 0);
  context.globalAlpha = 0.16;
  for (let index = 0; index < 760; index += 1) {
    const x = random() * size;
    const y = random() * size;
    const radius = 2 + random() * 11;
    context.fillStyle = random() > 0.45 ? '#65596d' : '#211b29';
    context.beginPath();
    context.ellipse(x, y, radius, radius * (0.35 + random() * 0.55), random() * Math.PI, 0, Math.PI * 2);
    context.fill();
  }
  context.globalAlpha = 0.2;
  for (let index = 0; index < 210; index += 1) {
    const x = random() * size;
    const y = random() * size;
    const length = 5 + random() * 34;
    context.strokeStyle = random() > 0.55 ? '#17121d' : '#74657b';
    context.lineWidth = 0.5 + random() * 1.4;
    context.beginPath();
    context.moveTo(x, y);
    context.quadraticCurveTo(
      x + length * 0.42,
      y + (random() - 0.5) * 9,
      x + length,
      y + (random() - 0.5) * 13
    );
    context.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(8, 7);
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return texture;
}

export function loadIslandGroundTexture(renderer, material) {
  new THREE.TextureLoader().load(ISLAND_GROUND_TEXTURE, texture => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4.8, 4.1);
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const reliefTexture = texture.clone();
    reliefTexture.colorSpace = THREE.NoColorSpace;
    reliefTexture.needsUpdate = true;
    material.map = texture;
    material.bumpMap = reliefTexture;
    material.roughnessMap = null;
    material.roughness = 1;
    material.bumpScale = 0.09;
    material.needsUpdate = true;
  });
}

export function createCliffTexture(renderer, size = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const context = canvas.getContext('2d');
  const image = context.createImageData(size, size);
  const random = seededRandom(4289);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4;
      const broad = Math.sin(x * 0.031 + Math.sin(y * 0.018) * 2.4) * 11;
      const strata = Math.sin(y * 0.14 + Math.sin(x * 0.021) * 3.2) * 8;
      const fractured = Math.sin((x + y) * 0.082) * 4 + Math.cos((x - y) * 0.047) * 5;
      const grain = (random() - 0.5) * 18;
      image.data[index] = 119 + broad + strata + fractured + grain;
      image.data[index + 1] = 108 + broad * 0.82 + strata + fractured + grain;
      image.data[index + 2] = 128 + broad * 0.74 + strata * 0.72 + fractured + grain;
      image.data[index + 3] = 255;
    }
  }

  context.putImageData(image, 0, 0);
  context.globalAlpha = 0.2;
  for (let index = 0; index < 170; index += 1) {
    const x = random() * size;
    const y = random() * size;
    context.strokeStyle = random() > 0.5 ? '#3d3445' : '#796a83';
    context.lineWidth = 1 + random() * 2.5;
    context.beginPath();
    context.moveTo(x, y);
    context.bezierCurveTo(
      x + 12 + random() * 34,
      y + (random() - 0.5) * 8,
      x + 38 + random() * 48,
      y + (random() - 0.5) * 11,
      x + 72 + random() * 54,
      y + (random() - 0.5) * 7
    );
    context.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(5, 3.25);
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return texture;
}

export function loadIslandRockTexture(renderer, materials) {
  new THREE.TextureLoader().load(ISLAND_ROCK_TEXTURE, texture => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(5, 2.4);
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

    const bumpTexture = texture.clone();
    bumpTexture.colorSpace = THREE.NoColorSpace;
    bumpTexture.needsUpdate = true;

    materials.forEach(material => {
      material.map = texture;
      material.bumpMap = bumpTexture;
      material.needsUpdate = true;
    });
  });
}
