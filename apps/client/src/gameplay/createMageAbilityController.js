import * as THREE from 'three';
import { CARD_BY_ID, cellKey } from '@tronos/shared/cards';
import { GAME_CONFIG } from '@tronos/shared/game-config';
import { setMageFireBadgeActive } from '../ui/unitHealthBadge.js';

export function createMageAbilityController({
  state, scene, tile, half, units, fires, unitAtCell, mageEffects,
  boardPresentation, callbacks, currentRound, currentTurnIndex, syncAbilityBadges,
}) {
  const geometry = new THREE.PlaneGeometry(tile * 0.78, tile * 0.78);
  const targetMaterial = new THREE.MeshBasicMaterial({
    color: 0xff4728, transparent: true, opacity: 0.48, depthWrite: false, side: THREE.DoubleSide,
  });
  const chosenMaterial = new THREE.MeshBasicMaterial({
    color: 0xffc247, transparent: true, opacity: 0.78, depthWrite: false, side: THREE.DoubleSide,
  });
  const markers = [];
  let aiming = false;
  let fireCells = [];

  function clearTargets() {
    markers.splice(0).forEach(marker => scene.remove(marker));
    if (state.selected?.userData.cardId === 'mage') setMageFireBadgeActive(state.selected, false);
    aiming = false;
    fireCells = [];
  }

  function showTargets() {
    markers.splice(0).forEach(marker => scene.remove(marker));
    if (!aiming || state.selected?.userData.cardId !== 'mage') return;
    const origin = {
      x: Math.round((state.selected.position.x + half) / tile),
      z: Math.round((state.selected.position.z + half) / tile),
    };
    const chosen = new Set(fireCells.map(cell => cellKey(cell.x, cell.z)));
    for (let dx = -4; dx <= 4; dx += 1) {
      for (let dz = -4; dz <= 4; dz += 1) {
        const distance = Math.abs(dx) + Math.abs(dz);
        const x = origin.x + dx;
        const z = origin.z + dz;
        if (distance < 1 || distance > 4 || x < 0 || x >= GAME_CONFIG.boardSize || z < 0 || z >= GAME_CONFIG.boardSize) continue;
        const marker = new THREE.Mesh(geometry, chosen.has(cellKey(x, z)) ? chosenMaterial : targetMaterial);
        marker.rotation.x = -Math.PI / 2;
        marker.position.set(x * tile - half, 0.082, z * tile - half);
        scene.add(marker);
        markers.push(marker);
      }
    }
  }

  function syncCommands() {
    if (state.selected?.userData.cardId !== 'mage') {
      clearTargets();
      return;
    }
    setMageFireBadgeActive(state.selected, aiming);
  }

  function toggleFireCell(destination) {
    const origin = {
      x: Math.round((state.selected.position.x + half) / tile),
      z: Math.round((state.selected.position.z + half) / tile),
    };
    const distance = Math.abs(destination.x - origin.x) + Math.abs(destination.z - origin.z);
    if (distance < 1 || distance > CARD_BY_ID.mage.attackRange) {
      callbacks.showGameError?.('Escolha uma casa a até 4 quadrados do Mago.');
      return;
    }
    const index = fireCells.findIndex(cell => cell.x === destination.x && cell.z === destination.z);
    if (index >= 0) fireCells.splice(index, 1);
    else if (fireCells.length < CARD_BY_ID.mage.maxFireCells) fireCells.push({ x: destination.x, z: destination.z });
    else {
      callbacks.showGameError?.('O Mago pode incendiar no máximo duas casas.');
      return;
    }
    showTargets();
    syncCommands();
  }

  function castFireLocally(cells) {
    const selected = state.selected;
    const additions = cells.map((cell, index) => ({
      id: `local-fire-${state.round}-${Date.now()}-${index}`,
      ownerSeat: selected.userData.ownerSeat ?? state.activePlayer,
      casterUnitId: selected.uuid,
      ...cell,
      damagedUnitIds: [],
    }));
    boardPresentation.reconcileFires([...fires, ...additions]);
    additions.forEach(fire => {
      const target = unitAtCell(fire.x, fire.z);
      if (target) callbacks.damageLocalUnit?.(target, CARD_BY_ID.mage.damage);
    });
    selected.userData.actionUsed = true;
    syncAbilityBadges();
  }

  function activateFire() {
    const selected = state.selected;
    const owned = state.devMode
      ? selected?.userData.ownerSeat === state.activePlayer
      : selected?.userData.ownerSeat === state.selfSeat;
    const unavailable = selected?.userData.cardId !== 'mage' || !owned || selected.userData.actionUsed
      || Boolean(state.onlineState && state.onlineState.state.activeSeat !== state.selfSeat);
    if (unavailable) return;
    if (!aiming) {
      aiming = true;
      fireCells = [];
      callbacks.clearMovementGrid?.();
      showTargets();
      syncCommands();
      return;
    }
    if (!fireCells.length) return;
    const cells = fireCells.map(cell => ({ ...cell }));
    if (state.onlineState) callbacks.sendOnlineAction?.({ type: 'mage_fire', unitId: selected.userData.serverUnitId, cells });
    else castFireLocally(cells);
    clearTargets();
    syncCommands();
  }

  function activateAcid() {
    const selected = state.selected;
    const owned = state.devMode
      ? selected?.userData.ownerSeat === state.activePlayer
      : selected?.userData.ownerSeat === state.selfSeat;
    const me = state.onlineState?.state.players.find(player => player.seat === state.selfSeat);
    const instant = CARD_BY_ID.mage.instant;
    const ready = (selected?.userData.instantReadyTurn ?? 0) <= currentTurnIndex();
    if (selected?.userData.cardId !== 'mage' || !owned || !ready || selected.userData.underConstruction || Boolean(me && me.energy < instant.cost)) return;
    mageEffects.castAcid(selected);
    if (state.onlineState) {
      callbacks.sendOnlineAction?.({ type: 'use_instant', unitId: selected.userData.serverUnitId });
      return;
    }
    const origin = {
      x: Math.round((selected.position.x + half) / tile),
      z: Math.round((selected.position.z + half) / tile),
    };
    [...units].filter(unit => unit !== selected && Math.max(
      Math.abs(Math.round((unit.position.x + half) / tile) - origin.x),
      Math.abs(Math.round((unit.position.z + half) / tile) - origin.z),
    ) <= instant.radius).forEach(unit => callbacks.damageLocalUnit?.(unit, instant.damage));
    selected.userData.instantUsedRound = currentRound();
    selected.userData.instantReadyTurn = currentTurnIndex() + (instant.cooldownTurns ?? 2);
    syncCommands();
    syncAbilityBadges();
  }

  return {
    clearTargets,
    showTargets,
    syncCommands,
    toggleFireCell,
    activateFire,
    activateAcid,
    isAiming: () => aiming,
  };
}
