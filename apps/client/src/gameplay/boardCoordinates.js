import * as THREE from 'three';
import { baseCellsForSeat as sharedBaseCellsForSeat } from '@tronos/shared/cards';

export function createBoardCoordinates({ getUnits, tile, half }) {
  function unitAtCell(x, z, exclude = null) {
    return unitsAtCell(x, z, exclude)[0] ?? null;
  }

  function unitsAtCell(x, z, exclude = null) {
    return getUnits().filter(unit => (
      unit !== exclude
      && Math.round((unit.position.x + half) / tile) === x
      && Math.round((unit.position.z + half) / tile) === z
    ));
  }

  function baseSeatAtCell(x, z) {
    if (x < 6 || x > 8) return null;
    if (z <= 2) return 2;
    if (z >= 12) return 1;
    return null;
  }

  function baseCellsForSeat(seat) {
    return sharedBaseCellsForSeat(seat, 15);
  }

  function snapToTile(value) {
    return THREE.MathUtils.clamp(Math.round((value + half) / tile) * tile - half, -half, half);
  }

  return { unitAtCell, unitsAtCell, baseSeatAtCell, baseCellsForSeat, snapToTile };
}
