import test from 'node:test';
import assert from 'node:assert/strict';
import { match } from '../test-support/match.js';

test('barreira permanece em construção durante uma rodada', () => {
  const { rooms, room, first, second } = match();
  room.state.players[0].hand.push({ instanceId: 'barrier-card', cardId: 'wooden_barrier' });
  rooms.action(room.code, first.id, { type: 'summon', cardInstanceId: 'barrier-card', x: 6, z: 10 }, room.state.version);
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
  secondPlayer.rooms.action(secondPlayer.room.code, secondPlayer.second.id, { type: 'summon', cardInstanceId: 'barrier-card-seat-2', x: 6, z: 4 }, secondPlayer.room.state.version);
  const secondBarrier = secondPlayer.room.state.units[0];
  secondPlayer.rooms.action(secondPlayer.room.code, secondPlayer.second.id, { type: 'end_turn' }, secondPlayer.room.state.version);
  assert.equal(secondBarrier.underConstruction, true);
  secondPlayer.rooms.action(secondPlayer.room.code, secondPlayer.first.id, { type: 'end_turn' }, secondPlayer.room.state.version);
  assert.equal(secondBarrier.underConstruction, false);
});
test('torre leva duas rodadas para concluir', () => {
  const { rooms, room, first, second } = match();
  room.state.players[0].hand.push({ instanceId: 'tower-card', cardId: 'tower' });
  rooms.action(room.code, first.id, { type: 'summon', cardInstanceId: 'tower-card', x: 6, z: 10 }, room.state.version);
  const tower = room.state.units[0];
  assert.equal(tower.underConstruction, true);
  assert.equal(tower.buildReadyRound, 3);
  rooms.action(room.code, first.id, { type: 'end_turn' }, room.state.version);
  rooms.action(room.code, second.id, { type: 'end_turn' }, room.state.version);
  assert.equal(tower.underConstruction, true);
  rooms.action(room.code, first.id, { type: 'end_turn' }, room.state.version);
  rooms.action(room.code, second.id, { type: 'end_turn' }, room.state.version);
  assert.equal(tower.underConstruction, false);
});

test('Altar Mago compra uma carta adicional ao concluir a construção', () => {
  const { rooms, room, first, second } = match();
  const player = room.state.players[0];
  player.hand = player.hand.slice(0, 5);
  room.state.units.push({
    id: 'mage-altar-building', ownerSeat: 1, cardId: 'mage_altar', x: 6, z: 10,
    hp: 1, maxHp: 1, shield: 0, actionUsed: false, underConstruction: true, buildReadyRound: 2,
  });
  rooms.action(room.code, first.id, { type: 'end_turn' }, room.state.version);
  rooms.action(room.code, second.id, { type: 'end_turn' }, room.state.version);
  assert.equal(room.state.units.find(unit => unit.id === 'mage-altar-building').underConstruction, false);
  assert.equal(player.hand.length, 7);
});
