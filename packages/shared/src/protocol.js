export const CLIENT_EVENTS = Object.freeze({
  ROOM_CREATE: 'room:create',
  ROOM_JOIN: 'room:join',
  ROOM_LEAVE: 'room:leave',
  GAME_ACTION: 'game:action'
});

export const SERVER_EVENTS = Object.freeze({
  CONNECTION_READY: 'connection:ready',
  ROOM_STATE: 'room:state',
  GAME_STATE: 'game:state',
  ERROR: 'server:error'
});

export function parseMessage(raw) {
  try {
    const source = String(raw);
    if (source.length > 4096) return null;
    const message = JSON.parse(source);
    if (!message || typeof message !== 'object' || Array.isArray(message) || typeof message.type !== 'string') return null;
    if (!Object.values({ ...CLIENT_EVENTS, ...SERVER_EVENTS }).includes(message.type)) return null;
    return { type: message.type, payload: message.payload ?? {} };
  } catch {
    return null;
  }
}

export function encodeMessage(type, payload = {}) {
  return JSON.stringify({ type, payload });
}
