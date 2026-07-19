import { CLIENT_EVENTS, SERVER_EVENTS, parseMessage } from '@tronos/shared/protocol';

export class GameSocketClient extends EventTarget {
  constructor(url = import.meta.env.VITE_WS_URL ?? 'ws://localhost:3001/ws') {
    super();
    this.url = url;
    this.socket = null;
  }

  connect() {
    if (this.socket?.readyState === WebSocket.OPEN) return;
    this.socket = new WebSocket(this.url);
    this.socket.addEventListener('open', () => this.#emit('connected'));
    this.socket.addEventListener('close', () => this.#emit('disconnected'));
    this.socket.addEventListener('message', ({ data }) => {
      const message = parseMessage(data);
      if (message) this.#emit(message.type, message.payload);
    });
  }

  createRoom(playerName) {
    this.#send(CLIENT_EVENTS.ROOM_CREATE, { playerName });
  }

  joinRoom(roomCode, playerName) {
    this.#send(CLIENT_EVENTS.ROOM_JOIN, { roomCode, playerName });
  }

  sendAction(roomCode, action) {
    this.#send(CLIENT_EVENTS.GAME_ACTION, { roomCode, action });
  }

  #send(type, payload) {
    if (this.socket?.readyState !== WebSocket.OPEN) throw new Error('WebSocket desconectado');
    this.socket.send(JSON.stringify({ type, payload }));
  }

  #emit(type, detail) {
    this.dispatchEvent(new CustomEvent(type, { detail }));
  }
}

export { SERVER_EVENTS };
