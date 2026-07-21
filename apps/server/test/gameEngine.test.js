import test from 'node:test';
import assert from 'node:assert/strict';
import { CARD_BY_ID } from '@tronos/shared/cards';
import { GAME_CONFIG } from '@tronos/shared/game-config';
import { RoomManager } from '../src/game/roomManager.js';

function match() {
  const rooms = new RoomManager();
  const first = rooms.create('Rei Azul', {});
  const second = rooms.join(first.room.code, 'Rei Vermelho', {});
  return { rooms, room: second.room, first: first.player, second: second.player };
}

test('inicia com cinco cartas privadas e dez de energia', () => {
  const { room } = match();
  assert.equal(room.state.players[0].hand.length, 5);
  assert.equal(room.state.players[1].hand.length, 5);
  assert.equal(room.state.players[0].energy, 10);
  assert.equal(room.state.players[0].maxEnergy, 10);
  assert.equal(room.state.players[0].baseHp, 10);
  assert.equal(GAME_CONFIG.turnDurationSeconds, 120);
});

test('invocação válida consome a carta e energia no servidor', () => {
  const { rooms, room, first } = match();
  const player = room.state.players[0];
  player.hand[0].cardId = 'warrior';
  const instance = player.hand[0], cost = CARD_BY_ID[instance.cardId].cost;
  rooms.action(room.code, first.id, { type: 'summon', cardInstanceId: instance.instanceId, x: 6, z: 10 }, room.state.version);
  assert.equal(player.hand.length, 4);
  assert.equal(player.energy, 10 - cost);
  assert.equal(room.state.units[0].ownerSeat, 1);
});

test('rejeita ação fora do turno, replay e posição adulterada', () => {
  const { rooms, room, first, second } = match();
  room.state.players[1].hand[0].cardId = 'warrior';
  const secondCard = room.state.players[1].hand[0];
  assert.throws(() => rooms.action(room.code, second.id, { type: 'summon', cardInstanceId: secondCard.instanceId, x: 2, z: 5 }, room.state.version), /turno/);
  const oldVersion = room.state.version;
  rooms.action(room.code, first.id, { type: 'end_turn' }, oldVersion);
  assert.throws(() => rooms.action(room.code, second.id, { type: 'end_turn' }, oldVersion), /estado/);
  assert.throws(() => rooms.action(room.code, second.id, { type: 'summon', cardInstanceId: secondCard.instanceId, x: 2, z: 12 }, room.state.version), /2 casas/);
});

test('passar turno compra carta, entrega energia e reinicia o relógio', () => {
  const { rooms, room, first } = match();
  room.state.players[1].energy = 7;
  const previousDeadline = room.state.turnEndsAt;
  rooms.action(room.code, first.id, { type: 'end_turn' }, room.state.version);
  assert.equal(room.state.activeSeat, 2);
  assert.equal(room.state.players[1].energy, 10);
  assert.equal(room.state.players[1].hand.length, 6);
  assert.ok(room.state.turnEndsAt >= previousDeadline);
});

test('cartas usam os atributos definidos', () => {
  assert.deepEqual(
    Object.fromEntries(Object.values(CARD_BY_ID).map(card => [card.id, {
      hp: card.hp, damage: card.damage, move: card.move, movementType: card.movementType, cost: card.cost
    }])),
    {
      warrior: { hp: 3, damage: 2, move: 2, movementType: 'straight', cost: 4 },
      guard: { hp: 4, damage: 1, move: 1, movementType: 'any', cost: 4 },
      archer: { hp: 2, damage: 2, move: 1, movementType: 'any', cost: 6 },
      wooden_barrier: { hp: 2, damage: 0, move: 0, movementType: 'none', cost: 4 },
      tower: { hp: 5, damage: 0, move: 0, movementType: 'none', cost: 7 },
      operator: { hp: 1, damage: 0, move: 1, movementType: 'any', cost: 3 },
      cannon: { hp: 2, damage: 4, move: 1, movementType: 'forward', cost: 7 },
      wooden_house: { hp: 1, damage: 0, move: 0, movementType: 'none', cost: 3 },
      road: { hp: null, damage: 0, move: 0, movementType: 'none', cost: 1 },
      mage: { hp: 2, damage: 2, move: 1, movementType: 'any', cost: 6 }
    }
  );
  assert.deepEqual(
    { minAttackRange: CARD_BY_ID.warrior.minAttackRange, attackRange: CARD_BY_ID.warrior.attackRange },
    { minAttackRange: 1, attackRange: 2 }
  );
  Object.values(CARD_BY_ID).forEach(card => {
    assert.equal(card.ability.enabled, card.id === 'mage');
    assert.equal(card.instant.enabled, card.id === 'tower');
  });
  assert.deepEqual(
    { minAttackRange: CARD_BY_ID.archer.minAttackRange, attackRange: CARD_BY_ID.archer.attackRange, ability: CARD_BY_ID.archer.ability.name },
    { minAttackRange: 3, attackRange: 4, ability: 'Nenhuma' }
  );
  assert.deepEqual(
    { rarity: CARD_BY_ID.archer.rarity, rarityClass: CARD_BY_ID.archer.rarityClass },
    { rarity: 'INCOMUM', rarityClass: 'uncommon' }
  );
  assert.equal(CARD_BY_ID.wooden_barrier.buildRounds, 1);
  assert.equal(CARD_BY_ID.tower.buildRounds, 2);
  assert.deepEqual(
    { minAttackRange: CARD_BY_ID.cannon.minAttackRange, attackRange: CARD_BY_ID.cannon.attackRange, areaRadius: CARD_BY_ID.cannon.areaRadius, buildRounds: CARD_BY_ID.cannon.buildRounds },
    { minAttackRange: 3, attackRange: 7, areaRadius: 2, buildRounds: 2 }
  );
});

