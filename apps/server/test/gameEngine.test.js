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

test('habilidade instantânea funciona fora do próprio turno apenas uma vez por rodada', () => {
  const { rooms, room, first } = match();
  room.state.units.push({ id: 'warrior-1', ownerSeat: 1, cardId: 'warrior', x: 4, z: 9, hp: 70, shield: 0, actionUsed: false, abilityUsed: false, instantUsedRound: 0, empowered: false });
  rooms.action(room.code, first.id, { type: 'end_turn' }, room.state.version);
  const energy = room.state.players[0].energy;
  rooms.action(room.code, first.id, { type: 'use_instant', unitId: 'warrior-1' }, room.state.version);
  assert.equal(room.state.units[0].shield, 8);
  assert.equal(room.state.players[0].energy, energy - CARD_BY_ID.warrior.instant.cost);
  assert.throws(() => rooms.action(room.code, first.id, { type: 'use_instant', unitId: 'warrior-1' }, room.state.version), /indisponível/);
});
