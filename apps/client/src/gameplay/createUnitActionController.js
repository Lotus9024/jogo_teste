import {
  CARD_BY_ID,
  forwardDeltaForSeat,
  gridCellsBetween,
  isAttackDistanceValid,
  isCannonTargetValid,
  movementDistance,
} from '@tronos/shared/cards';
import { isMountedArcher } from './unitState.js';
import { setArcherMountedState } from '../models/unitModels.js';
import { createLocalCombatController } from './createLocalCombatController.js';

export function createUnitActionController(options) {
  const {
    state, tile, half, units, unitAtCell, unitsAtCell, baseSeatAtCell, relations, callbacks,
  } = options;
  const local = createLocalCombatController(options);

  function markHenryAction(unit, action) {
    if (unit.userData.cardId !== 'henry') return;
    if (action === 'move') unit.userData.movedThisTurn = true;
    if (action === 'attack') unit.userData.attackedThisTurn = true;
    unit.userData.actionUsed = Boolean(unit.userData.movedThisTurn && unit.userData.attackedThisTurn);
  }

  function canCommandUnit(unit) {
    return Boolean(unit && (state.devMode
      ? unit.userData.ownerSeat === state.activePlayer
      : state.onlineState
        && unit.userData.ownerSeat === state.selfSeat
        && state.onlineState.state.activeSeat === state.selfSeat
        && !unit.userData.actionUsed));
  }

  function mountArcherLocally(unit, tower) {
    relations.placeArcherOnTower(unit, tower);
    unit.userData.mountedOnTowerId = relations.towerId(tower);
    unit.userData.attackRange = CARD_BY_ID.archer.attackRange + 1;
    callbacks.selectUnit?.(unit, { cinematic: false });
    callbacks.syncAbilityBadges?.();
  }

  function sendOnlineMoveOrAttack(unit, destination, target, origin, context) {
    unit.position.copy(context.originPosition);
    if (context.mountable || context.cannonMove) {
      callbacks.sendOnlineAction?.({ type: 'move', unitId: unit.userData.serverUnitId, ...destination });
      return;
    }
    if (target && (target.userData.ownerSeat !== state.selfSeat || context.cannonTarget)) {
      const targetDistance = Math.abs(destination.x - origin.x) + Math.abs(destination.z - origin.z);
      const valid = unit.userData.cardId === 'cannon'
        ? context.cannonTarget
        : isAttackDistanceValid(unit.userData, targetDistance);
      if (valid) callbacks.sendOnlineAction?.({ type: 'attack', unitId: unit.userData.serverUnitId, targetUnitId: target.userData.serverUnitId });
      else callbacks.showGameError?.('Alvo fora de alcance.');
    } else if (target) callbacks.showGameError?.('Esta casa já está ocupada.');
    else if (context.baseTarget) callbacks.sendOnlineAction?.({ type: 'attack', unitId: unit.userData.serverUnitId, targetBaseSeat: context.opponentBaseSeat });
    else if (context.cannonTarget) callbacks.sendOnlineAction?.({ type: 'attack', unitId: unit.userData.serverUnitId, x: destination.x, z: destination.z });
    else if (unit.userData.cardId === 'cannon') callbacks.showGameError?.('Escolha a casa verde à frente ou uma casa vermelha de disparo.');
    else callbacks.sendOnlineAction?.({ type: 'move', unitId: unit.userData.serverUnitId, ...destination });
  }

  function moveOrAttackUnit(unit, destination, explicitTarget = null, originPosition = unit.position.clone()) {
    const origin = {
      x: Math.round((originPosition.x + half) / tile),
      z: Math.round((originPosition.z + half) / tile),
    };
    const occupants = unitsAtCell(destination.x, destination.z, unit);
    const target = explicitTarget ?? occupants.find(item => item !== unit) ?? null;
    const opponentBaseSeat = state.selfSeat === 1 ? 2 : 1;
    const baseTarget = state.onlineState && baseSeatAtCell(destination.x, destination.z) === opponentBaseSeat;
    const mountable = unit.userData.cardId === 'archer'
      && target?.userData.cardId === 'tower'
      && target.userData.ownerSeat === unit.userData.ownerSeat
      && !target.userData.underConstruction
      && occupants.every(item => item === target);
    const hostileTarget = target && target.userData.ownerSeat !== unit.userData.ownerSeat;
    if (unit.userData.cardId === 'mage' && (hostileTarget || baseTarget)) {
      unit.position.copy(originPosition);
      callbacks.showGameError?.('Use CONJURAR FOGO e escolha uma ou duas casas.');
      return;
    }
    const forward = forwardDeltaForSeat(unit.userData.ownerSeat);
    const cannonTarget = unit.userData.cardId === 'cannon'
      && isCannonTargetValid({ ...origin, ownerSeat: unit.userData.ownerSeat }, destination);
    const cannonMove = unit.userData.cardId === 'cannon'
      && destination.x === origin.x + forward.x && destination.z === origin.z + forward.z;
    if (isMountedArcher(unit) && !hostileTarget && !baseTarget) {
      unit.position.copy(originPosition);
      callbacks.showGameError?.('O arqueiro na torre não pode se mover.');
      return;
    }
    const blockers = gridCellsBetween(origin, destination)
      .map(cell => unitAtCell(cell.x, cell.z, unit)).filter(Boolean);
    const mountedShot = isMountedArcher(unit) && (hostileTarget || baseTarget);
    const archerShotOverBarriers = unit.userData.cardId === 'archer'
      && (hostileTarget || baseTarget)
      && blockers.every(blocker => blocker.userData.cardId === 'wooden_barrier');
    if (blockers.length && !mountedShot && !archerShotOverBarriers) {
      unit.position.copy(originPosition);
      return;
    }
    if (state.onlineState) {
      sendOnlineMoveOrAttack(unit, destination, target, origin, {
        mountable, cannonMove, cannonTarget, baseTarget, opponentBaseSeat, originPosition,
      });
      return;
    }
    if (!state.devMode) return;
    const moveDistance = movementDistance(unit.userData.movementType, origin, destination);
    if (mountable) {
      unit.position.copy(originPosition);
      if (moveDistance <= unit.userData.move) mountArcherLocally(unit, target);
      else callbacks.showGameError?.('Movimento fora de alcance.');
    } else if (cannonMove) local.moveCannon(unit, destination, target, origin, originPosition, forward);
    else if (unit.userData.cardId === 'cannon' && cannonTarget) local.fireCannon(unit, destination, origin, originPosition, forward);
    else if (target) {
      const targetDistance = Math.abs(destination.x - origin.x) + Math.abs(destination.z - origin.z);
      if (local.attackTarget(unit, target, destination, origin, originPosition, cannonTarget || isAttackDistanceValid(unit.userData, targetDistance))) {
        markHenryAction(unit, 'attack');
      }
    } else if (moveDistance > unit.userData.move) {
      unit.position.copy(originPosition);
      callbacks.showGameError?.('Movimento fora de alcance.');
    } else {
      unit.position.set(destination.worldX, 0.06, destination.worldZ);
      unit.userData.mountedOnTowerId = null;
      setArcherMountedState(unit, false);
      unit.userData.attackRange = CARD_BY_ID[unit.userData.cardId].attackRange;
      local.applyLocalFireEntry(unit);
      markHenryAction(unit, 'move');
    }
  }

  return {
    removeLocalUnit: local.removeLocalUnit,
    damageLocalUnit: local.damageLocalUnit,
    applyLocalFireEntry: local.applyLocalFireEntry,
    resolveLocalFires: local.resolveLocalFires,
    canCommandUnit,
    mountArcherLocally,
    moveOrAttackUnit,
  };
}
