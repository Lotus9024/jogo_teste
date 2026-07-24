import { CARD_BY_ID } from '@tronos/shared/cards';
import { updateHealthBadge } from '../ui/unitHealthBadge.js';

function isTroop(cardId) {
  const type = CARD_BY_ID[cardId]?.type;
  return !['construction', 'machine', 'terrain', 'spell', 'summon'].includes(type);
}

export function createLocalCardEffects({
  units,
  tile,
  half,
  battleAnimations,
  callbacks,
}) {
  function healAndIncrease(unit, amount, bonusField) {
    unit.userData[bonusField] = (unit.userData[bonusField] ?? 0) + amount;
    unit.userData.maxHp += amount;
    unit.userData.hp = Math.min(unit.userData.maxHp, unit.userData.hp + amount);
    updateHealthBadge(unit);
  }

  function applyRoyalWarriorBlessing(warrior) {
    const amount = CARD_BY_ID.royal_warrior.royalWarriorBlessing;
    units
      .filter(unit => unit.userData.ownerSeat === warrior.userData.ownerSeat
        && ['warrior', 'royal_warrior'].includes(unit.userData.cardId))
      .forEach(unit => healAndIncrease(unit, amount, 'royalWarriorHpBonus'));
  }

  function applyRoyalTowerBlessing(tower) {
    if (tower.userData.royalBlessingApplied) return;
    tower.userData.royalBlessingApplied = true;
    const amount = CARD_BY_ID.royal_tower.royalConstructionBlessing;
    units
      .filter(unit => unit.userData.ownerSeat === tower.userData.ownerSeat
        && CARD_BY_ID[unit.userData.cardId]?.type === 'construction'
        && !unit.userData.underConstruction)
      .forEach(unit => healAndIncrease(unit, amount, 'royalConstructionBonus'));
  }

  function castBlizzard({ ownerSeat, x, z, card = CARD_BY_ID.blizzard }) {
    const targetSeat = ownerSeat === 1 ? 2 : 1;
    const affected = [...units].filter(unit => {
      if (unit.userData.ownerSeat !== targetSeat || !isTroop(unit.userData.cardId)) return false;
      const unitX = Math.round((unit.position.x + half) / tile);
      const unitZ = Math.round((unit.position.z + half) / tile);
      return Math.max(Math.abs(unitX - x), Math.abs(unitZ - z)) <= card.radius;
    });
    affected.forEach(unit => {
      unit.userData.movementPenalty = Math.max(unit.userData.movementPenalty ?? 0, card.movementPenalty);
      unit.userData.movementPenaltyTurns = Math.max(unit.userData.movementPenaltyTurns ?? 0, card.durationOpponentTurns);
      callbacks.damageLocalUnit?.(unit, card.damage);
    });
    battleAnimations.createLocalSnowstorm({
      ownerSeat,
      targetSeat,
      x,
      z,
      radius: card.radius,
      remainingTurns: card.durationOpponentTurns,
    });
  }

  function finishSnowstormTurn(endingSeat) {
    units
      .filter(unit => unit.userData.ownerSeat === endingSeat && (unit.userData.movementPenaltyTurns ?? 0) > 0)
      .forEach(unit => {
        unit.userData.movementPenaltyTurns -= 1;
        if (unit.userData.movementPenaltyTurns <= 0) {
          unit.userData.movementPenalty = 0;
          unit.userData.movementPenaltyTurns = 0;
        }
      });
    battleAnimations.finishLocalSnowstormTurn(endingSeat);
  }

  return {
    applyRoyalWarriorBlessing,
    applyRoyalTowerBlessing,
    castBlizzard,
    finishSnowstormTurn,
  };
}
