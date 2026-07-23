import * as THREE from 'three';
import { forwardDeltaForSeat, gridCellsBetween, isAttackTargetValid, isCannonTargetValid, isGoblinTroop, movementDistance, roadMovementBonus } from '@tronos/shared/cards';
import { isMountedArcher, setAttackHighlight } from './unitState.js';

export function createMovementOverlay({
  scene,
  app,
  units,
  tile,
  half,
  unitAtCell,
  baseSeatAtCell,
  baseCellsForSeat,
  getRoads,
  getMatchContext
}) {
  const geometry = new THREE.PlaneGeometry(tile * 0.82, tile * 0.82);
  const movementMaterial = new THREE.MeshBasicMaterial({ color: 0x43d17d, transparent: true, opacity: 0.42, depthWrite: false, side: THREE.DoubleSide });
  const attackMaterial = new THREE.MeshBasicMaterial({ color: 0xff3b2e, transparent: true, opacity: 0.7, depthWrite: false, side: THREE.DoubleSide });
  const markers = [];
  const interactiveCells = new Set();

  function clear() {
    markers.splice(0).forEach(marker => scene.remove(marker));
    interactiveCells.clear();
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
    interactiveCells.add(`${x}:${z}`);
  }

  function lineBlocked(from, to, excludedUnit) {
    return gridCellsBetween(from, to).some(cell => unitAtCell(cell.x, cell.z, excludedUnit));
  }

  function attackLineBlocked(unit, from, to) {
    if (isMountedArcher(unit)) return false;
    return gridCellsBetween(from, to).some(cell => {
      const blocker = unitAtCell(cell.x, cell.z, unit);
      return blocker && (unit.userData.cardId !== 'archer' || blocker.userData.cardId !== 'wooden_barrier');
    });
  }

  function show(unit) {
    clear();
    const { onlineState, selfSeat, devMode } = getMatchContext();
    const onlineAllowed = onlineState
      && unit.userData.ownerSeat === selfSeat
      && onlineState.state.activeSeat === selfSeat
      && (!unit.userData.actionUsed || (isGoblinTroop(unit.userData.cardId) && (unit.userData.bonusMoves ?? 0) > 0));
    if (!devMode && !onlineAllowed) return;

    const originX = Math.round((unit.position.x + half) / tile);
    const originZ = Math.round((unit.position.z + half) / tile);
    const range = unit.userData.move + roadMovementBonus(originX, originZ, getRoads(), unit.userData.cardId);
    const movementAvailable = unit.userData.cardId !== 'henry' || !unit.userData.movedThisTurn || (unit.userData.bonusMoves ?? 0) > 0;
    const attackAvailable = unit.userData.cardId !== 'henry' || !unit.userData.attackedThisTurn;
    if (unit.userData.cardId === 'cannon') {
      const forward = forwardDeltaForSeat(unit.userData.ownerSeat);
      const operator = unitAtCell(originX - forward.x, originZ - forward.z, unit);
      const x = originX + forward.x, z = originZ + forward.z;
      if (operator?.userData.cardId === 'operator'
        && operator.userData.ownerSeat === unit.userData.ownerSeat
        && !operator.userData.actionUsed
        && !unitAtCell(x, z, unit)
        && !baseSeatAtCell(x, z)) addMarker(x, z, movementMaterial);
    } else if (movementAvailable && !isMountedArcher(unit)) for (let dx = -range; dx <= range; dx += 1) {
      for (let dz = -range; dz <= range; dz += 1) {
        const x = originX + dx;
        const z = originZ + dz;
        const distance = movementDistance(unit.userData.movementType, { x: 0, z: 0 }, { x: dx, z: dz });
        const occupant = unitAtCell(x, z, unit);
        const mountableTower = unit.userData.cardId === 'archer'
          && occupant?.userData.cardId === 'tower'
          && occupant.userData.ownerSeat === unit.userData.ownerSeat
          && !occupant.userData.underConstruction;
        if (!distance || distance > range || x < 0 || x >= 15 || z < 0 || z >= 15 || baseSeatAtCell(x, z) || (occupant && !mountableTower) || lineBlocked({ x: originX, z: originZ }, { x, z }, unit)) continue;
        addMarker(x, z, movementMaterial);
      }
    }

    const attackTargets = !attackAvailable || unit.userData.underConstruction || unit.userData.damage <= 0 || unit.userData.cardId === 'mage' ? [] : units.filter(target => {
      const targetCell = { x: Math.round((target.position.x + half) / tile), z: Math.round((target.position.z + half) / tile) };
      const distance = Math.abs(targetCell.x - originX) + Math.abs(targetCell.z - originZ);
      const cannonCanTarget = unit.userData.cardId === 'cannon' && isCannonTargetValid({ x: originX, z: originZ, ownerSeat: unit.userData.ownerSeat }, targetCell);
      return target !== unit && (cannonCanTarget || target.userData.ownerSeat !== unit.userData.ownerSeat) && (cannonCanTarget || isAttackTargetValid(unit.userData, { x: originX, z: originZ }, targetCell)) && !attackLineBlocked(unit, { x: originX, z: originZ }, targetCell);
    });
    const cannonAttackCells = [];
    if (unit.userData.cardId === 'cannon' && !unit.userData.underConstruction && unit.userData.damage > 0) {
      const forward = forwardDeltaForSeat(unit.userData.ownerSeat);
      for (let step = unit.userData.minAttackRange; step <= unit.userData.attackRange; step += 1) {
        const cell = { x: originX + forward.x * step, z: originZ + forward.z * step };
        if (cell.x < 0 || cell.x >= 15 || cell.z < 0 || cell.z >= 15 || attackLineBlocked(unit, { x: originX, z: originZ }, cell)) continue;
        cannonAttackCells.push(cell);
        addMarker(cell.x, cell.z, attackMaterial);
      }
    }
    attackTargets.forEach(target => {
      if (unit.userData.cardId !== 'cannon') addMarker(Math.round((target.position.x + half) / tile), Math.round((target.position.z + half) / tile), attackMaterial);
      setAttackHighlight(target, true);
    });

    const opponentBaseCells = attackAvailable && onlineState && unit.userData.ownerSeat === selfSeat ? baseCellsForSeat(selfSeat === 1 ? 2 : 1) : [];
    const reachableBaseCells = opponentBaseCells.filter(cell => (unit.userData.cardId === 'cannon'
      ? isCannonTargetValid({ x: originX, z: originZ, ownerSeat: unit.userData.ownerSeat }, cell)
      : isAttackTargetValid(unit.userData, { x: originX, z: originZ }, cell))
      && !attackLineBlocked(unit, { x: originX, z: originZ }, cell));
    const baseInRange = reachableBaseCells.length > 0;
    reachableBaseCells.forEach(cell => {
      if (unit.userData.cardId !== 'cannon' || !cannonAttackCells.some(item => item.x === cell.x && item.z === cell.z)) addMarker(cell.x, cell.z, attackMaterial);
    });
    const attackMarkerCount = unit.userData.cardId === 'cannon' ? cannonAttackCells.length : attackTargets.length + reachableBaseCells.length;
    app.dataset.movementTiles = String(markers.length - attackMarkerCount);
    app.dataset.attackTiles = String(attackMarkerCount);
  }

  return { clear, show, isInteractiveCell: (x, z) => interactiveCells.has(`${x}:${z}`) };
}
