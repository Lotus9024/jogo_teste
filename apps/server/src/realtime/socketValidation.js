import { validateDeckCardIds } from '@tronos/shared/cards';

const TICKET_PATTERN = /^[A-Za-z0-9_-]{32,256}$/;
const ID_PATTERN = /^[A-Za-z0-9:_-]{1,128}$/;

export function assertOutsideRoom(session) {
  if (session.roomCode) throw new Error('Saia da sala atual antes de continuar.');
}

export function normalizeTicket(value) {
  const ticket = String(value ?? '');
  if (!TICKET_PATTERN.test(ticket)) throw new Error('Ticket inválido.');
  return ticket;
}

export function normalizeIdentity(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Identidade inválida.');
  const playerId = String(value.playerId ?? '').trim();
  if (!ID_PATTERN.test(playerId)) throw new Error('Identidade inválida.');
  const name = String(value.name ?? '')
    .normalize('NFKC')
    .trim()
    .replace(/[<>\u0000-\u001f\u007f]/g, '')
    .slice(0, 24);
  if (name.length < 2) throw new Error('Identidade inválida.');
  return {
    playerId,
    name,
    deckCardIds: Array.isArray(value.deckCardIds) ? [...value.deckCardIds] : []
  };
}

export function hasValidDeck(deckCardIds) {
  try {
    validateDeckCardIds(deckCardIds, { allowDefault: false });
    return true;
  } catch {
    return false;
  }
}
