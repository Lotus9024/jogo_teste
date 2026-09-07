import * as THREE from 'three';

/** Render the board in two draw calls; logical cells remain in boardCoordinates. */
export function createBoardTiles({ size, tile, half, materials }) {
  const group = new THREE.Group();
  group.name = 'Casas de pedra chanfrada';
  const bevel = 0.018;
  const edge = (tile - 0.035) / 2 - bevel;
  const outline = new THREE.Shape();
  outline.moveTo(-edge, -edge);
  outline.lineTo(edge, -edge);
  outline.lineTo(edge, edge);
  outline.lineTo(-edge, edge);
  outline.closePath();
  const geometry = new THREE.ExtrudeGeometry(outline, {
    depth: 0.18 - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 1,
    steps: 1,
    curveSegments: 1,
  });
  geometry.translate(0, 0, -(0.18 - bevel * 2) / 2);
  geometry.rotateX(-Math.PI / 2);

  // Match the original slab UV scale: one full masonry texture per tile.
  const positions = geometry.getAttribute('position');
  const uv = geometry.getAttribute('uv');
  for (let index = 0; index < positions.count; index += 1) {
    uv.setXY(index, positions.getX(index) / (tile - 0.035) + 0.5, positions.getZ(index) / (tile - 0.035) + 0.5);
  }
  const counts = [Math.ceil(size * size / 2), Math.floor(size * size / 2)];
  const batches = materials.map((material, parity) => {
    const mesh = new THREE.InstancedMesh(geometry, material, counts[parity]);
    mesh.name = parity === 0 ? 'Casas claras' : 'Casas escuras';
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    mesh.userData.cells = [];
    return mesh;
  });
  const transform = new THREE.Object3D();
  const offsets = [0, 0];
  for (let z = 0; z < size; z += 1) {
    for (let x = 0; x < size; x += 1) {
      const parity = (x + z) % 2;
      transform.position.set(x * tile - half, -0.04 + (((x * 17 + z * 11) % 5) - 2) * 0.004, z * tile - half);
      transform.rotation.y = (((x * 7 + z * 3) % 5) - 2) * 0.0025;
      transform.updateMatrix();
      batches[parity].setMatrixAt(offsets[parity]++, transform.matrix);
      batches[parity].userData.cells.push({ x, z });
    }
  }
  batches.forEach(mesh => {
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingBox();
    mesh.computeBoundingSphere();
    group.add(mesh);
  });
  group.userData.cellCount = size * size;
  group.userData.drawCalls = 2;
  return group;
}
