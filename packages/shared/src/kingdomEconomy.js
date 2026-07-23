import { CARD_BY_ID } from './cardCatalog.js';
import { baseCellsForSeat, cellKey, ORTHOGONAL_DIRECTIONS } from './boardRules.js';

function roadCard(road) {
  return CARD_BY_ID[road.cardId ?? 'road'] ?? CARD_BY_ID.road;
}

export function isRoadCard(cardId) {
  return CARD_BY_ID[cardId]?.road === true;
}

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
  const completedRoads = new Map(roads
    .filter(road => road.ownerSeat === seat && !road.underConstruction)
    .map(road => [cellKey(road.x, road.z), road]));
  const housedCitizens = units
    .filter(unit => unit.ownerSeat === seat && unit.cardId === 'wooden_house' && !unit.underConstruction)
    .reduce((total, house) => {
      const connectedBonuses = ORTHOGONAL_DIRECTIONS
        .map(direction => cellKey(house.x + direction.x, house.z + direction.z))
        .filter(key => connected.has(key))
        .map(key => roadCard(completedRoads.get(key)).connectedHouseCitizenBonus ?? 0);
      return total + CARD_BY_ID.wooden_house.citizens + Math.max(0, ...connectedBonuses);
    }, 0);
  const arenaCitizens = units
    .filter(unit => unit.ownerSeat === seat && !unit.underConstruction)
    .reduce((total, unit) => total + (CARD_BY_ID[unit.cardId]?.arenaCitizens ?? 0), 0);
  return housedCitizens + arenaCitizens;
}

export function roadMovementBonus(x, z, roads, unitCardId = null) {
  const road = roads.find(item => item.x === x && item.z === z && !item.underConstruction);
  if (!road) return 0;
  const definition = roadCard(road);
  if (definition.movementCategory && CARD_BY_ID[unitCardId]?.category !== definition.movementCategory) return 0;
  return definition.movementBonus ?? 1;
}

export function roadAttackBonus(x, z, roads, unitCardId = null) {
  const road = roads.find(item => item.x === x && item.z === z && !item.underConstruction);
  if (!road) return 0;
  const definition = roadCard(road);
  if (definition.attackCategory && CARD_BY_ID[unitCardId]?.category !== definition.attackCategory) return 0;
  return definition.attackBonus ?? 0;
}

export function completedRoadCount(seat, roads) {
  return roads.filter(road => road.ownerSeat === seat && !road.underConstruction).length;
}