test('Mago incendeia uma ou duas casas e o fogo persiste pelo turno rival', () => {
  const { rooms, room, first, second } = match();
  room.state.units.push(
    { id: 'mage-fire', ownerSeat: 1, cardId: 'mage', x: 7, z: 8, hp: 2, shield: 0, actionUsed: false, abilityUsed: false },
    { id: 'fire-target', ownerSeat: 2, cardId: 'guard', x: 7, z: 5, hp: 4, shield: 0, actionUsed: false, abilityUsed: false }
  );
  rooms.action(room.code, first.id, { type: 'mage_fire', unitId: 'mage-fire', cells: [{ x: 7, z: 5 }, { x: 8, z: 5 }] }, room.state.version);
  assert.equal(room.state.units.find(unit => unit.id === 'fire-target').hp, 2);
  assert.equal(room.state.fires.length, 2);
  assert.equal(room.state.units.find(unit => unit.id === 'mage-fire').actionUsed, true);
  rooms.action(room.code, first.id, { type: 'end_turn' }, room.state.version);
  assert.equal(room.state.fires.length, 2);
  rooms.action(room.code, second.id, { type: 'end_turn' }, room.state.version);
  assert.equal(room.state.units.find(unit => unit.id === 'fire-target').hp, 1);
  assert.equal(room.state.fires.length, 0);
});

test('tropa que entra no fogo sofre um dano apenas uma vez', () => {
  const { rooms, room, first, second } = match();
  room.state.units.push(
    { id: 'mage-entry', ownerSeat: 1, cardId: 'mage', x: 7, z: 9, hp: 2, shield: 0, actionUsed: false, abilityUsed: false },
    { id: 'entry-target', ownerSeat: 2, cardId: 'guard', x: 7, z: 5, hp: 4, shield: 0, actionUsed: false, abilityUsed: false }
  );
  rooms.action(room.code, first.id, { type: 'mage_fire', unitId: 'mage-entry', cells: [{ x: 7, z: 6 }] }, room.state.version);
  rooms.action(room.code, first.id, { type: 'end_turn' }, room.state.version);
  rooms.action(room.code, second.id, { type: 'move', unitId: 'entry-target', x: 7, z: 6 }, room.state.version);
  assert.equal(room.state.units.find(unit => unit.id === 'entry-target').hp, 3);
  rooms.action(room.code, second.id, { type: 'end_turn' }, room.state.version);
  assert.equal(room.state.units.find(unit => unit.id === 'entry-target').hp, 3);
  assert.equal(room.state.fires.length, 0);
});

test('círculo ácido do Mago atinge inimigos e aliados ao redor', () => {
  const { rooms, room, first } = match();
  room.state.units.push(
    { id: 'mage-acid', ownerSeat: 1, cardId: 'mage', x: 7, z: 8, hp: 2, shield: 0, actionUsed: false, abilityUsed: false },
    { id: 'acid-ally', ownerSeat: 1, cardId: 'guard', x: 6, z: 8, hp: 4, shield: 0, actionUsed: false },
    { id: 'acid-enemy', ownerSeat: 2, cardId: 'guard', x: 8, z: 9, hp: 4, shield: 0, actionUsed: false },
    { id: 'acid-safe', ownerSeat: 2, cardId: 'guard', x: 9, z: 8, hp: 4, shield: 0, actionUsed: false }
  );
  rooms.action(room.code, first.id, { type: 'use_ability', unitId: 'mage-acid' }, room.state.version);
  assert.equal(room.state.units.find(unit => unit.id === 'acid-ally').hp, 1);
  assert.equal(room.state.units.find(unit => unit.id === 'acid-enemy').hp, 1);
  assert.equal(room.state.units.find(unit => unit.id === 'acid-safe').hp, 4);
  assert.equal(room.state.units.find(unit => unit.id === 'mage-acid').hp, 2);
  assert.equal(room.state.players[0].energy, 6);
});

