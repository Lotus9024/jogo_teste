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

test('Goblins retiram no máximo 1 de resistência de cada construção Básica adjacente por turno', () => {
  const { rooms, room, second } = match();
  room.state.activeSeat = 2;
  room.state.units.push(
    { id: 'goblin', ownerSeat: 1, cardId: 'goblin', x: 6, z: 10, hp: 1, underConstruction: false },
    { id: 'henry', ownerSeat: 1, cardId: 'henry', x: 8, z: 10, hp: 1, underConstruction: false },
    { id: 'shared-building', ownerSeat: 1, cardId: 'tower', x: 7, z: 10, hp: 5, maxHp: 5, underConstruction: false },
    { id: 'swarm-goblin', ownerSeat: 1, cardId: 'goblin', x: 5, z: 9, hp: 1, underConstruction: false },
    { id: 'swarm-building', ownerSeat: 1, cardId: 'wooden_barrier', x: 5, z: 10, hp: 3, maxHp: 3, underConstruction: false },
  );

  rooms.action(room.code, second.id, { type: 'end_turn' }, room.state.version);

  assert.equal(room.state.units.find(unit => unit.id === 'shared-building').hp, 4);
  assert.equal(room.state.units.find(unit => unit.id === 'swarm-building').hp, 2);
});

test('Desordem atinge diagonais, ignora inimigos e também é aplicada pelo Bombardeiro', () => {
  const { rooms, room, second } = match();
  room.state.activeSeat = 2;
  room.state.units.push(
    { id: 'goblin', ownerSeat: 1, cardId: 'goblin', x: 6, z: 10, hp: 1, underConstruction: false },
    { id: 'diagonal', ownerSeat: 1, cardId: 'tower', x: 7, z: 9, hp: 5, maxHp: 5, underConstruction: false },
    { id: 'enemy', ownerSeat: 2, cardId: 'tower', x: 6, z: 9, hp: 5, maxHp: 5, underConstruction: false },
    { id: 'bomber', ownerSeat: 1, cardId: 'goblin_bomber', x: 9, z: 10, hp: 1, underConstruction: false },
    { id: 'beside-bomber', ownerSeat: 1, cardId: 'tower', x: 9, z: 9, hp: 5, maxHp: 5, underConstruction: false },
  );

  rooms.action(room.code, second.id, { type: 'end_turn' }, room.state.version);

  assert.equal(room.state.units.find(unit => unit.id === 'diagonal').hp, 4);
  assert.equal(room.state.units.find(unit => unit.id === 'enemy').hp, 5);
  assert.equal(room.state.units.find(unit => unit.id === 'beside-bomber').hp, 4);
});

test('Casa Goblin hospeda cidadãos, é imune à Desordem e gera Goblin à frente', () => {
  const { rooms, room, first, second } = match();
  const player = room.state.players[0];
  player.energy = 10;
  player.hand = [{ instanceId: 'house-card', cardId: 'goblin_house' }];
  rooms.action(room.code, first.id, { type: 'summon', cardInstanceId: 'house-card', x: 7, z: 10 }, room.state.version);
  const house = room.state.units.find(unit => unit.cardId === 'goblin_house');
  assert.deepEqual({ hp: house.hp, underConstruction: house.underConstruction }, { hp: 1, underConstruction: false });
  room.state.activeSeat = 2;
  room.state.units.push({ id: 'beside', ownerSeat: 1, cardId: 'goblin', x: 6, z: 10, hp: 1, underConstruction: false });
  rooms.action(room.code, second.id, { type: 'end_turn' }, room.state.version);
  assert.equal(room.state.units.find(unit => unit.id === house.id).hp, 1);
  rooms.action(room.code, first.id, { type: 'use_ability', unitId: house.id }, room.state.version);
  const child = room.state.units.find(unit => unit.cardId === 'goblin' && unit.x === 7 && unit.z === 9);
  assert.equal(child.actionUsed, true);
  assert.equal(player.energy, 10 - CARD_BY_ID.goblin_house.cost + 3 - CARD_BY_ID.goblin_house.ability.cost);
});

test('Casa Goblin não pode ficar ao lado de outra casa Básica', () => {
  const { rooms, room, first } = match();
  const player = room.state.players[0];
  player.hand = [{ instanceId: 'house-card', cardId: 'goblin_house' }];
  room.state.units.push({ id: 'wood-house', ownerSeat: 1, cardId: 'wooden_house', x: 7, z: 10, hp: 1, underConstruction: false });
  assert.throws(() => rooms.action(room.code, first.id, {
    type: 'summon', cardInstanceId: 'house-card', x: 8, z: 10,
  }, room.state.version), /outra casa Básica/);
});

test('Clone Goblin copia a última tropa lançada e pode se fortalecer', () => {
  const { rooms, room, first } = match();
  const player = room.state.players[0];
  player.energy = 10;
  player.hand = [
    { instanceId: 'henry-card', cardId: 'henry' },
    { instanceId: 'clone-card', cardId: 'goblin_clone' },
  ];
  rooms.action(room.code, first.id, { type: 'summon', cardInstanceId: 'henry-card', x: 6, z: 10 }, room.state.version);
  player.energy = 10;
  rooms.action(room.code, first.id, { type: 'summon', cardInstanceId: 'clone-card', x: 8, z: 10 }, room.state.version);
  const clone = room.state.units.find(unit => unit.isGoblinClone);
  assert.deepEqual({ cardId: clone.cardId, copied: clone.clonedFromCardId, actionUsed: clone.actionUsed }, { cardId: 'henry', copied: 'henry', actionUsed: true });
  rooms.action(room.code, first.id, { type: 'use_instant', unitId: clone.id }, room.state.version);
  assert.deepEqual({ hp: clone.hp, maxHp: clone.maxHp, damage: clone.cloneDamageBonus }, { hp: 2, maxHp: 2, damage: 1 });
});

test('Desordem destrói construções sem resistência restante', () => {
  const { rooms, room, second } = match();
  room.state.activeSeat = 2;
  room.state.units.push(
    { id: 'goblin', ownerSeat: 1, cardId: 'goblin', x: 6, z: 10, hp: 1, underConstruction: false },
    { id: 'house', ownerSeat: 1, cardId: 'wooden_house', x: 6, z: 9, hp: 1, maxHp: 1, underConstruction: false },
  );

  rooms.action(room.code, second.id, { type: 'end_turn' }, room.state.version);

  assert.equal(room.state.units.some(unit => unit.id === 'house'), false);
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
