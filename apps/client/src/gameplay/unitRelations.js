import * as THREE from 'three';
import { setArcherMountedState } from '../models/unitModels.js';

export function createUnitRelations(units) {
  const archerMountPoint = new THREE.Vector3();
  const towerId = unit => unit.userData.serverUnitId ?? unit.uuid;

  function towerForArcher(unit) {
    if (unit?.userData.cardId !== 'archer' || !unit.userData.mountedOnTowerId) return null;
    return units.find(candidate =>
      towerId(candidate) === unit.userData.mountedOnTowerId
      && ['tower', 'royal_tower'].includes(candidate.userData.cardId)
      && !candidate.userData.underConstruction,
    ) ?? null;
  }

  function archerForTower(tower) {
    if (!['tower', 'royal_tower'].includes(tower?.userData.cardId)) return null;
    return units.find(candidate =>
      candidate.userData.cardId === 'archer'
      && candidate.userData.mountedOnTowerId === towerId(tower),
    ) ?? null;
  }

  function placeArcherOnTower(unit, tower) {
    const mount = tower.getObjectByName('archerMount');
    tower.updateMatrixWorld(true);
    if (mount) unit.position.copy(mount.getWorldPosition(archerMountPoint));
    else unit.position.set(tower.position.x, 0.94, tower.position.z);
    setArcherMountedState(unit, true);
  }

  return { towerId, towerForArcher, archerForTower, placeArcherOnTower };
}
