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
  constructor(url = resolveSocketUrl(), {
    WebSocketImpl = globalThis.WebSocket,
    reconnectBaseDelay = 500,
    ticketProvider = null,
  } = {}) {
    super();
    this.url = url;
    this.WebSocketImpl = WebSocketImpl;
    this.reconnectBaseDelay = reconnectBaseDelay;
    this.ticketProvider = ticketProvider;
    this.socket = null;
    this.reconnectTimer = null;
    this.reconnectAttempt = 0;
    this.connecting = false;
    this.authenticated = false;
    this.reconnectEnabled = true;
  }

  setTicketProvider(provider) {
    this.ticketProvider = provider;
  }

  async connect() {
    if (this.socket && this.socket.readyState < this.WebSocketImpl.CLOSING) return;
    if (this.connecting || typeof this.ticketProvider !== 'function') return;
    clearTimeout(this.reconnectTimer);
    this.reconnectEnabled = true;
    this.connecting = true;
    let ticket;
    try {
      ticket = await this.ticketProvider();
    } catch (error) {
      this.connecting = false;
      this.#emit(SERVER_EVENTS.ERROR, { message: error.message });
      this.#scheduleReconnect();
      return;
    }
    if (!this.reconnectEnabled) {
      this.connecting = false;
      return;
    }
    const socket = new this.WebSocketImpl(this.url, ['nexus-v1']);
    this.socket = socket;
    this.authenticated = false;
    socket.addEventListener('open', () => {
      if (socket !== this.socket) return;
      this.connecting = false;
      this.#send(CLIENT_EVENTS.AUTHENTICATE, { ticket });
    });
    socket.addEventListener('close', () => {
      if (socket !== this.socket) return;
      this.connecting = false;
      this.authenticated = false;
      this.#emit('disconnected');
      this.#scheduleReconnect();
    });
    socket.addEventListener('message', ({ data }) => {
      const message = parseMessage(data, { maxBytes: PROTOCOL_LIMITS.serverMessageBytes });
      if (!message) return;
      if (message.type === SERVER_EVENTS.AUTHENTICATED) {
        this.authenticated = true;
        this.reconnectAttempt = 0;
        this.#emit('connected', message.payload);
      }
      this.#emit(message.type, message.payload);
    });
  }

  disconnect() {
    this.reconnectEnabled = false;
    clearTimeout(this.reconnectTimer);
    this.socket?.close();
    this.socket = null;
    this.authenticated = false;
    this.connecting = false;
  }

  requestRooms() {
    this.#send(CLIENT_EVENTS.ROOM_LIST);
  }

  createRoom({ name, visibility }) {
    this.#send(CLIENT_EVENTS.ROOM_CREATE, { name, visibility });
  }

  joinRoom(roomCode) {
    this.#send(CLIENT_EVENTS.ROOM_JOIN, { roomCode });
  }

  spectateRoom(roomCode) {
    this.#send(CLIENT_EVENTS.ROOM_SPECTATE, { roomCode });
  }

  createAiRoom() {
    this.#send(CLIENT_EVENTS.AI_CREATE);
  }

  leaveRoom() {
    this.#send(CLIENT_EVENTS.ROOM_LEAVE);
  }

  sendAction(action, version) {
    this.#send(CLIENT_EVENTS.GAME_ACTION, { action, version });
  }

  #send(type, payload) {
    if (this.socket?.readyState !== this.WebSocketImpl.OPEN) throw new Error('WebSocket desconectado');
    if (type !== CLIENT_EVENTS.AUTHENTICATE && !this.authenticated) {
      throw new Error('Conexão ainda não autenticada');
    }
    this.socket.send(JSON.stringify({ type, payload }));
  }

  #scheduleReconnect() {
    clearTimeout(this.reconnectTimer);
    const delay = Math.min(this.reconnectBaseDelay * 2 ** this.reconnectAttempt, 5_000);
    this.reconnectAttempt += 1;
    if (!this.reconnectEnabled) return;
    this.reconnectTimer = setTimeout(() => { void this.connect(); }, delay);
  }

  #emit(type, detail) {
    this.dispatchEvent(new CustomEvent(type, { detail }));
  }
}

export { SERVER_EVENTS };
