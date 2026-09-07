/** Public discovery data never exposes private room codes or player identities. */
export function roomDirectory(rooms) {
  return [...rooms]
    .filter(room => room.listed && room.state.phase !== 'finished')
    .sort((left, right) => right.updatedAt - left.updatedAt)
    .map(room => {
      const full = room.players.length >= room.capacity;
      const isPrivate = room.visibility === 'private';
      return {
        id: room.id,
        name: room.name,
        visibility: room.visibility,
        locked: isPrivate,
        code: isPrivate ? null : room.code,
        playerCount: room.players.length,
        capacity: room.capacity,
        players: room.players.length,
        maxPlayers: room.capacity,
        spectators: room.spectators.length,
        status: full ? 'playing' : 'waiting',
        canJoin: !isPrivate && !full,
        canSpectate: !isPrivate && full
      };
    });
}
