import { CARD_BY_ID } from '@tronos/shared/cards';
import { setArcherMountedState } from '../models/unitModels.js';
import { updateHealthBadge } from '../ui/unitHealthBadge.js';

export function createLocalCombatController({
  app,
  scene,
  tile,
  half,
  units,
  hoverables,
  fires,
  unitAtCell,
  unitsAtCell,
  baseSeatAtCell,
  damageEffects,
  relations,
  boardPresentation,
  callbacks,
}) {
  function removeLocalUnit(unit) {
    const removedTowerId = relations.towerId(unit);
    units.splice(units.indexOf(unit), 1);
    hoverables.splice(hoverables.indexOf(unit), 1);
    scene.remove(unit);
    units.filter(candidate => candidate.userData.mountedOnTowerId === removedTowerId).forEach(candidate => {
      candidate.userData.mountedOnTowerId = null;
      candidate.userData.attackRange = CARD_BY_ID[candidate.userData.cardId].attackRange;
      candidate.position.y = 0.06;
      setArcherMountedState(candidate, false);
    });
    callbacks.syncAbilityBadges?.();
  }

  function damageLocalUnit(unit, amount) {
    if (!unit || !units.includes(unit)) return;
    damageEffects.show(unit.position, amount);
    unit.userData.hp -= amount;
    updateHealthBadge(unit);
    if (unit.userData.hp <= 0) removeLocalUnit(unit);
  }

  function applyLocalFireEntry(unit) {
    const cell = {
      x: Math.round((unit.position.x + half) / tile),
      z: Math.round((unit.position.z + half) / tile),
    };
    const pending = fires.filter(fire =>
      fire.x === cell.x && fire.z === cell.z && !fire.damagedUnitIds.includes(unit.uuid),
    );
    for (const fire of pending) {
      fire.damagedUnitIds.push(unit.uuid);
      damageLocalUnit(unit, 1);
      if (!units.includes(unit)) break;
    }
  }

  function resolveLocalFires(endingSeat) {
    fires.filter(fire => fire.ownerSeat !== endingSeat).forEach(fire => {
      const occupant = unitAtCell(fire.x, fire.z);
      if (occupant && !fire.damagedUnitIds.includes(occupant.uuid)) damageLocalUnit(occupant, 1);
    });
    boardPresentation.reconcileFires(fires.filter(fire => fire.ownerSeat === endingSeat));
  }

  function fireCannon(unit, destination, origin, originPosition, forward) {
    const operator = unitAtCell(origin.x - forward.x, origin.z - forward.z, unit);
    unit.position.copy(originPosition);
    if (operator?.userData.cardId !== 'operator' || operator.userData.ownerSeat !== unit.userData.ownerSeat) {
      callbacks.showGameError?.('O Canhão precisa de um Operador exatamente atrás.');
      return;
    }
    [...units].filter(candidate => Math.max(
      Math.abs(Math.round((candidate.position.x + half) / tile) - destination.x),
      Math.abs(Math.round((candidate.position.z + half) / tile) - destination.z),
    ) <= unit.userData.areaRadius).forEach(candidate => {
      const impactDistance = Math.max(
        Math.abs(Math.round((candidate.position.x + half) / tile) - destination.x),
        Math.abs(Math.round((candidate.position.z + half) / tile) - destination.z),
      );
      const damage = impactDistance === 0 ? unit.userData.damage : unit.userData.areaDamage;
      damageEffects.show(candidate.position, damage);
      candidate.userData.hp -= damage;
      updateHealthBadge(candidate);
      if (candidate.userData.hp <= 0) {
        units.splice(units.indexOf(candidate), 1);
        hoverables.splice(hoverables.indexOf(candidate), 1);
        scene.remove(candidate);
      }
    });
  }

  function moveCannon(unit, destination, target, origin, originPosition, forward) {
    const operator = unitAtCell(origin.x - forward.x, origin.z - forward.z, unit);
    if (operator?.userData.cardId !== 'operator' || operator.userData.ownerSeat !== unit.userData.ownerSeat) {
      unit.position.copy(originPosition);
      callbacks.showGameError?.('O Canhão precisa de um Operador exatamente atrás.');
      return;
    }
    if (target || baseSeatAtCell(destination.x, destination.z)) {
      unit.position.copy(originPosition);
      callbacks.showGameError?.('A casa à frente do Canhão está bloqueada.');
      return;
    }
    operator.position.set(origin.x * tile - half, 0.06, origin.z * tile - half);
    unit.position.set(destination.worldX, 0.06, destination.worldZ);
    applyLocalFireEntry(operator);
    applyLocalFireEntry(unit);
  }

  function attackTarget(unit, target, destination, origin, originPosition, validDistance) {
    const defeatedPosition = target.position.clone();
    unit.position.copy(originPosition);
    if (!validDistance) {
      callbacks.showGameError?.('Alvo fora de alcance.');
      return;
    }
    damageEffects.show(target.position, unit.userData.damage);
    target.userData.hp -= unit.userData.damage;
    updateHealthBadge(target);
    app.dataset.lastAttack = `${unit.userData.name}->${target.userData.name}:${Math.max(0, target.userData.hp)}`;
    if (target.userData.hp > 0) return;
    const removedTowerId = relations.towerId(target);
    units.splice(units.indexOf(target), 1);
    hoverables.splice(hoverables.indexOf(target), 1);
    scene.remove(target);
    units.filter(candidate => candidate.userData.mountedOnTowerId === removedTowerId).forEach(candidate => {
      candidate.userData.mountedOnTowerId = null;
      candidate.userData.attackRange = CARD_BY_ID[candidate.userData.cardId].attackRange;
      candidate.position.y = 0.06;
      setArcherMountedState(candidate, false);
    });
    if (unit.userData.cardId !== 'archer' && !unitsAtCell(destination.x, destination.z, unit).length) {
      unit.position.set(defeatedPosition.x, 0.06, defeatedPosition.z);
    }
  }

  return {
    removeLocalUnit,
    damageLocalUnit,
    applyLocalFireEntry,
    resolveLocalFires,
    fireCannon,
    moveCannon,
    attackTarget,
  };
}
