export const CARD_DEFINITIONS = Object.freeze([
  Object.freeze({
    id: 'warrior', name: 'Guerreiro', description: 'Combatente versátil da linha de frente, treinado para abrir caminho até o castelo rival.',
    hp: 70, damage: 16, move: 3, attackRange: 1, cost: 3, rarity: 'COMUM', rarityClass: 'common', info: 'HUMANO · COMBATENTE', glyph: '⚔',
    ability: Object.freeze({ name: 'Golpe de Ruptura', cost: 2, description: 'O próximo ataque causa 8 de dano adicional.' }),
    instant: Object.freeze({ name: 'Postura de Guarda', cost: 1, description: 'Reduz em 8 o próximo dano recebido nesta rodada.' })
  }),
  Object.freeze({
    id: 'guard', name: 'Guarda', description: 'Defensor pesado do reino, feito para segurar posições e proteger aliados próximos.',
    hp: 95, damage: 10, move: 2, attackRange: 1, cost: 4, rarity: 'COMUM', rarityClass: 'common', info: 'HUMANO · GUARDIÃO', glyph: '♜',
    ability: Object.freeze({ name: 'Muralha Real', cost: 2, description: 'Recebe um escudo de 12 pontos até o próximo turno.' }),
    instant: Object.freeze({ name: 'Interposição', cost: 2, description: 'Protege imediatamente uma unidade aliada adjacente.' })
  }),
  Object.freeze({
    id: 'archer', name: 'Arqueiro', description: 'Atirador ágil que controla corredores do campo sem abandonar uma posição segura.',
    hp: 48, damage: 15, move: 4, attackRange: 3, cost: 3, rarity: 'COMUM', rarityClass: 'common', info: 'HUMANO · ATIRADOR', glyph: '➶',
    ability: Object.freeze({ name: 'Chuva de Flechas', cost: 2, description: 'Atinge o alvo e inimigos adjacentes com 8 de dano.' }),
    instant: Object.freeze({ name: 'Tiro de Reação', cost: 1, description: 'Dispara uma vez contra um inimigo que entra no alcance.' })
  })
]);

export const CARD_BY_ID = Object.freeze(Object.fromEntries(CARD_DEFINITIONS.map(card => [card.id, card])));
