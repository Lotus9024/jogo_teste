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
    id: 'wooden_house', name: 'Casa de madeira', description: 'Uma casa de madeira simples e frágil. Esta casa consegue hospedar até 3 cidadãos.',
    hp: 1, damage: 0, move: 0, movementType: 'none', minAttackRange: 0, attackRange: 0, cost: 3, buildRounds: 1, type: 'construction', rarity: 'COMUM', rarityClass: 'common', info: 'CONSTRUÇÃO · MORADIA', glyph: '⌂',
    citizens: 3, connectedRoadCitizenBonus: 1,
    ability: Object.freeze({ name: 'Hospedagem', cost: '—', description: 'Fornece 3 cidadãos e mais 1 quando conectada ao castelo por Ruas.', enabled: false }),
    instant: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'Esta carta não possui habilidade instantânea.', enabled: false })
  }),
  Object.freeze({
    id: 'road', name: 'Rua', description: 'Aumenta em 1 o movimento de quem estiver sobre ela. Casas conectadas à Rua recebem espaço para mais 1 cidadão. Deve estar ligada ao castelo ou a outra Rua.',
    hp: null, damage: 0, move: 0, movementType: 'none', minAttackRange: 0, attackRange: 0, cost: 1, buildRounds: 1, type: 'terrain', indestructible: true, rarity: 'COMUM', rarityClass: 'common', info: 'TERRENO · RUA', glyph: '═',
    ability: Object.freeze({ name: 'Caminho do reino', cost: '—', description: 'Terreno permanente que se conecta automaticamente e não pode ser destruído.', enabled: false }),
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

export function movementDistance(movementType, from, to) {
  const dx = Math.abs(from.x - to.x), dz = Math.abs(from.z - to.z);
  if (movementType === 'straight') return dx === 0 || dz === 0 ? dx + dz : Number.POSITIVE_INFINITY;
  if (movementType === 'any') return Math.max(dx, dz);
  return dx + dz;
}

export function gridCellsBetween(from, to) {
  const dx = to.x - from.x, dz = to.z - from.z;
  const steps = Math.max(Math.abs(dx), Math.abs(dz));
  if (steps <= 1) return [];
  const cells = [], seen = new Set();
  for (let step = 1; step < steps; step += 1) {
    const x = Math.round(from.x + dx * step / steps);
    const z = Math.round(from.z + dz * step / steps);
    const key = `${x}:${z}`;
    if (!seen.has(key)) { seen.add(key); cells.push({ x, z }); }
  }
  return cells;
}

export function forwardDeltaForSeat(seat) {
  return { x: 0, z: seat === 1 ? -1 : 1 };
}

export function isCannonTargetValid(cannon, target) {
  const forward = forwardDeltaForSeat(cannon.ownerSeat);
  const step = forward.z ? (target.z - cannon.z) / forward.z : (target.x - cannon.x) / forward.x;
  return Number.isInteger(step)
    && step >= CARD_BY_ID.cannon.minAttackRange
    && step <= CARD_BY_ID.cannon.attackRange
    && target.x === cannon.x + forward.x * step
    && target.z === cannon.z + forward.z * step;
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

export const ORTHOGONAL_DIRECTIONS = Object.freeze([
  Object.freeze({ x: 1, z: 0 }), Object.freeze({ x: -1, z: 0 }),
  Object.freeze({ x: 0, z: 1 }), Object.freeze({ x: 0, z: -1 })
]);

export const cellKey = (x, z) => `${x}:${z}`;

export function connectedRoadKeys(seat, roads, boardSize = 15) {
  const completedRoads = roads.filter(road => road.ownerSeat === seat && !road.underConstruction);
  const owned = new Set(completedRoads.map(road => cellKey(road.x, road.z)));
  const bases = new Set(baseCellsForSeat(seat, boardSize).map(cell => cellKey(cell.x, cell.z)));
  const connected = new Set();
  const queue = completedRoads.filter(road => ORTHOGONAL_DIRECTIONS.some(direction => bases.has(cellKey(road.x + direction.x, road.z + direction.z))));
  queue.forEach(road => connected.add(cellKey(road.x, road.z)));
  for (let index = 0; index < queue.length; index += 1) {
    const road = queue[index];
    for (const direction of ORTHOGONAL_DIRECTIONS) {
      const key = cellKey(road.x + direction.x, road.z + direction.z);
      if (!owned.has(key) || connected.has(key)) continue;
      connected.add(key);
      const [x, z] = key.split(':').map(Number);
      queue.push({ x, z });
    }
  }
  return connected;
}

export function isRoadPlacementCell(seat, x, z, roads, boardSize = 15) {
  if (x < 0 || x >= boardSize || z < 0 || z >= boardSize || roads.some(road => road.x === x && road.z === z)) return false;
  const bases = new Set(baseCellsForSeat(seat, boardSize).map(cell => cellKey(cell.x, cell.z)));
  const connected = connectedRoadKeys(seat, roads, boardSize);
  return ORTHOGONAL_DIRECTIONS.some(direction => {
    const key = cellKey(x + direction.x, z + direction.z);
    return bases.has(key) || connected.has(key);
  });
}

export function citizensForSeat(seat, units, roads, boardSize = 15) {
  const connected = connectedRoadKeys(seat, roads, boardSize);
  return units
    .filter(unit => unit.ownerSeat === seat && unit.cardId === 'wooden_house' && !unit.underConstruction)
    .reduce((total, house) => total + CARD_BY_ID.wooden_house.citizens + (ORTHOGONAL_DIRECTIONS.some(direction => connected.has(cellKey(house.x + direction.x, house.z + direction.z))) ? CARD_BY_ID.wooden_house.connectedRoadCitizenBonus : 0), 0);
}

export function roadMovementBonus(x, z, roads) {
  return roads.some(road => road.x === x && road.z === z && !road.underConstruction) ? 1 : 0;
}

export function completedRoadCount(seat, roads) {
  return roads.filter(road => road.ownerSeat === seat && !road.underConstruction).length;
}