test('Mago rejeita fogo duplicado, distante ou com mais de duas casas', () => {
  const { rooms, room, first } = match();
  room.state.units.push({ id: 'mage-invalid', ownerSeat: 1, cardId: 'mage', x: 7, z: 8, hp: 2, shield: 0, actionUsed: false, abilityUsed: false });
  for (const cells of [[{ x: 7, z: 5 }, { x: 7, z: 5 }], [{ x: 7, z: 3 }], [{ x: 7, z: 5 }, { x: 8, z: 5 }, { x: 9, z: 5 }]]) {
    assert.throws(() => rooms.action(room.code, first.id, { type: 'mage_fire', unitId: 'mage-invalid', cells }, room.state.version));
  }
});

test('guerreiro só anda reto e guarda pode andar na diagonal', () => {
  const { rooms, room, first } = match();
  room.state.units.push({ id: 'warrior-1', ownerSeat: 1, cardId: 'warrior', x: 4, z: 9, hp: 3, shield: 0, actionUsed: false, abilityUsed: false, instantUsedRound: 0, empowered: false });
  assert.throws(() => rooms.action(room.code, first.id, { type: 'move', unitId: 'warrior-1', x: 5, z: 10 }, room.state.version), /Movimento inválido/);
  rooms.action(room.code, first.id, { type: 'move', unitId: 'warrior-1', x: 6, z: 9 }, room.state.version);
  assert.deepEqual({ x: room.state.units[0].x, z: room.state.units[0].z }, { x: 6, z: 9 });

  const other = match();
  other.room.state.units.push({ id: 'guard-1', ownerSeat: 1, cardId: 'guard', x: 4, z: 9, hp: 4, shield: 0, actionUsed: false, abilityUsed: false, instantUsedRound: 0, empowered: false });
  other.rooms.action(other.room.code, other.first.id, { type: 'move', unitId: 'guard-1', x: 5, z: 10 }, other.room.state.version);
  assert.deepEqual({ x: other.room.state.units[0].x, z: other.room.state.units[0].z }, { x: 5, z: 10 });
});

test('não consome a ação ao tentar mover para a própria casa', () => {
  const { rooms, room, first } = match();
  const unit = { id: 'same-cell', ownerSeat: 1, cardId: 'guard', x: 4, z: 9, hp: 4, shield: 0, actionUsed: false, abilityUsed: false, instantUsedRound: 0, empowered: false };
  room.state.units.push(unit);
  assert.throws(
    () => rooms.action(room.code, first.id, { type: 'move', unitId: unit.id, x: unit.x, z: unit.z }, room.state.version),
    /Movimento inválido/
  );
  assert.equal(unit.actionUsed, false);
  assert.deepEqual({ x: unit.x, z: unit.z }, { x: 4, z: 9 });
});

test('guerreiro ataca a até dois blocos de distância', () => {
  const { rooms, room, first } = match();
  room.state.units.push(
    { id: 'warrior-range', ownerSeat: 1, cardId: 'warrior', x: 4, z: 9, hp: 3, shield: 0, actionUsed: false, abilityUsed: false },
    { id: 'target-range', ownerSeat: 2, cardId: 'guard', x: 4, z: 11, hp: 4, shield: 0, actionUsed: false, abilityUsed: false }
  );
  rooms.action(room.code, first.id, { type: 'attack', unitId: 'warrior-range', targetUnitId: 'target-range' }, room.state.version);
  assert.equal(room.state.units.find(unit => unit.id === 'target-range').hp, 2);
});

