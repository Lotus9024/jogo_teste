import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_DECK_CARD_IDS } from '@tronos/shared/cards';
import { RoomManager } from '../src/game/roomManager.js';

test('cria uma sala e inicia a partida com dois jogadores', () => {
  const rooms = new RoomManager();
  const created = rooms.create('Rei Aldren', {}, [...DEFAULT_DECK_CARD_IDS]);
  assert.equal(created.room.state.phase, 'waiting');
  const joined = rooms.join(created.room.code, 'Rei Varos', {}, [...DEFAULT_DECK_CARD_IDS]);
  assert.equal(joined.room.players.length, 2);
  assert.equal(joined.room.state.phase, 'playing');
  assert.equal(joined.room.state.players[1].seat, 2);
  assert.match(joined.room.code, /^[A-Z2-9]{6}$/);
});

test('impede um terceiro jogador na mesma sala', () => {
  const rooms = new RoomManager();
  const { room } = rooms.create('Jogador Um', {}, [...DEFAULT_DECK_CARD_IDS]);
  rooms.join(room.code, 'Jogador Dois', {}, [...DEFAULT_DECK_CARD_IDS]);
  assert.throws(
    () => rooms.join(room.code, 'Jogador Três', {}, [...DEFAULT_DECK_CARD_IDS]),
    /Sala cheia/
  );
});

test('diretório esconde o código privado e expõe ações seguras da sala pública', () => {
  const rooms = new RoomManager();
  const privateRoom = rooms.createAuthenticated(identity('privado', 'Rei Privado'), {}, {
    name: 'Conselho secreto',
    visibility: 'private'
  }).room;
  const publicRoom = rooms.createAuthenticated(identity('publico', 'Rei Público'), {}, {
    name: 'Praça aberta',
    visibility: 'public'
  }).room;

  const directory = rooms.directory();
  const privateEntry = directory.find(entry => entry.id === privateRoom.id);
  const publicEntry = directory.find(entry => entry.id === publicRoom.id);

  assert.equal(privateEntry.locked, true);
  assert.equal(privateEntry.code, null);
  assert.equal(privateEntry.canJoin, false);
  assert.equal(publicEntry.code, publicRoom.code);
  assert.equal(publicEntry.playerCount, 1);
  assert.equal(publicEntry.capacity, 2);
  assert.equal(publicEntry.canJoin, true);

  rooms.joinAuthenticated(publicRoom.code, identity('convidado', 'Rei Convidado'), {});
  const fullEntry = rooms.directory().find(entry => entry.id === publicRoom.id);
  assert.equal(fullEntry.canJoin, false);
  assert.equal(fullEntry.canSpectate, true);
});

test('espectador recebe lugar separado e nunca pode executar ação de jogador', () => {
  const rooms = new RoomManager();
  const created = rooms.createAuthenticated(identity('azul', 'Rei Azul'), {}, {
    visibility: 'private',
    name: 'Duelo'
  });
  rooms.joinAuthenticated(created.room.code, identity('vermelho', 'Rei Vermelho'), {});
  const { spectator } = rooms.spectateAuthenticated(
    created.room.code,
    identity('observador', 'Cronista'),
    {}
  );

  assert.equal(created.room.spectators.length, 1);
  assert.throws(
    () => rooms.action(
      created.room.code,
      spectator.id,
      { type: 'end_turn' },
      created.room.state.version
    ),
    /Sessão inválida/
  );
});

test('IA autoritativa inicia a partida e encerra o próprio turno sem travar', () => {
  const rooms = new RoomManager({ botDelayMs: 0 });
  const { room, player, bot } = rooms.createAiAuthenticated(identity('humano', 'Rei Humano'), {});

  assert.equal(room.state.phase, 'playing');
  assert.equal(room.players.length, 2);
  assert.equal(bot.isBot, true);

  rooms.action(room.code, player.id, { type: 'end_turn' }, room.state.version);
  assert.equal(room.state.activeSeat, 2);
  const changed = rooms.tick();
  assert.equal(changed.includes(room), true);
  assert.equal(room.state.activeSeat, 1);
  assert.equal(room.state.round, 2);
});

test('identidade autenticada precisa trazer um Deck válido sem fallback', () => {
  const rooms = new RoomManager();
  assert.throws(
    () => rooms.createAuthenticated({ playerId: 'sem-deck', name: 'Sem Deck', deckCardIds: [] }, {}),
    /Monte um Deck/
  );
});

test('reanexa jogador desconectado a partida em andamento', () => {
  const rooms = new RoomManager();
  const oldSocket = {};
  const newSocket = {};
  const blueIdentity = identity('azul-retorno', 'Rei Azul');
  const { room } = rooms.createAuthenticated(blueIdentity, oldSocket, {
    visibility: 'private',
    name: 'Duelo de retorno'
  });
  rooms.joinAuthenticated(room.code, identity('vermelho-retorno', 'Rei Vermelho'), {});

  rooms.leave(blueIdentity.playerId);
  assert.equal(room.players[0].socket, null);
  assert.equal(room.state.players[0].connected, false);

  const resumed = rooms.reattachAuthenticated(blueIdentity, newSocket);
  assert.equal(resumed.room, room);
  assert.equal(resumed.player.socket, newSocket);
  assert.equal(room.state.players[0].connected, true);
});

function identity(playerId, name) {
  return { playerId, name, deckCardIds: [...DEFAULT_DECK_CARD_IDS] };
}
