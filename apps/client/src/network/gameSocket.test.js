import assert from 'node:assert/strict';
import test from 'node:test';
import { GameSocketClient, resolveSocketUrl } from './gameSocket.js';

class FakeWebSocket extends EventTarget {
  static OPEN = 1;
  static CLOSING = 2;
  static instances = [];

  constructor(url) {
    super();
    this.url = url;
    this.readyState = 0;
    this.sent = [];
    FakeWebSocket.instances.push(this);
  }

  open() {
    this.readyState = FakeWebSocket.OPEN;
    this.dispatchEvent(new Event('open'));
  }

  close() {
    this.readyState = 3;
    this.dispatchEvent(new Event('close'));
  }

  send(message) {
    this.sent.push(JSON.parse(message));
  }

  receive(type, payload = {}) {
    this.dispatchEvent(new MessageEvent('message', {
      data: JSON.stringify({ type, payload }),
    }));
  }
}

test('usa o backend público quando um endereço local vaza para o site HTTPS', () => {
  assert.equal(resolveSocketUrl({
    configuredUrl: 'ws://192.168.0.45:3001/ws',
    protocol: 'https:',
    hostname: 'tronos-em-ruinas.netlify.app'
  }), 'wss://tronos-em-ruinas-api.squareweb.app/ws');
});

test('preserva o servidor da rede local durante desenvolvimento', () => {
  assert.equal(resolveSocketUrl({
    configuredUrl: 'ws://192.168.0.45:3001/ws',
    protocol: 'http:',
    hostname: '127.0.0.1'
  }), 'ws://192.168.0.45:3001/ws');
});

test('autentica com ticket de uso único fora da URL e renova ao reconectar', async () => {
  FakeWebSocket.instances = [];
  let ticketNumber = 0;
  const client = new GameSocketClient('ws://local/ws', {
    WebSocketImpl: FakeWebSocket,
    reconnectBaseDelay: 1,
    ticketProvider: async () => `ticket-${++ticketNumber}`,
  });
  let connections = 0;
  client.addEventListener('connected', () => { connections += 1; });
  await client.connect();
  FakeWebSocket.instances[0].open();
  assert.equal(FakeWebSocket.instances[0].url, 'ws://local/ws');
  assert.deepEqual(FakeWebSocket.instances[0].sent[0], {
    type: 'auth:authenticate',
    payload: { ticket: 'ticket-1' },
  });
  FakeWebSocket.instances[0].receive('auth:authenticated');
  assert.equal(connections, 1);
  FakeWebSocket.instances[0].close();
  await new Promise(resolve => setTimeout(resolve, 10));
  assert.equal(FakeWebSocket.instances.length, 2);
  FakeWebSocket.instances[1].open();
  FakeWebSocket.instances[1].receive('auth:authenticated');
  assert.equal(connections, 2);
  assert.equal(FakeWebSocket.instances[1].sent[0].payload.ticket, 'ticket-2');
  client.disconnect();
});

test('ignora mensagens atrasadas de uma conexão substituída', async () => {
  const client = new GameSocketClient('ws://local/ws', {
    WebSocketImpl: FakeWebSocket,
    ticketProvider: async () => 'ticket',
  });
  let connections = 0;
  client.addEventListener('connected', () => { connections += 1; });
  await client.connect();
  const oldSocket = client.socket;
  oldSocket.open();
  client.disconnect();
  await client.connect();
  const newSocket = client.socket;
  newSocket.open();
  oldSocket.receive('auth:authenticated');
  assert.equal(client.authenticated, false);
  assert.equal(connections, 0);
  newSocket.receive('auth:authenticated');
  assert.equal(connections, 1);
  client.disconnect();
});

test('ticket pendente de uma sessão anterior não abre outro socket após entrar novamente', async () => {
  let resolveOldTicket;
  const client = new GameSocketClient('ws://local/ws', {
    WebSocketImpl: FakeWebSocket,
    ticketProvider: () => new Promise(resolve => { resolveOldTicket = resolve; }),
  });
  const pending = client.connect();
  client.disconnect();
  client.setTicketProvider(async () => 'new-ticket');
  await client.connect();
  const current = client.socket;
  resolveOldTicket('stale-ticket');
  await pending;
  assert.equal(client.socket, current);
  current.open();
  assert.equal(current.sent[0].payload.ticket, 'new-ticket');
  client.disconnect();
});

test('falha tardia do ticket após logout não agenda reconexão nem erro de outra sessão', async () => {
  let rejectTicket;
  const client = new GameSocketClient('ws://local/ws', {
    WebSocketImpl: FakeWebSocket,
    ticketProvider: () => new Promise((resolve, reject) => { rejectTicket = reject; }),
  });
  let errors = 0;
  client.addEventListener('error', () => { errors += 1; });
  const pending = client.connect();
  client.disconnect();
  rejectTicket(new Error('expired'));
  await pending;
  assert.equal(client.reconnectAttempt, 0);
  assert.equal(errors, 0);
  assert.equal(client.socket, null);
});

test('falha ao criar WebSocket libera o estado de conexão para nova tentativa', async () => {
  class BrokenWebSocket { constructor() { throw new Error('network unavailable'); } }
  const client = new GameSocketClient('ws://local/ws', {
    WebSocketImpl: BrokenWebSocket,
    ticketProvider: async () => 'ticket',
  });
  await client.connect();
  assert.equal(client.connecting, false);
  assert.equal(client.reconnectAttempt, 1);
  client.disconnect();
});
