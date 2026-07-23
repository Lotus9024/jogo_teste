import { ORTHOGONAL_DIRECTIONS, cellKey } from '@tronos/shared/cards';
import { makeFireHazard } from '../assets/models/fireHazardModel.js';
import { makeRoad } from '../assets/models/roadModel.js';

export function createBoardPresentation({ scene, app, tile, half, baseCellsForSeat, getUnits = () => [] }) {
  const roads = [];
  const roadMeshes = [];
  const fires = [];
  const fireMeshes = [];

  function roadConnections(road, allRoads) {
    const bases = new Set(baseCellsForSeat(road.ownerSeat).map(cell => cellKey(cell.x, cell.z)));
    const owned = new Set(
      allRoads
        .filter(item => item.ownerSeat === road.ownerSeat && !item.underConstruction)
        .map(item => cellKey(item.x, item.z)),
    );
    const houses = new Set(getUnits()
      .filter(unit => unit.userData.ownerSeat === road.ownerSeat
        && unit.userData.cardId === 'wooden_house' && !unit.userData.underConstruction)
      .map(unit => cellKey(
        Math.round((unit.position.x + half) / tile),
        Math.round((unit.position.z + half) / tile),
      )));
    const names = ['east', 'west', 'south', 'north'];

    return Object.fromEntries(
      ORTHOGONAL_DIRECTIONS.map((direction, index) => {
        const key = cellKey(road.x + direction.x, road.z + direction.z);
        return [names[index], owned.has(key) || bases.has(key) || houses.has(key)];
      }),
    );
  }

  function reconcileRoads(serverRoads) {
    roadMeshes.splice(0).forEach(mesh => scene.remove(mesh));
    roads.splice(0, roads.length, ...serverRoads.map(road => ({ ...road })));
    roads.forEach(road => {
      const mesh = makeRoad(roadConnections(road, roads), tile, {
        underConstruction: Boolean(road.underConstruction),
        cardId: road.cardId ?? 'road',
      });
      mesh.position.set(road.x * tile - half, 0.072, road.z * tile - half);
      mesh.userData = {
        ...mesh.userData,
        roadId: road.id,
        cardId: road.cardId ?? 'road',
        ownerSeat: road.ownerSeat,
        buildReadyRound: road.buildReadyRound,
      };
      roadMeshes.push(mesh);
      scene.add(mesh);
    });
    app.dataset.roads = String(roads.length);
  }

  function reconcileFires(serverFires) {
    fireMeshes.splice(0).forEach(mesh => scene.remove(mesh));
    fires.splice(
      0,
      fires.length,
      ...serverFires.map(fire => ({ ...fire, damagedUnitIds: [...(fire.damagedUnitIds ?? [])] })),
    );
    fires.forEach(fire => {
      const mesh = makeFireHazard(tile);
      mesh.position.set(fire.x * tile - half, 0.079, fire.z * tile - half);
      mesh.userData.fireId = fire.id;
      fireMeshes.push(mesh);
      scene.add(mesh);
    });
    app.dataset.fires = String(fires.length);
  }

  return { roads, roadMeshes, fires, fireMeshes, reconcileRoads, reconcileFires };
}
