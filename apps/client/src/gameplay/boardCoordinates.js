import * as THREE from 'three';
import { baseCellsForSeat as sharedBaseCellsForSeat } from '@tronos/shared/cards';

export function createBoardCoordinates({ getUnits, getBaseLevel = () => 1, tile, half }) {
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
    return [1, 2].find(seat => baseCellsForSeat(seat).some(cell => cell.x === x && cell.z === z)) ?? null;
  }

  function baseCellsForSeat(seat) {
    return sharedBaseCellsForSeat(seat, 15, getBaseLevel(seat));
  }

  function snapToTile(value) {
    return THREE.MathUtils.clamp(Math.round((value + half) / tile) * tile - half, -half, half);
  }

  return { unitAtCell, unitsAtCell, baseSeatAtCell, baseCellsForSeat, snapToTile };
}
