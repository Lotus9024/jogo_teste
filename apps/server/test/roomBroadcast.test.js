import test from 'node:test';
import assert from 'node:assert/strict';
import { WebSocket } from 'ws';
import { DEFAULT_DECK_CARD_IDS } from '@tronos/shared/cards';
import { SERVER_EVENTS, parseMessage } from '@tronos/shared/protocol';
import { RoomManager } from '../src/game/roomManager.js';
import { publicState } from '../src/realtime/roomState.js';
import { broadcastDirectory, broadcastRoom } from '../src/realtime/roomBroadcast.js';

function socket(readyState = WebSocket.OPEN) {
  return { readyState, messages: [], send(raw) { this.messages.push(parseMessage(raw)); } };
}

function createRoom() {
  const rooms = new RoomManager();
  const first = socket();
  const second = socket();
  const spectator = socket();
  const identity = playerId => ({ playerId, name: playerId, deckCardIds: [...DEFAULT_DECK_CARD_IDS] });
  const { room } = rooms.createAuthenticated(identity('azul'), first);
  rooms.joinAuthenticated(room.code, identity('vermelho'), second);
  rooms.spectateAuthenticated(room.code, identity('cronista'), spectator);
  return { room, first, second, spectator };
}

test('projeção de sala entrega a mão apenas ao dono e oculta decks dos espectadores', () => {
  const { room, first, second, spectator } = createRoom();
  room.state.players[0].hand = ['segredo-azul'];
  room.state.players[1].hand = ['segredo-vermelho'];
  broadcastRoom(room);

  assert.deepEqual(first.messages[0].payload.self.hand, ['segredo-azul']);
  assert.deepEqual(second.messages[0].payload.self.hand, ['segredo-vermelho']);
  assert.deepEqual(spectator.messages[0].payload.self, { id: 'cronista', spectator: true });
  for (const client of [first, second, spectator]) {
    assert.equal(client.messages[0].type, SERVER_EVENTS.ROOM_STATE);
    for (const player of client.messages[0].payload.state.players) {
      assert.equal(player.handCount, 1);
      for (const privateField of ['hand', 'deck', 'deckCardIds', 'socket']) {
        assert.equal(Object.hasOwn(player, privateField), false);
      }
    }
  }
});

test('opções do Altar são privadas, únicas e aparecem apenas enquanto há escolha pendente', () => {
  const { room } = createRoom();
  const player = room.state.players[0];
  player.deckCardIds = ['carta-a', 'carta-a', 'carta-b'];
  assert.deepEqual(publicState(room, room.players[0]).self.deckChoices, []);
  player.pendingMageAltarChoices = 1;
  assert.deepEqual(publicState(room, room.players[0]).self.deckChoices, ['carta-a', 'carta-b']);
  assert.deepEqual(publicState(room, room.players[1]).self.deckChoices, []);
  assert.equal(Object.hasOwn(publicState(room, room.spectators[0], true).self, 'deckChoices'), false);
});

test('eventos de batalha e Nevasca chegam ao cliente sem expor mão ou baralho', () => {
  const { room, first, second, spectator } = createRoom();
  room.state.effects = [{
    id: 'ataque-1', type: 'unit_attack', unitId: 'guerreiro-1', cardId: 'warrior',
    targetKind: 'unit', fromX: 1, fromZ: 1, toX: 1, toZ: 2
  }];
  room.state.snowstorms = [{
    id: 'nevasca-1', ownerSeat: 1, targetSeat: 2, x: 5, z: 5, radius: 1, remainingTurns: 2
  }];
  room.state.players[0].hand = [{ instanceId: 'mao-secreta', cardId: 'mage' }];
  room.state.players[0].deck = ['baralho-secreto'];
  broadcastRoom(room);

  for (const client of [first, second, spectator]) {
    const { state } = client.messages[0].payload;
    assert.deepEqual(state.effects, room.state.effects);
    assert.deepEqual(state.snowstorms, room.state.snowstorms);
    assert.equal(JSON.stringify(state).includes('mao-secreta'), false);
    assert.equal(JSON.stringify(state).includes('baralho-secreto'), false);
  }
  for (const client of [second, spectator]) {
    assert.equal(JSON.stringify(client.messages[0]).includes('mao-secreta'), false);
  }
});

test('diretório é calculado uma vez e enviado somente a conexões autenticadas e abertas', () => {
  const first = socket();
  const second = socket();
  const anonymous = socket();
  const closed = socket(WebSocket.CLOSED);
  const clients = new Set([first, second, anonymous, closed]);
  const sessions = new Map([...clients].map(client => [client, { authenticated: client !== anonymous }]));
  let calls = 0;
  const rooms = { directory() { calls += 1; return [{ id: 'publica', code: 'ABC234' }]; } };
  broadcastDirectory({ clients }, sessions, rooms);

  assert.equal(calls, 1);
  assert.deepEqual(first.messages, second.messages);
  assert.equal(first.messages[0].type, SERVER_EVENTS.ROOM_DIRECTORY);
  assert.equal(anonymous.messages.length, 0);
  assert.equal(closed.messages.length, 0);
});
