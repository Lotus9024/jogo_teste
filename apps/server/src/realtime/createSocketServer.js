import { WebSocket, WebSocketServer } from 'ws';
import { GAME_CONFIG } from '@tronos/shared/game-config';
import { PROTOCOL_LIMITS, SERVER_EVENTS, parseMessage } from '@tronos/shared/protocol';
import { config } from '../config.js';
import { handleMessage } from './handleClientMessage.js';
import { broadcastRoom, broadcastDirectory, send, sendError } from './roomBroadcast.js';

const AUTHENTICATION_TIMEOUT_MS = 5_000;
const MAX_TOTAL_CONNECTIONS = 256;
const MAX_PREAUTH_CONNECTIONS = 64;
const MAX_PREAUTH_CONNECTIONS_PER_IP = 8;

export function createSocketServer(server, rooms, authServiceOrOptions) {
  const authService = authServiceOrOptions?.consumeSocketTicket
    ? authServiceOrOptions
    : authServiceOrOptions?.authService;
  const websocket = new WebSocketServer({
    server,
    path: '/ws',
    maxPayload: GAME_CONFIG.maxMessageBytes,
    verifyClient: ({ origin }, done) => {
      const allowed = config.clientOrigins.includes(origin);
      done(allowed, allowed ? 200 : 403, 'Origin denied');
    }
  });
  const sessions = new Map();
  const activeIdentitySockets = new Map();

  websocket.on('connection', (socket, request) => {
    // Protocol and network failures belong to this connection, not the process.
    socket.on('error', () => socket.terminate());
    const ip = requestIp(request);
    if (
      sessions.size >= MAX_TOTAL_CONNECTIONS
      || countPreauthSessions(sessions) >= MAX_PREAUTH_CONNECTIONS
      || countPreauthSessions(sessions, ip) >= MAX_PREAUTH_CONNECTIONS_PER_IP
    ) {
      socket.close(1013, 'Connection limit');
      return;
    }

    const session = {
      ip,
      identity: null,
      authenticated: false,
      authenticating: false,
      role: null,
      roomCode: null,
      messages: [],
      chain: Promise.resolve()
    };
    sessions.set(socket, session);
    socket.isAlive = true;
    socket.on('pong', () => { socket.isAlive = true; });

    const authenticationTimer = setTimeout(() => {
      if (session.authenticated || socket.readyState !== WebSocket.OPEN) return;
      sendError(socket, 'Autenticação necessária.');
      socket.close(1008, 'Authentication required');
    }, AUTHENTICATION_TIMEOUT_MS);
    authenticationTimer.unref();

    send(socket, SERVER_EVENTS.CONNECTION_READY, {
      serverTime: Date.now(),
      authenticationRequired: true
    });

    socket.on('message', raw => {
      const now = Date.now();
      session.messages = session.messages.filter(timestamp => now - timestamp < 10_000);
      session.messages.push(now);
      if (session.messages.length > 30) return socket.close(1008, 'Rate limit');

      const message = parseMessage(raw, { maxBytes: PROTOCOL_LIMITS.clientMessageBytes });
      if (!message) return sendError(socket, 'Mensagem inválida.');
      session.chain = session.chain
        .then(() => socket.readyState === WebSocket.OPEN && handleMessage({
          socket,
          session,
          message,
          rooms,
          websocket,
          sessions,
          activeIdentitySockets,
          authService,
          authenticationTimer
        }))
        .catch(error => {
          sendError(socket, error instanceof Error ? error.message : 'Não foi possível executar a ação.');
        });
    });

    socket.on('close', () => {
      clearTimeout(authenticationTimer);
      sessions.delete(socket);
      if (
        session.identity
        && activeIdentitySockets.get(session.identity.playerId) === socket
      ) {
        activeIdentitySockets.delete(session.identity.playerId);
      }
      if (!session.identity || !session.roomCode) return;
      const room = rooms.leave(session.identity.playerId);
      if (room) broadcastRoom(room);
      broadcastDirectory(websocket, sessions, rooms);
    });
  });

  const tickTimer = setInterval(() => {
    const roomCount = rooms.rooms.size;
    const changedRooms = rooms.tick();
    changedRooms.forEach(broadcastRoom);
    if (rooms.rooms.size !== roomCount || changedRooms.some(room => room.state.phase === 'finished')) {
      broadcastDirectory(websocket, sessions, rooms);
    }
  }, 1_000);
  tickTimer.unref();

  const heartbeatTimer = setInterval(() => websocket.clients.forEach(socket => {
    if (socket.readyState !== WebSocket.OPEN) return;
    if (socket.isAlive === false) return socket.terminate();
    socket.isAlive = false;
    socket.ping();
  }), 30_000);
  heartbeatTimer.unref();

  websocket.on('close', () => {
    clearInterval(tickTimer);
    clearInterval(heartbeatTimer);
  });
  return websocket;
}

function countPreauthSessions(sessions, ip = null) {
  let count = 0;
  for (const session of sessions.values()) {
    if (session.authenticated || (ip !== null && session.ip !== ip)) continue;
    count += 1;
  }
  return count;
}

function requestIp(request) {
  const forwarded = config.trustProxy
    ? String(request?.headers?.['x-forwarded-for'] ?? '').split(',')[0].trim()
    : '';
  return (forwarded || request?.socket?.remoteAddress || 'unknown').slice(0, 64);
}
