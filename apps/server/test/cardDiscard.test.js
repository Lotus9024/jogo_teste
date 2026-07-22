import test from 'node:test';
import assert from 'node:assert/strict';
import { match } from '../test-support/match.js';

test('descarta uma carta sem consumir energia e sem comprar reposição imediata', () => {
  const { rooms, room, first } = match();
  const player = room.state.players[0];
  const card = player.hand[0];
  const energy = player.energy;
  const handSize = player.hand.length;
  rooms.action(room.code, first.id, { type: 'discard_card', cardInstanceId: card.instanceId }, room.state.version);
  assert.equal(player.energy, energy);
  assert.equal(player.hand.length, handSize - 1);
  assert.equal(player.discard.at(-1), card.cardId);
});

test('não permite descartar carta fora do próprio turno ou repetir a mesma carta', () => {
  const { rooms, room, first, second } = match();
  const firstCard = room.state.players[0].hand[0];
  const secondCard = room.state.players[1].hand[0];
  assert.throws(() => rooms.action(room.code, second.id, { type: 'discard_card', cardInstanceId: secondCard.instanceId }, room.state.version), /turno/);
  rooms.action(room.code, first.id, { type: 'discard_card', cardInstanceId: firstCard.instanceId }, room.state.version);
  assert.throws(() => rooms.action(room.code, first.id, { type: 'discard_card', cardInstanceId: firstCard.instanceId }, room.state.version), /mão/);
});