test('tropas bloqueiam movimento e ataques contra casas atrás delas', () => {
  const movement = match();
  movement.room.state.units.push(
    { id: 'moving-warrior', ownerSeat: 1, cardId: 'warrior', x: 4, z: 9, hp: 3, shield: 0, actionUsed: false, abilityUsed: false },
    { id: 'movement-blocker', ownerSeat: 1, cardId: 'guard', x: 5, z: 9, hp: 4, shield: 0, actionUsed: false, abilityUsed: false }
  );
  assert.throws(
    () => movement.rooms.action(movement.room.code, movement.first.id, { type: 'move', unitId: 'moving-warrior', x: 6, z: 9 }, movement.room.state.version),
    /caminho.*bloqueado/i
  );

  const attack = match();
  attack.room.state.units.push(
    { id: 'attacking-warrior', ownerSeat: 1, cardId: 'warrior', x: 4, z: 9, hp: 3, shield: 0, actionUsed: false, abilityUsed: false },
    { id: 'attack-blocker', ownerSeat: 1, cardId: 'guard', x: 5, z: 9, hp: 4, shield: 0, actionUsed: false, abilityUsed: false },
    { id: 'blocked-target', ownerSeat: 2, cardId: 'guard', x: 6, z: 9, hp: 4, shield: 0, actionUsed: false, abilityUsed: false }
  );
  assert.throws(
    () => attack.rooms.action(attack.room.code, attack.first.id, { type: 'attack', unitId: 'attacking-warrior', targetUnitId: 'blocked-target' }, attack.room.state.version),
    /linha de ataque.*bloqueada/i
  );
});

test('arqueiro ataca somente a três ou quatro blocos e não ocupa a casa da vítima', () => {
  const near = match();
  near.room.state.units.push(
    { id: 'archer-near', ownerSeat: 1, cardId: 'archer', x: 4, z: 9, hp: 2, shield: 0, actionUsed: false, abilityUsed: false },
    { id: 'target-near', ownerSeat: 2, cardId: 'guard', x: 4, z: 11, hp: 4, shield: 0, actionUsed: false, abilityUsed: false }
  );
  assert.throws(() => near.rooms.action(near.room.code, near.first.id, { type: 'attack', unitId: 'archer-near', targetUnitId: 'target-near' }, near.room.state.version), /fora de alcance/);

  const valid = match();
  valid.room.state.units.push(
    { id: 'archer-valid', ownerSeat: 1, cardId: 'archer', x: 4, z: 9, hp: 2, shield: 0, actionUsed: false, abilityUsed: false },
    { id: 'target-valid', ownerSeat: 2, cardId: 'guard', x: 4, z: 12, hp: 4, shield: 0, actionUsed: false, abilityUsed: false }
  );
  valid.rooms.action(valid.room.code, valid.first.id, { type: 'attack', unitId: 'archer-valid', targetUnitId: 'target-valid' }, valid.room.state.version);
  assert.equal(valid.room.state.units.find(unit => unit.id === 'target-valid').hp, 2);

  const edge = match();
  edge.room.state.units.push(
    { id: 'archer-edge', ownerSeat: 1, cardId: 'archer', x: 4, z: 9, hp: 2, shield: 0, actionUsed: false, abilityUsed: false },
    { id: 'target-edge', ownerSeat: 2, cardId: 'guard', x: 4, z: 13, hp: 4, shield: 0, actionUsed: false, abilityUsed: false }
  );
  edge.rooms.action(edge.room.code, edge.first.id, { type: 'attack', unitId: 'archer-edge', targetUnitId: 'target-edge' }, edge.room.state.version);
  assert.equal(edge.room.state.units.find(unit => unit.id === 'target-edge').hp, 2);

  const far = match();
  far.room.state.units.push(
    { id: 'archer-far', ownerSeat: 1, cardId: 'archer', x: 4, z: 9, hp: 2, shield: 0, actionUsed: false, abilityUsed: false },
    { id: 'target-far', ownerSeat: 2, cardId: 'guard', x: 4, z: 14, hp: 4, shield: 0, actionUsed: false, abilityUsed: false }
  );
  assert.throws(() => far.rooms.action(far.room.code, far.first.id, { type: 'attack', unitId: 'archer-far', targetUnitId: 'target-far' }, far.room.state.version), /fora de alcance/);

  const kill = match();
  kill.room.state.units.push(
    { id: 'archer-kill', ownerSeat: 1, cardId: 'archer', x: 4, z: 9, hp: 2, shield: 0, actionUsed: false, abilityUsed: false },
    { id: 'target-kill', ownerSeat: 2, cardId: 'guard', x: 4, z: 12, hp: 2, shield: 0, actionUsed: false, abilityUsed: false }
  );
  kill.rooms.action(kill.room.code, kill.first.id, { type: 'attack', unitId: 'archer-kill', targetUnitId: 'target-kill' }, kill.room.state.version);
  assert.equal(kill.room.state.units.some(unit => unit.id === 'target-kill'), false);
  assert.deepEqual(
    { x: kill.room.state.units.find(unit => unit.id === 'archer-kill').x, z: kill.room.state.units.find(unit => unit.id === 'archer-kill').z },
    { x: 4, z: 9 }
  );
});

