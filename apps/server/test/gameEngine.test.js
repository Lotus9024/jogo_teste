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
  assert.equal(room.state.players[0].baseHp, 10);
  assert.equal(GAME_CONFIG.turnDurationSeconds, 60);
});

test('invocação válida consome a carta e energia no servidor', () => {
  const { rooms, room, first } = match();
  const player = room.state.players[0], instance = player.hand[0], cost = CARD_BY_ID[instance.cardId].cost;
  rooms.action(room.code, first.id, { type: 'summon', cardInstanceId: instance.instanceId, x: 2, z: 9 }, room.state.version);
  assert.equal(player.hand.length, 4);
  assert.equal(player.energy, 10 - cost);
  assert.equal(room.state.units[0].ownerSeat, 1);
});

test('rejeita ação fora do turno, replay e posição adulterada', () => {
  const { rooms, room, first, second } = match();
  const secondCard = room.state.players[1].hand[0];
  assert.throws(() => rooms.action(room.code, second.id, { type: 'summon', cardInstanceId: secondCard.instanceId, x: 2, z: 5 }, room.state.version), /turno/);
  const oldVersion = room.state.version;
  rooms.action(room.code, first.id, { type: 'end_turn' }, oldVersion);
  assert.throws(() => rooms.action(room.code, second.id, { type: 'end_turn' }, oldVersion), /estado/);
  assert.throws(() => rooms.action(room.code, second.id, { type: 'summon', cardInstanceId: secondCard.instanceId, x: 2, z: 12 }, room.state.version), /zona/);
});

test('passar turno compra carta, entrega energia e reinicia o relógio', () => {
  const { rooms, room, first } = match();
  room.state.players[1].energy = 7;
  const previousDeadline = room.state.turnEndsAt;
  rooms.action(room.code, first.id, { type: 'end_turn' }, room.state.version);
  assert.equal(room.state.activeSeat, 2);
  assert.equal(room.state.players[1].energy, 11);
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
      archer: { hp: 2, damage: 2, move: 2, movementType: 'any', cost: 5 },
      wooden_barrier: { hp: 2, damage: 0, move: 0, movementType: 'none', cost: 4 }
    }
  );
  assert.deepEqual(
    { minAttackRange: CARD_BY_ID.warrior.minAttackRange, attackRange: CARD_BY_ID.warrior.attackRange },
    { minAttackRange: 1, attackRange: 2 }
  );
  Object.values(CARD_BY_ID).forEach(card => {
    assert.equal(card.ability.enabled, false);
    assert.equal(card.instant.enabled, false);
  });
  assert.deepEqual(
    { minAttackRange: CARD_BY_ID.archer.minAttackRange, attackRange: CARD_BY_ID.archer.attackRange, ability: CARD_BY_ID.archer.ability.name },
    { minAttackRange: 3, attackRange: 4, ability: 'Nenhuma' }
  );
  assert.equal(CARD_BY_ID.wooden_barrier.buildRounds, 1);
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

test('guerreiro ataca a até dois blocos de distância', () => {
  const { rooms, room, first } = match();
  room.state.units.push(
    { id: 'warrior-range', ownerSeat: 1, cardId: 'warrior', x: 4, z: 9, hp: 3, shield: 0, actionUsed: false, abilityUsed: false },
    { id: 'target-range', ownerSeat: 2, cardId: 'guard', x: 4, z: 11, hp: 4, shield: 0, actionUsed: false, abilityUsed: false }
  );
  rooms.action(room.code, first.id, { type: 'attack', unitId: 'warrior-range', targetUnitId: 'target-range' }, room.state.version);
  assert.equal(room.state.units.find(unit => unit.id === 'target-range').hp, 2);
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

test('barreira permanece em construção durante uma rodada', () => {
  const { rooms, room, first, second } = match();
  room.state.players[0].hand.push({ instanceId: 'barrier-card', cardId: 'wooden_barrier' });
  rooms.action(room.code, first.id, { type: 'summon', cardInstanceId: 'barrier-card', x: 3, z: 9 }, room.state.version);
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
  secondPlayer.rooms.action(secondPlayer.room.code, secondPlayer.second.id, { type: 'summon', cardInstanceId: 'barrier-card-seat-2', x: 3, z: 5 }, secondPlayer.room.state.version);
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
