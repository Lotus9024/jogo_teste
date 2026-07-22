import { CARD_BY_ID } from './cardCatalog.js';
import { baseCellsForSeat, cellKey, ORTHOGONAL_DIRECTIONS } from './boardRules.js';

export function connectedRoadKeys(seat, roads, boardSize = 15) {
  const completedRoads = roads.filter(road => road.ownerSeat === seat && !road.underConstruction);
  const owned = new Set(completedRoads.map(road => cellKey(road.x, road.z)));
  const bases = new Set(baseCellsForSeat(seat, boardSize).map(cell => cellKey(cell.x, cell.z)));
  const connected = new Set();
  const queue = completedRoads.filter(road => ORTHOGONAL_DIRECTIONS.some(direction => bases.has(cellKey(road.x + direction.x, road.z + direction.z))));
  queue.forEach(road => connected.add(cellKey(road.x, road.z)));
  for (let index = 0; index < queue.length; index += 1) {
    const road = queue[index];
    for (const direction of ORTHOGONAL_DIRECTIONS) {
      const key = cellKey(road.x + direction.x, road.z + direction.z);
      if (!owned.has(key) || connected.has(key)) continue;
      connected.add(key);
      const [x, z] = key.split(':').map(Number);
      queue.push({ x, z });
    }
  }
  return connected;
}

export function isRoadPlacementCell(seat, x, z, roads, boardSize = 15) {
  if (x < 0 || x >= boardSize || z < 0 || z >= boardSize || roads.some(road => road.x === x && road.z === z)) return false;
  const bases = new Set(baseCellsForSeat(seat, boardSize).map(cell => cellKey(cell.x, cell.z)));
  const connected = connectedRoadKeys(seat, roads, boardSize);
  return ORTHOGONAL_DIRECTIONS.some(direction => {
    const key = cellKey(x + direction.x, z + direction.z);
    return bases.has(key) || connected.has(key);
  });
}

export function citizensForSeat(seat, units, roads, boardSize = 15) {
  const connected = connectedRoadKeys(seat, roads, boardSize);
  return units
    .filter(unit => unit.ownerSeat === seat && unit.cardId === 'wooden_house' && !unit.underConstruction)
    .reduce((total, house) => total + CARD_BY_ID.wooden_house.citizens + (ORTHOGONAL_DIRECTIONS.some(direction => connected.has(cellKey(house.x + direction.x, house.z + direction.z))) ? CARD_BY_ID.wooden_house.connectedRoadCitizenBonus : 0), 0);
}

export function roadMovementBonus(x, z, roads) {
  return roads.some(road => road.x === x && road.z === z && !road.underConstruction) ? 1 : 0;
}

export function completedRoadCount(seat, roads) {
  return roads.filter(road => road.ownerSeat === seat && !road.underConstruction).length;
}
