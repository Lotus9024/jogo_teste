import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { refreshKingdomProgress } from '../src/game/kingdomProgress.js';
import { match } from '../test-support/match.js';

test('Guerreiro ataca apenas em linhas retas', () => {
  const diagonal = match();
  diagonal.room.state.units.push(
    { id: 'warrior', ownerSeat: 1, cardId: 'warrior', x: 5, z: 8, hp: 2, actionUsed: false },
    { id: 'diagonal-target', ownerSeat: 2, cardId: 'guard', x: 6, z: 9, hp: 3, actionUsed: false },
  );
  assert.throws(() => diagonal.rooms.action(diagonal.room.code, diagonal.first.id, {
    type: 'attack', unitId: 'warrior', targetUnitId: 'diagonal-target',
  }, diagonal.room.state.version), /fora de alcance/);

  const straight = match();
  straight.room.state.units.push(
    { id: 'warrior', ownerSeat: 1, cardId: 'warrior', x: 5, z: 8, hp: 2, actionUsed: false },
    { id: 'straight-target', ownerSeat: 2, cardId: 'guard', x: 5, z: 10, hp: 3, actionUsed: false },
  );
  straight.rooms.action(straight.room.code, straight.first.id, {
    type: 'attack', unitId: 'warrior', targetUnitId: 'straight-target',
  }, straight.room.state.version);
  assert.equal(straight.room.state.units.find(unit => unit.id === 'straight-target').hp, 1);
});

test('perder cidadãos reduz o castelo ao nível um', () => {
  const { room } = match();
  const player = room.state.players[0];
  player.baseLevel = 2;
  player.maxEnergy = 12;
  player.energy = 12;
  refreshKingdomProgress(room.state);
  assert.deepEqual({ level: player.baseLevel, maxEnergy: player.maxEnergy, energy: player.energy }, { level: 1, maxEnergy: 10, energy: 10 });
});

test('Altar Goblin exige duas tropas na área da base e concede movimento extra', () => {
  const { rooms, room, first } = match();
  const player = room.state.players[0];
  player.hand = [{ instanceId: randomUUID(), cardId: 'goblin_altar' }];
  assert.throws(() => rooms.action(room.code, first.id, {
    type: 'summon', cardInstanceId: player.hand[0].instanceId, x: 7, z: 10,
  }, room.state.version), /duas tropas Goblin/);
  room.state.units.push(
    { id: 'base-goblin', ownerSeat: 1, cardId: 'goblin', x: 6, z: 11, hp: 1, actionUsed: false },
    { id: 'base-henry', ownerSeat: 1, cardId: 'henry', x: 8, z: 11, hp: 1, actionUsed: false },
  );
  rooms.action(room.code, first.id, {
    type: 'summon', cardInstanceId: player.hand[0].instanceId, x: 7, z: 10,
  }, room.state.version);
  const altar = room.state.units.find(unit => unit.cardId === 'goblin_altar');
  altar.underConstruction = false;
  altar.actionUsed = false;
  player.energy = 10;
  room.state.units.find(unit => unit.id === 'base-goblin').actionUsed = true;
  rooms.action(room.code, first.id, { type: 'use_ability', unitId: altar.id }, room.state.version);
  const goblin = room.state.units.find(unit => unit.id === 'base-goblin');
  assert.equal(goblin.bonusMoves, 1);
  rooms.action(room.code, first.id, { type: 'move', unitId: goblin.id, x: 6, z: 10 }, room.state.version);
  assert.deepEqual({ x: goblin.x, z: goblin.z, bonusMoves: goblin.bonusMoves }, { x: 6, z: 10, bonusMoves: 0 });
});

test('Altar Mago reduz o ataque dos Goblins por dois turnos', () => {
  const { rooms, room, first, second } = match();
  room.state.units.push(
    { id: 'mage-altar', ownerSeat: 1, cardId: 'mage_altar', x: 7, z: 10, hp: 1, actionUsed: false, underConstruction: false, abilityReadyTurn: 0 },
    { id: 'enemy-goblin', ownerSeat: 2, cardId: 'goblin', x: 5, z: 5, hp: 1, actionUsed: false },
    { id: 'goblin-target', ownerSeat: 1, cardId: 'guard', x: 5, z: 6, hp: 3, actionUsed: false },
  );
  room.state.players[0].energy = 10;
  rooms.action(room.code, first.id, { type: 'use_ability', unitId: 'mage-altar' }, room.state.version);
  const goblin = room.state.units.find(unit => unit.id === 'enemy-goblin');
  assert.equal(goblin.attackPenalty, 1);
  room.state.activeSeat = 2;
  rooms.action(room.code, second.id, { type: 'attack', unitId: 'enemy-goblin', targetUnitId: 'goblin-target' }, room.state.version);
  assert.equal(room.state.units.find(unit => unit.id === 'goblin-target').hp, 3);
});

test('Áreas de construtor acumulam resistência, mas energia apenas uma vez', () => {
  const { rooms, room, first } = match();
  const red = room.state.players[1];
  red.energy = 0;
  room.state.units.push(
    { id: 'builder-a', ownerSeat: 2, cardId: 'builder_area', x: 6, z: 3, hp: 1, maxHp: 1, underConstruction: false },
    { id: 'builder-b', ownerSeat: 2, cardId: 'builder_area', x: 8, z: 3, hp: 1, maxHp: 1, underConstruction: false },
    { id: 'fortified', ownerSeat: 2, cardId: 'tower', x: 7, z: 4, hp: 5, maxHp: 5, underConstruction: false },
  );
  refreshKingdomProgress(room.state);
  assert.deepEqual({ hp: room.state.units.find(unit => unit.id === 'fortified').hp, maxHp: room.state.units.find(unit => unit.id === 'fortified').maxHp }, { hp: 7, maxHp: 7 });
  rooms.action(room.code, first.id, { type: 'end_turn' }, room.state.version);
  assert.equal(red.energy, 4);
  room.state.units.push({ id: 'mage-in-base', ownerSeat: 2, cardId: 'mage', x: 7, z: 3, hp: 2, actionUsed: false });
  refreshKingdomProgress(room.state);
  assert.deepEqual({ hp: room.state.units.find(unit => unit.id === 'fortified').hp, maxHp: room.state.units.find(unit => unit.id === 'fortified').maxHp }, { hp: 5, maxHp: 5 });
});

test('não encerra o turno com mais de sete cartas', () => {
  const { rooms, room, first } = match();
  room.state.players[0].hand.push({ instanceId: randomUUID(), cardId: 'guard' });
  assert.throws(() => rooms.action(room.code, first.id, { type: 'end_turn' }, room.state.version), /no máximo 7 cartas/);
});
