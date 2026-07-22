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
    id: 'henry', name: 'Henry', description: 'Henry tem pernas curtas, mas é ágil. Pode se movimentar e atacar no mesmo turno, em qualquer ordem, e entra em campo pronto para agir.',
    hp: 1, damage: 1, move: 1, movementType: 'any', minAttackRange: 1, attackRange: 1, cost: 4, rarity: 'INCOMUM', rarityClass: 'uncommon', info: 'HUMANO · ÁGIL', glyph: '⚡',
    ability: Object.freeze({ name: 'Agilidade', cost: '—', description: 'Pode realizar um movimento e um ataque no mesmo turno, em qualquer ordem. Entra em campo pronto para agir.', enabled: false }),
    instant: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'Esta carta não possui habilidade instantânea.', enabled: false })
  }),
  Object.freeze({
    id: 'archer', name: 'Arqueiro', description: 'Um arqueiro silencioso que ataca apenas de longe, a 3 ou 4 blocos de distância. Pode atacar por cima de barreiras, mas não de tropas. Ao matar uma criatura, não ocupa a posição dela.',
    hp: 2, damage: 2, move: 1, movementType: 'any', minAttackRange: 3, attackRange: 4, cost: 6, rarity: 'INCOMUM', rarityClass: 'uncommon', info: 'HUMANO · ATIRADOR', glyph: '➶',
    ability: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'Esta carta não possui habilidade.', enabled: false }),
    instant: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'Esta carta não possui habilidade instantânea.', enabled: false })
  }),
  Object.freeze({
    id: 'wooden_barrier', name: 'Barreira de madeira', description: 'Uma barreira de madeira frágil, defende de ameaças comuns e é intransponível, exceto por ataques aéreos como flechas e criaturas voadoras.',
    hp: 3, damage: 0, move: 0, movementType: 'none', minAttackRange: 0, attackRange: 0, cost: 2, buildRounds: 1, type: 'construction', rarity: 'COMUM', rarityClass: 'common', info: 'CONSTRUÇÃO · BARREIRA', glyph: '▥',
    ability: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'Esta carta não possui habilidade.', enabled: false }),
    instant: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'Esta carta não possui habilidade instantânea.', enabled: false })
  }),
  Object.freeze({
    id: 'tower', name: 'Torre', description: 'Uma torre que precisa de um arqueiro em seu topo. O arqueiro montado recebe +1 de alcance e pode atacar mesmo com unidades à frente.',
    hp: 5, damage: 0, move: 0, movementType: 'none', minAttackRange: 0, attackRange: 0, cost: 7, buildRounds: 2, type: 'construction', rarity: 'INCOMUM', rarityClass: 'uncommon', info: 'CONSTRUÇÃO · TORRE', glyph: '♜',
    ability: Object.freeze({ name: 'Rajada cardinal', cost: 2, cooldownTurns: 2, range: 3, damage: 2, description: 'Durante seu turno, dispara uma flecha em cada direção reta, alcançando até 3 casas e causando 2 de dano. Recarrega após 1 rodada.', enabled: true }),
    instant: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'Esta carta não possui habilidade instantânea.', enabled: false })
  }),
  Object.freeze({
    id: 'operator', name: 'Operador', description: 'Esse operador pode operar tudo, ou quase tudo. Posicione-o atrás de uma máquina para fazê-la funcionar.',
    hp: 1, damage: 0, move: 1, movementType: 'any', minAttackRange: 0, attackRange: 0, cost: 3, rarity: 'COMUM', rarityClass: 'common', info: 'HUMANO · OPERADOR', glyph: '⚙',
    ability: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'Esta carta não possui habilidade.', enabled: false }),
    instant: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'Esta carta não possui habilidade instantânea.', enabled: false })
  }),
  Object.freeze({
    id: 'cannon', name: 'Canhão', description: 'Uma poderosa máquina de cerco que exige um Operador posicionado exatamente atrás para se mover e disparar. Seu projétil atinge alvos entre 3 e 6 quadrados de distância, mas não atravessa tropas nem construções. Causa 3 de dano no quadrado escolhido e 1 de dano nas oito casas imediatamente ao redor. O disparo não distingue amigos de inimigos.',
    hp: 1, damage: 3, areaDamage: 1, move: 1, movementType: 'forward', minAttackRange: 3, attackRange: 6, areaRadius: 1, cost: 8, buildRounds: 2, type: 'machine', rarity: 'INCOMUM', rarityClass: 'uncommon', info: 'MÁQUINA · CERCO', glyph: '◉',
    ability: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'O Canhão precisa de um Operador exatamente uma casa atrás.', enabled: false }),
    instant: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'Esta carta não possui habilidade instantânea.', enabled: false })
  }),
  Object.freeze({
    id: 'wooden_house', name: 'Casa de madeira', description: 'Uma casa de madeira simples e frágil, essa casa pode hospedar 3 cidadãos.',
    hp: 1, damage: 0, move: 0, movementType: 'none', minAttackRange: 0, attackRange: 0, cost: 3, buildRounds: 1, type: 'construction', rarity: 'COMUM', rarityClass: 'common', info: 'CONSTRUÇÃO · MORADIA', glyph: '⌂',
    citizens: 3, connectedRoadCitizenBonus: 1,
    ability: Object.freeze({ name: 'Hospedagem', cost: '—', description: 'Fornece 3 cidadãos e mais 1 quando conectada ao castelo por Ruas.', enabled: false }),
    instant: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'Esta carta não possui habilidade instantânea.', enabled: false })
  }),
  Object.freeze({
    id: 'road', name: 'Rua', description: 'Aumenta em 1 o movimento de quem estiver sobre ela. Conecta-se visualmente a Casas, que recebem espaço para mais 1 cidadão quando ligadas ao castelo. Deve estar ligada ao castelo ou a outra Rua.',
    hp: null, damage: 0, move: 0, movementType: 'none', minAttackRange: 0, attackRange: 0, cost: 1, buildRounds: 1, type: 'terrain', indestructible: true, rarity: 'COMUM', rarityClass: 'common', info: 'TERRENO · RUA', glyph: '═',
    ability: Object.freeze({ name: 'Caminho do reino', cost: '—', description: 'Terreno permanente que se conecta automaticamente e não pode ser destruído.', enabled: false }),
    instant: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'Esta carta não possui habilidade instantânea.', enabled: false })
  }),
  Object.freeze({
    id: 'goblin', name: 'Goblin', description: 'Um goblin frágil, mas que tem coragem de roubar ouro.',
    hp: 1, damage: 1, move: 1, movementType: 'any', minAttackRange: 1, attackRange: 1, cost: 2, rarity: 'COMUM', rarityClass: 'common', info: 'GOBLIN · SAQUEADOR', glyph: '♟',
    ability: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'Esta carta não possui habilidade.', enabled: false }),
    instant: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'Esta carta não possui habilidade instantânea.', enabled: false })
  }),
  Object.freeze({
    id: 'goblin_tower', name: 'Torre Goblin', description: 'Goblin invocado ao lado da torre nasce com +1 de vida. Cada Goblin aliado na arena reduz em 1 o custo desta torre.',
    hp: 5, damage: 0, move: 0, movementType: 'none', minAttackRange: 0, attackRange: 0, cost: 10, minimumCost: 1, goblinDiscount: 1, buildRounds: 1, type: 'construction', rarity: 'RARA', rarityClass: 'rare', info: 'CONSTRUÇÃO · GOBLIN', glyph: '♜',
    ability: Object.freeze({ name: 'Reforço Goblin', cost: 3, description: 'Consome um Goblin do seu baralho e o invoca em qualquer casa livre da arena. Ele nasce sem poder agir neste turno.', enabled: true }),
    instant: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'Esta carta não possui habilidade instantânea.', enabled: false })
  }),
  Object.freeze({
    id: 'mage', name: 'Mago', description: 'Conjura fogo em uma ou duas casas a até 4 quadrados, mesmo com unidades à frente. O impacto causa 2 de dano e as chamas causam mais 1 se uma tropa permanecer ou entrar nelas antes de desaparecerem.',
    hp: 2, damage: 2, move: 1, movementType: 'any', minAttackRange: 1, attackRange: 4, maxFireCells: 2, cost: 6, rarity: 'RARA', rarityClass: 'rare', info: 'ARCANO · CONJURADOR', glyph: '✦',
    ability: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'O fogo é conjurado pelo ícone acima do Mago.', enabled: false }),
    instant: Object.freeze({ name: 'Ácido (Instantâneo)', cost: 4, cooldownTurns: 2, damage: 3, radius: 1, description: 'Em qualquer turno, espalha ácido nas casas ao redor do Mago. Todas as tropas atingidas sofrem 3 de dano, inclusive as aliadas. Recarrega após 1 rodada.', enabled: true })
  })
]);

export const CARD_BY_ID = Object.freeze(Object.fromEntries(CARD_DEFINITIONS.map(card => [card.id, card])));
