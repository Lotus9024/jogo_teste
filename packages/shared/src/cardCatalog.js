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
    hp: 3, damage: 1, move: 1, movementType: 'any', attackType: 'any', minAttackRange: 1, attackRange: 1, cost: 5, category: 'basic', rarity: 'COMUM', rarityClass: 'common', info: 'HUMANO · GUARDIÃO', glyph: '♜',
    ability: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'Esta carta não possui habilidade.', enabled: false }),
    instant: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'Esta carta não possui habilidade instantânea.', enabled: false })
  }),
  Object.freeze({
    id: 'henry', name: 'Henry', description: 'Entra podendo agir e pode se movimentar e atacar, ou vice-versa, no mesmo turno.\nEle entra com Desordem: ao entrar e no início dos seus próximos turnos, retira 1 de resistência de cada construção Básica sua diretamente ao lado.',
    hp: 1, damage: 1, move: 1, movementType: 'any', attackType: 'any', minAttackRange: 1, attackRange: 1, cost: 4, adjacentConstructionDamage: 1, category: 'goblin', rarity: 'INCOMUM', rarityClass: 'uncommon', family: 'goblin', info: 'GOBLIN · ÁGIL', glyph: '⚡',
    ability: Object.freeze({ name: 'Agilidade', cost: '—', description: 'Pode realizar um movimento e um ataque no mesmo turno, em qualquer ordem. Entra em campo pronto para agir.', enabled: false }),
    instant: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'Esta carta não possui habilidade instantânea.', enabled: false })
  }),
  Object.freeze({
    id: 'archer', name: 'Arqueiro', description: 'Pode atacar por cima de barreiras, mas não de tropas ou construções grandes.\nAtaca apenas a 3 ou 4 blocos de distância.',
    hp: 2, damage: 1, move: 1, movementType: 'any', minAttackRange: 3, attackRange: 4, cost: 6, category: 'basic', rarity: 'INCOMUM', rarityClass: 'uncommon', info: 'HUMANO · ATIRADOR', glyph: '➶',
    ability: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'Esta carta não possui habilidade.', enabled: false }),
    instant: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'Esta carta não possui habilidade instantânea.', enabled: false })
  }),
  Object.freeze({
    id: 'wooden_barrier', name: 'Barreira de madeira', description: 'Uma barreira simples para defesa terrestre.\nNão defende de projéteis aéreos.',
    hp: 3, damage: 0, move: 0, movementType: 'none', minAttackRange: 0, attackRange: 0, cost: 2, buildRounds: 1, type: 'construction', category: 'basic', rarity: 'COMUM', rarityClass: 'common', info: 'CONSTRUÇÃO · BARREIRA', glyph: '▥',
    ability: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'Esta carta não possui habilidade.', enabled: false }),
    instant: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'Esta carta não possui habilidade instantânea.', enabled: false })
  }),
  Object.freeze({
    id: 'tower', name: 'Torre', description: 'Permite posicionar um Arqueiro com +1 de distância de ataque.\nEsse Arqueiro tem visão livre para atirar por cima de qualquer carta.\nCaso a Torre seja destruída, o Arqueiro também é.',
    hp: 5, damage: 0, move: 0, movementType: 'none', minAttackRange: 0, attackRange: 0, cost: 7, buildRounds: 2, type: 'construction', category: 'basic', rarity: 'INCOMUM', rarityClass: 'uncommon', info: 'CONSTRUÇÃO · TORRE', glyph: '♜',
    ability: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'Esta carta não possui habilidade normal.', enabled: false }),
    instant: Object.freeze({ name: 'Rajada cardinal (Instantânea)', cost: 2, cooldownTurns: 2, range: 3, damage: 2, description: 'Atira uma flecha em todas as 4 direções retas, com no máximo 3 blocos de distância e 2 de dano.', enabled: true })
  }),
  Object.freeze({
    id: 'operator', name: 'Operador', description: 'Pode operar quase qualquer máquina.\nEnquanto estiver na arena, conta como 1 cidadão para você.',
    hp: 1, damage: 0, move: 1, movementType: 'any', minAttackRange: 0, attackRange: 0, cost: 3, arenaCitizens: 1, category: 'basic', rarity: 'COMUM', rarityClass: 'common', info: 'HUMANO · OPERADOR', glyph: '⚙',
    ability: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'Esta carta não possui habilidade.', enabled: false }),
    instant: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'Esta carta não possui habilidade instantânea.', enabled: false })
  }),
  Object.freeze({
    id: 'citizen', name: 'Cidadão', description: 'Apenas por estar na arena, conta como 1 cidadão para você.',
    hp: 1, damage: 1, move: 1, movementType: 'any', minAttackRange: 1, attackRange: 1, cost: 2, arenaCitizens: 1, category: 'basic', rarity: 'COMUM', rarityClass: 'common', info: 'HUMANO · CIDADÃO', glyph: '☺',
    ability: Object.freeze({ name: 'Morador do reino', cost: '—', description: 'Conta como 1 cidadão enquanto permanecer na arena.', enabled: false }),
    instant: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'Esta carta não possui habilidade instantânea.', enabled: false })
  }),
  Object.freeze({
    id: 'cannon', name: 'Canhão', description: 'Exige um Operador posicionado exatamente atrás para se mover ou disparar.\nAtinge apenas de 3 a 6 blocos de distância, causando 3 de dano central e 1 de dano em área.',
    hp: 1, damage: 3, areaDamage: 1, move: 1, movementType: 'forward', minAttackRange: 3, attackRange: 6, areaRadius: 1, cost: 7, buildRounds: 2, type: 'machine', category: 'basic', rarity: 'INCOMUM', rarityClass: 'uncommon', info: 'MÁQUINA · CERCO', glyph: '◉',
    ability: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'O Canhão precisa de um Operador exatamente uma casa atrás.', enabled: false }),
    instant: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'Esta carta não possui habilidade instantânea.', enabled: false })
  }),
  Object.freeze({
    id: 'wooden_house', name: 'Casa de madeira', description: 'Uma casa de madeira simples e frágil, essa casa hospeda 3 cidadãos.',
    hp: 1, damage: 0, move: 0, movementType: 'none', minAttackRange: 0, attackRange: 0, cost: 3, buildRounds: 1, type: 'construction', house: true, category: 'basic', rarity: 'COMUM', rarityClass: 'common', info: 'CONSTRUÇÃO · MORADIA', glyph: '⌂',
    citizens: 3, connectedRoadCitizenBonus: 1,
    ability: Object.freeze({ name: 'Hospedagem', cost: '—', description: 'Fornece 3 cidadãos e mais 1 quando conectada ao castelo por Ruas.', enabled: false }),
    instant: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'Esta carta não possui habilidade instantânea.', enabled: false })
  }),
  Object.freeze({
    id: 'goblin_house', name: 'Casa Goblin', description: 'Hospeda 2 cidadãos e Goblins não retiram resistência dela.\nNão pode ser colocada ao lado de outra casa Básica.',
    hp: 1, damage: 0, move: 0, movementType: 'none', minAttackRange: 0, attackRange: 0, cost: 4, buildRounds: 0, type: 'construction', house: true, goblinWearImmune: true, category: 'basic', family: 'goblin', rarity: 'INCOMUM', rarityClass: 'uncommon', info: 'CONSTRUÇÃO · MORADIA GOBLIN', glyph: '⌂',
    citizens: 2,
    ability: Object.freeze({ name: 'Ninhada Goblin', cost: 3, cooldownTurns: 2, description: 'Gera um Goblin na casa à frente. A casa precisa estar livre, e o Goblin nasce sem poder agir neste turno.', enabled: true }),
    instant: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'Esta carta não possui habilidade instantânea.', enabled: false })
  }),
  Object.freeze({
    id: 'road', name: 'Rua', description: 'Precisa estar na área do reino e conectada a um Castelo ou a outra Rua.\nAumenta em 1 quadrado o movimento de quem está por cima e o limite das Casas conectadas em 1 cidadão.',
    hp: null, damage: 0, move: 0, movementType: 'none', minAttackRange: 0, attackRange: 0, cost: 1, buildRounds: 1, type: 'terrain', road: true, movementBonus: 1, connectedHouseCitizenBonus: 1, category: 'basic', rarity: 'COMUM', rarityClass: 'common', info: 'TERRENO · RUA', glyph: '═',
    ability: Object.freeze({ name: 'Caminho do reino', cost: '—', description: 'Terreno que se conecta automaticamente e pode ser destruído por efeitos que atinjam ruas.', enabled: false }),
    instant: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'Esta carta não possui habilidade instantânea.', enabled: false })
  }),
  Object.freeze({
    id: 'goblin', name: 'Goblin', description: 'Um Goblin frágil, mas que tem coragem de roubar ouro.\nEle entra com Desordem: ao entrar e no início dos seus próximos turnos, retira 1 de resistência de cada construção Básica sua diretamente ao lado.',
    hp: 1, damage: 1, move: 1, movementType: 'any', minAttackRange: 1, attackRange: 1, cost: 2, adjacentConstructionDamage: 1, category: 'goblin', rarity: 'COMUM', rarityClass: 'common', family: 'goblin', info: 'GOBLIN · SAQUEADOR', glyph: '♟',
    ability: Object.freeze({ name: 'Desordem', cost: '—', description: 'Ao entrar e no início de cada turno seu, causa 1 de dano a cada construção Básica sua diretamente ao lado.', enabled: false }),
    instant: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'Esta carta não possui habilidade instantânea.', enabled: false })
  }),
  Object.freeze({
    id: 'goblin_swarm', name: 'Enxame Goblin', description: 'Três Goblins surgem em posições aleatórias da sua área de lançamento.\nEles entram com Desordem, mas só retiram resistência de construções no seu próximo turno após o surgimento.',
    hp: 1, damage: 1, move: 1, movementType: 'any', minAttackRange: 1, attackRange: 1, cost: 6, summonCount: 3, summonsCardId: 'goblin', type: 'summon', category: 'goblin', family: 'goblin', rarity: 'INCOMUM', rarityClass: 'uncommon', info: 'GOBLIN · ENXAME', glyph: '♟',
    ability: Object.freeze({ name: 'Enxame', cost: '—', description: 'Ao ser lançada, esta carta se transforma em três Goblins. Cada um aplica Desordem separadamente.', enabled: false }),
    instant: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'Esta carta não possui habilidade instantânea.', enabled: false })
  }),
  Object.freeze({
    id: 'goblin_bomber', name: 'Goblin Bombardeiro', description: 'Ele entra com Desordem: ao entrar e no início de cada turno seu, retira 1 de resistência de cada construção Básica sua diretamente ao lado.',
    hp: 1, damage: 1, move: 1, movementType: 'straight', minAttackRange: 1, attackRange: 1, cost: 4, adjacentConstructionDamage: 1, category: 'goblin', family: 'goblin', rarity: 'INCOMUM', rarityClass: 'uncommon', info: 'GOBLIN · BOMBARDEIRO', glyph: '✹',
    ability: Object.freeze({ name: 'Carga explosiva', cost: 2, chargeDistance: 4, troopDamage: 3, constructionDamage: 4, radius: 1, description: 'Corre 4 blocos para a frente e explode. Causa 3 de dano em tropas e 4 em construções no centro e ao redor, destruindo também as ruas atingidas. O Goblin morre. Enquanto aguarda, também aplica Desordem às construções aliadas diretamente ao lado.', enabled: true }),
    instant: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'Esta carta não possui habilidade instantânea.', enabled: false })
  }),
  Object.freeze({
    id: 'goblin_clone', name: 'Clone Goblin', description: 'Coloca em campo uma cópia da última tropa Goblin que você lançou.\nA cópia mantém as características impressas da tropa e entra sem poder agir.\nCusta o valor impresso da tropa copiada + 2.',
    hp: 1, damage: 1, move: 1, movementType: 'straight', minAttackRange: 1, attackRange: 1, cost: 0, cloneCostExtra: 2, dynamicCost: true, type: 'summon', category: 'goblin', family: 'goblin', rarity: 'INCOMUM', rarityClass: 'uncommon', info: 'FEITIÇO · CLONE GOBLIN', glyph: '♟',
    ability: Object.freeze({ name: 'Clone', cost: '—', description: 'Copia a última tropa Goblin lançada. Não copia Enxame, construções nem altares.', enabled: false }),
    instant: Object.freeze({ name: 'Fortalecer Clone (Instantâneo)', cost: 2, cooldownTurns: 2, description: 'A cópia recebe +1 de vida máxima, recupera 1 de vida e ganha +1 de dano.', enabled: true })
  }),
  Object.freeze({
    id: 'goblin_spanking', name: 'Espanquem', description: 'Todos os seus Goblins podem agir e atacar novamente neste turno.\nGoblins lançados depois deste feitiço entram prontos para agir e atacar.',
    hp: null, damage: 0, move: 0, movementType: 'none', minAttackRange: 0, attackRange: 0, cost: 5, type: 'spell', category: 'goblin', family: 'goblin', rarity: 'INCOMUM', rarityClass: 'uncommon', info: 'FEITIÇO · GOBLIN', glyph: '✺',
    ability: Object.freeze({ name: 'Espanquem', cost: '—', description: 'Ao ser lançado, concede uma ação e um ataque adicionais aos seus Goblins até o fim do turno.', enabled: false }),
    instant: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'O efeito acontece ao lançar a carta.', enabled: false })
  }),
  Object.freeze({
    id: 'goblin_tower', name: 'Torre Goblin', description: 'Goblins que nascem ao lado ganham +1 de vida.\nNecessita de 2 Goblins seus na arena e fica 1 de energia mais barata por cada Goblin seu em jogo, até o custo mínimo de 5.',
    hp: 5, damage: 0, move: 0, movementType: 'none', minAttackRange: 0, attackRange: 0, cost: 10, minimumCost: 5, requiredGoblinTroops: 2, goblinDiscount: 1, buildRounds: 1, type: 'construction', category: 'goblin', family: 'goblin', rarity: 'RARA', rarityClass: 'rare', info: 'CONSTRUÇÃO · GOBLIN', glyph: '♜',
    ability: Object.freeze({ name: 'Reforço Goblin', cost: 4, description: 'Necessita de um Goblin na sua mão. Consome essa carta e invoca o Goblin em qualquer casa livre da arena, exceto na área da base inimiga. Ele nasce sem poder agir neste turno.', enabled: true }),
    instant: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'Esta carta não possui habilidade instantânea.', enabled: false })
  }),
  Object.freeze({
    id: 'mage', name: 'Mago', description: 'Atira fogo em até duas casas a no máximo 3 blocos de distância, sem ser bloqueado. O fogo também pode atingir a base inimiga.\nO Ácido atinge todas as cartas ao redor, menos o próprio Mago.',
    hp: 2, damage: 2, move: 1, movementType: 'any', minAttackRange: 1, attackRange: 3, maxFireCells: 2, cost: 6, category: 'mage', family: 'mage', rarity: 'RARA', rarityClass: 'rare', info: 'MAGO · CONJURADOR', glyph: '✦',
    ability: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'O fogo é conjurado pelo ícone acima do Mago.', enabled: false }),
    instant: Object.freeze({ name: 'Ácido (Instantâneo)', cost: 4, cooldownTurns: 2, damage: 3, radius: 1, description: 'Jogue um ácido em volta do Mago. Todas as cartas em volta tomam 3 de dano, inclusive as suas.', enabled: true })
  }),
  Object.freeze({
    id: 'goblin_altar', name: 'Altar Goblin', description: 'Cartas Goblin custam 1 a menos, podendo custar no mínimo 1, e ao concluir a construção você recebe uma carta Goblin aleatória.\nÉ necessário ter 2 tropas Goblin na área da sua base. Você pode ter apenas um Altar no Deck e só volta a recebê-lo depois que ele for perdido.',
    hp: 1, damage: 0, move: 0, movementType: 'none', minAttackRange: 0, attackRange: 0, cost: 5, buildRounds: 1, type: 'construction', category: 'goblin', family: 'goblin', rarity: 'RARA', rarityClass: 'rare', info: 'CONSTRUÇÃO · GOBLIN', glyph: '♨',
    ability: Object.freeze({ name: 'Marcha Goblin', cost: 4, range: 6, cooldownTurns: 2, description: 'Goblins no raio de 6 casas recebem +1 ação neste turno. A ação extra pode ser usada para mover ou atacar.', enabled: true }),
    instant: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'Esta carta não possui habilidade instantânea.', enabled: false })
  }),
  Object.freeze({
    id: 'mage_altar', name: 'Altar Mago', description: 'Cartas Mago custam 1 a menos, podendo custar no mínimo 1, e ao concluir a construção você escolhe qualquer carta do seu Deck para comprar.\nNão pode ser lançado enquanto você controlar um Goblin na arena. Você pode ter apenas um Altar no Deck e só volta a recebê-lo depois que ele for perdido.',
    hp: 1, damage: 0, move: 0, movementType: 'none', minAttackRange: 0, attackRange: 0, cost: 6, buildRounds: 1, type: 'construction', category: 'mage', family: 'mage', rarity: 'RARA', rarityClass: 'rare', info: 'CONSTRUÇÃO · MAGO', glyph: '✧',
    ability: Object.freeze({ name: 'Selo enfraquecedor', cost: 7, cooldownTurns: 2, durationTurns: 2, description: 'Todos os Goblins da arena recebem -1 de ataque por 2 turnos.', enabled: true }),
    instant: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'Esta carta não possui habilidade instantânea.', enabled: false })
  }),
  Object.freeze({
    id: 'builder_area', name: 'Área de construtor', description: 'Concede +1 de energia por turno e +1 de resistência às suas construções.\nO efeito é anulado enquanto houver uma carta Goblin ou Mago na área da sua base.',
    hp: 1, damage: 0, move: 0, movementType: 'none', minAttackRange: 0, attackRange: 0, cost: 5, buildRounds: 1, type: 'construction', category: 'basic', rarity: 'INCOMUM', rarityClass: 'uncommon', info: 'CONSTRUÇÃO · SUPORTE', glyph: '⌂',
    ability: Object.freeze({ name: 'Oficina do reino', cost: '—', description: 'O bônus de energia não acumula; a resistência acumula para cada Área de construtor ativa.', enabled: false }),
    instant: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'Esta carta não possui habilidade instantânea.', enabled: false })
  }),
  Object.freeze({
    id: 'cobblestone_road', name: 'Estrada de Pedregulhos', description: 'Concede +2 de movimento às cartas Básicas que estiverem por cima e +2 de cidadãos às Casas conectadas.\nPrecisa estar na área do reino e conectada a um Castelo ou a outra Rua.',
    hp: null, damage: 0, move: 0, movementType: 'none', minAttackRange: 0, attackRange: 0, cost: 5, buildRounds: 1, type: 'terrain', road: true, movementBonus: 2, attackBonus: 0, movementCategory: 'basic', connectedHouseCitizenBonus: 2, category: 'basic', rarity: 'INCOMUM', rarityClass: 'uncommon', info: 'TERRENO · ESTRADA', glyph: '▰',
    ability: Object.freeze({ name: 'Caminho pavimentado', cost: '—', description: 'Terreno que aumenta em 2 o movimento de cartas Básicas, conecta Casas ao castelo e pode ser destruído por efeitos que atinjam ruas.', enabled: false }),
    instant: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'Esta carta não possui habilidade instantânea.', enabled: false })
  }),
  Object.freeze({
    id: 'royal_warrior', name: 'Guerreiro Real', description: 'Todos os Guerreiros do seu reino ganham +1 de vida.\nNecessita de 10 cidadãos e não pode ser conjurado enquanto houver Magos ou Goblins seus na arena.',
    hp: 3, damage: 5, move: 2, movementType: 'straight', attackType: 'straight', minAttackRange: 1, attackRange: 2, cost: 7, requiredCitizens: 10, forbidsMageAndGoblin: true, royalWarriorBlessing: 1, category: 'basic', rarity: 'RARA', rarityClass: 'rare', info: 'HUMANO · GUERREIRO REAL', glyph: '♛',
    ability: Object.freeze({ name: 'Sangue da coroa', cost: '—', description: 'Ao entrar na arena, todos os Guerreiros aliados, inclusive ele, recebem +1 de vida máxima e recuperam 1 de vida.', enabled: false }),
    instant: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'Esta carta não possui habilidade instantânea.', enabled: false })
  }),
  Object.freeze({
    id: 'royal_tower', name: 'Torre Real', description: 'Quando a construção termina, todas as construções do seu reino ganham +3 de vida.\nArqueiros ao redor ganham +1 de alcance; um Arqueiro montado também ganha +1 de dano.\nNecessita de 12 cidadãos e não pode ser construída enquanto houver Magos ou Goblins seus na arena. Caso seja destruída, o Arqueiro montado também é.',
    hp: 7, damage: 5, move: 0, movementType: 'none', minAttackRange: 0, attackRange: 0, cost: 8, buildRounds: 3, type: 'construction', requiredCitizens: 12, forbidsMageAndGoblin: true, royalConstructionBlessing: 3, adjacentArcherRangeBonus: 1, archerRangeBonus: 1, archerDamageBonus: 1, category: 'basic', rarity: 'RARA', rarityClass: 'rare', info: 'CONSTRUÇÃO · TORRE REAL', glyph: '♜',
    ability: Object.freeze({ name: 'Fortificação real', cost: '—', description: 'Ao ser concluída, concede +3 de vida máxima e recupera 3 de vida de todas as construções aliadas.', enabled: false }),
    instant: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'Esta carta não possui habilidade instantânea.', enabled: false })
  }),
  Object.freeze({
    id: 'blizzard', name: 'Nevasca', description: 'Pode ser lançada em qualquer casa da arena.\nCausa 1 de dano e faz todas as tropas ao redor perderem 1 de movimento durante os próximos 2 turnos delas.',
    hp: null, damage: 1, move: 0, movementType: 'none', minAttackRange: 0, attackRange: 0, cost: 4, type: 'spell', radius: 1, movementPenalty: 1, durationOpponentTurns: 2, category: 'mage', family: 'mage', rarity: 'INCOMUM', rarityClass: 'uncommon', info: 'FEITIÇO · NEVASCA', glyph: '❄',
    ability: Object.freeze({ name: 'Frio paralisante', cost: '—', description: 'Causa 1 de dano e reduz em 1 o movimento de todas as tropas ao redor por 2 turnos delas.', enabled: false }),
    instant: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'O efeito acontece ao lançar a carta.', enabled: false })
  })
]);

export const CARD_BY_ID = Object.freeze(Object.fromEntries(CARD_DEFINITIONS.map(card => [card.id, card])));
