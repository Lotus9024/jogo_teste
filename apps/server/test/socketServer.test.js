import { once } from 'node:events';
import { createServer } from 'node:http';
import test from 'node:test';
import assert from 'node:assert/strict';
import { WebSocket } from 'ws';
import { DEFAULT_DECK_CARD_IDS } from '@tronos/shared/cards';
import {
  CLIENT_EVENTS,
  SERVER_EVENTS,
  encodeMessage,
  parseMessage
} from '@tronos/shared/protocol';
import { RoomManager } from '../src/game/roomManager.js';
import { createSocketServer } from '../src/realtime/createSocketServer.js';

test('WebSocket exige ticket, ignora identidade do cliente e bloqueia ação de espectador', async t => {
  const tickets = new Map([
    ['a'.repeat(43), identity('jogador-azul', 'Rei Autêntico')],
    ['b'.repeat(43), identity('jogador-vermelho', 'Rainha Autêntica')],
    ['c'.repeat(43), identity('cronista', 'Cronista')]
  ]);
  const authService = {
    async consumeSocketTicket(ticket) {
      const value = tickets.get(ticket) ?? null;
      tickets.delete(ticket);
      return value;
    }
  };
  const rooms = new RoomManager();
  const server = createServer();
  const websocketServer = createSocketServer(server, rooms, authService);
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  const clients = [];
  t.after(async () => {
    for (const client of clients) {
      if (client.socket.readyState === WebSocket.OPEN) client.socket.close();
    }
    await Promise.all(clients.map(client => client.closed()));
    await new Promise(resolve => websocketServer.close(resolve));
    await new Promise(resolve => server.close(resolve));
  });

  const url = `ws://127.0.0.1:${server.address().port}/ws`;
  const blue = await connect(url); clients.push(blue);
  await blue.next(SERVER_EVENTS.CONNECTION_READY);

  blue.send(CLIENT_EVENTS.ROOM_CREATE, {
    name: 'Tentativa sem login',
    visibility: 'public'
  });
  assert.match((await blue.next(SERVER_EVENTS.ERROR)).payload.message, /Autentique-se/);

  blue.send(CLIENT_EVENTS.AUTHENTICATE, { ticket: 'a'.repeat(43) });
  assert.deepEqual((await blue.next(SERVER_EVENTS.AUTHENTICATED)).payload.player, {
    id: 'jogador-azul',
    name: 'Rei Autêntico'
  });
  await blue.next(SERVER_EVENTS.ROOM_DIRECTORY);

  blue.send(CLIENT_EVENTS.ROOM_CREATE, {
    name: 'Arena pública',
    visibility: 'public',
    playerName: 'Nome falso',
    deckCardIds: []
  });
  const waitingState = await blue.next(SERVER_EVENTS.ROOM_STATE);
  assert.equal(waitingState.payload.state.players[0].name, 'Rei Autêntico');
  const roomCode = waitingState.payload.code;

  const red = await connect(url); clients.push(red);
  await red.next(SERVER_EVENTS.CONNECTION_READY);
  red.send(CLIENT_EVENTS.AUTHENTICATE, { ticket: 'b'.repeat(43) });
  await red.next(SERVER_EVENTS.AUTHENTICATED);
  await red.next(SERVER_EVENTS.ROOM_DIRECTORY);
  red.send(CLIENT_EVENTS.ROOM_JOIN, { roomCode, playerName: 'Outro nome falso' });
  await red.next(SERVER_EVENTS.ROOM_STATE);

  const spectator = await connect(url); clients.push(spectator);
  await spectator.next(SERVER_EVENTS.CONNECTION_READY);
  spectator.send(CLIENT_EVENTS.AUTHENTICATE, { ticket: 'c'.repeat(43) });
  await spectator.next(SERVER_EVENTS.AUTHENTICATED);
  await spectator.next(SERVER_EVENTS.ROOM_DIRECTORY);
  spectator.send(CLIENT_EVENTS.ROOM_SPECTATE, { roomCode });
  const spectatorState = await spectator.next(SERVER_EVENTS.ROOM_STATE);
  assert.deepEqual(spectatorState.payload.self, { id: 'cronista', spectator: true });
  assert.equal(Object.hasOwn(spectatorState.payload.self, 'hand'), false);

  spectator.send(CLIENT_EVENTS.GAME_ACTION, {
    version: spectatorState.payload.state.version,
    action: { type: 'end_turn' }
  });
  assert.match((await spectator.next(SERVER_EVENTS.ERROR)).payload.message, /Espectadores/);
  assert.equal(rooms.rooms.get(roomCode).state.version, spectatorState.payload.state.version);
});

test('limita conexoes pre-auth por IP', async t => {
  const authService = { async consumeSocketTicket() { return null; } };
  const rooms = new RoomManager();
  const server = createServer();
  const websocketServer = createSocketServer(server, rooms, authService);
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  const clients = [];
  t.after(async () => {
    for (const client of clients) {
      if (client.socket.readyState === WebSocket.OPEN) client.socket.close();
    }
    await Promise.all(clients.map(client => client.closed()));
    await new Promise(resolve => websocketServer.close(resolve));
    await new Promise(resolve => server.close(resolve));
  });

  const url = `ws://127.0.0.1:${server.address().port}/ws`;
  for (let index = 0; index < 8; index += 1) {
    const client = await connect(url);
    clients.push(client);
    await client.next(SERVER_EVENTS.CONNECTION_READY);
  }

  const overflow = new WebSocket(url, { origin: 'http://127.0.0.1:4173' });
  const opened = once(overflow, 'open');
  const closed = once(overflow, 'close');
  await opened;
  const [closeCode] = await closed;
  assert.equal(closeCode, 1013);
});

