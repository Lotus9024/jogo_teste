import { randomUUID } from 'node:crypto';
import { CARD_BY_ID } from '@tronos/shared/cards';
import { damageUnit } from './combat.js';

const MAX_TRANSIENT_EFFECTS = 32;

function isTroop(cardId) {
  const type = CARD_BY_ID[cardId]?.type;
  return !['construction', 'machine', 'terrain', 'spell', 'summon'].includes(type);
}

export function pushBattleEffect(state, effect) {
  state.effects ??= [];
  state.effects.push({ id: randomUUID(), ...effect });
  if (state.effects.length > MAX_TRANSIENT_EFFECTS) {
    state.effects.splice(0, state.effects.length - MAX_TRANSIENT_EFFECTS);
  }
}

export function applyRoyalWarriorBlessing(state, warrior) {
  const amount = CARD_BY_ID.royal_warrior.royalWarriorBlessing;
  state.units
    .filter(unit => unit.ownerSeat === warrior.ownerSeat
      && ['warrior', 'royal_warrior'].includes(unit.cardId))
    .forEach(unit => {
      unit.royalWarriorHpBonus = (unit.royalWarriorHpBonus ?? 0) + amount;
      unit.maxHp += amount;
      unit.hp = Math.min(unit.maxHp, unit.hp + amount);
    });
}

export function applyRoyalTowerBlessing(state, tower) {
  const amount = CARD_BY_ID.royal_tower.royalConstructionBlessing;
  state.units
    .filter(unit => unit.ownerSeat === tower.ownerSeat
      && CARD_BY_ID[unit.cardId]?.type === 'construction'
      && !unit.underConstruction)
    .forEach(unit => {
      unit.royalConstructionBonus = (unit.royalConstructionBonus ?? 0) + amount;
      unit.maxHp += amount;
      unit.hp = Math.min(unit.maxHp, unit.hp + amount);
    });
}

export function castBlizzard(state, player, card, x, z) {
  const targetSeat = player.seat === 1 ? 2 : 1;
  const affected = [...state.units].filter(unit =>
    unit.ownerSeat === targetSeat
    && isTroop(unit.cardId)
    && Math.max(Math.abs(unit.x - x), Math.abs(unit.z - z)) <= card.radius);

  for (const unit of affected) {
    unit.movementPenalty = Math.max(unit.movementPenalty ?? 0, card.movementPenalty);
    unit.movementPenaltyTurns = Math.max(unit.movementPenaltyTurns ?? 0, card.durationOpponentTurns);
    damageUnit(state, unit, card.damage);
  }

  state.snowstorms ??= [];
  const storm = {
    id: randomUUID(),
    ownerSeat: player.seat,
    targetSeat,
    x,
    z,
    radius: card.radius,
    remainingTurns: card.durationOpponentTurns,
  };
  state.snowstorms.push(storm);
  pushBattleEffect(state, {
    type: 'blizzard_cast',
    ownerSeat: player.seat,
    x,
    z,
    radius: card.radius,
  });
}

export function finishSnowstormTurn(state, endingSeat) {
  state.units
    .filter(unit => unit.ownerSeat === endingSeat && (unit.movementPenaltyTurns ?? 0) > 0)
    .forEach(unit => {
      unit.movementPenaltyTurns -= 1;
      if (unit.movementPenaltyTurns <= 0) {
        unit.movementPenalty = 0;
        unit.movementPenaltyTurns = 0;
      }
    });

  state.snowstorms = (state.snowstorms ?? []).flatMap(storm => {
    if (storm.targetSeat !== endingSeat) return [storm];
    const remainingTurns = storm.remainingTurns - 1;
    return remainingTurns > 0 ? [{ ...storm, remainingTurns }] : [];
  });
}
