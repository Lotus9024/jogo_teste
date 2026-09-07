import * as THREE from 'three';

/** A deterministic cutout avoids the opaque polygon disks of flattened spheres. */
export function createMossTexture(size = 64) {
  const pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4;
      const dx = (x + 0.5) / size * 2 - 1;
      const dy = (y + 0.5) / size * 2 - 1;
      const angle = Math.atan2(dy, dx);
      let noise = Math.imul(x + 13, 374761393) ^ Math.imul(y + 71, 668265263);
      noise = Math.imul(noise ^ (noise >>> 13), 1274126177);
      const grain = ((noise ^ (noise >>> 16)) >>> 0) / 4294967295;
      const edge = 0.68 + Math.sin(angle * 5) * 0.12 + Math.cos(angle * 9 + 0.4) * 0.08;
      const coverage = Math.hypot(dx, dy) < edge + (grain - 0.5) * 0.25;
      pixels[index] = 66 + grain * 39;
      pixels[index + 1] = 73 + grain * 37;
      pixels[index + 2] = 49 + grain * 25;
      pixels[index + 3] = coverage && grain > 0.12 ? 255 : 0;
    }
  }
  const texture = new THREE.DataTexture(pixels, size, size, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}
