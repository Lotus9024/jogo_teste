import { CARD_BY_ID } from '@tronos/shared/cards';
import { setAbilityBadgeState, setMageFireBadgeCooling } from '../ui/unitHealthBadge.js';
import { createMageAbilityController } from './createMageAbilityController.js';

export function createAbilityController(options) {
  const { state, app, tile, half, units, relations, callbacks } = options;
  const currentRound = () => state.onlineState?.state.round ?? state.round;
  const currentTurnIndex = () => {
    const seat = state.onlineState?.state.activeSeat ?? state.activePlayer;
    return (currentRound() - 1) * 2 + (seat === 2 ? 1 : 0);
  };

  function syncInstantCommand() {
    app.dataset.instantAvailable = String(Boolean(relations.towerForArcher(state.selected)));
  }

  function syncAbilityBadges() {
    const turn = currentTurnIndex();
    const me = state.onlineState?.state.players.find(player => player.seat === state.selfSeat);
    units.forEach(unit => {
      const owned = state.onlineState
        ? unit.userData.ownerSeat === state.selfSeat
        : unit.userData.ownerSeat === state.activePlayer;
      if (unit.userData.cardId === 'mage') {
        const remaining = Math.max(0, (unit.userData.instantReadyTurn ?? 0) - turn);
        setAbilityBadgeState(unit, {
          remaining,
          enabled: owned && !remaining && !unit.userData.underConstruction
            && Boolean(!me || me.energy >= CARD_BY_ID.mage.instant.cost),
        });
        setMageFireBadgeCooling(unit, Boolean(unit.userData.actionUsed));
      }
      if (unit.userData.cardId === 'tower') {
        const archer = relations.archerForTower(unit);
        const remaining = Math.max(0, (archer?.userData.abilityReadyTurn ?? 0) - turn);
        const ownTurn = (state.onlineState?.state.activeSeat ?? state.activePlayer) === unit.userData.ownerSeat;
        setAbilityBadgeState(unit, {
          remaining,
          enabled: Boolean(archer && owned && ownTurn && !remaining && !archer.userData.actionUsed
            && !unit.userData.underConstruction && (!me || me.energy >= CARD_BY_ID.tower.ability.cost)),
        });
      }
    });
  }

  const mage = createMageAbilityController({
    ...options, currentRound, currentTurnIndex, syncAbilityBadges,
  });

  function activateTowerAbility() {
    const selected = state.selected;
    const tower = relations.towerForArcher(selected);
    const owned = state.devMode
      ? selected?.userData.ownerSeat === state.activePlayer
      : selected?.userData.ownerSeat === state.selfSeat;
    const me = state.onlineState?.state.players.find(player => player.seat === state.selfSeat);
    const ownTurn = (state.onlineState?.state.activeSeat ?? state.activePlayer) === selected?.userData.ownerSeat;
    const ability = CARD_BY_ID.tower.ability;
    const ready = (selected?.userData.abilityReadyTurn ?? 0) <= currentTurnIndex();
    if (!tower || !owned || !ownTurn || selected.userData.actionUsed || !ready || Boolean(me && me.energy < ability.cost)) return;
    if (state.onlineState) {
      callbacks.sendOnlineAction?.({ type: 'use_ability', unitId: selected.userData.serverUnitId });
      return;
    }
    const origin = {
      x: Math.round((selected.position.x + half) / tile),
      z: Math.round((selected.position.z + half) / tile),
    };
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const target = units.filter(unit => unit !== selected).map(unit => {
        const x = Math.round((unit.position.x + half) / tile);
        const z = Math.round((unit.position.z + half) / tile);
        const step = dx ? (x - origin.x) / dx : (z - origin.z) / dz;
        return { unit, x, z, step };
      }).filter(item => item.step >= 1 && item.step <= ability.range
        && item.x === origin.x + dx * item.step && item.z === origin.z + dz * item.step)
        .sort((a, b) => a.step - b.step)[0]?.unit;
      if (target && target.userData.ownerSeat !== selected.userData.ownerSeat) callbacks.damageLocalUnit?.(target, ability.damage);
    }
    selected.userData.actionUsed = true;
    selected.userData.abilityUsed = true;
    selected.userData.abilityReadyTurn = currentTurnIndex() + (ability.cooldownTurns ?? 2);
    syncInstantCommand();
    syncAbilityBadges();
  }

  function mount() {
    addEventListener('keydown', event => {
      if (event.key.toLowerCase() !== 'f' || event.repeat || event.target.closest?.('input,textarea')) return;
      event.preventDefault();
      if (state.selected?.userData.cardId === 'mage') mage.activateAcid();
      else activateTowerAbility();
    });
  }

  return {
    mount,
    currentRound,
    currentTurnIndex,
    syncInstantCommand,
    syncAbilityBadges,
    clearMageTargets: mage.clearTargets,
    showMageTargets: mage.showTargets,
    syncMageCommands: mage.syncCommands,
    toggleMageFireCell: mage.toggleFireCell,
    activateTowerAbility,
    activateMageFire: mage.activateFire,
    activateMageAcid: mage.activateAcid,
    isMageAiming: mage.isAiming,
  };
}
