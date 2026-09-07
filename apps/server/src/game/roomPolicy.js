import { randomInt, randomUUID } from 'node:crypto';
import { validateDeckCardIds } from '@tronos/shared/cards';
import { GAME_CONFIG } from '@tronos/shared/game-config';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ROOM_CODE_PATTERN = /^[A-Z2-9]{6}$/;
const ID_PATTERN = /^[A-Za-z0-9:_-]{1,128}$/;

export function roomCode() {
  return Array.from({ length: 6 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
}

export function participant(identity, seat, socket, isBot = false) {
  return {
    id: identity.playerId,
    name: identity.name,
    seat,
    socket,
    isBot,
    forfeitAt: null,
    deckCardIds: [...identity.deckCardIds]
  };
}

export function authenticatedIdentity(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Identidade inválida.');
  const playerId = String(value.playerId ?? '').trim();
  if (!ID_PATTERN.test(playerId)) throw new Error('Identidade inválida.');
  return {
    playerId,
    name: normalizeName(value.name),
    deckCardIds: validateDeckCardIds(value.deckCardIds, { allowDefault: false })
  };
}

export function legacyIdentity(playerName, deckCardIds) {
  return {
    playerId: randomUUID(),
    name: normalizeName(playerName),
    deckCardIds: validateDeckCardIds(deckCardIds, { allowDefault: false })
  };
}

export function normalizeName(value) {
  const name = String(value ?? '')
    .normalize('NFKC')
    .trim()
    .replace(/[<>\u0000-\u001f\u007f]/g, '')
    .slice(0, 24);
  if (name.length < 2) throw new Error('O nome precisa ter pelo menos 2 caracteres.');
  return name;
}

export function normalizeRoomName(value, ownerName) {
  const fallback = `Sala de ${ownerName}`;
  const name = String(value ?? fallback)
    .normalize('NFKC')
    .trim()
    .replace(/[<>\u0000-\u001f\u007f]/g, '')
    .slice(0, 32);
  if (name.length < 2) throw new Error('O nome da sala precisa ter pelo menos 2 caracteres.');
  return name;
}

export function normalizeVisibility(value) {
  if (value === undefined) return 'private';
  if (value !== 'public' && value !== 'private') throw new Error('Privacidade de sala inválida.');
  return value;
}

export function normalizePlayerCount(value) {
  if (value === undefined) return GAME_CONFIG.maxPlayers;
  const playerCount = Number(value);
  if (![2, 3, 4].includes(playerCount)) throw new Error('Quantidade de jogadores inválida.');
  return playerCount;
}

export function normalizeCode(value) {
  const code = String(value ?? '').trim().toUpperCase();
  if (!ROOM_CODE_PATTERN.test(code)) throw new Error('Código de sala inválido.');
  return code;
}