test('arqueiro ataca o castelo inimigo quando está no alcance', () => {
  const { rooms, room, first } = match();
  room.state.units.push({ id: 'archer-base', ownerSeat: 1, cardId: 'archer', x: 7, z: 5, hp: 2, shield: 0, actionUsed: false, abilityUsed: false });
  rooms.action(room.code, first.id, { type: 'attack', unitId: 'archer-base', targetBaseSeat: 2 }, room.state.version);
  assert.equal(room.state.players[1].baseHp, 8);
});

test('arqueiro na torre ataca através de unidades à frente', () => {
  const { rooms, room, first } = match();
  room.state.units.push(
    { id: 'tower-shot', ownerSeat: 1, cardId: 'tower', x: 7, z: 5, hp: 5, shield: 0, actionUsed: false, underConstruction: false },
    { id: 'archer-tower-shot', ownerSeat: 1, cardId: 'archer', x: 7, z: 5, hp: 2, shield: 0, actionUsed: false, mountedOnTowerId: 'tower-shot' },
    { id: 'tower-shot-blocker', ownerSeat: 1, cardId: 'guard', x: 7, z: 4, hp: 4, shield: 0, actionUsed: false }
  );
  rooms.action(room.code, first.id, { type: 'attack', unitId: 'archer-tower-shot', targetBaseSeat: 2 }, room.state.version);
  assert.equal(room.state.players[1].baseHp, 8);
});

test('barreira permanece em construção durante uma rodada', () => {
  const { rooms, room, first, second } = match();
  room.state.players[0].hand.push({ instanceId: 'barrier-card', cardId: 'wooden_barrier' });
  rooms.action(room.code, first.id, { type: 'summon', cardInstanceId: 'barrier-card', x: 6, z: 10 }, room.state.version);
  const barrier = room.state.units[0];
  assert.equal(barrier.underConstruction, true);
  assert.equal(barrier.buildReadyRound, 2);
  rooms.action(room.code, first.id, { type: 'end_turn' }, room.state.version);
  assert.equal(barrier.underConstruction, true);
  rooms.action(room.code, second.id, { type: 'end_turn' }, room.state.version);
  assert.equal(room.state.round, 2);
  assert.equal(barrier.underConstruction, false);

  const secondPlayer = match();
  secondPlayer.rooms.action(secondPlayer.room.code, secondPlayer.first.id, { type: 'end_turn' }, secondPlayer.room.state.version);
  secondPlayer.room.state.players[1].hand.push({ instanceId: 'barrier-card-seat-2', cardId: 'wooden_barrier' });
  secondPlayer.rooms.action(secondPlayer.room.code, secondPlayer.second.id, { type: 'summon', cardInstanceId: 'barrier-card-seat-2', x: 6, z: 4 }, secondPlayer.room.state.version);
  const secondBarrier = secondPlayer.room.state.units[0];
  secondPlayer.rooms.action(secondPlayer.room.code, secondPlayer.second.id, { type: 'end_turn' }, secondPlayer.room.state.version);
  assert.equal(secondBarrier.underConstruction, true);
  secondPlayer.rooms.action(secondPlayer.room.code, secondPlayer.first.id, { type: 'end_turn' }, secondPlayer.room.state.version);
  assert.equal(secondBarrier.underConstruction, false);
});

test('unidades corpo a corpo ocupam a casa da criatura eliminada', () => {
  const { rooms, room, first } = match();
  room.state.units.push(
    { id: 'warrior-advance', ownerSeat: 1, cardId: 'warrior', x: 4, z: 9, hp: 3, shield: 0, actionUsed: false, abilityUsed: false },
    { id: 'target-advance', ownerSeat: 2, cardId: 'guard', x: 4, z: 10, hp: 2, shield: 0, actionUsed: false, abilityUsed: false }
  );
  rooms.action(room.code, first.id, { type: 'attack', unitId: 'warrior-advance', targetUnitId: 'target-advance' }, room.state.version);
  assert.equal(room.state.units.some(unit => unit.id === 'target-advance'), false);
  assert.deepEqual(
    { x: room.state.units.find(unit => unit.id === 'warrior-advance').x, z: room.state.units.find(unit => unit.id === 'warrior-advance').z },
    { x: 4, z: 10 }
  );
});

