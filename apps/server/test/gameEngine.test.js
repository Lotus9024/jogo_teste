import test from 'node:test';
import assert from 'node:assert/strict';
import { CARD_BY_ID } from '@tronos/shared/cards';
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

test('cartas usam os novos atributos sem habilidades', () => {
  assert.deepEqual(
    Object.fromEntries(Object.values(CARD_BY_ID).map(card => [card.id, {
      hp: card.hp, damage: card.damage, move: card.move, movementType: card.movementType, cost: card.cost
    }])),
    {
      warrior: { hp: 3, damage: 2, move: 2, movementType: 'straight', cost: 3 },
      guard: { hp: 4, damage: 1, move: 1, movementType: 'any', cost: 3 },
      archer: { hp: 2, damage: 2, move: 2, movementType: 'any', cost: 4 }
    }
  );
  Object.values(CARD_BY_ID).forEach(card => {
    assert.equal(card.ability.enabled, false);
    assert.equal(card.instant.enabled, false);
  });
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

test('habilidades normais e instantâneas estão indisponíveis', () => {
  const { rooms, room, first } = match();
  room.state.units.push({ id: 'warrior-1', ownerSeat: 1, cardId: 'warrior', x: 4, z: 9, hp: 3, shield: 0, actionUsed: false, abilityUsed: false, instantUsedRound: 0, empowered: false });
  assert.throws(() => rooms.action(room.code, first.id, { type: 'use_ability', unitId: 'warrior-1' }, room.state.version), /indisponível/);
  assert.throws(() => rooms.action(room.code, first.id, { type: 'use_instant', unitId: 'warrior-1' }, room.state.version), /indisponível/);
});
