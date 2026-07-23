import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { CARD_BY_ID } from '@tronos/shared/cards';
import { match } from '../test-support/match.js';

test('Enxame Goblin se transforma em três Goblins sem ação', () => {
  const { rooms, room, first } = match();
  const player = room.state.players[0];
  player.hand = [{ instanceId: 'swarm-card', cardId: 'goblin_swarm' }];
  rooms.action(room.code, first.id, {
    type: 'summon', cardInstanceId: 'swarm-card', x: 6, z: 10,
  }, room.state.version);
  const goblins = room.state.units.filter(unit => unit.cardId === 'goblin');
  assert.equal(goblins.length, 3);
  assert.equal(goblins.every(unit => unit.actionUsed), true);
  assert.equal(room.state.units.some(unit => unit.cardId === 'goblin_swarm'), false);
  assert.equal(player.energy, 10 - CARD_BY_ID.goblin_swarm.cost);
});

test('Goblin Bombardeiro corre cinco casas, explode e morre', () => {
  const { rooms, room, first } = match();
  room.state.units.push(
    { id: 'bomber', ownerSeat: 1, cardId: 'goblin_bomber', x: 7, z: 10, hp: 1, actionUsed: false, underConstruction: false },
    { id: 'building', ownerSeat: 2, cardId: 'tower', x: 7, z: 5, hp: 5, actionUsed: false, underConstruction: false },
    { id: 'enemy-troop', ownerSeat: 2, cardId: 'guard', x: 8, z: 5, hp: 4, actionUsed: false, underConstruction: false },
    { id: 'ally-troop', ownerSeat: 1, cardId: 'warrior', x: 6, z: 5, hp: 4, actionUsed: false, underConstruction: false },
  );
  rooms.action(room.code, first.id, { type: 'use_ability', unitId: 'bomber' }, room.state.version);
  assert.equal(room.state.units.some(unit => unit.id === 'bomber'), false);
  assert.equal(room.state.units.find(unit => unit.id === 'building').hp, 1);
  assert.equal(room.state.units.find(unit => unit.id === 'enemy-troop').hp, 1);
  assert.equal(room.state.units.find(unit => unit.id === 'ally-troop').hp, 1);
});

test('Estrada de Pedregulhos dá mais um de ataque apenas para cartas Básicas', () => {
  const basic = match();
  basic.room.state.roads.push({ cardId: 'cobblestone_road', ownerSeat: 1, x: 5, z: 8, underConstruction: false });
  basic.room.state.units.push(
    { id: 'warrior', ownerSeat: 1, cardId: 'warrior', x: 5, z: 8, hp: 2, actionUsed: false },
    { id: 'target', ownerSeat: 2, cardId: 'guard', x: 5, z: 11, hp: 3, actionUsed: false },
  );
  basic.rooms.action(basic.room.code, basic.first.id, {
    type: 'attack', unitId: 'warrior', targetUnitId: 'target',
  }, basic.room.state.version);
  assert.equal(basic.room.state.units.find(unit => unit.id === 'target').hp, 1);

  const goblin = match();
  goblin.room.state.roads.push({ cardId: 'cobblestone_road', ownerSeat: 1, x: 5, z: 8, underConstruction: false });
  goblin.room.state.units.push(
    { id: 'goblin', ownerSeat: 1, cardId: 'goblin', x: 5, z: 8, hp: 1, actionUsed: false },
    { id: 'target', ownerSeat: 2, cardId: 'guard', x: 5, z: 10, hp: 3, actionUsed: false },
  );
  assert.throws(() => goblin.rooms.action(goblin.room.code, goblin.first.id, {
    type: 'attack', unitId: 'goblin', targetUnitId: 'target',
  }, goblin.room.state.version), /fora de alcance/);
});

test('Altar Goblin concede movimento e ataque adicionais aos Goblins próximos', () => {
  const { rooms, room, first } = match();
  const player = room.state.players[0];
  player.energy = 10;
  room.state.units.push(
    { id: 'altar', ownerSeat: 1, cardId: 'goblin_altar', x: 7, z: 10, hp: 1, actionUsed: false, underConstruction: false, abilityReadyTurn: 0 },
    { id: 'goblin', ownerSeat: 1, cardId: 'goblin', x: 6, z: 9, hp: 1, actionUsed: true, bonusMoves: 0, bonusAttacks: 0 },
    { id: 'target', ownerSeat: 2, cardId: 'guard', x: 6, z: 8, hp: 3, actionUsed: false },
  );
  rooms.action(room.code, first.id, { type: 'use_ability', unitId: 'altar' }, room.state.version);
  const goblin = room.state.units.find(unit => unit.id === 'goblin');
  assert.deepEqual({ moves: goblin.bonusMoves, attacks: goblin.bonusAttacks }, { moves: 1, attacks: 1 });
  rooms.action(room.code, first.id, { type: 'attack', unitId: 'goblin', targetUnitId: 'target' }, room.state.version);
  assert.equal(room.state.units.find(unit => unit.id === 'target').hp, 2);
  assert.equal(goblin.bonusAttacks, 0);
});

test('Altar Mago não pode ser lançado enquanto o jogador controla um Goblin', () => {
  const { rooms, room, first } = match();
  const player = room.state.players[0];
  const card = { instanceId: randomUUID(), cardId: 'mage_altar' };
  player.hand = [card];
  room.state.units.push({ id: 'goblin', ownerSeat: 1, cardId: 'goblin', x: 6, z: 10, hp: 1, actionUsed: false });
  assert.throws(() => rooms.action(room.code, first.id, {
    type: 'summon', cardInstanceId: card.instanceId, x: 8, z: 10,
  }, room.state.version), /controlar um Goblin/);
});
