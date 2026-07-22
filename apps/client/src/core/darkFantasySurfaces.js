import * as THREE from 'three';

function hash(x, y, seed) {
  let value = Math.imul(x + seed * 17, 374761393) + Math.imul(y + seed * 31, 668265263);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
}

function textureFrom(data, size, { color = false, repeat = [1, 1] } = {}) {
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(...repeat);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function writePixel(buffer, index, rgb, alpha = 255) {
  buffer[index] = THREE.MathUtils.clamp(rgb[0], 0, 255);
  buffer[index + 1] = THREE.MathUtils.clamp(rgb[1], 0, 255);
  buffer[index + 2] = THREE.MathUtils.clamp(rgb[2], 0, 255);
  buffer[index + 3] = alpha;
}

export function createMasonryMaps({
  size = 128,
  seed = 13,
  stone = [53, 49, 63],
  mortar = [15, 12, 22],
  repeat = [2, 2],
  brickWidth = 30,
  brickHeight = 17,
} = {}) {
  const colorData = new Uint8Array(size * size * 4);
  const bumpData = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y += 1) {
    const row = Math.floor(y / brickHeight);
    const shiftedX = (y % (brickHeight * 2)) < brickHeight ? 0 : Math.floor(brickWidth / 2);
    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4;
      const localX = (x + shiftedX) % brickWidth;
      const localY = y % brickHeight;
      const joint = localX < 2 || localX > brickWidth - 3 || localY < 2 || localY > brickHeight - 3;
      const cellX = Math.floor((x + shiftedX) / brickWidth);
      const grain = (hash(x, y, seed) - 0.5) * 24;
      const cellTone = (hash(cellX, row, seed + 71) - 0.5) * 22;
      const hairline = hash(cellX, row, seed + 201) > 0.82
        && Math.abs(localX - (localY * 1.7 + hash(cellX, row, seed) * 12) % brickWidth) < 0.75;
      const tone = joint || hairline ? mortar : stone;
      const variation = joint ? grain * 0.18 : grain + cellTone;
      writePixel(colorData, index, tone.map(channel => channel + variation));
      const height = joint ? 42 : hairline ? 56 : 158 + variation * 1.5;
      writePixel(bumpData, index, [height, height, height]);
    }
  }

  return {
    map: textureFrom(colorData, size, { color: true, repeat }),
    bumpMap: textureFrom(bumpData, size, { repeat }),
  };
}

export function createCobblestoneMaps({
  size = 128,
  seed = 29,
  stone = [71, 61, 78],
  mortar = [22, 17, 29],
  repeat = [2.4, 2.4],
} = {}) {
  const colorData = new Uint8Array(size * size * 4);
  const bumpData = new Uint8Array(size * size * 4);
  const cellWidth = 16;
  const cellHeight = 12;

  for (let y = 0; y < size; y += 1) {
    const row = Math.floor(y / cellHeight);
    const offset = row % 2 ? cellWidth / 2 : 0;
    for (let x = 0; x < size; x += 1) {
      const shifted = x + offset;
      const cellX = Math.floor(shifted / cellWidth);
      const localX = (shifted % cellWidth) / cellWidth - 0.5;
      const localY = (y % cellHeight) / cellHeight - 0.5;
      const edge = Math.max(Math.abs(localX) / 0.46, Math.abs(localY) / 0.42);
      const joint = edge > 0.88;
      const grain = (hash(x, y, seed) - 0.5) * 20;
      const stoneTone = (hash(cellX, row, seed + 53) - 0.5) * 26;
      const variation = joint ? grain * 0.12 : grain + stoneTone;
      const tone = joint ? mortar : stone;
      writePixel(colorData, (y * size + x) * 4, tone.map(channel => channel + variation));
      const height = joint ? 35 : 138 + (1 - edge) * 55 + variation;
      writePixel(bumpData, (y * size + x) * 4, [height, height, height]);
    }
  }

  return {
    map: textureFrom(colorData, size, { color: true, repeat }),
    bumpMap: textureFrom(bumpData, size, { repeat }),
  };
}

export function createGrainMaps({
  size = 64,
  seed = 47,
  color = [100, 92, 112],
  repeat = [3, 3],
  streak = 0.12,
} = {}) {
  const colorData = new Uint8Array(size * size * 4);
  const bumpData = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4;
      const noise = (hash(x, y, seed) - 0.5) * 22;
      const bands = Math.sin((x + y * streak) * 0.48) * 8;
      const value = noise + bands;
      writePixel(colorData, index, color.map(channel => channel + value));
      const height = 132 + value * 2.2;
      writePixel(bumpData, index, [height, height, height]);
    }
  }
  return {
    map: textureFrom(colorData, size, { color: true, repeat }),
    bumpMap: textureFrom(bumpData, size, { repeat }),
  };
}

export function texturedStandardMaterial(maps, options = {}) {
  return new THREE.MeshStandardMaterial({
    ...options,
    map: maps.map,
    bumpMap: maps.bumpMap,
    bumpScale: options.bumpScale ?? 0.035,
  });
}
