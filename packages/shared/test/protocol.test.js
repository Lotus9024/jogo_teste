import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeMessage, parseMessage } from '../src/protocol.js';

test('codifica e interpreta mensagens do protocolo', () => {
  const encoded = encodeMessage('room:create', { playerName: 'Aldren' });
  assert.deepEqual(parseMessage(encoded), { type: 'room:create', payload: { playerName: 'Aldren' } });
});

test('rejeita mensagens inválidas', () => {
  assert.equal(parseMessage('não é json'), null);
  assert.equal(parseMessage('{}'), null);
});
