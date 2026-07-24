import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CLIENT_EVENTS,
  encodeMessage,
  parseMessage,
  PROTOCOL_LIMITS,
  SERVER_EVENTS
} from '../src/protocol.js';

test('codifica e interpreta mensagens do protocolo', () => {
  const encoded = encodeMessage(CLIENT_EVENTS.AUTHENTICATE, { ticket: 'a'.repeat(43) });
  assert.deepEqual(parseMessage(encoded), {
    type: CLIENT_EVENTS.AUTHENTICATE,
    payload: { ticket: 'a'.repeat(43) }
  });
  assert.equal(CLIENT_EVENTS.ROOM_SPECTATE, 'room:spectate');
  assert.equal(CLIENT_EVENTS.AI_CREATE, 'ai:create');
  assert.equal(SERVER_EVENTS.ROOM_DIRECTORY, 'room:directory');
});

test('rejeita mensagens inválidas', () => {
  assert.equal(parseMessage('não é json'), null);
  assert.equal(parseMessage('{}'), null);
});

test('aceita estados grandes do servidor sem ampliar comandos do cliente', () => {
  const units = Array.from({ length: 24 }, (_, index) => ({
    id: `unidade-${index}-${'x'.repeat(80)}`,
    ownerSeat: index % 2 + 1,
    cardId: index % 3 === 0 ? 'archer' : 'guard',
    x: index % 15,
    z: Math.floor(index / 15),
    hp: 4,
    actionUsed: false,
    underConstruction: false
  }));
  const encoded = encodeMessage(SERVER_EVENTS.ROOM_STATE, { state: { version: 75, units } });
  const size = new TextEncoder().encode(encoded).byteLength;

  assert.ok(size > PROTOCOL_LIMITS.clientMessageBytes);
  assert.ok(size < PROTOCOL_LIMITS.serverMessageBytes);
  assert.equal(parseMessage(encoded)?.payload.state.units.length, units.length);
  assert.equal(parseMessage(encoded, { maxBytes: PROTOCOL_LIMITS.clientMessageBytes }), null);
});
