import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync
} from 'node:fs';
import { dirname } from 'node:path';
import { MemoryIdentityRepository } from './memoryIdentityRepository.js';

const STORAGE_VERSION = 1;

function restoreDate(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error('Data inválida no armazenamento local do Nexus.');
  return date;
}

function playerFromStorage(player) {
  return {
    ...player,
    createdAt: restoreDate(player.createdAt),
    lastLoginAt: restoreDate(player.lastLoginAt)
  };
}

export class FileIdentityRepository extends MemoryIdentityRepository {
  constructor({ filePath, now } = {}) {
    super({ now });
    if (!filePath) throw new Error('O caminho do armazenamento local do Nexus é obrigatório.');
    this.storageKind = 'file';
    this.filePath = filePath;
    this.#load();
  }

  #load() {
    if (!existsSync(this.filePath)) return;
    let data;
    try {
      data = JSON.parse(readFileSync(this.filePath, 'utf8'));
    } catch {
      throw new Error('O armazenamento local do Nexus está corrompido.');
    }
    if (data?.version !== STORAGE_VERSION) {
      throw new Error('A versão do armazenamento local do Nexus não é compatível.');
    }

    for (const storedPlayer of data.players ?? []) {
      const player = playerFromStorage(storedPlayer);
      this.players.set(player.id, player);
      this.playerIdByName.set(player.normalizedName, player.id);
      if (player.discordUserId) this.playerIdByDiscord.set(player.discordUserId, player.id);
    }
    for (const [key, session] of data.sessions ?? []) {
      this.sessions.set(key, {
        ...session,
        csrfHash: Buffer.from(String(session.csrfHash ?? ''), 'base64'),
        expiresAt: restoreDate(session.expiresAt)
      });
    }
    for (const [playerId, cardIds] of data.decks ?? []) this.decks.set(playerId, [...cardIds]);
    for (const [key, ticket] of data.socketTickets ?? []) {
      this.socketTickets.set(key, { ...ticket, expiresAt: restoreDate(ticket.expiresAt) });
    }
    for (const [key, state] of data.oauthStates ?? []) {
      this.oauthStates.set(key, { ...state, expiresAt: restoreDate(state.expiresAt) });
    }
    for (const [key, rateLimit] of data.rateLimits ?? []) {
      this.rateLimits.set(key, {
        ...rateLimit,
        windowStartedAt: restoreDate(rateLimit.windowStartedAt)
      });
    }
  }

  #persist() {
    const payload = {
      version: STORAGE_VERSION,
      players: [...this.players.values()],
      sessions: [...this.sessions].map(([key, session]) => [key, {
        ...session,
        csrfHash: session.csrfHash.toString('base64')
      }]),
      decks: [...this.decks],
      socketTickets: [...this.socketTickets],
      oauthStates: [...this.oauthStates],
      rateLimits: [...this.rateLimits]
    };
    mkdirSync(dirname(this.filePath), { recursive: true });
    const temporaryPath = `${this.filePath}.${process.pid}.tmp`;
    writeFileSync(temporaryPath, JSON.stringify(payload), { encoding: 'utf8', mode: 0o600 });
    renameSync(temporaryPath, this.filePath);
  }

  async createPlayer(input) {
    const player = await super.createPlayer(input);
    this.#persist();
    return player;
  }

  async touchPlayerLogin(playerId) {
    await super.touchPlayerLogin(playerId);
    this.#persist();
  }

  async createSession(input) {
    await super.createSession(input);
    this.#persist();
  }

  async getSession(tokenHash) {
    const key = Buffer.from(tokenHash).toString('hex');
    const existed = this.sessions.has(key);
    const session = await super.getSession(tokenHash);
    if (existed && !session) this.#persist();
    return session;
  }

  async deleteSession(tokenHash) {
    const deleted = await super.deleteSession(tokenHash);
    if (deleted) this.#persist();
    return deleted;
  }

  async saveDeck(playerId, cardIds) {
    const saved = await super.saveDeck(playerId, cardIds);
    this.#persist();
    return saved;
  }

  async createSocketTicket(input) {
    await super.createSocketTicket(input);
    this.#persist();
  }

  async consumeSocketTicket(tokenHash) {
    const result = await super.consumeSocketTicket(tokenHash);
    this.#persist();
    return result;
  }

  async createOauthState(input) {
    await super.createOauthState(input);
    this.#persist();
  }

  async consumeOauthState(stateHash) {
    const result = await super.consumeOauthState(stateHash);
    this.#persist();
    return result;
  }

  async consumeRateLimit(input) {
    const result = await super.consumeRateLimit(input);
    this.#persist();
    return result;
  }
}
