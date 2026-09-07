import { WebSocket } from 'ws';
import { SERVER_EVENTS, encodeMessage } from '@tronos/shared/protocol';
import { publicState } from './roomState.js';

export function broadcastRoom(room) {
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

export function broadcastDirectory(websocket, sessions, rooms) {
  const payload = { rooms: rooms.directory() };
  for (const socket of websocket.clients) {
    if (sessions.get(socket)?.authenticated) send(socket, SERVER_EVENTS.ROOM_DIRECTORY, payload);
  }
}

export function sendDirectory(socket, rooms) {
  send(socket, SERVER_EVENTS.ROOM_DIRECTORY, { rooms: rooms.directory() });
}

export function send(socket, type, payload) {
  if (socket?.readyState === WebSocket.OPEN) socket.send(encodeMessage(type, payload));
}

export function sendError(socket, message) {
  send(socket, SERVER_EVENTS.ERROR, { message: String(message).slice(0, 160) });
}
