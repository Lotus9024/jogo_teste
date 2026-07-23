export const CARD_CATEGORY_LABELS = Object.freeze({
  basic: 'BÁSICA',
  goblin: 'GOBLIN',
  mage: 'MAGO',
});

export const CARD_DEFINITIONS = Object.freeze([
  Object.freeze({
    id: 'warrior', name: 'Guerreiro', description: 'Um guerreiro comum que luta pelo seu reino com unhas e dentes sem recuar.',
    hp: 2, damage: 2, move: 2, movementType: 'straight', attackType: 'straight', minAttackRange: 1, attackRange: 2, cost: 5, category: 'basic', rarity: 'COMUM', rarityClass: 'common', info: 'HUMANO · COMBATENTE', glyph: '⚔',
    ability: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'Esta carta não possui habilidade.', enabled: false }),
    instant: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'Esta carta não possui habilidade instantânea.', enabled: false })
  }),
  Object.freeze({
    id: 'guard', name: 'Guarda', description: 'Um defensor simples recém treinado, defende o seu reino com corpo e alma.',
    hp: 3, damage: 1, move: 1, movementType: 'any', minAttackRange: 1, attackRange: 1, cost: 5, category: 'basic', rarity: 'COMUM', rarityClass: 'common', info: 'HUMANO · GUARDIÃO', glyph: '♜',
    ability: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'Esta carta não possui habilidade.', enabled: false }),
    instant: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'Esta carta não possui habilidade instantânea.', enabled: false })
  }),
  Object.freeze({
    id: 'henry', name: 'Henry', description: 'Ele pode se movimentar e atacar, ou vice-versa, no mesmo turno.\nEle já entra podendo agir.',
    hp: 1, damage: 1, move: 1, movementType: 'any', minAttackRange: 1, attackRange: 1, cost: 4, category: 'goblin', rarity: 'INCOMUM', rarityClass: 'uncommon', family: 'goblin', info: 'GOBLIN · ÁGIL', glyph: '⚡',
    ability: Object.freeze({ name: 'Agilidade', cost: '—', description: 'Pode realizar um movimento e um ataque no mesmo turno, em qualquer ordem. Entra em campo pronto para agir.', enabled: false }),
    instant: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'Esta carta não possui habilidade instantânea.', enabled: false })
  }),
  Object.freeze({
    id: 'archer', name: 'Arqueiro', description: 'Ele ataca apenas a 3 ou 4 blocos de distância de si mesmo.\nPode atacar por cima de barreiras, mas não de tropas ou construções grandes.',
    hp: 2, damage: 1, move: 1, movementType: 'any', minAttackRange: 3, attackRange: 4, cost: 6, category: 'basic', rarity: 'INCOMUM', rarityClass: 'uncommon', info: 'HUMANO · ATIRADOR', glyph: '➶',
    ability: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'Esta carta não possui habilidade.', enabled: false }),
    instant: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'Esta carta não possui habilidade instantânea.', enabled: false })
  }),
  Object.freeze({
    id: 'wooden_barrier', name: 'Barreira de madeira', description: 'Uma poderosa… Digo, uma barreira de madeira! Não defende de projéteis aéreos.',
    hp: 3, damage: 0, move: 0, movementType: 'none', minAttackRange: 0, attackRange: 0, cost: 2, buildRounds: 1, type: 'construction', category: 'basic', rarity: 'COMUM', rarityClass: 'common', info: 'CONSTRUÇÃO · BARREIRA', glyph: '▥',
    ability: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'Esta carta não possui habilidade.', enabled: false }),
    instant: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'Esta carta não possui habilidade instantânea.', enabled: false })
  }),
  Object.freeze({
    id: 'tower', name: 'Torre', description: 'Você pode colocar um arqueiro em cima da torre.\nEsse arqueiro ganha +1 de distância de ataque e consegue atirar por cima de qualquer construção.\nCaso a torre seja destruída, o arqueiro também é.',
    hp: 5, damage: 0, move: 0, movementType: 'none', minAttackRange: 0, attackRange: 0, cost: 7, buildRounds: 2, type: 'construction', category: 'basic', rarity: 'INCOMUM', rarityClass: 'uncommon', info: 'CONSTRUÇÃO · TORRE', glyph: '♜',
    ability: Object.freeze({ name: 'Rajada cardinal', cost: 2, cooldownTurns: 2, range: 3, damage: 2, description: 'Atira uma flecha em todas as 4 direções retas, com no máximo 3 blocos de distância e 2 de dano.', enabled: true }),
    instant: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'Esta carta não possui habilidade instantânea.', enabled: false })
  }),
  Object.freeze({
    id: 'operator', name: 'Operador', description: 'Esse operador pode operar tudo! Ou quase tudo. Coloque ele atrás de alguma máquina e ele opera.',
    hp: 1, damage: 0, move: 1, movementType: 'any', minAttackRange: 0, attackRange: 0, cost: 3, category: 'basic', rarity: 'COMUM', rarityClass: 'common', info: 'HUMANO · OPERADOR', glyph: '⚙',
    ability: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'Esta carta não possui habilidade.', enabled: false }),
    instant: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'Esta carta não possui habilidade instantânea.', enabled: false })
  }),
  Object.freeze({
    id: 'cannon', name: 'Canhão', description: 'Uma poderosa máquina de cerco que exige um Operador posicionado exatamente atrás para se mover ou disparar.\nEle atinge apenas de 3 a 6 blocos de distância, com 3 de dano central e 1 de dano em área.',
    hp: 1, damage: 3, areaDamage: 1, move: 1, movementType: 'forward', minAttackRange: 3, attackRange: 6, areaRadius: 1, cost: 8, buildRounds: 2, type: 'machine', category: 'basic', rarity: 'INCOMUM', rarityClass: 'uncommon', info: 'MÁQUINA · CERCO', glyph: '◉',
    ability: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'O Canhão precisa de um Operador exatamente uma casa atrás.', enabled: false }),
    instant: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'Esta carta não possui habilidade instantânea.', enabled: false })
  }),
  Object.freeze({
    id: 'wooden_house', name: 'Casa de madeira', description: 'Uma casa de madeira simples e frágil, essa casa hospeda 3 cidadãos.',
    hp: 1, damage: 0, move: 0, movementType: 'none', minAttackRange: 0, attackRange: 0, cost: 3, buildRounds: 1, type: 'construction', category: 'basic', rarity: 'COMUM', rarityClass: 'common', info: 'CONSTRUÇÃO · MORADIA', glyph: '⌂',
    citizens: 3, connectedRoadCitizenBonus: 1,
    ability: Object.freeze({ name: 'Hospedagem', cost: '—', description: 'Fornece 3 cidadãos e mais 1 quando conectada ao castelo por Ruas.', enabled: false }),
    instant: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'Esta carta não possui habilidade instantânea.', enabled: false })
  }),
  Object.freeze({
    id: 'road', name: 'Rua', description: 'Precisa estar conectada a um castelo ou a outra Rua.\nAumenta em 1 quadrado o alcance de movimento de quem está por cima.\nCasas conectadas às Ruas ganham limite para mais 1 cidadão.',
    hp: null, damage: 0, move: 0, movementType: 'none', minAttackRange: 0, attackRange: 0, cost: 1, buildRounds: 1, type: 'terrain', indestructible: true, category: 'basic', rarity: 'COMUM', rarityClass: 'common', info: 'TERRENO · RUA', glyph: '═',
    ability: Object.freeze({ name: 'Caminho do reino', cost: '—', description: 'Terreno permanente que se conecta automaticamente e não pode ser destruído.', enabled: false }),
    instant: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'Esta carta não possui habilidade instantânea.', enabled: false })
  }),
  Object.freeze({
    id: 'goblin', name: 'Goblin', description: 'Um goblin frágil, mas que tem coragem de roubar ouro.',
    hp: 1, damage: 1, move: 1, movementType: 'any', minAttackRange: 1, attackRange: 1, cost: 2, category: 'goblin', rarity: 'COMUM', rarityClass: 'common', family: 'goblin', info: 'GOBLIN · SAQUEADOR', glyph: '♟',
    ability: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'Esta carta não possui habilidade.', enabled: false }),
    instant: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'Esta carta não possui habilidade instantânea.', enabled: false })
  }),
  Object.freeze({
    id: 'goblin_tower', name: 'Torre Goblin', description: 'Cada Goblin seu deixa o custo da torre mais barato.\nQualquer Goblin que nasce ao lado da torre nasce com 1 de vida extra.',
    hp: 5, damage: 0, move: 0, movementType: 'none', minAttackRange: 0, attackRange: 0, cost: 10, minimumCost: 1, goblinDiscount: 1, buildRounds: 1, type: 'construction', category: 'goblin', family: 'goblin', rarity: 'RARA', rarityClass: 'rare', info: 'CONSTRUÇÃO · GOBLIN', glyph: '♜',
    ability: Object.freeze({ name: 'Reforço Goblin', cost: 3, description: 'Consome um Goblin do seu baralho e o invoca em qualquer casa livre da arena. Ele nasce sem poder agir neste turno.', enabled: true }),
    instant: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'Esta carta não possui habilidade instantânea.', enabled: false })
  }),
  Object.freeze({
    id: 'mage', name: 'Mago', description: 'Permite atirar fogo em dois quadrados a no máximo 4 de distância. O fogo causa 2 de dano no primeiro ataque e mais 1 se a tropa não sair; ele some quando o turno volta para você.\nO fogo pode ser utilizado em qualquer lugar sem ser bloqueado.',
    hp: 2, damage: 2, move: 1, movementType: 'any', minAttackRange: 1, attackRange: 4, maxFireCells: 2, cost: 6, category: 'mage', family: 'mage', rarity: 'RARA', rarityClass: 'rare', info: 'MAGO · CONJURADOR', glyph: '✦',
    ability: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'O fogo é conjurado pelo ícone acima do Mago.', enabled: false }),
    instant: Object.freeze({ name: 'Ácido (Instantâneo)', cost: 4, cooldownTurns: 2, damage: 3, radius: 1, description: 'Jogue um ácido em volta do Mago. Todas as tropas em volta tomam 3 de dano, inclusive as suas.', enabled: true })
  }),
  Object.freeze({
    id: 'goblin_altar', name: 'Altar Goblin', description: 'É necessário ter 2 tropas Goblin na área da sua base para usar o Altar Goblin.\nTodas as cartas Goblin custam 1 a menos, podendo custar no mínimo 1.',
    hp: 1, damage: 0, move: 0, movementType: 'none', minAttackRange: 0, attackRange: 0, cost: 7, buildRounds: 1, type: 'construction', category: 'goblin', family: 'goblin', rarity: 'RARA', rarityClass: 'rare', info: 'CONSTRUÇÃO · GOBLIN', glyph: '♨',
    ability: Object.freeze({ name: 'Marcha Goblin', cost: 5, range: 6, cooldownTurns: 2, description: 'Goblins no raio de 6 casas podem se mover uma vez adicional neste turno.', enabled: true }),
    instant: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'Esta carta não possui habilidade instantânea.', enabled: false })
  }),
  Object.freeze({
    id: 'mage_altar', name: 'Altar Mago', description: 'Todas as cartas Mago custam 1 a menos, podendo custar no mínimo 1.\nAo ser construído, naquela rodada você ganha uma carta a mais.',
    hp: 1, damage: 0, move: 0, movementType: 'none', minAttackRange: 0, attackRange: 0, cost: 9, buildRounds: 1, type: 'construction', category: 'mage', family: 'mage', rarity: 'RARA', rarityClass: 'rare', info: 'CONSTRUÇÃO · MAGO', glyph: '✧',
    ability: Object.freeze({ name: 'Selo enfraquecedor', cost: 7, cooldownTurns: 2, durationTurns: 2, description: 'Todos os Goblins da arena recebem -1 de ataque por 2 turnos.', enabled: true }),
    instant: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'Esta carta não possui habilidade instantânea.', enabled: false })
  }),
  Object.freeze({
    id: 'builder_area', name: 'Área de construtor', description: 'Essa carta não tem efeito caso você tenha uma carta Goblin ou Mago na área da sua base.\nVocê ganha +1 de energia por turno (máximo 1) e +1 de resistência nas suas construções no campo e nas próximas.',
    hp: 1, damage: 0, move: 0, movementType: 'none', minAttackRange: 0, attackRange: 0, cost: 7, buildRounds: 1, type: 'construction', category: 'basic', rarity: 'INCOMUM', rarityClass: 'uncommon', info: 'CONSTRUÇÃO · SUPORTE', glyph: '⌂',
    ability: Object.freeze({ name: 'Oficina do reino', cost: '—', description: 'O bônus de energia não acumula; a resistência acumula para cada Área de construtor ativa.', enabled: false }),
    instant: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'Esta carta não possui habilidade instantânea.', enabled: false })
  })
]);

export const CARD_BY_ID = Object.freeze(Object.fromEntries(CARD_DEFINITIONS.map(card => [card.id, card])));
