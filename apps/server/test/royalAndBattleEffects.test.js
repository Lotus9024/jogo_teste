import test from 'node:test';
import assert from 'node:assert/strict';
import { match } from '../test-support/match.js';

function replaceHand(player, cardId, instanceId = `${cardId}-card`) {
  player.hand = [{ instanceId, cardId }];
  player.energy = 10;
  return instanceId;
}

test('Guerreiro Real valida o reino e fortalece todos os Guerreiros aliados', () => {
  const { rooms, room, first } = match();
  const player = room.state.players[0];
  const cardInstanceId = replaceHand(player, 'royal_warrior');

  player.citizens = 9;
  assert.throws(() => rooms.action(room.code, first.id, {
    type: 'summon', cardInstanceId, x: 6, z: 10,
  }, room.state.version), /10 cidadãos/);

  player.citizens = 10;
  room.state.units.push({
    id: 'blocking-goblin', ownerSeat: 1, cardId: 'goblin', x: 5, z: 10,
    hp: 1, maxHp: 1, actionUsed: false, underConstruction: false,
  });
  assert.throws(() => rooms.action(room.code, first.id, {
    type: 'summon', cardInstanceId, x: 6, z: 10,
  }, room.state.version), /Magos ou Goblins/);

  room.state.units = [{
    id: 'warrior', ownerSeat: 1, cardId: 'warrior', x: 5, z: 10,
    hp: 1, maxHp: 2, actionUsed: false, underConstruction: false,
  }];
  rooms.action(room.code, first.id, {
    type: 'summon', cardInstanceId, x: 6, z: 10,
  }, room.state.version);

  const warrior = room.state.units.find(unit => unit.id === 'warrior');
  const royal = room.state.units.find(unit => unit.cardId === 'royal_warrior');
  assert.deepEqual(
    { hp: warrior.hp, maxHp: warrior.maxHp, bonus: warrior.royalWarriorHpBonus },
    { hp: 2, maxHp: 3, bonus: 1 },
  );
  assert.deepEqual(
    { hp: royal.hp, maxHp: royal.maxHp, bonus: royal.royalWarriorHpBonus },
    { hp: 4, maxHp: 4, bonus: 1 },
  );
});

test('Torre Real concede vida às construções quando a obra termina', () => {
  const { rooms, room, first, second } = match();
  const player = room.state.players[0];
  const cardInstanceId = replaceHand(player, 'royal_tower');
  player.citizens = 12;
  room.state.units.push({
    id: 'house', ownerSeat: 1, cardId: 'wooden_house', x: 5, z: 10,
    hp: 1, maxHp: 1, actionUsed: false, underConstruction: false,
  });

  rooms.action(room.code, first.id, {
    type: 'summon', cardInstanceId, x: 6, z: 10,
  }, room.state.version);
  const tower = room.state.units.find(unit => unit.cardId === 'royal_tower');
  assert.equal(tower.underConstruction, true);
  tower.buildReadyRound = room.state.round + 1;

  rooms.action(room.code, first.id, { type: 'end_turn' }, room.state.version);
  rooms.action(room.code, second.id, { type: 'end_turn' }, room.state.version);

  const house = room.state.units.find(unit => unit.id === 'house');
  assert.deepEqual(
    { hp: house.hp, maxHp: house.maxHp, bonus: house.royalConstructionBonus },
    { hp: 4, maxHp: 4, bonus: 3 },
  );
  assert.deepEqual(
    { hp: tower.hp, maxHp: tower.maxHp, bonus: tower.royalConstructionBonus, building: tower.underConstruction },
    { hp: 10, maxHp: 10, bonus: 3, building: false },
  );
});

