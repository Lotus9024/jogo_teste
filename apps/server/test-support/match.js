import { RoomManager } from '../src/game/roomManager.js';

export function match() {
  const rooms = new RoomManager();
  const first = rooms.create('Rei Azul', {});
  const second = rooms.join(first.room.code, 'Rei Vermelho', {});
  return { rooms, room: second.room, first: first.player, second: second.player };
}
