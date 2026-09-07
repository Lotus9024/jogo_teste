import { WebSocket } from 'ws';
import { CLIENT_EVENTS, SERVER_EVENTS } from '@tronos/shared/protocol';
import { assertOutsideRoom, normalizeTicket, normalizeIdentity, hasValidDeck } from './socketValidation.js';
import { broadcastRoom, broadcastDirectory, sendDirectory, send, sendError } from './roomBroadcast.js';

export async function handleMessage({
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
      name: message.payload.name,
      playerCount: message.payload.playerCount,
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
    broadcastRoom(room);
    if (room.state.phase === 'finished') broadcastDirectory(websocket, sessions, rooms);
    return;
  }

  throw new Error('Evento não reconhecido.');
}
