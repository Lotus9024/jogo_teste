/** Read confirmed snapshots only; these flags never drive simulation or spend resources. */
export function presentationChanges(previous, next) {
  if (!previous || !next) return { damaged: false, healed: false, ability: false };
  return {
    damaged: next.hp < previous.hp,
    healed: next.hp > previous.hp,
    ability: (next.abilityReadyTurn ?? 0) > (previous.abilityReadyTurn ?? 0)
      || (next.instantReadyTurn ?? 0) > (previous.instantReadyTurn ?? 0)
      || (!previous.abilityUsed && Boolean(next.abilityUsed))
      || (next.bonusActions ?? 0) > (previous.bonusActions ?? 0)
      || (next.attackPenalty ?? 0) > (previous.attackPenalty ?? 0),
  };
}
