import * as THREE from 'three';

export function createBoardCoordinates({ getUnits, tile, half }) {
  function unitAtCell(x, z, exclude = null) {
    return getUnits().find(unit => (
      unit !== exclude
      && Math.round((unit.position.x + half) / tile) === x
      && Math.round((unit.position.z + half) / tile) === z
    )) ?? null;
  }

  function baseSeatAtCell(x, z) {
    if (x < 6 || x > 8) return null;
    if (z <= 2) return 2;
    if (z >= 12) return 1;
    return null;
  }

  function baseCellsForSeat(seat) {
    const cells = [];
    const centerZ = seat === 1 ? 13 : 1;
    for (let x = 6; x <= 8; x += 1) {
      for (let z = centerZ - 1; z <= centerZ + 1; z += 1) cells.push({ x, z });
    }
    return cells;
  }

  function snapToTile(value) {
    return THREE.MathUtils.clamp(Math.round((value + half) / tile) * tile - half, -half, half);
  }

  return { unitAtCell, baseSeatAtCell, baseCellsForSeat, snapToTile };
}
