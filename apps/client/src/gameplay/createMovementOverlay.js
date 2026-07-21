import * as THREE from 'three';
import { isAttackDistanceValid, movementDistance } from '@tronos/shared/cards';
import { setAttackHighlight } from './unitState.js';

export function createMovementOverlay({
  scene,
  app,
  units,
  tile,
  half,
  unitAtCell,
  baseSeatAtCell,
  baseCellsForSeat,
  getMatchContext
}) {
  const geometry = new THREE.PlaneGeometry(tile * 0.82, tile * 0.82);
  const movementMaterial = new THREE.MeshBasicMaterial({ color: 0x60b8e8, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide });
  const attackMaterial = new THREE.MeshBasicMaterial({ color: 0xff3b2e, transparent: true, opacity: 0.7, depthWrite: false, side: THREE.DoubleSide });
  const markers = [];

  function clear() {
    markers.splice(0).forEach(marker => scene.remove(marker));
    units.filter(unit => unit.userData.attackHighlighted).forEach(unit => setAttackHighlight(unit, false));
    app.dataset.movementTiles = '0';
    app.dataset.attackTiles = '0';
  }

  function addMarker(x, z, material) {
    const marker = new THREE.Mesh(geometry, material);
    marker.rotation.x = -Math.PI / 2;
    marker.position.set(x * tile - half, 0.076, z * tile - half);
    scene.add(marker);
    markers.push(marker);
  }

  function show(unit) {
    clear();
    const { onlineState, selfSeat, devMode } = getMatchContext();
    const onlineAllowed = onlineState
      && unit.userData.ownerSeat === selfSeat
      && onlineState.state.activeSeat === selfSeat
      && !unit.userData.actionUsed;
    if (!devMode && !onlineAllowed) return;

    const originX = Math.round((unit.position.x + half) / tile);
    const originZ = Math.round((unit.position.z + half) / tile);
    const range = unit.userData.move;
    for (let dx = -range; dx <= range; dx += 1) {
      for (let dz = -range; dz <= range; dz += 1) {
        const x = originX + dx;
        const z = originZ + dz;
        const distance = movementDistance(unit.userData.movementType, { x: 0, z: 0 }, { x: dx, z: dz });
        if (!distance || distance > range || x < 0 || x >= 15 || z < 0 || z >= 15 || baseSeatAtCell(x, z) || unitAtCell(x, z, unit)) continue;
        addMarker(x, z, movementMaterial);
      }
    }

    const attackTargets = unit.userData.underConstruction || unit.userData.damage <= 0 ? [] : units.filter(target => {
      const distance = Math.abs(target.position.x - unit.position.x) / tile + Math.abs(target.position.z - unit.position.z) / tile;
      return target !== unit && (devMode || target.userData.ownerSeat !== selfSeat) && isAttackDistanceValid(unit.userData, distance);
    });
    attackTargets.forEach(target => {
      addMarker(Math.round((target.position.x + half) / tile), Math.round((target.position.z + half) / tile), attackMaterial);
      setAttackHighlight(target, true);
    });

    const opponentBaseCells = onlineState && unit.userData.ownerSeat === selfSeat ? baseCellsForSeat(selfSeat === 1 ? 2 : 1) : [];
    const baseInRange = opponentBaseCells.length > 0 && isAttackDistanceValid(
      unit.userData,
      Math.min(...opponentBaseCells.map(cell => Math.abs(cell.x - originX) + Math.abs(cell.z - originZ)))
    );
    if (baseInRange) opponentBaseCells.forEach(cell => addMarker(cell.x, cell.z, attackMaterial));
    app.dataset.movementTiles = String(markers.length - attackTargets.length - (baseInRange ? opponentBaseCells.length : 0));
    app.dataset.attackTiles = String(attackTargets.length + (baseInRange ? 1 : 0));
  }

  return { clear, show };
}
