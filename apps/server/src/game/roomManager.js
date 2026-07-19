import { randomUUID } from 'node:crypto';
import { GAME_CONFIG } from '@tronos/shared/game-config';
import { createInitialState } from './createInitialState.js';

function roomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export class RoomManager {
  constructor() {
    this.rooms = new Map();
  }

  create(playerName, socket) {
    let code;
    do code = roomCode(); while (this.rooms.has(code));
    const player = { id: randomUUID(), name: normalizeName(playerName), seat: 1, socket };
    const room = { code, players: [player], state: createInitialState([player]) };
    this.rooms.set(code, room);
    return { room, player };
  }

  join(code, playerName, socket) {
    const room = this.rooms.get(String(code).toUpperCase());
    if (!room) throw new Error('Sala não encontrada.');
    if (room.players.length >= GAME_CONFIG.maxPlayers) throw new Error('Sala cheia.');
    const player = { id: randomUUID(), name: normalizeName(playerName), seat: room.players.length + 1, socket };
    room.players.push(player);
    room.state = createInitialState(room.players);
    return { room, player };
  }

  leave(playerId) {
    for (const [code, room] of this.rooms) {
      const player = room.players.find(item => item.id === playerId);
      if (!player) continue;
      room.players = room.players.filter(item => item.id !== playerId);
      if (!room.players.length) this.rooms.delete(code);
      else room.state = createInitialState(room.players);
      return room;
    }
    return null;
  }
}

function normalizeName(value) {
  const name = String(value ?? '').trim().slice(0, 32);
  if (name.length < 2) throw new Error('O nome precisa ter pelo menos 2 caracteres.');
  return name;
}
