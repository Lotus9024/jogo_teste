import { CLIENT_EVENTS, PROTOCOL_LIMITS, SERVER_EVENTS, parseMessage } from '@tronos/shared/protocol';

const PRODUCTION_SOCKET_URL = 'wss://tronos-em-ruinas-api.squareweb.app/ws';

export function resolveSocketUrl({
  configuredUrl = import.meta.env.VITE_WS_URL,
  protocol = globalThis.location?.protocol ?? 'https:',
  hostname = globalThis.location?.hostname ?? ''
} = {}) {
  const configured = configuredUrl?.trim();
  // Never let a local, insecure build-time override escape into the HTTPS site.
  if (configured && !(protocol === 'https:' && configured.startsWith('ws://'))) return configured;
  const localHost = hostname === 'localhost' || hostname === '127.0.0.1'
    || /^10\./.test(hostname) || /^192\.168\./.test(hostname)
    || /^172\.(1[6-9]|2\d|3[01])\./.test(hostname);
  return localHost ? `ws://${hostname}:3001/ws` : PRODUCTION_SOCKET_URL;
}

export class GameSocketClient extends EventTarget {
  constructor(url = resolveSocketUrl(), { WebSocketImpl = globalThis.WebSocket, reconnectBaseDelay = 500 } = {}) {
    super();
    this.url = url;
    this.WebSocketImpl = WebSocketImpl;
    this.reconnectBaseDelay = reconnectBaseDelay;
    this.socket = null;
    this.reconnectTimer = null;
    this.reconnectAttempt = 0;
  }

  connect() {
    if (this.socket && this.socket.readyState < this.WebSocketImpl.CLOSING) return;
    clearTimeout(this.reconnectTimer);
    const socket = new this.WebSocketImpl(this.url);
    this.socket = socket;
    socket.addEventListener('open', () => {
      if (socket !== this.socket) return;
      this.reconnectAttempt = 0;
      this.#emit('connected');
    });
    socket.addEventListener('close', () => {
      if (socket !== this.socket) return;
      this.#emit('disconnected');
      this.#scheduleReconnect();
    });
    socket.addEventListener('message', ({ data }) => {
      const message = parseMessage(data, { maxBytes: PROTOCOL_LIMITS.serverMessageBytes });
      if (message) this.#emit(message.type, message.payload);
    });
  }

  createRoom(playerName) {
    this.#send(CLIENT_EVENTS.ROOM_CREATE, { playerName });
  }

  joinRoom(roomCode, playerName) {
    this.#send(CLIENT_EVENTS.ROOM_JOIN, { roomCode, playerName });
  }

  sendAction(action, version) {
    this.#send(CLIENT_EVENTS.GAME_ACTION, { action, version });
  }

  #send(type, payload) {
    if (this.socket?.readyState !== this.WebSocketImpl.OPEN) throw new Error('WebSocket desconectado');
    this.socket.send(JSON.stringify({ type, payload }));
  }

  #scheduleReconnect() {
    clearTimeout(this.reconnectTimer);
    const delay = Math.min(this.reconnectBaseDelay * 2 ** this.reconnectAttempt, 5_000);
    this.reconnectAttempt += 1;
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  #emit(type, detail) {
    this.dispatchEvent(new CustomEvent(type, { detail }));
  }
}

export { SERVER_EVENTS };
