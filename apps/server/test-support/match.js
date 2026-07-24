import { RoomManager } from '../src/game/roomManager.js';
import { DEFAULT_DECK_CARD_IDS } from '@tronos/shared/cards';

export function match() {
  const rooms = new RoomManager();
  const first = rooms.create('Rei Azul', {}, [...DEFAULT_DECK_CARD_IDS]);
  const second = rooms.join(first.room.code, 'Rei Vermelho', {}, [...DEFAULT_DECK_CARD_IDS]);
  return { rooms, room: second.room, first: first.player, second: second.player };
}
