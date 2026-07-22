import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { match } from '../test-support/match.js';

function give(player, ...cardIds) {
  player.hand = cardIds.map(cardId => ({ instanceId: randomUUID(), cardId }));
  return [...player.hand];
}

test('Rua começa como pequenos galhos e conclui após uma rodada', () => {
  const { rooms, room, first, second } = match();
  const player = room.state.players[0];
  const [firstRoad, secondRoad] = give(player, 'road', 'road');
  rooms.action(room.code, first.id, { type: 'summon', cardInstanceId: firstRoad.instanceId, x: 7, z: 11 }, room.state.version);
  assert.equal(room.state.roads[0].underConstruction, true);
  assert.equal(room.state.roads[0].buildReadyRound, 2);
  rooms.action(room.code, first.id, { type: 'end_turn' }, room.state.version);
  rooms.action(room.code, second.id, { type: 'end_turn' }, room.state.version);
  assert.equal(room.state.roads[0].underConstruction, false);
  rooms.action(room.code, first.id, { type: 'summon', cardInstanceId: secondRoad.instanceId, x: 7, z: 10 }, room.state.version);
  assert.deepEqual(room.state.roads.map(({ x, z }) => ({ x, z })), [{ x: 7, z: 11 }, { x: 7, z: 10 }]);
  assert.equal(room.state.units.length, 0);
});

test('Rua aumenta o movimento somente depois de concluída', () => {
  const { rooms, room, first, second } = match();
  const player = room.state.players[0];
  const [road] = give(player, 'road');
  rooms.action(room.code, first.id, { type: 'summon', cardInstanceId: road.instanceId, x: 7, z: 11 }, room.state.version);
  room.state.units.push({ id: 'guard-road', ownerSeat: 1, cardId: 'guard', x: 7, z: 11, hp: 4, shield: 0, actionUsed: false, abilityUsed: false, instantUsedRound: 0, empowered: false });
  assert.throws(() => rooms.action(room.code, first.id, { type: 'move', unitId: 'guard-road', x: 7, z: 9 }, room.state.version), /Movimento inválido/);
  rooms.action(room.code, first.id, { type: 'end_turn' }, room.state.version);
  rooms.action(room.code, second.id, { type: 'end_turn' }, room.state.version);
  rooms.action(room.code, first.id, { type: 'move', unitId: 'guard-road', x: 7, z: 9 }, room.state.version);
  assert.deepEqual({ x: room.state.units[0].x, z: room.state.units[0].z }, { x: 7, z: 9 });
});

test('construções ficam ao lado da Rua e não cobrem o terreno', () => {
  const { rooms, room, first } = match();
  const player = room.state.players[0];
  const [road, house] = give(player, 'road', 'wooden_house');
  rooms.action(room.code, first.id, { type: 'summon', cardInstanceId: road.instanceId, x: 7, z: 11 }, room.state.version);
  assert.throws(() => rooms.action(room.code, first.id, { type: 'summon', cardInstanceId: house.instanceId, x: 7, z: 11 }, room.state.version), /casa livre/);
});

test('nível dois exige oito cidadãos e uma Rua concluída', () => {
  const { rooms, room, first, second } = match();
  const blue = room.state.players[0];
  const [road, ...houses] = give(blue, 'road', 'wooden_house', 'wooden_house');
  rooms.action(room.code, first.id, { type: 'summon', cardInstanceId: road.instanceId, x: 7, z: 11 }, room.state.version);
  rooms.action(room.code, first.id, { type: 'end_turn' }, room.state.version);
  rooms.action(room.code, second.id, { type: 'end_turn' }, room.state.version);
  [[6, 11], [8, 11]].forEach(([x, z], index) => {
    rooms.action(room.code, first.id, { type: 'summon', cardInstanceId: houses[index].instanceId, x, z }, room.state.version);
  });
  assert.equal(blue.citizens, 0);
  rooms.action(room.code, first.id, { type: 'end_turn' }, room.state.version);
  blue.energy = 3;
  rooms.action(room.code, second.id, { type: 'end_turn' }, room.state.version);
  assert.equal(blue.citizens, 8);
  assert.equal(blue.baseLevel, 2);
  assert.equal(blue.maxEnergy, 12);
  assert.equal(blue.energy, 9);
  rooms.action(room.code, first.id, { type: 'end_turn' }, room.state.version);
  assert.equal(blue.energy, 9);
});

test('base nível dois recupera uma vida das construções a cada duas rodadas', () => {
  const { rooms, room, second } = match();
  const blue = room.state.players[0];
  blue.baseLevel = 2;
  blue.maxEnergy = 12;
  room.state.activeSeat = 2;
  room.state.round = 3;
  room.state.units.push({ id: 'damaged-tower', ownerSeat: 1, cardId: 'tower', x: 7, z: 10, hp: 4, shield: 0, actionUsed: false, abilityUsed: false, instantUsedRound: 0, empowered: false, underConstruction: false });
  rooms.action(room.code, second.id, { type: 'end_turn' }, room.state.version);
  assert.equal(room.state.round, 4);
  assert.equal(room.state.units[0].hp, 5);
});
