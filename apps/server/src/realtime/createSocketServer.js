import { WebSocket, WebSocketServer } from 'ws';
import { CLIENT_EVENTS, SERVER_EVENTS, encodeMessage, parseMessage } from '@tronos/shared/protocol';

export function createSocketServer(server, rooms) {
  const websocket = new WebSocketServer({ server, path: '/ws' });

  websocket.on('connection', socket => {
    const session = { playerId: null, roomCode: null };
    send(socket, SERVER_EVENTS.CONNECTION_READY, { serverTime: Date.now() });

    socket.on('message', raw => {
      const message = parseMessage(raw);
      if (!message) return sendError(socket, 'Mensagem inválida.');
      try {
        if (message.type === CLIENT_EVENTS.ROOM_CREATE) {
          const { room, player } = rooms.create(message.payload.playerName, socket);
          Object.assign(session, { playerId: player.id, roomCode: room.code });
          return broadcastRoom(room);
        }
        if (message.type === CLIENT_EVENTS.ROOM_JOIN) {
          const { room, player } = rooms.join(message.payload.roomCode, message.payload.playerName, socket);
          Object.assign(session, { playerId: player.id, roomCode: room.code });
          return broadcastRoom(room);
        }
        if (message.type === CLIENT_EVENTS.GAME_ACTION) {
          return sendError(socket, 'A validação de ações será ligada na próxima etapa.');
        }
        sendError(socket, 'Evento não reconhecido.');
      } catch (error) {
        sendError(socket, error.message);
      }
    });

    socket.on('close', () => {
      if (!session.playerId) return;
      const room = rooms.leave(session.playerId);
      if (room) broadcastRoom(room);
    });
  });

  return websocket;
}

function broadcastRoom(room) {
  const publicRoom = { code: room.code, state: room.state };
  for (const player of room.players) send(player.socket, SERVER_EVENTS.ROOM_STATE, publicRoom);
}

function send(socket, type, payload) {
  if (socket.readyState === WebSocket.OPEN) socket.send(encodeMessage(type, payload));
}

function sendError(socket, message) {
  send(socket, SERVER_EVENTS.ERROR, { message });
}
