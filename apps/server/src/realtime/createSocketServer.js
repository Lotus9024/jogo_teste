import { WebSocket, WebSocketServer } from 'ws';
import { validateDeckCardIds } from '@tronos/shared/cards';
import { GAME_CONFIG } from '@tronos/shared/game-config';
import {
  CLIENT_EVENTS,
  PROTOCOL_LIMITS,
  SERVER_EVENTS,
  encodeMessage,
  parseMessage
} from '@tronos/shared/protocol';
import { config } from '../config.js';

const AUTHENTICATION_TIMEOUT_MS = 5_000;
const MAX_TOTAL_CONNECTIONS = 256;
const MAX_PREAUTH_CONNECTIONS = 64;
const MAX_PREAUTH_CONNECTIONS_PER_IP = 8;
const TICKET_PATTERN = /^[A-Za-z0-9_-]{32,256}$/;
const ID_PATTERN = /^[A-Za-z0-9:_-]{1,128}$/;

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
        .then(() => handleMessage({
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
    rooms.tick().forEach(broadcastRoom);
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

async function handleMessage({
  socket,
  session,
  message,
  rooms,
  websocket,
  sessions,
  activeIdentitySockets,
  authService,
  authenticationTimer
}) {
  if (!session.authenticated) {
    if (message.type !== CLIENT_EVENTS.AUTHENTICATE) {
      throw new Error('Autentique-se antes de acessar as salas.');
    }
    if (session.authenticating) throw new Error('Autenticação já está em andamento.');
    session.authenticating = true;
    try {
      const ticket = normalizeTicket(message.payload.ticket);
      if (!authService?.consumeSocketTicket) throw new Error('Autenticação indisponível.');
      const consumedIdentity = await authService.consumeSocketTicket(ticket);
      const identity = normalizeIdentity(consumedIdentity);
      if (socket.readyState !== WebSocket.OPEN) throw new Error('Connection closed.');
      const existingSocket = activeIdentitySockets.get(identity.playerId);
      if (
        existingSocket
        && existingSocket !== socket
        && existingSocket.readyState !== WebSocket.CLOSED
      ) {
        throw new Error('Identity already connected.');
      }
      if (existingSocket?.readyState === WebSocket.CLOSED) {
        activeIdentitySockets.delete(identity.playerId);
      }

      const resumed = rooms.reattachAuthenticated(identity, socket);
      Object.assign(session, {
        identity,
        authenticated: true,
        authenticating: false,
        role: resumed ? 'player' : null,
        roomCode: resumed?.room.code ?? null
      });
      activeIdentitySockets.set(identity.playerId, socket);
      clearTimeout(authenticationTimer);
      send(socket, SERVER_EVENTS.AUTHENTICATED, {
        player: { id: identity.playerId, name: identity.name },
        hasDeck: hasValidDeck(identity.deckCardIds),
        resumed: Boolean(resumed)
      });
      sendDirectory(socket, rooms);
      if (resumed) {
        broadcastRoom(resumed.room);
      }
      return;
    } catch {
      session.authenticating = false;
      sendError(socket, 'Não foi possível autenticar esta conexão.');
      socket.close(1008, 'Authentication failed');
      return;
    }
  }

  if (message.type === CLIENT_EVENTS.AUTHENTICATE) throw new Error('Esta conexão já está autenticada.');

  if (message.type === CLIENT_EVENTS.ROOM_LIST) {
    return sendDirectory(socket, rooms);
  }

  if (message.type === CLIENT_EVENTS.ROOM_CREATE) {
    assertOutsideRoom(session);
    const { room } = rooms.createAuthenticated(session.identity, socket, {
      visibility: message.payload.visibility,
      name: message.payload.name
    });
    Object.assign(session, { role: 'player', roomCode: room.code });
    broadcastRoom(room);
    return broadcastDirectory(websocket, sessions, rooms);
  }

  if (message.type === CLIENT_EVENTS.ROOM_JOIN) {
    assertOutsideRoom(session);
    const { room } = rooms.joinAuthenticated(
      message.payload.roomCode ?? message.payload.code,
      session.identity,
      socket
    );
    Object.assign(session, { role: 'player', roomCode: room.code });
    broadcastRoom(room);
    return broadcastDirectory(websocket, sessions, rooms);
  }

  if (message.type === CLIENT_EVENTS.ROOM_SPECTATE) {
    assertOutsideRoom(session);
    const { room } = rooms.spectateAuthenticated(
      message.payload.roomCode ?? message.payload.code,
      session.identity,
      socket
    );
    Object.assign(session, { role: 'spectator', roomCode: room.code });
    broadcastRoom(room);
    return broadcastDirectory(websocket, sessions, rooms);
  }

  if (message.type === CLIENT_EVENTS.AI_CREATE) {
    assertOutsideRoom(session);
    const { room } = rooms.createAiAuthenticated(session.identity, socket);
    Object.assign(session, { role: 'player', roomCode: room.code });
    broadcastRoom(room);
    return broadcastDirectory(websocket, sessions, rooms);
  }

  if (message.type === CLIENT_EVENTS.ROOM_LEAVE) {
    if (!session.roomCode) throw new Error('Você não está em uma sala.');
    const room = rooms.leave(session.identity.playerId, { abandon: true });
    Object.assign(session, { role: null, roomCode: null });
    send(socket, SERVER_EVENTS.ROOM_LEFT, {});
    if (room) broadcastRoom(room);
    return broadcastDirectory(websocket, sessions, rooms);
  }

  if (message.type === CLIENT_EVENTS.GAME_ACTION) {
    if (session.role !== 'player' || !session.roomCode) {
      throw new Error('Espectadores não podem realizar ações.');
    }
    const room = rooms.action(
      session.roomCode,
      session.identity.playerId,
      message.payload.action,
      message.payload.version
    );
    return broadcastRoom(room);
  }

  throw new Error('Evento não reconhecido.');
}

function publicState(room, viewer, spectator = false) {
  const state = room.state;
  const privatePlayer = spectator ? null : state.players.find(player => player.id === viewer.id);
  return {
    code: room.code,
    room: {
      name: room.name,
      visibility: room.visibility
    },
    self: spectator
      ? { id: viewer.id, spectator: true }
      : {
          id: viewer.id,
          spectator: false,
          seat: viewer.seat,
          hand: privatePlayer?.hand ?? [],
          lastPlayedGoblinTroopCardId: privatePlayer?.lastPlayedGoblinTroopCardId ?? null,
          pendingMageAltarChoices: privatePlayer?.pendingMageAltarChoices ?? 0,
          deckChoices: (privatePlayer?.pendingMageAltarChoices ?? 0) > 0
            ? [...new Set(privatePlayer.deck)]
            : []
        },
    state: {
      version: state.version,
      phase: state.phase,
      round: state.round,
      activeSeat: state.activeSeat,
      turnEndsAt: state.turnEndsAt,
      winnerSeat: state.winnerSeat,
      board: state.board,
      units: state.units,
      roads: state.roads,
      fires: state.fires ?? [],
      players: state.players.map(player => ({
        id: player.id,
        name: player.name,
        seat: player.seat,
        connected: player.connected,
        baseHp: player.baseHp,
        energy: player.energy,
        maxEnergy: player.maxEnergy,
        citizens: player.citizens,
        baseLevel: player.baseLevel,
        handCount: player.hand.length,
        deckCount: player.deck.length
      }))
    }
  };
}

function broadcastRoom(room) {
  for (const player of room.players) {
    if (player.socket) send(player.socket, SERVER_EVENTS.ROOM_STATE, publicState(room, player));
  }
  for (const spectator of room.spectators) {
    if (spectator.socket) send(
      spectator.socket,
      SERVER_EVENTS.ROOM_STATE,
      publicState(room, spectator, true)
    );
  }
}

function broadcastDirectory(websocket, sessions, rooms) {
  for (const socket of websocket.clients) {
    if (sessions.get(socket)?.authenticated) sendDirectory(socket, rooms);
  }
}

function sendDirectory(socket, rooms) {
  send(socket, SERVER_EVENTS.ROOM_DIRECTORY, { rooms: rooms.directory() });
}

function assertOutsideRoom(session) {
  if (session.roomCode) throw new Error('Saia da sala atual antes de continuar.');
}

function normalizeTicket(value) {
  const ticket = String(value ?? '');
  if (!TICKET_PATTERN.test(ticket)) throw new Error('Ticket inválido.');
  return ticket;
}

function normalizeIdentity(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Identidade inválida.');
  const playerId = String(value.playerId ?? '').trim();
  if (!ID_PATTERN.test(playerId)) throw new Error('Identidade inválida.');
  const name = String(value.name ?? '')
    .normalize('NFKC')
    .trim()
    .replace(/[<>\u0000-\u001f\u007f]/g, '')
    .slice(0, 24);
  if (name.length < 2) throw new Error('Identidade inválida.');
  return {
    playerId,
    name,
    deckCardIds: Array.isArray(value.deckCardIds) ? [...value.deckCardIds] : []
  };
}

function hasValidDeck(deckCardIds) {
  try {
    validateDeckCardIds(deckCardIds, { allowDefault: false });
    return true;
  } catch {
    return false;
  }
}

function send(socket, type, payload) {
  if (socket?.readyState === WebSocket.OPEN) socket.send(encodeMessage(type, payload));
}

function sendError(socket, message) {
  send(socket, SERVER_EVENTS.ERROR, { message: String(message).slice(0, 160) });
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
