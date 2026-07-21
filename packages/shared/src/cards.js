export const CARD_DEFINITIONS = Object.freeze([
  Object.freeze({
    id: 'warrior', name: 'Guerreiro', description: 'Um guerreiro comum que luta pelo seu reino com unhas e dentes sem recuar.',
    hp: 3, damage: 2, move: 2, movementType: 'straight', minAttackRange: 1, attackRange: 1, cost: 3, rarity: 'COMUM', rarityClass: 'common', info: 'HUMANO · COMBATENTE', glyph: '⚔',
    ability: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'Esta carta não possui habilidade.', enabled: false }),
    instant: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'Esta carta não possui habilidade instantânea.', enabled: false })
  }),
  Object.freeze({
    id: 'guard', name: 'Guarda', description: 'Um defensor simples recém treinado, defende o seu reino com corpo e alma.',
    hp: 4, damage: 1, move: 1, movementType: 'any', minAttackRange: 1, attackRange: 1, cost: 3, rarity: 'COMUM', rarityClass: 'common', info: 'HUMANO · GUARDIÃO', glyph: '♜',
    ability: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'Esta carta não possui habilidade.', enabled: false }),
    instant: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'Esta carta não possui habilidade instantânea.', enabled: false })
  }),
  Object.freeze({
    id: 'archer', name: 'Arqueiro', description: 'Um arqueiro silencioso que ataca apenas de longe, ele ataca apenas a 3 e 4 blocos de distância de si mesmo, mantendo a distância. Ele ao matar uma criatura não ocupa a posição dela.',
    hp: 2, damage: 2, move: 2, movementType: 'any', minAttackRange: 3, attackRange: 4, cost: 4, rarity: 'COMUM', rarityClass: 'common', info: 'HUMANO · ATIRADOR', glyph: '➶',
    ability: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'Esta carta não possui habilidade.', enabled: false }),
    instant: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'Esta carta não possui habilidade instantânea.', enabled: false })
  }),
  Object.freeze({
    id: 'wooden_barrier', name: 'Barreira de madeira', description: 'Uma barreira de madeira frágil, defende de ameaças comuns e é intransponível, exceto por ataques aéreos como flechas e criaturas voadoras.',
    hp: 2, damage: 0, move: 0, movementType: 'none', minAttackRange: 0, attackRange: 0, cost: 3, buildRounds: 1, type: 'construction', rarity: 'COMUM', rarityClass: 'common', info: 'CONSTRUÇÃO · BARREIRA', glyph: '▥',
    ability: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'Esta carta não possui habilidade.', enabled: false }),
    instant: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'Esta carta não possui habilidade instantânea.', enabled: false })
  })
]);

export const CARD_BY_ID = Object.freeze(Object.fromEntries(CARD_DEFINITIONS.map(card => [card.id, card])));

export function movementDistance(movementType, from, to) {
  const dx = Math.abs(from.x - to.x), dz = Math.abs(from.z - to.z);
  if (movementType === 'straight') return dx === 0 || dz === 0 ? dx + dz : Number.POSITIVE_INFINITY;
  if (movementType === 'any') return Math.max(dx, dz);
  return dx + dz;
}

export function isAttackDistanceValid(card, value) {
  const minimum = card.minAttackRange ?? 1;
  return value >= minimum && value <= card.attackRange;
}
