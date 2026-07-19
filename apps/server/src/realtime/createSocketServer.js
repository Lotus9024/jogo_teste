import { WebSocket, WebSocketServer } from 'ws';
import { GAME_CONFIG } from '@tronos/shared/game-config';
import { CLIENT_EVENTS, SERVER_EVENTS, encodeMessage, parseMessage } from '@tronos/shared/protocol';
import { config } from '../config.js';

export function createSocketServer(server, rooms) {
  const websocket = new WebSocketServer({
    server, path: '/ws', maxPayload: GAME_CONFIG.maxMessageBytes,
    verifyClient: ({ origin }, done) => done(origin === config.clientOrigin, origin === config.clientOrigin ? 200 : 403, 'Origin denied')
  });

  websocket.on('connection', socket => {
    const session = { playerId: null, roomCode: null, messages: [] };
    socket.isAlive = true;
    socket.on('pong', () => { socket.isAlive = true; });
    send(socket, SERVER_EVENTS.CONNECTION_READY, { serverTime: Date.now() });

    socket.on('message', raw => {
      const now = Date.now(); session.messages = session.messages.filter(timestamp => now - timestamp < 10_000); session.messages.push(now);
      if (session.messages.length > 30) return socket.close(1008, 'Rate limit');
      const message = parseMessage(raw);
      if (!message) return sendError(socket, 'Mensagem inválida.');
      try {
        if (message.type === CLIENT_EVENTS.ROOM_CREATE) {
          if (session.playerId) throw new Error('Você já está em uma sala.');
          const { room, player } = rooms.create(message.payload.playerName, socket);
          Object.assign(session, { playerId: player.id, roomCode: room.code }); return broadcastRoom(room);
        }
        if (message.type === CLIENT_EVENTS.ROOM_JOIN) {
          if (session.playerId) throw new Error('Você já está em uma sala.');
          const { room, player } = rooms.join(message.payload.roomCode, message.payload.playerName, socket);
          Object.assign(session, { playerId: player.id, roomCode: room.code }); return broadcastRoom(room);
        }
        if (message.type === CLIENT_EVENTS.GAME_ACTION) {
          if (!session.playerId) throw new Error('Entre em uma sala primeiro.');
          const room = rooms.action(session.roomCode, session.playerId, message.payload.action, message.payload.version);
          return broadcastRoom(room);
        }
        throw new Error('Evento não reconhecido.');
      } catch (error) { sendError(socket, error instanceof Error ? error.message : 'Não foi possível executar a ação.'); }
    });

    socket.on('close', () => { if (!session.playerId) return; const room = rooms.leave(session.playerId); if (room) broadcastRoom(room); });
  });

  const timer = setInterval(() => rooms.tick().forEach(broadcastRoom), 1000);
  timer.unref();
  const heartbeat = setInterval(() => websocket.clients.forEach(socket => {
    if (socket.readyState !== WebSocket.OPEN) return;
    if (socket.isAlive === false) return socket.terminate();
    socket.isAlive = false; socket.ping();
  }), 30_000);
  heartbeat.unref();
  websocket.on('close', () => clearInterval(heartbeat));
  return websocket;
}

function publicState(room, viewer) {
  const state = room.state;
  return {
    code: room.code,
    self: { id: viewer.id, seat: viewer.seat, hand: state.players.find(player => player.id === viewer.id)?.hand ?? [] },
    state: {
      version: state.version, phase: state.phase, round: state.round, activeSeat: state.activeSeat,
      turnEndsAt: state.turnEndsAt, winnerSeat: state.winnerSeat, board: state.board, units: state.units,
      players: state.players.map(player => ({
        id: player.id, name: player.name, seat: player.seat, connected: player.connected,
        baseHp: player.baseHp, energy: player.energy, handCount: player.hand.length, deckCount: player.deck.length
      }))
    }
  };
}

function broadcastRoom(room) {
  for (const player of room.players) if (player.socket) send(player.socket, SERVER_EVENTS.ROOM_STATE, publicState(room, player));
}
function send(socket, type, payload) { if (socket?.readyState === WebSocket.OPEN) socket.send(encodeMessage(type, payload)); }
function sendError(socket, message) { send(socket, SERVER_EVENTS.ERROR, { message: String(message).slice(0, 160) }); }
