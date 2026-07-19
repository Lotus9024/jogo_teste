import test from 'node:test';
import assert from 'node:assert/strict';
import { RoomManager } from '../src/game/roomManager.js';

test('cria uma sala e inicia a partida com dois jogadores', () => {
  const rooms = new RoomManager();
  const created = rooms.create('Rei Aldren', {});
  assert.equal(created.room.state.phase, 'waiting');
  const joined = rooms.join(created.room.code, 'Rei Varos', {});
  assert.equal(joined.room.players.length, 2);
  assert.equal(joined.room.state.phase, 'playing');
  assert.equal(joined.room.state.players[1].seat, 2);
  assert.match(joined.room.code, /^[A-Z2-9]{6}$/);
});

test('impede um terceiro jogador na mesma sala', () => {
  const rooms = new RoomManager();
  const { room } = rooms.create('Jogador Um', {});
  rooms.join(room.code, 'Jogador Dois', {});
  assert.throws(() => rooms.join(room.code, 'Jogador Três', {}), /Sala cheia/);
});
