import { randomUUID } from 'node:crypto';
import { IdentityConflictError } from './repositoryErrors.js';

function keyOf(buffer) {
  return Buffer.from(buffer).toString('hex');
}

function clonePlayer(player) {
  return player ? { ...player } : null;
}

export class MemoryIdentityRepository {
  constructor({ now = () => new Date() } = {}) {
    this.storageKind = 'memory';
    this.now = now;
    this.players = new Map();
    this.playerIdByName = new Map();
    this.playerIdByDiscord = new Map();
    this.sessions = new Map();
    this.decks = new Map();
    this.socketTickets = new Map();
    this.oauthStates = new Map();
    this.rateLimits = new Map();
  }

  async createPlayer({ displayName, normalizedName, authProvider, passwordHash = null, discordUserId = null }) {
    if (this.playerIdByName.has(normalizedName) || (discordUserId && this.playerIdByDiscord.has(discordUserId))) {
      throw new IdentityConflictError();
    }
    const player = {
      id: randomUUID(),
      displayName,
      normalizedName,
      authProvider,
      passwordHash,
      discordUserId,
      createdAt: this.now(),
      lastLoginAt: this.now()
    };
    this.players.set(player.id, player);
    this.playerIdByName.set(normalizedName, player.id);
    if (discordUserId) this.playerIdByDiscord.set(discordUserId, player.id);
    return clonePlayer(player);
  }

  async findPlayerByNormalizedName(normalizedName) {
    return clonePlayer(this.players.get(this.playerIdByName.get(normalizedName)));
  }

  async findPlayerByDiscordId(discordUserId) {
    return clonePlayer(this.players.get(this.playerIdByDiscord.get(discordUserId)));
  }

  async touchPlayerLogin(playerId) {
    const player = this.players.get(playerId);
    if (player) player.lastLoginAt = this.now();
  }

  async createSession({ tokenHash, playerId, csrfHash, expiresAt }) {
    this.sessions.set(keyOf(tokenHash), {
      playerId,
      csrfHash: Buffer.from(csrfHash),
      expiresAt
    });
  }

  async getSession(tokenHash) {
    const session = this.sessions.get(keyOf(tokenHash));
    if (!session || session.expiresAt <= this.now()) {
      this.sessions.delete(keyOf(tokenHash));
      return null;
    }
    const player = this.players.get(session.playerId);
    if (!player) return null;
    return {
      tokenHash: Buffer.from(tokenHash),
      player: clonePlayer(player),
      expiresAt: session.expiresAt,
      deckCardIds: [...(this.decks.get(player.id) ?? [])]
    };
  }

  async deleteSession(tokenHash) {
    return this.sessions.delete(keyOf(tokenHash));
  }

  async saveDeck(playerId, cardIds) {
    this.decks.set(playerId, [...cardIds]);
    return [...cardIds];
  }

  async getDeck(playerId) {
    return [...(this.decks.get(playerId) ?? [])];
  }

  async createSocketTicket({ tokenHash, playerId, expiresAt }) {
    for (const [key, ticket] of this.socketTickets) {
      if (ticket.expiresAt <= this.now()) this.socketTickets.delete(key);
    }
    this.socketTickets.set(keyOf(tokenHash), { playerId, expiresAt });
  }

  async consumeSocketTicket(tokenHash) {
    const key = keyOf(tokenHash);
    const ticket = this.socketTickets.get(key);
    this.socketTickets.delete(key);
    if (!ticket || ticket.expiresAt <= this.now()) return null;
    const player = this.players.get(ticket.playerId);
    if (!player) return null;
    return {
      player: clonePlayer(player),
      deckCardIds: [...(this.decks.get(player.id) ?? [])]
    };
  }

  async createOauthState({ stateHash, codeVerifier, expiresAt }) {
    for (const [key, state] of this.oauthStates) {
      if (state.expiresAt <= this.now()) this.oauthStates.delete(key);
    }
    this.oauthStates.set(keyOf(stateHash), { codeVerifier, expiresAt });
  }

  async consumeOauthState(stateHash) {
    const key = keyOf(stateHash);
    const state = this.oauthStates.get(key);
    this.oauthStates.delete(key);
    if (!state || state.expiresAt <= this.now()) return null;
    return { ...state };
  }

  async consumeRateLimit({ keyHash, limit, windowSeconds }) {
    const key = keyOf(keyHash);
    const now = this.now();
    const current = this.rateLimits.get(key);
    if (!current || now.getTime() - current.windowStartedAt.getTime() >= windowSeconds * 1000) {
      this.rateLimits.set(key, { attempts: 1, windowStartedAt: now });
      return { allowed: true, attempts: 1 };
    }
    current.attempts += 1;
    return { allowed: current.attempts <= limit, attempts: current.attempts };
  }
}