test('habilidades normais e instantâneas estão indisponíveis', () => {
  const { rooms, room, first } = match();
  room.state.units.push({ id: 'warrior-1', ownerSeat: 1, cardId: 'warrior', x: 4, z: 9, hp: 3, shield: 0, actionUsed: false, abilityUsed: false, instantUsedRound: 0, empowered: false });
  assert.throws(() => rooms.action(room.code, first.id, { type: 'use_ability', unitId: 'warrior-1' }, room.state.version), /indisponível/);
  assert.throws(() => rooms.action(room.code, first.id, { type: 'use_instant', unitId: 'warrior-1' }, room.state.version), /indisponível/);
});

test('cartas só podem ser lançadas a até duas casas do reino', () => {
  const { rooms, room, first } = match();
  room.state.players[0].hand.push({ instanceId: 'zone-card', cardId: 'wooden_barrier' });
  assert.throws(
    () => rooms.action(room.code, first.id, { type: 'summon', cardInstanceId: 'zone-card', x: 6, z: 9 }, room.state.version),
    /2 casas/
  );
  rooms.action(room.code, first.id, { type: 'summon', cardInstanceId: 'zone-card', x: 6, z: 10 }, room.state.version);
  assert.deepEqual({ x: room.state.units[0].x, z: room.state.units[0].z }, { x: 6, z: 10 });
});

test('torre leva duas rodadas para concluir', () => {
  const { rooms, room, first, second } = match();
  room.state.players[0].hand.push({ instanceId: 'tower-card', cardId: 'tower' });
  rooms.action(room.code, first.id, { type: 'summon', cardInstanceId: 'tower-card', x: 6, z: 10 }, room.state.version);
  const tower = room.state.units[0];
  assert.equal(tower.underConstruction, true);
  assert.equal(tower.buildReadyRound, 3);
  rooms.action(room.code, first.id, { type: 'end_turn' }, room.state.version);
  rooms.action(room.code, second.id, { type: 'end_turn' }, room.state.version);
  assert.equal(tower.underConstruction, true);
  rooms.action(room.code, first.id, { type: 'end_turn' }, room.state.version);
  rooms.action(room.code, second.id, { type: 'end_turn' }, room.state.version);
  assert.equal(tower.underConstruction, false);
});

test('arqueiro pode subir na torre e recebe mais um de alcance', () => {
  const { rooms, room, first } = match();
  room.state.units.push(
    { id: 'tower-built', ownerSeat: 1, cardId: 'tower', x: 6, z: 10, hp: 5, shield: 0, actionUsed: false, underConstruction: false },
    { id: 'archer-mount', ownerSeat: 1, cardId: 'archer', x: 6, z: 9, hp: 2, shield: 0, actionUsed: false, instantUsedRound: 0 },
    { id: 'range-five', ownerSeat: 2, cardId: 'guard', x: 6, z: 5, hp: 4, shield: 0, actionUsed: false }
  );
  rooms.action(room.code, first.id, { type: 'move', unitId: 'archer-mount', x: 6, z: 10 }, room.state.version);
  const archer = room.state.units.find(unit => unit.id === 'archer-mount');
  assert.equal(archer.mountedOnTowerId, 'tower-built');
  archer.actionUsed = false;
  assert.throws(
    () => rooms.action(room.code, first.id, { type: 'move', unitId: 'archer-mount', x: 6, z: 9 }, room.state.version),
    /arqueiro montado não pode se mover/i
  );
  assert.deepEqual({ x: archer.x, z: archer.z, tower: archer.mountedOnTowerId }, { x: 6, z: 10, tower: 'tower-built' });
  rooms.action(room.code, first.id, { type: 'attack', unitId: 'archer-mount', targetUnitId: 'range-five' }, room.state.version);
  assert.equal(room.state.units.find(unit => unit.id === 'range-five').hp, 2);
});