test('Nevasca atinge tropas ao redor e reduz o movimento por dois turnos delas', () => {
  const { rooms, room, first, second } = match();
  const player = room.state.players[0];
  const cardInstanceId = replaceHand(player, 'blizzard');
  room.state.units.push(
    {
      id: 'frozen-guard', ownerSeat: 2, cardId: 'guard', x: 7, z: 7,
      hp: 3, maxHp: 3, actionUsed: false, underConstruction: false,
    },
    {
      id: 'safe-guard', ownerSeat: 2, cardId: 'guard', x: 10, z: 10,
      hp: 3, maxHp: 3, actionUsed: false, underConstruction: false,
    },
    {
      id: 'allied-warrior', ownerSeat: 1, cardId: 'warrior', x: 8, z: 7,
      hp: 2, maxHp: 2, actionUsed: false, underConstruction: false,
    },
  );

  rooms.action(room.code, first.id, {
    type: 'summon', cardInstanceId, x: 7, z: 7,
  }, room.state.version);

  const frozen = room.state.units.find(unit => unit.id === 'frozen-guard');
  assert.deepEqual(
    { hp: frozen.hp, penalty: frozen.movementPenalty, turns: frozen.movementPenaltyTurns },
    { hp: 2, penalty: 1, turns: 2 },
  );
  assert.equal(room.state.units.find(unit => unit.id === 'safe-guard').hp, 3);
  assert.equal(room.state.units.find(unit => unit.id === 'allied-warrior').hp, 2);
  assert.equal(room.state.snowstorms.length, 1);
  assert.equal(room.state.effects[0].type, 'blizzard_cast');

  rooms.action(room.code, first.id, { type: 'end_turn' }, room.state.version);
  assert.throws(() => rooms.action(room.code, second.id, {
    type: 'move', unitId: frozen.id, x: 8, z: 7,
  }, room.state.version), /Movimento inválido/);
  rooms.action(room.code, second.id, { type: 'end_turn' }, room.state.version);
  assert.equal(frozen.movementPenaltyTurns, 1);

  rooms.action(room.code, first.id, { type: 'end_turn' }, room.state.version);
  assert.throws(() => rooms.action(room.code, second.id, {
    type: 'move', unitId: frozen.id, x: 8, z: 7,
  }, room.state.version), /Movimento inválido/);
  rooms.action(room.code, second.id, { type: 'end_turn' }, room.state.version);

  assert.deepEqual(
    { penalty: frozen.movementPenalty, turns: frozen.movementPenaltyTurns, storms: room.state.snowstorms.length },
    { penalty: 0, turns: 0, storms: 0 },
  );
});

test('Bombardeiro e Torre publicam os eventos usados pelas animações', () => {
  const bomberMatch = match();
  bomberMatch.room.state.units.push({
    id: 'bomber', ownerSeat: 1, cardId: 'goblin_bomber', x: 7, z: 10,
    hp: 1, maxHp: 1, actionUsed: false, underConstruction: false,
  });
  bomberMatch.rooms.action(bomberMatch.room.code, bomberMatch.first.id, {
    type: 'use_ability', unitId: 'bomber',
  }, bomberMatch.room.state.version);
  assert.deepEqual(
    {
      type: bomberMatch.room.state.effects[0].type,
      from: [bomberMatch.room.state.effects[0].fromX, bomberMatch.room.state.effects[0].fromZ],
      to: [bomberMatch.room.state.effects[0].toX, bomberMatch.room.state.effects[0].toZ],
    },
    { type: 'goblin_bomber_charge', from: [7, 10], to: [7, 5] },
  );

  const towerMatch = match();
  towerMatch.room.state.units.push(
    {
      id: 'tower', ownerSeat: 1, cardId: 'tower', x: 7, z: 10,
      hp: 5, maxHp: 5, actionUsed: false, underConstruction: false,
    },
    {
      id: 'archer', ownerSeat: 1, cardId: 'archer', x: 7, z: 10,
      hp: 2, maxHp: 2, actionUsed: false, underConstruction: false, mountedOnTowerId: 'tower',
      abilityReadyTurn: 0,
    },
    {
      id: 'enemy', ownerSeat: 2, cardId: 'guard', x: 7, z: 7,
      hp: 3, maxHp: 3, actionUsed: false, underConstruction: false,
    },
  );
  towerMatch.rooms.action(towerMatch.room.code, towerMatch.first.id, {
    type: 'use_ability', unitId: 'archer',
  }, towerMatch.room.state.version);
  assert.equal(towerMatch.room.state.effects[0].type, 'tower_arrow_volley');
  assert.equal(towerMatch.room.state.units.find(unit => unit.id === 'enemy').hp, 1);
});
