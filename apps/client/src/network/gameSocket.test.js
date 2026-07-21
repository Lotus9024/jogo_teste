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

test('reconecta automaticamente depois que o servidor reinicia', async () => {
  FakeWebSocket.instances = [];
  const client = new GameSocketClient('ws://local/ws', {
    WebSocketImpl: FakeWebSocket,
    reconnectBaseDelay: 1
  });
  let connections = 0;
  client.addEventListener('connected', () => { connections += 1; });
  client.connect();
  FakeWebSocket.instances[0].open();
  FakeWebSocket.instances[0].close();
  await new Promise(resolve => setTimeout(resolve, 10));
  assert.equal(FakeWebSocket.instances.length, 2);
  FakeWebSocket.instances[1].open();
  assert.equal(connections, 2);
});
