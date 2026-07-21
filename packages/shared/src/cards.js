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
    hp: 2, damage: 2, move: 2, movementType: 'any', minAttackRange: 3, attackRange: 4, cost: 6, rarity: 'INCOMUM', rarityClass: 'uncommon', info: 'HUMANO · ATIRADOR', glyph: '➶',
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
  }),
  Object.freeze({
    id: 'operator', name: 'Operador', description: 'Esse operador pode operar tudo, ou quase tudo. Posicione-o atrás de uma máquina para fazê-la funcionar.',
    hp: 1, damage: 0, move: 1, movementType: 'any', minAttackRange: 0, attackRange: 0, cost: 3, rarity: 'COMUM', rarityClass: 'common', info: 'HUMANO · OPERADOR', glyph: '⚙',
    ability: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'Esta carta não possui habilidade.', enabled: false }),
    instant: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'Esta carta não possui habilidade instantânea.', enabled: false })
  }),
  Object.freeze({
    id: 'cannon', name: 'Canhão', description: 'Uma poderosa máquina de cerco que exige um Operador posicionado exatamente atrás para se mover e disparar. Seu projétil atinge alvos entre 3 e 7 quadrados de distância, causando dano em uma área de 2 quadrados. O disparo não distingue amigos de inimigos e também pode atingir tropas aliadas.',
    hp: 2, damage: 4, move: 1, movementType: 'forward', minAttackRange: 3, attackRange: 7, areaRadius: 2, cost: 7, buildRounds: 2, type: 'machine', rarity: 'INCOMUM', rarityClass: 'uncommon', info: 'MÁQUINA · CERCO', glyph: '◉',
    ability: Object.freeze({ name: 'Nenhuma', cost: '—', description: 'O Canhão precisa de um Operador exatamente uma casa atrás.', enabled: false }),
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
