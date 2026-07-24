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

test('Rua não pode sair da área do reino e usa a expansão lateral do nível dois', () => {
  const { rooms, room, first } = match();
  const player = room.state.players[0];
  const [outside, expanded] = give(player, 'road', 'road');
  assert.throws(
    () => rooms.action(room.code, first.id, { type: 'summon', cardInstanceId: outside.instanceId, x: 7, z: 9 }, room.state.version),
    /área do reino/i,
  );
  player.baseLevel = 2;
  rooms.action(room.code, first.id, { type: 'summon', cardInstanceId: expanded.instanceId, x: 5, z: 11 }, room.state.version);
  assert.equal(room.state.roads.some(road => road.x === 5 && road.z === 11), true);
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

test('Estrada de Pedregulhos é construída na rede e acelera somente cartas Básicas', () => {
  const { rooms, room, first, second } = match();
  const player = room.state.players[0];
  const [road] = give(player, 'cobblestone_road');
  rooms.action(room.code, first.id, { type: 'summon', cardInstanceId: road.instanceId, x: 7, z: 11 }, room.state.version);
  assert.equal(room.state.roads[0].cardId, 'cobblestone_road');
  rooms.action(room.code, first.id, { type: 'end_turn' }, room.state.version);
  rooms.action(room.code, second.id, { type: 'end_turn' }, room.state.version);
  room.state.units.push(
    { id: 'basic-on-cobbles', ownerSeat: 1, cardId: 'guard', x: 7, z: 11, hp: 3, shield: 0, actionUsed: false, underConstruction: false },
  );
  rooms.action(room.code, first.id, { type: 'move', unitId: 'basic-on-cobbles', x: 7, z: 9 }, room.state.version);
  room.state.units.push(
    { id: 'goblin-on-cobbles', ownerSeat: 1, cardId: 'goblin', x: 7, z: 11, hp: 1, shield: 0, actionUsed: false, underConstruction: false },
  );
  assert.throws(
    () => rooms.action(room.code, first.id, { type: 'move', unitId: 'goblin-on-cobbles', x: 9, z: 11 }, room.state.version),
    /Movimento inválido/,
  );
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
  assert.equal(blue.energy, 8);
  rooms.action(room.code, first.id, { type: 'end_turn' }, room.state.version);
  assert.equal(blue.energy, 8);
});

test('base nível dois recupera uma vida das construções a cada duas rodadas', () => {
  const { rooms, room, second } = match();
  const blue = room.state.players[0];
  blue.baseLevel = 2;
  blue.maxEnergy = 12;
  room.state.activeSeat = 2;
  room.state.round = 3;
  room.state.roads.push({ id: 'level-road', ownerSeat: 1, x: 7, z: 11, underConstruction: false });
  room.state.units.push(
    { id: 'level-house-a', ownerSeat: 1, cardId: 'wooden_house', x: 6, z: 11, hp: 1, maxHp: 1, underConstruction: false },
    { id: 'level-house-b', ownerSeat: 1, cardId: 'wooden_house', x: 8, z: 11, hp: 1, maxHp: 1, underConstruction: false },
  );
  room.state.units.push({ id: 'damaged-tower', ownerSeat: 1, cardId: 'tower', x: 7, z: 10, hp: 4, shield: 0, actionUsed: false, abilityUsed: false, instantUsedRound: 0, empowered: false, underConstruction: false });
  rooms.action(room.code, second.id, { type: 'end_turn' }, room.state.version);
  assert.equal(room.state.round, 4);
  assert.equal(room.state.units.find(unit => unit.id === 'damaged-tower').hp, 5);
});
