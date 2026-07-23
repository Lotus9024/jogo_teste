import test from 'node:test';
import assert from 'node:assert/strict';
import { match } from '../test-support/match.js';

test('Goblins na arena reduzem o custo da Torre Goblin', () => {
  const { rooms, room, first } = match();
  const player = room.state.players[0];
  player.energy = 10;
  player.hand.push({ instanceId: 'goblin-tower-card', cardId: 'goblin_tower' });
  room.state.units.push({ id: 'goblin-one', ownerSeat: 1, cardId: 'goblin', x: 6, z: 10, hp: 1, actionUsed: false });
  rooms.action(room.code, first.id, { type: 'summon', cardInstanceId: 'goblin-tower-card', x: 8, z: 10 }, room.state.version);
  assert.equal(player.energy, 3);
  const tower = room.state.units.find(unit => unit.cardId === 'goblin_tower');
  assert.equal(tower.underConstruction, true);
  assert.equal(tower.buildReadyRound, 2);
});

test('Torre Goblin consome um Goblin do baralho e o invoca sem ação', () => {
  const { rooms, room, first } = match();
  const player = room.state.players[0];
  player.energy = 10;
  player.deck = ['guard', 'goblin', 'warrior'];
  room.state.units.push({
    id: 'goblin-tower', ownerSeat: 1, cardId: 'goblin_tower', x: 7, z: 7,
    hp: 5, maxHp: 5, actionUsed: false, abilityUsed: false, underConstruction: false,
  });
  rooms.action(room.code, first.id, { type: 'summon_goblin', unitId: 'goblin-tower', x: 7, z: 6 }, room.state.version);
  const goblin = room.state.units.find(unit => unit.cardId === 'goblin');
  assert.deepEqual({ hp: goblin.hp, maxHp: goblin.maxHp, actionUsed: goblin.actionUsed }, { hp: 2, maxHp: 2, actionUsed: true });
  assert.deepEqual(player.deck, ['guard', 'warrior']);
  assert.equal(player.energy, 8);
  assert.equal(room.state.units[0].actionUsed, true);
  assert.throws(() => rooms.action(room.code, first.id, { type: 'summon_goblin', unitId: 'goblin-tower', x: 5, z: 5 }, room.state.version), /indisponível/);
});

test('Torre Goblin exige um Goblin no baralho e uma casa livre', () => {
  const { rooms, room, first } = match();
  const player = room.state.players[0];
  player.deck = ['guard'];
  room.state.units.push({ id: 'tower', ownerSeat: 1, cardId: 'goblin_tower', x: 7, z: 7, hp: 5, actionUsed: false, underConstruction: false });
  assert.throws(() => rooms.action(room.code, first.id, { type: 'summon_goblin', unitId: 'tower', x: 5, z: 5 }, room.state.version), /Goblin no baralho/);
});