test('rajada da torre funciona em qualquer turno e recarrega após uma rodada', () => {
  const { rooms, room, first, second } = match();
  room.state.units.push(
    { id: 'tower-seat-2', ownerSeat: 2, cardId: 'tower', x: 7, z: 4, hp: 5, shield: 0, actionUsed: false, underConstruction: false },
    { id: 'archer-seat-2', ownerSeat: 2, cardId: 'archer', x: 7, z: 4, hp: 2, shield: 0, actionUsed: false, instantUsedRound: 0, mountedOnTowerId: 'tower-seat-2' },
    { id: 'east', ownerSeat: 1, cardId: 'guard', x: 9, z: 4, hp: 4, shield: 0 },
    { id: 'west', ownerSeat: 1, cardId: 'guard', x: 5, z: 4, hp: 4, shield: 0 },
    { id: 'south', ownerSeat: 1, cardId: 'guard', x: 7, z: 6, hp: 4, shield: 0 },
    { id: 'north', ownerSeat: 1, cardId: 'guard', x: 7, z: 2, hp: 4, shield: 0 }
  );
  rooms.action(room.code, second.id, { type: 'use_instant', unitId: 'archer-seat-2' }, room.state.version);
  for (const id of ['east', 'west', 'south', 'north']) assert.equal(room.state.units.find(unit => unit.id === id).hp, 2);
  assert.equal(room.state.players[1].energy, 8);
  assert.throws(() => rooms.action(room.code, second.id, { type: 'use_instant', unitId: 'archer-seat-2' }, room.state.version), /indisponível/);
  rooms.action(room.code, first.id, { type: 'end_turn' }, room.state.version);
  rooms.action(room.code, second.id, { type: 'end_turn' }, room.state.version);
  rooms.action(room.code, second.id, { type: 'use_instant', unitId: 'archer-seat-2' }, room.state.version);
  assert.equal(room.state.units.some(unit => ['east', 'west', 'south', 'north'].includes(unit.id)), false);
});

test('canhão exige operador exatamente atrás para disparar', () => {
  const { rooms, room, first } = match();
  room.state.units.push(
    { id: 'cannon-1', ownerSeat: 1, cardId: 'cannon', x: 7, z: 8, hp: 2, shield: 0, actionUsed: false, underConstruction: false },
    { id: 'target-1', ownerSeat: 2, cardId: 'guard', x: 7, z: 4, hp: 8, shield: 0, actionUsed: false }
  );
  assert.throws(
    () => rooms.action(room.code, first.id, { type: 'attack', unitId: 'cannon-1', targetUnitId: 'target-1' }, room.state.version),
    /Operador disponível/
  );
  room.state.units.push({ id: 'operator-1', ownerSeat: 1, cardId: 'operator', x: 7, z: 9, hp: 1, shield: 0, actionUsed: false });
  rooms.action(room.code, first.id, { type: 'attack', unitId: 'cannon-1', targetUnitId: 'target-1' }, room.state.version);
  assert.equal(room.state.units.find(unit => unit.id === 'target-1').hp, 4);
  assert.equal(room.state.units.find(unit => unit.id === 'operator-1').actionUsed, true);
});

test('canhão dispara somente para frente entre três e sete casas', () => {
  for (const [id, x, z] of [['near', 7, 6], ['side', 10, 8], ['far', 7, 0]]) {
    const { rooms, room, first } = match();
    room.state.units.push(
      { id: 'cannon-range', ownerSeat: 1, cardId: 'cannon', x: 7, z: 8, hp: 2, shield: 0, actionUsed: false, underConstruction: false },
      { id: 'operator-range', ownerSeat: 1, cardId: 'operator', x: 7, z: 9, hp: 1, shield: 0, actionUsed: false },
      { id, ownerSeat: 2, cardId: 'guard', x, z, hp: 8, shield: 0, actionUsed: false }
    );
    assert.throws(
      () => rooms.action(room.code, first.id, { type: 'attack', unitId: 'cannon-range', targetUnitId: id }, room.state.version),
      /fora de alcance/
    );
  }
});

test('explosão do canhão causa 4 no impacto e 1 em área inclusive em aliados', () => {
  const { rooms, room, first } = match();
  room.state.units.push(
    { id: 'cannon-area', ownerSeat: 1, cardId: 'cannon', x: 7, z: 9, hp: 2, shield: 0, actionUsed: false, underConstruction: false },
    { id: 'operator-area', ownerSeat: 1, cardId: 'operator', x: 7, z: 10, hp: 1, shield: 0, actionUsed: false },
    { id: 'impact', ownerSeat: 2, cardId: 'guard', x: 7, z: 5, hp: 8, shield: 0, actionUsed: false },
    { id: 'enemy-splash', ownerSeat: 2, cardId: 'guard', x: 8, z: 5, hp: 8, shield: 0, actionUsed: false },
    { id: 'ally-splash', ownerSeat: 1, cardId: 'guard', x: 9, z: 5, hp: 8, shield: 0, actionUsed: false },
    { id: 'safe', ownerSeat: 1, cardId: 'guard', x: 10, z: 5, hp: 8, shield: 0, actionUsed: false }
  );
  rooms.action(room.code, first.id, { type: 'attack', unitId: 'cannon-area', targetUnitId: 'impact' }, room.state.version);
  assert.equal(room.state.units.find(unit => unit.id === 'impact').hp, 4);
  for (const id of ['enemy-splash', 'ally-splash']) assert.equal(room.state.units.find(unit => unit.id === id).hp, 7);
  assert.equal(room.state.units.find(unit => unit.id === 'safe').hp, 8);
});

