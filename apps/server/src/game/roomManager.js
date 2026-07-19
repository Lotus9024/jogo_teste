import { randomInt, randomUUID } from 'node:crypto';
import { GAME_CONFIG } from '@tronos/shared/game-config';
import { createInitialState } from './createInitialState.js';
import { applyGameAction, applyTurnTimeout } from './gameEngine.js';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function roomCode() { return Array.from({ length: 6 }, () => ALPHABET[randomInt(ALPHABET.length)]).join(''); }

export class RoomManager {
  constructor() { this.rooms = new Map(); }
  create(playerName, socket) {
    let code; do code = roomCode(); while (this.rooms.has(code));
    const player = { id: randomUUID(), name: normalizeName(playerName), seat: 1, socket };
    const room = { code, players: [player], state: createInitialState([player]), updatedAt: Date.now() };
    this.rooms.set(code, room); return { room, player };
  }
  join(code, playerName, socket) {
    const normalizedCode = String(code ?? '').trim().toUpperCase();
    if (!/^[A-Z2-9]{6}$/.test(normalizedCode)) throw new Error('Código de sala inválido.');
    const room = this.rooms.get(normalizedCode);
    if (!room) throw new Error('Sala não encontrada.');
    if (room.players.length >= GAME_CONFIG.maxPlayers) throw new Error('Sala cheia.');
    const player = { id: randomUUID(), name: normalizeName(playerName), seat: 2, socket };
    room.players.push(player); room.state = createInitialState(room.players); room.updatedAt = Date.now();
    return { room, player };
  }
  action(roomCode, playerId, action, expectedVersion) {
    const room = this.rooms.get(roomCode);
    if (!room || !room.players.some(player => player.id === playerId)) throw new Error('Sessão inválida.');
    applyGameAction(room.state, playerId, action, expectedVersion); room.updatedAt = Date.now(); return room;
  }
  leave(playerId) {
    for (const [code, room] of this.rooms) {
      const player = room.players.find(item => item.id === playerId); if (!player) continue;
      if (room.state.phase === 'playing') {
        player.socket = null; const statePlayer = room.state.players.find(item => item.id === playerId); if (statePlayer) statePlayer.connected = false;
      } else { room.players = room.players.filter(item => item.id !== playerId); if (!room.players.length) this.rooms.delete(code); else room.state = createInitialState(room.players); }
      room.updatedAt = Date.now();
      return room;
    }
    return null;
  }
  tick() {
    const changed = [],now = Date.now();
    for (const [code,room] of this.rooms) {
      if (room.players.every(player => !player.socket) && now-room.updatedAt > 5*60*1000) { this.rooms.delete(code); continue; }
      if (applyTurnTimeout(room.state)) changed.push(room);
    }
    return changed;
  }
}

function normalizeName(value) {
  const name = String(value ?? '').trim().replace(/[<>\u0000-\u001f]/g, '').slice(0, 24);
  if (name.length < 2) throw new Error('O nome precisa ter pelo menos 2 caracteres.');
  return name;
}
