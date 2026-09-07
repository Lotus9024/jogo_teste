/** Only this projection crosses the socket boundary; hands and decks stay private. */
export function publicState(room, viewer, spectator = false) {
  const state = room.state;
  const privatePlayer = spectator ? null : state.players.find(player => player.id === viewer.id);
  return {
    code: room.code,
    room: {
      name: room.name,
      visibility: room.visibility,
      capacity: room.capacity
    },
    self: spectator
      ? { id: viewer.id, spectator: true }
      : {
          id: viewer.id,
          spectator: false,
          seat: viewer.seat,
          hand: privatePlayer?.hand ?? [],
          lastPlayedGoblinTroopCardId: privatePlayer?.lastPlayedGoblinTroopCardId ?? null,
          pendingMageAltarChoices: privatePlayer?.pendingMageAltarChoices ?? 0,
          deckChoices: (privatePlayer?.pendingMageAltarChoices ?? 0) > 0
            ? [...new Set(privatePlayer.deckCardIds)]
            : []
        },
    state: {
      version: state.version,
      phase: state.phase,
      round: state.round,
      activeSeat: state.activeSeat,
      turnEndsAt: state.turnEndsAt,
      winnerSeat: state.winnerSeat,
      endReason: state.endReason ?? null,
      forfeitReason: state.forfeitReason ?? null,
      forfeitSeat: state.forfeitSeat ?? null,
      board: state.board,
      units: state.units,
      roads: state.roads,
      fires: state.fires ?? [],
      effects: state.effects ?? [],
      snowstorms: state.snowstorms ?? [],
      players: state.players.map(player => ({
        id: player.id,
        name: player.name,
        seat: player.seat,
        connected: player.connected,
        disconnectEndsAt: player.disconnectEndsAt ?? null,
        baseHp: player.baseHp,
        energy: player.energy,
        maxEnergy: player.maxEnergy,
        citizens: player.citizens,
        baseLevel: player.baseLevel,
        handCount: player.hand.length,
        deckCount: player.deck.length
      }))
    }
  };
}
