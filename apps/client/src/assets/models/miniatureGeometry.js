import * as THREE from 'three';

/** Sculpted silhouette with thickness, centered around its local XY plane. */
export function profileGeometry(points, depth = 0.06, bevel = 0.012) {
  const shape = new THREE.Shape();
  points.forEach(([x, y], index) => index ? shape.lineTo(x, y) : shape.moveTo(x, y));
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled: bevel > 0, bevelThickness: bevel,
    bevelSize: bevel, bevelSegments: 1, steps: 1, curveSegments: 6,
  });
  geometry.translate(0, 0, -depth / 2);
  return geometry;
}

/** Broad cloth folds and a shaped hem instead of a flat rectangle. */
export function drapedClothGeometry({ topWidth = 0.6, bottomWidth = 0.9, height = 1, folds = 5, sweep = 0.18 } = {}) {
  const columns = 24, rows = 8;
  const positions = [], uvs = [], indices = [];
  for (let row = 0; row <= rows; row += 1) {
    const v = row / rows;
    const width = THREE.MathUtils.lerp(topWidth, bottomWidth, v);
    for (let column = 0; column <= columns; column += 1) {
      const u = column / columns;
      positions.push((u - 0.5) * width,
        -v * height + v ** 8 * (0.035 + 0.04 * Math.cos(u * Math.PI * 6)),
        sweep * v * v + Math.cos(u * Math.PI * 2 * folds) * (0.018 + v * 0.032));
      uvs.push(u, 1 - v);
      if (row < rows && column < columns) {
        const a = row * (columns + 1) + column, b = a + columns + 1;
        indices.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function foldedRobeGeometry() {
  const rings = [[0.15, 0.43], [0.38, 0.4], [0.82, 0.29], [1.12, 0.23], [1.4, 0.3], [1.53, 0.24]];
  const positions = [], uvs = [], indices = [];
  const segments = 40;
  rings.forEach(([y, radius], row) => {
    for (let column = 0; column <= segments; column += 1) {
      const angle = column / segments * Math.PI * 2;
      const r = radius + Math.cos(angle * 10) * (row < 3 ? 0.035 : 0.016);
      positions.push(Math.cos(angle) * r, y, Math.sin(angle) * r * 0.83);
      uvs.push(column / segments, row / (rings.length - 1));
      if (row < rings.length - 1 && column < segments) {
        const a = row * (segments + 1) + column, b = a + segments + 1;
        indices.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
