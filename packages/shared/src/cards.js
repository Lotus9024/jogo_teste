export const CARD_DEFINITIONS = Object.freeze([
  Object.freeze({
    id: 'warrior', name: 'Guerreiro', description: 'Combatente versátil da linha de frente, treinado para abrir caminho até o castelo rival.',
    hp: 3, damage: 2, move: 2, movementType: 'straight', attackRange: 1, cost: 3, rarity: 'COMUM', rarityClass: 'common', info: 'HUMANO · COMBATENTE', glyph: '⚔',
    ability: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'Esta carta não possui habilidade.', enabled: false }),
    instant: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'Esta carta não possui habilidade instantânea.', enabled: false })
  }),
  Object.freeze({
    id: 'guard', name: 'Guarda', description: 'Defensor pesado do reino, feito para segurar posições e proteger aliados próximos.',
    hp: 4, damage: 1, move: 1, movementType: 'any', attackRange: 1, cost: 3, rarity: 'COMUM', rarityClass: 'common', info: 'HUMANO · GUARDIÃO', glyph: '♜',
    ability: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'Esta carta não possui habilidade.', enabled: false }),
    instant: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'Esta carta não possui habilidade instantânea.', enabled: false })
  }),
  Object.freeze({
    id: 'archer', name: 'Arqueiro', description: 'Atirador ágil que controla corredores do campo sem abandonar uma posição segura.',
    hp: 2, damage: 2, move: 2, movementType: 'any', attackRange: 3, cost: 4, rarity: 'COMUM', rarityClass: 'common', info: 'HUMANO · ATIRADOR', glyph: '➶',
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
