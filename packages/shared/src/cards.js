export const CARD_DEFINITIONS = Object.freeze([
  Object.freeze({
    id: 'warrior', name: 'Guerreiro', description: 'Um guerreiro comum que luta pelo seu reino com unhas e dentes sem recuar.',
    hp: 3, damage: 2, move: 2, movementType: 'straight', minAttackRange: 1, attackRange: 2, cost: 4, rarity: 'COMUM', rarityClass: 'common', info: 'HUMANO · COMBATENTE', glyph: '⚔',
    ability: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'Esta carta não possui habilidade.', enabled: false }),
    instant: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'Esta carta não possui habilidade instantânea.', enabled: false })
  }),
  Object.freeze({
    id: 'guard', name: 'Guarda', description: 'Um defensor simples recém treinado, defende o seu reino com corpo e alma.',
    hp: 4, damage: 1, move: 1, movementType: 'any', minAttackRange: 1, attackRange: 1, cost: 4, rarity: 'COMUM', rarityClass: 'common', info: 'HUMANO · GUARDIÃO', glyph: '♜',
    ability: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'Esta carta não possui habilidade.', enabled: false }),
    instant: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'Esta carta não possui habilidade instantânea.', enabled: false })
  }),
  Object.freeze({
    id: 'archer', name: 'Arqueiro', description: 'Um arqueiro silencioso que ataca apenas de longe, ele ataca apenas a 3 e 4 blocos de distância de si mesmo, mantendo a distância. Ele ao matar uma criatura não ocupa a posição dela.',
    hp: 2, damage: 2, move: 2, movementType: 'any', minAttackRange: 3, attackRange: 4, cost: 5, rarity: 'COMUM', rarityClass: 'common', info: 'HUMANO · ATIRADOR', glyph: '➶',
    ability: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'Esta carta não possui habilidade.', enabled: false }),
    instant: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'Esta carta não possui habilidade instantânea.', enabled: false })
  }),
  Object.freeze({
    id: 'wooden_barrier', name: 'Barreira de madeira', description: 'Uma barreira de madeira frágil, defende de ameaças comuns e é intransponível, exceto por ataques aéreos como flechas e criaturas voadoras.',
    hp: 2, damage: 0, move: 0, movementType: 'none', minAttackRange: 0, attackRange: 0, cost: 4, buildRounds: 1, type: 'construction', rarity: 'COMUM', rarityClass: 'common', info: 'CONSTRUÇÃO · BARREIRA', glyph: '▥',
    ability: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'Esta carta não possui habilidade.', enabled: false }),
    instant: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'Esta carta não possui habilidade instantânea.', enabled: false })
  }),
  Object.freeze({
    id: 'tower', name: 'Torre', description: 'Uma torre que precisa de um arqueiro em seu topo. O arqueiro montado recebe +1 de alcance.',
    hp: 5, damage: 0, move: 0, movementType: 'none', minAttackRange: 0, attackRange: 0, cost: 7, buildRounds: 2, type: 'construction', rarity: 'INCOMUM', rarityClass: 'uncommon', info: 'CONSTRUÇÃO · TORRE', glyph: '♜',
    ability: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'A torre precisa de um arqueiro para funcionar.', enabled: false }),
    instant: Object.freeze({ name: 'Rajada cardinal', cost: 2, cooldownRounds: 1, range: 3, damage: 2, description: 'Dispara uma flecha em cada direção reta, alcançando até 3 casas e causando 2 de dano.', enabled: true })
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

export function baseCellsForSeat(seat, boardSize = 15) {
  const centerX = Math.floor(boardSize / 2);
  const centerZ = seat === 1 ? boardSize - 2 : 1;
  const cells = [];
  for (let x = centerX - 1; x <= centerX + 1; x += 1) {
    for (let z = centerZ - 1; z <= centerZ + 1; z += 1) cells.push({ x, z });
  }
  return cells;
}

export function deploymentDistance(seat, cell, boardSize = 15) {
  return Math.min(...baseCellsForSeat(seat, boardSize).map(base => Math.abs(base.x - cell.x) + Math.abs(base.z - cell.z)));
}

export function isDeploymentCell(seat, x, z, boardSize = 15) {
  if (![1, 2].includes(seat) || x < 0 || x >= boardSize || z < 0 || z >= boardSize) return false;
  const value = deploymentDistance(seat, { x, z }, boardSize);
  return value >= 1 && value <= 2;
}
