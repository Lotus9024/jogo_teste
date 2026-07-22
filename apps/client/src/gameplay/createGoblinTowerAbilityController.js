import * as THREE from 'three';
import { CARD_BY_ID } from '@tronos/shared/cards';
import { GAME_CONFIG } from '@tronos/shared/game-config';
import { createCardUnit } from '../models/createCardUnit.js';
import { setUnitTeamColor } from './unitState.js';
import { cards } from '../ui/cardView.js';

export function createGoblinTowerAbilityController({
  state, scene, tile, half, units, hoverables, unitAtCell, baseSeatAtCell, callbacks, syncAbilityBadges,
}) {
  const geometry = new THREE.PlaneGeometry(tile * 0.78, tile * 0.78);
  const material = new THREE.MeshBasicMaterial({
    color: 0x72d55c, transparent: true, opacity: 0.46, depthWrite: false, side: THREE.DoubleSide,
  });
  const markers = [];
  let aiming = false;

  function clearTargets() {
    markers.splice(0).forEach(marker => scene.remove(marker));
    aiming = false;
  }

  function validTarget(x, z) {
    return x >= 0 && x < GAME_CONFIG.boardSize && z >= 0 && z < GAME_CONFIG.boardSize
      && !baseSeatAtCell(x, z) && !unitAtCell(x, z);
  }

  function showTargets() {
    markers.splice(0).forEach(marker => scene.remove(marker));
    if (!aiming || state.selected?.userData.cardId !== 'goblin_tower') return;
    for (let x = 0; x < GAME_CONFIG.boardSize; x += 1) for (let z = 0; z < GAME_CONFIG.boardSize; z += 1) {
      if (!validTarget(x, z)) continue;
      const marker = new THREE.Mesh(geometry, material);
      marker.rotation.x = -Math.PI / 2;
      marker.position.set(x * tile - half, 0.083, z * tile - half);
      scene.add(marker);
      markers.push(marker);
    }
  }

  function available() {
    const tower = state.selected;
    const ownTurn = (state.onlineState?.state.activeSeat ?? state.activePlayer) === tower?.userData.ownerSeat;
    const owned = state.devMode ? tower?.userData.ownerSeat === state.activePlayer : tower?.userData.ownerSeat === state.selfSeat;
    const me = state.onlineState?.state.players.find(player => player.seat === state.selfSeat);
    return tower?.userData.cardId === 'goblin_tower' && owned && ownTurn
      && !tower.userData.actionUsed && !tower.userData.underConstruction
      && (!me || me.energy >= CARD_BY_ID.goblin_tower.ability.cost);
  }

  function activate() {
    if (!available()) return;
    aiming = !aiming;
    callbacks.clearMovementGrid?.();
    showTargets();
  }

  function summonLocally(tower, destination) {
    const index = cards.findIndex(card => card.id === 'goblin');
    const goblin = createCardUnit(cards[index], index);
    goblin.position.set(destination.x * tile - half, 0.06, destination.z * tile - half);
    goblin.userData.ownerSeat = tower.userData.ownerSeat;
    goblin.userData.actionUsed = true;
    const adjacent = Math.abs(destination.x - Math.round((tower.position.x + half) / tile))
      + Math.abs(destination.z - Math.round((tower.position.z + half) / tile)) === 1;
    if (adjacent) goblin.userData.hp = goblin.userData.maxHp = CARD_BY_ID.goblin.hp + 1;
    setUnitTeamColor(goblin, tower.userData.ownerSeat === 1 ? 0x168cff : 0xff352f);
    units.push(goblin);
    hoverables.push(goblin);
    scene.add(goblin);
    tower.userData.actionUsed = true;
    tower.userData.abilityUsed = true;
    syncAbilityBadges();
  }

  function choose(destination) {
    if (!aiming || !available() || !validTarget(destination.x, destination.z)) return false;
    const tower = state.selected;
    if (state.onlineState) callbacks.sendOnlineAction?.({
      type: 'summon_goblin', unitId: tower.userData.serverUnitId, x: destination.x, z: destination.z,
    });
    else summonLocally(tower, destination);
    clearTargets();
    return true;
  }

  return { activate, choose, clearTargets, showTargets, isAiming: () => aiming };
}