test('impede duas conexoes autenticadas e retoma partida apos queda', async t => {
  const ticketBlue = 'd'.repeat(43);
  const ticketDuplicate = 'e'.repeat(43);
  const ticketReconnect = 'f'.repeat(43);
  const ticketRed = 'g'.repeat(43);
  const blueIdentity = identity('jogador-retorno', 'Rei Retorno');
  const tickets = new Map([
    [ticketBlue, blueIdentity],
    [ticketDuplicate, blueIdentity],
    [ticketReconnect, blueIdentity],
    [ticketRed, identity('jogador-rival', 'Rei Rival')]
  ]);
  const authService = {
    async consumeSocketTicket(ticket) {
      const value = tickets.get(ticket) ?? null;
      tickets.delete(ticket);
      return value;
    }
  };
  const rooms = new RoomManager();
  const server = createServer();
  const websocketServer = createSocketServer(server, rooms, authService);
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  const clients = [];
  t.after(async () => {
    for (const client of clients) {
      if (client.socket.readyState === WebSocket.OPEN) client.socket.close();
    }
    await Promise.all(clients.map(client => client.closed()));
    await new Promise(resolve => websocketServer.close(resolve));
    await new Promise(resolve => server.close(resolve));
  });

  const url = `ws://127.0.0.1:${server.address().port}/ws`;
  const blue = await connect(url); clients.push(blue);
  await blue.next(SERVER_EVENTS.CONNECTION_READY);
  blue.send(CLIENT_EVENTS.AUTHENTICATE, { ticket: ticketBlue });
  await blue.next(SERVER_EVENTS.AUTHENTICATED);
  await blue.next(SERVER_EVENTS.ROOM_DIRECTORY);
  blue.send(CLIENT_EVENTS.ROOM_CREATE, { name: 'Arena de retorno', visibility: 'private' });
  const waiting = await blue.next(SERVER_EVENTS.ROOM_STATE);
  const roomCode = waiting.payload.code;

  const red = await connect(url); clients.push(red);
  await red.next(SERVER_EVENTS.CONNECTION_READY);
  red.send(CLIENT_EVENTS.AUTHENTICATE, { ticket: ticketRed });
  await red.next(SERVER_EVENTS.AUTHENTICATED);
  await red.next(SERVER_EVENTS.ROOM_DIRECTORY);
  red.send(CLIENT_EVENTS.ROOM_JOIN, { roomCode });
  await red.next(SERVER_EVENTS.ROOM_STATE);

  const duplicate = await connect(url); clients.push(duplicate);
  await duplicate.next(SERVER_EVENTS.CONNECTION_READY);
  duplicate.send(CLIENT_EVENTS.AUTHENTICATE, { ticket: ticketDuplicate });
  await duplicate.next(SERVER_EVENTS.ERROR);
  await duplicate.closed();
  assert.equal(
    rooms.rooms.get(roomCode).players.filter(player => player.id === blueIdentity.playerId && player.socket).length,
    1
  );

  blue.socket.close();
  await blue.closed();
  await waitFor(() => rooms.rooms.get(roomCode).players[0].socket === null);
  assert.equal(rooms.rooms.get(roomCode).state.players[0].connected, false);

  const reconnected = await connect(url); clients.push(reconnected);
  await reconnected.next(SERVER_EVENTS.CONNECTION_READY);
  reconnected.send(CLIENT_EVENTS.AUTHENTICATE, { ticket: ticketReconnect });
  const authenticated = await reconnected.next(SERVER_EVENTS.AUTHENTICATED);
  assert.equal(authenticated.payload.resumed, true);
  const resumed = await reconnected.next(SERVER_EVENTS.ROOM_STATE);
  assert.equal(resumed.payload.code, roomCode);
  assert.equal(resumed.payload.self.spectator, false);
  assert.equal(Array.isArray(resumed.payload.self.hand), true);
  assert.equal(resumed.payload.state.players[0].connected, true);
});

function identity(playerId, name) {
  return { playerId, name, deckCardIds: [...DEFAULT_DECK_CARD_IDS] };
}

async function waitFor(predicate, timeoutMs = 1_000) {
  const deadline = Date.now() + timeoutMs;
  while (!predicate()) {
    if (Date.now() >= deadline) throw new Error('Tempo excedido aguardando estado.');
    await new Promise(resolve => setTimeout(resolve, 10));
  }
}

async function connect(url) {
  const socket = new WebSocket(url, { origin: 'http://127.0.0.1:4173' });
  const messages = [];
  const waiters = [];

  socket.on('message', raw => {
    const message = parseMessage(raw);
    if (!message) return;
    const waiterIndex = waiters.findIndex(waiter => waiter.type === message.type);
    if (waiterIndex >= 0) {
      const [waiter] = waiters.splice(waiterIndex, 1);
      waiter.finish(message);
    } else {
      messages.push(message);
    }
  });
  await once(socket, 'open');

  return {
    socket,
    send(type, payload = {}) {
      socket.send(encodeMessage(type, payload));
    },
    next(type) {
      const index = messages.findIndex(message => message.type === type);
      if (index >= 0) return Promise.resolve(messages.splice(index, 1)[0]);
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          const waiterIndex = waiters.findIndex(waiter => waiter.type === type);
          if (waiterIndex >= 0) waiters.splice(waiterIndex, 1);
          reject(new Error(`Tempo excedido aguardando ${type}`));
        }, 2_000);
        waiters.push({
          type,
          finish(message) {
            clearTimeout(timeout);
            resolve(message);
          }
        });
      });
    },
    closed() {
      if (socket.readyState === WebSocket.CLOSED) return Promise.resolve();
      return once(socket, 'close').then(() => undefined);
    }
  };
}
