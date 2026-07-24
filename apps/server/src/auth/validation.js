import { validateDeckCardIds as validateSharedDeck } from '@tronos/shared/cards';

const CONTROL_CHARACTER = /[\u0000-\u001f\u007f]/u;
const WHITESPACE_RUN = /\s+/gu;

export class ValidationError extends Error {
  constructor(message, code = 'INVALID_INPUT') {
    super(message);
    this.name = 'ValidationError';
    this.code = code;
  }
}

export function normalizeKingName(value) {
  if (typeof value !== 'string') throw new ValidationError('Nome de rei inválido.');
  const displayName = value.normalize('NFKC').trim().replace(WHITESPACE_RUN, ' ');
  const characterCount = [...displayName].length;
  if (characterCount < 2 || characterCount > 24 || CONTROL_CHARACTER.test(displayName)) {
    throw new ValidationError('O nome de rei deve ter entre 2 e 24 caracteres.');
  }
  return Object.freeze({
    displayName,
    normalizedName: displayName.toLocaleLowerCase('pt-BR')
  });
}

export function validatePassword(value) {
  if (typeof value !== 'string' || value.length < 10 || value.length > 128 || CONTROL_CHARACTER.test(value)) {
    throw new ValidationError('A senha do cofre deve ter entre 10 e 128 caracteres.');
  }
  return value;
}

export function validateDeckCardIds(value) {
  try {
    return validateSharedDeck(value);
  } catch {
    throw new ValidationError('O Deck precisa ter exatamente 6 cartas comuns, 4 incomuns e 2 raras.', 'INVALID_DECK');
  }
}
