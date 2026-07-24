import { randomInt, randomUUID } from 'node:crypto';
import { DEFAULT_DECK_CARD_IDS, validateDeckCardIds } from '@tronos/shared/cards';
import { GAME_CONFIG } from '@tronos/shared/game-config';
import { createInitialState } from './createInitialState.js';
import { applyGameAction, applyTurnTimeout } from './gameEngine.js';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ROOM_CODE_PATTERN = /^[A-Z2-9]{6}$/;
const ID_PATTERN = /^[A-Za-z0-9:_-]{1,128}$/;

function roomCode() {
  return Array.from({ length: 6 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
}

export class RoomManager {
  constructor({ botDelayMs = 350 } = {}) {
    this.rooms = new Map();
    this.botDelayMs = Math.max(0, Number(botDelayMs) || 0);
  }

  /**
   * Compatibilidade de assinatura para integrações internas. Mesmo este
   * caminho exige um Deck explícito e válido.
   */
  create(playerName, socket, deckCardIds) {
    return this.createAuthenticated(
      legacyIdentity(playerName, deckCardIds),
      socket,
      { visibility: 'private', name: `Sala de ${normalizeName(playerName)}` }
    );
  }

  join(code, playerName, socket, deckCardIds) {
    return this.joinAuthenticated(code, legacyIdentity(playerName, deckCardIds), socket);
  }

  createAuthenticated(identity, socket, options = {}) {
    const playerIdentity = authenticatedIdentity(identity);
    this.#assertConnectionAvailable(playerIdentity.playerId);

    let code;
    do code = roomCode(); while (this.rooms.has(code));

    const player = participant(playerIdentity, 1, socket);
    const room = {
      id: randomUUID(),
      code,
      name: normalizeRoomName(options.name, player.name),
      visibility: normalizeVisibility(options.visibility),
      listed: options.listed !== false,
      players: [player],
      spectators: [],
      state: createInitialState([player]),
      updatedAt: Date.now(),
      botTurnReadyAt: null
    };
    this.rooms.set(code, room);
    return { room, player };
  }

  joinAuthenticated(code, identity, socket) {
    const normalizedCode = normalizeCode(code);
    const playerIdentity = authenticatedIdentity(identity);
    this.#assertConnectionAvailable(playerIdentity.playerId);

    const room = this.rooms.get(normalizedCode);
    if (!room) throw new Error('Sala não encontrada.');
    if (room.players.length >= GAME_CONFIG.maxPlayers) throw new Error('Sala cheia.');

    const player = participant(playerIdentity, 2, socket);
    room.players.push(player);
    room.state = createInitialState(room.players);
    room.updatedAt = Date.now();
    room.botTurnReadyAt = null;
    return { room, player };
  }

  spectateAuthenticated(code, identity, socket) {
    const normalizedCode = normalizeCode(code);
    const spectatorIdentity = authenticatedIdentity(identity);
    this.#assertConnectionAvailable(spectatorIdentity.playerId);

    const room = this.rooms.get(normalizedCode);
    if (!room) throw new Error('Sala não encontrada.');
    if (room.players.length < GAME_CONFIG.maxPlayers || room.state.phase !== 'playing') {
      throw new Error('A partida ainda não pode ser assistida.');
    }

    const spectator = {
      id: spectatorIdentity.playerId,
      name: spectatorIdentity.name,
      socket
    };
    room.spectators.push(spectator);
    room.updatedAt = Date.now();
    return { room, spectator };
  }

  createAiAuthenticated(identity, socket) {
    const created = this.createAuthenticated(identity, socket, {
      visibility: 'private',
      listed: false,
      name: 'Partida contra IA'
    });
    const bot = participant({
      playerId: `bot:${randomUUID()}`,
      name: 'Guardião Nexus',
      deckCardIds: validateDeckCardIds(DEFAULT_DECK_CARD_IDS)
    }, 2, null, true);

    created.room.players.push(bot);
    created.room.state = createInitialState(created.room.players);
    created.room.updatedAt = Date.now();
    created.room.botTurnReadyAt = null;
    return { room: created.room, player: created.player, bot };
  }

  reattachAuthenticated(identity, socket) {
    const playerIdentity = authenticatedIdentity(identity);
    for (const room of this.rooms.values()) {
      if (room.state.phase !== 'playing') continue;
      const player = room.players.find(item => (
        item.id === playerIdentity.playerId
        && !item.isBot
        && !item.socket
      ));
      if (!player) continue;

      player.socket = socket;
      const statePlayer = room.state.players.find(item => item.id === player.id);
      if (statePlayer) statePlayer.connected = true;
      room.updatedAt = Date.now();
      return { room, player };
    }
    return null;
  }

  directory() {
    return [...this.rooms.values()]
      .filter(room => room.listed && room.state.phase !== 'finished')
      .sort((left, right) => right.updatedAt - left.updatedAt)
      .map(room => {
        const full = room.players.length >= GAME_CONFIG.maxPlayers;
        const isPrivate = room.visibility === 'private';
        return {
          id: room.id,
          name: room.name,
          visibility: room.visibility,
          locked: isPrivate,
          code: isPrivate ? null : room.code,
          playerCount: room.players.length,
          capacity: GAME_CONFIG.maxPlayers,
          players: room.players.length,
          maxPlayers: GAME_CONFIG.maxPlayers,
          spectators: room.spectators.length,
          status: full ? 'playing' : 'waiting',
          canJoin: !isPrivate && !full,
          canSpectate: !isPrivate && full
        };
      });
  }

  action(roomCodeValue, playerId, action, expectedVersion) {
    const room = this.rooms.get(roomCodeValue);
    const player = room?.players.find(item => item.id === playerId);
    if (!room || !player || player.isBot || !player.socket) throw new Error('Sessão inválida.');

    applyGameAction(room.state, playerId, action, expectedVersion);
    room.updatedAt = Date.now();
    this.#armBot(room);
    return room;
  }

  leave(identityId, { abandon = false } = {}) {
    for (const [code, room] of this.rooms) {
      const spectator = room.spectators.find(item => item.id === identityId);
      if (spectator) {
        room.spectators = room.spectators.filter(item => item.id !== identityId);
        room.updatedAt = Date.now();
        return room;
      }

      const player = room.players.find(item => item.id === identityId);
      if (!player) continue;

      if (room.state.phase === 'playing' && abandon) {
        player.socket = null;
        room.listed = false;
        room.state.phase = 'finished';
        room.state.winnerSeat = room.state.players.find(item => item.id !== identityId)?.seat ?? null;
        room.state.version += 1;
        const statePlayer = room.state.players.find(item => item.id === identityId);
        if (statePlayer) statePlayer.connected = false;
      } else if (room.state.phase === 'playing') {
        player.socket = null;
        const statePlayer = room.state.players.find(item => item.id === identityId);
        if (statePlayer) statePlayer.connected = false;
      } else {
        room.players = room.players.filter(item => item.id !== identityId);
        if (!room.players.length) {
          this.rooms.delete(code);
          return null;
        }
        room.state = createInitialState(room.players);
      }
      room.updatedAt = Date.now();
      return room;
    }
    return null;
  }

  tick() {
    const changed = [];
    const now = Date.now();
    for (const [code, room] of this.rooms) {
      const hasLiveAudience = room.players.some(player => player.socket)
        || room.spectators.some(spectator => spectator.socket);
      if (!hasLiveAudience && now - room.updatedAt > 5 * 60 * 1000) {
        this.rooms.delete(code);
        continue;
      }

      const activePlayer = room.state.players.find(player => player.seat === room.state.activeSeat);
      const activeBot = room.players.find(player => player.id === activePlayer?.id && player.isBot);
      if (activeBot) {
        if (room.botTurnReadyAt === null) room.botTurnReadyAt = now + this.botDelayMs;
        if (now >= room.botTurnReadyAt) {
          applyGameAction(room.state, activeBot.id, { type: 'end_turn' }, room.state.version);
          room.updatedAt = now;
          room.botTurnReadyAt = null;
          changed.push(room);
          continue;
        }
      } else {
        room.botTurnReadyAt = null;
      }

      if (applyTurnTimeout(room.state)) {
        room.updatedAt = now;
        this.#armBot(room);
        changed.push(room);
      }
    }
    return changed;
  }

  #armBot(room) {
    const activeStatePlayer = room.state.players.find(player => player.seat === room.state.activeSeat);
    const activeBot = room.players.find(player => player.id === activeStatePlayer?.id && player.isBot);
    room.botTurnReadyAt = activeBot ? Date.now() + this.botDelayMs : null;
  }

  #assertConnectionAvailable(identityId) {
    for (const room of this.rooms.values()) {
      if (room.players.some(player => player.id === identityId && player.socket)) {
        throw new Error('Você já está em uma sala.');
      }
      if (room.spectators.some(spectator => spectator.id === identityId && spectator.socket)) {
        throw new Error('Você já está assistindo a uma sala.');
      }
    }
  }
}