test('selecionar o canhão avança a formação uma casa e consome as duas ações', () => {
  const { rooms, room, first } = match();
  room.state.units.push(
    { id: 'cannon-move', ownerSeat: 1, cardId: 'cannon', x: 7, z: 8, hp: 2, shield: 0, actionUsed: false, underConstruction: false },
    { id: 'operator-move', ownerSeat: 1, cardId: 'operator', x: 7, z: 9, hp: 1, shield: 0, actionUsed: false }
  );
  rooms.action(room.code, first.id, { type: 'move', unitId: 'cannon-move', x: 7, z: 7 }, room.state.version);
  const cannon = room.state.units.find(unit => unit.id === 'cannon-move');
  const operator = room.state.units.find(unit => unit.id === 'operator-move');
  assert.deepEqual({ x: cannon.x, z: cannon.z, actionUsed: cannon.actionUsed }, { x: 7, z: 7, actionUsed: true });
  assert.deepEqual({ x: operator.x, z: operator.z, actionUsed: operator.actionUsed }, { x: 7, z: 8, actionUsed: true });
});

test('formação não avança se o canhão agiu ou a casa frontal está ocupada', () => {
  const acted = match();
  acted.room.state.units.push(
    { id: 'cannon-acted', ownerSeat: 1, cardId: 'cannon', x: 7, z: 8, hp: 2, shield: 0, actionUsed: true, underConstruction: false },
    { id: 'operator-acted', ownerSeat: 1, cardId: 'operator', x: 7, z: 9, hp: 1, shield: 0, actionUsed: false }
  );
  assert.throws(() => acted.rooms.action(acted.room.code, acted.first.id, { type: 'move', unitId: 'cannon-acted', x: 7, z: 7 }, acted.room.state.version), /já agiu/);

  const blocked = match();
  blocked.room.state.units.push(
    { id: 'cannon-blocked', ownerSeat: 1, cardId: 'cannon', x: 7, z: 8, hp: 2, shield: 0, actionUsed: false, underConstruction: false },
    { id: 'operator-blocked', ownerSeat: 1, cardId: 'operator', x: 7, z: 9, hp: 1, shield: 0, actionUsed: false },
    { id: 'blocker', ownerSeat: 2, cardId: 'guard', x: 7, z: 7, hp: 4, shield: 0, actionUsed: false }
  );
  assert.throws(() => blocked.rooms.action(blocked.room.code, blocked.first.id, { type: 'move', unitId: 'cannon-blocked', x: 7, z: 7 }, blocked.room.state.version), /bloqueada/);
});

test('canhão pode disparar em casa vazia e atingir a área ao redor', () => {
  const { rooms, room, first } = match();
  room.state.units.push(
    { id: 'cannon-empty', ownerSeat: 1, cardId: 'cannon', x: 7, z: 9, hp: 2, shield: 0, actionUsed: false, underConstruction: false },
    { id: 'operator-empty', ownerSeat: 1, cardId: 'operator', x: 7, z: 10, hp: 1, shield: 0, actionUsed: false },
    { id: 'splash-empty', ownerSeat: 2, cardId: 'guard', x: 8, z: 5, hp: 8, shield: 0, actionUsed: false }
  );
  rooms.action(room.code, first.id, { type: 'attack', unitId: 'cannon-empty', x: 7, z: 5 }, room.state.version);
  assert.equal(room.state.units.find(unit => unit.id === 'splash-empty').hp, 7);
  assert.equal(room.state.units.find(unit => unit.id === 'operator-empty').actionUsed, true);
});

test('canhão permanece em construção por duas rodadas', () => {
  const { rooms, room, first, second } = match();
  room.state.players[0].hand.push({ instanceId: 'cannon-card', cardId: 'cannon' });
  rooms.action(room.code, first.id, { type: 'summon', cardInstanceId: 'cannon-card', x: 6, z: 10 }, room.state.version);
  const cannon = room.state.units[0];
  assert.equal(cannon.underConstruction, true);
  assert.equal(cannon.buildReadyRound, 3);
  rooms.action(room.code, first.id, { type: 'end_turn' }, room.state.version);
  rooms.action(room.code, second.id, { type: 'end_turn' }, room.state.version);
  assert.equal(cannon.underConstruction, true);
  rooms.action(room.code, first.id, { type: 'end_turn' }, room.state.version);
  rooms.action(room.code, second.id, { type: 'end_turn' }, room.state.version);
  assert.equal(cannon.underConstruction, false);
});
