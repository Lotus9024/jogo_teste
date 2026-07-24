import { CARD_BY_ID, forwardDeltaForSeat, gridCellsBetween } from '@tronos/shared/cards';
import { setAbilityBadgeState, setMageFireBadgeCooling } from '../ui/unitHealthBadge.js';
import { createMageAbilityController } from './createMageAbilityController.js';
import { createGoblinTowerAbilityController } from './createGoblinTowerAbilityController.js';

export function createAbilityController(options) {
  const { state, app, tile, half, units, relations, battleAnimations, callbacks } = options;
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
      if (unit.userData.isGoblinClone) {
        const remaining = Math.max(0, (unit.userData.instantReadyTurn ?? 0) - turn);
        setAbilityBadgeState(unit, {
          remaining,
          enabled: owned && !remaining && !unit.userData.underConstruction
            && Boolean(!me || me.energy >= CARD_BY_ID.goblin_clone.instant.cost),
        });
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
      if (unit.userData.cardId === 'goblin_tower') {
        const ownTurn = (state.onlineState?.state.activeSeat ?? state.activePlayer) === unit.userData.ownerSeat;
        setAbilityBadgeState(unit, {
          remaining: 0,
          enabled: Boolean(owned && ownTurn && !unit.userData.actionUsed && !unit.userData.underConstruction
            && (!me || me.energy >= CARD_BY_ID.goblin_tower.ability.cost)),
        });
      }
      if (unit.userData.cardId === 'goblin_house') {
        const ownTurn = (state.onlineState?.state.activeSeat ?? state.activePlayer) === unit.userData.ownerSeat;
        const remaining = Math.max(0, (unit.userData.abilityReadyTurn ?? 0) - turn);
        setAbilityBadgeState(unit, {
          remaining,
          enabled: Boolean(owned && ownTurn && !remaining && !unit.userData.actionUsed && !unit.userData.underConstruction
            && (!me || me.energy >= CARD_BY_ID.goblin_house.ability.cost)),
        });
      }
      if (['goblin_altar', 'mage_altar', 'goblin_bomber'].includes(unit.userData.cardId)) {
        const card = CARD_BY_ID[unit.userData.cardId];
        const ownTurn = (state.onlineState?.state.activeSeat ?? state.activePlayer) === unit.userData.ownerSeat;
        const remaining = Math.max(0, (unit.userData.abilityReadyTurn ?? 0) - turn);
        setAbilityBadgeState(unit, {
          remaining,
          enabled: Boolean(owned && ownTurn && !remaining && !unit.userData.actionUsed
            && !unit.userData.underConstruction && (!me || me.energy >= card.ability.cost)),
        });
      }
    });
  }

  const mage = createMageAbilityController({
    ...options, currentRound, currentTurnIndex, syncAbilityBadges,
  });
  const goblinTower = createGoblinTowerAbilityController({ ...options, syncAbilityBadges });

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
    if (tower?.userData.cardId !== 'tower' || !owned || !ownTurn || selected.userData.actionUsed || !ready || Boolean(me && me.energy < ability.cost)) return;
    if (state.onlineState) {
      callbacks.sendOnlineAction?.({ type: 'use_ability', unitId: selected.userData.serverUnitId });
      return;
    }
    const origin = {
      x: Math.round((selected.position.x + half) / tile),
      z: Math.round((selected.position.z + half) / tile),
    };
    battleAnimations.launchTowerVolley(selected.position, ability.range);
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

  function activateSelectedAbility() {
    const selected = state.selected;
    const card = CARD_BY_ID[selected?.userData.cardId];
    if (!selected || !['goblin_altar', 'mage_altar', 'goblin_bomber', 'goblin_house'].includes(card?.id)) return false;
    const me = state.onlineState?.state.players.find(player => player.seat === state.selfSeat);
    const ownTurn = (state.onlineState?.state.activeSeat ?? state.activePlayer) === selected.userData.ownerSeat;
    if (selected.userData.underConstruction || selected.userData.actionUsed || !ownTurn
      || (selected.userData.abilityReadyTurn ?? 0) > currentTurnIndex()
      || (me && me.energy < card.ability.cost)) return true;
    if (state.onlineState) callbacks.sendOnlineAction?.({ type: 'use_ability', unitId: selected.userData.serverUnitId });
    else if (card.id === 'goblin_bomber') {
      const origin = {
        x: Math.round((selected.position.x + half) / tile),
        z: Math.round((selected.position.z + half) / tile),
      };
      const forward = forwardDeltaForSeat(selected.userData.ownerSeat);
      const destination = {
        x: origin.x + forward.x * card.ability.chargeDistance,
        z: origin.z + forward.z * card.ability.chargeDistance,
      };
      const occupied = (x, z) => units.some(unit => unit !== selected
        && Math.round((unit.position.x + half) / tile) === x
        && Math.round((unit.position.z + half) / tile) === z);
      if (destination.x < 0 || destination.x >= 15 || destination.z < 0 || destination.z >= 15
        || gridCellsBetween(origin, destination).some(cell => occupied(cell.x, cell.z))) return true;
      const affected = units.filter(unit => unit !== selected).filter(unit => {
        const x = Math.round((unit.position.x + half) / tile);
        const z = Math.round((unit.position.z + half) / tile);
        return Math.max(Math.abs(x - destination.x), Math.abs(z - destination.z)) <= card.ability.radius;
      });
      selected.userData.actionUsed = true;
      battleAnimations.chargeGoblin(
        selected,
        battleAnimations.worldPoint(destination.x, destination.z),
        () => {
          affected.forEach(unit => {
            const targetCard = CARD_BY_ID[unit.userData.cardId];
            const construction = ['construction', 'machine'].includes(targetCard?.type);
            callbacks.damageLocalUnit?.(unit, construction ? card.ability.constructionDamage : card.ability.troopDamage);
          });
          callbacks.damageLocalUnit?.(selected, selected.userData.hp);
        },
      );
    } else selected.userData.actionUsed = true;
    return true;
  }

  function activateCloneInstant() {
    const selected = state.selected;
    if (!selected?.userData.isGoblinClone) return false;
    const me = state.onlineState?.state.players.find(player => player.seat === state.selfSeat);
    const instant = CARD_BY_ID.goblin_clone.instant;
    if ((selected.userData.instantReadyTurn ?? 0) > currentTurnIndex() || (me && me.energy < instant.cost)) return true;
    if (state.onlineState) callbacks.sendOnlineAction?.({ type: 'use_instant', unitId: selected.userData.serverUnitId });
    else {
      selected.userData.cloneDamageBonus = (selected.userData.cloneDamageBonus ?? 0) + 1;
      selected.userData.maxHp += 1;
      selected.userData.hp = Math.min(selected.userData.maxHp, selected.userData.hp + 1);
      selected.userData.instantReadyTurn = currentTurnIndex() + (instant.cooldownTurns ?? 2);
    }
    return true;
  }

  function mount() {
    addEventListener('keydown', event => {
      if (event.key.toLowerCase() !== 'f' || event.repeat || event.target.closest?.('input,textarea')) return;
      event.preventDefault();
      if (state.selected?.userData.isGoblinClone) activateCloneInstant();
      else if (state.selected?.userData.cardId === 'mage') mage.activateAcid();
      else if (state.selected?.userData.cardId === 'goblin_tower') goblinTower.activate();
      else if (!activateSelectedAbility()) activateTowerAbility();
    });
  }

  return {
    mount,
    currentRound,
    currentTurnIndex,
    syncInstantCommand,
    syncAbilityBadges,
    clearMageTargets() { mage.clearTargets(); goblinTower.clearTargets(); },
    showMageTargets: mage.showTargets,
    syncMageCommands: mage.syncCommands,
    toggleMageFireCell: mage.toggleFireCell,
    activateTowerAbility,
    activateMageFire: mage.activateFire,
    activateMageAcid: mage.activateAcid,
    activateCloneInstant,
    activateSelectedAbility,
    isMageAiming: mage.isAiming,
    activateGoblinTower: goblinTower.activate,
    chooseGoblinCell: goblinTower.choose,
    isGoblinTowerAiming: goblinTower.isAiming,
  };
}