function participant(identity, seat, socket, isBot = false) {
  return {
    id: identity.playerId,
    name: identity.name,
    seat,
    socket,
    isBot,
    deckCardIds: [...identity.deckCardIds]
  };
}

function authenticatedIdentity(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Identidade inválida.');
  const playerId = String(value.playerId ?? '').trim();
  if (!ID_PATTERN.test(playerId)) throw new Error('Identidade inválida.');
  return {
    playerId,
    name: normalizeName(value.name),
    deckCardIds: validateDeckCardIds(value.deckCardIds, { allowDefault: false })
  };
}

function legacyIdentity(playerName, deckCardIds) {
  return {
    playerId: randomUUID(),
    name: normalizeName(playerName),
    deckCardIds: validateDeckCardIds(deckCardIds, { allowDefault: false })
  };
}

function normalizeName(value) {
  const name = String(value ?? '')
    .normalize('NFKC')
    .trim()
    .replace(/[<>\u0000-\u001f\u007f]/g, '')
    .slice(0, 24);
  if (name.length < 2) throw new Error('O nome precisa ter pelo menos 2 caracteres.');
  return name;
}

function normalizeRoomName(value, ownerName) {
  const fallback = `Sala de ${ownerName}`;
  const name = String(value ?? fallback)
    .normalize('NFKC')
    .trim()
    .replace(/[<>\u0000-\u001f\u007f]/g, '')
    .slice(0, 32);
  if (name.length < 2) throw new Error('O nome da sala precisa ter pelo menos 2 caracteres.');
  return name;
}

function normalizeVisibility(value) {
  if (value === undefined) return 'private';
  if (value !== 'public' && value !== 'private') throw new Error('Privacidade de sala inválida.');
  return value;
}

function normalizeCode(value) {
  const code = String(value ?? '').trim().toUpperCase();
  if (!ROOM_CODE_PATTERN.test(code)) throw new Error('Código de sala inválido.');
  return code;
}
