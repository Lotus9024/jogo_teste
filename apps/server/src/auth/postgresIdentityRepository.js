import { IdentityConflictError } from './repositoryErrors.js';

function mapPlayer(row) {
  if (!row) return null;
  return {
    id: row.id,
    displayName: row.display_name,
    normalizedName: row.normalized_name,
    authProvider: row.auth_provider,
    passwordHash: row.password_hash,
    discordUserId: row.discord_user_id,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at
  };
}

function rethrowConflict(error) {
  if (error?.code === '23505') throw new IdentityConflictError();
  throw error;
}

export class PostgresIdentityRepository {
  constructor(pool) {
    this.storageKind = 'postgres';
    this.pool = pool;
  }

  async createPlayer({ displayName, normalizedName, authProvider, passwordHash = null, discordUserId = null }) {
    try {
      const result = await this.pool.query(
        `insert into game.players
          (display_name, normalized_name, auth_provider, password_hash, discord_user_id, last_login_at)
         values ($1, $2, $3, $4, $5, now())
         returning *`,
        [displayName, normalizedName, authProvider, passwordHash, discordUserId]
      );
      return mapPlayer(result.rows[0]);
    } catch (error) {
      rethrowConflict(error);
    }
  }

  async findPlayerByNormalizedName(normalizedName) {
    const result = await this.pool.query(
      'select * from game.players where normalized_name = $1 limit 1',
      [normalizedName]
    );
    return mapPlayer(result.rows[0]);
  }

  async findPlayerByDiscordId(discordUserId) {
    const result = await this.pool.query(
      'select * from game.players where discord_user_id = $1 limit 1',
      [discordUserId]
    );
    return mapPlayer(result.rows[0]);
  }

  async touchPlayerLogin(playerId) {
    await this.pool.query(
      'update game.players set last_login_at = now() where id = $1',
      [playerId]
    );
  }

  async createSession({ tokenHash, playerId, csrfHash, expiresAt }) {
    await this.pool.query(
      `insert into game.auth_sessions (token_hash, player_id, csrf_hash, expires_at)
       values ($1, $2, $3, $4)`,
      [tokenHash, playerId, csrfHash, expiresAt]
    );
  }

  async getSession(tokenHash) {
    const result = await this.pool.query(
      `select
         sessions.token_hash,
         sessions.expires_at,
         players.id,
         players.display_name,
         players.normalized_name,
         players.auth_provider,
         players.discord_user_id,
         players.created_at,
         players.last_login_at,
         coalesce(decks.card_ids, array[]::text[]) as card_ids
       from game.auth_sessions sessions
       join game.players players on players.id = sessions.player_id
       left join game.player_decks decks on decks.player_id = players.id
       where sessions.token_hash = $1
         and sessions.expires_at > now()
       limit 1`,
      [tokenHash]
    );
    const row = result.rows[0];
    if (!row) return null;
    await this.pool.query(
      'update game.auth_sessions set last_seen_at = now() where token_hash = $1',
      [tokenHash]
    );
    return {
      tokenHash: Buffer.from(row.token_hash),
      player: mapPlayer(row),
      expiresAt: row.expires_at,
      deckCardIds: row.card_ids
    };
  }

  async deleteSession(tokenHash) {
    const result = await this.pool.query(
      'delete from game.auth_sessions where token_hash = $1',
      [tokenHash]
    );
    return result.rowCount > 0;
  }

  async saveDeck(playerId, cardIds) {
    const result = await this.pool.query(
      `insert into game.player_decks (player_id, card_ids)
       values ($1, $2)
       on conflict (player_id)
       do update set card_ids = excluded.card_ids, updated_at = now()
       returning card_ids`,
      [playerId, cardIds]
    );
    return result.rows[0].card_ids;
  }

  async getDeck(playerId) {
    const result = await this.pool.query(
      'select card_ids from game.player_decks where player_id = $1',
      [playerId]
    );
    return result.rows[0]?.card_ids ?? [];
  }

  async createSocketTicket({ tokenHash, playerId, expiresAt }) {
    await this.pool.query(
      'delete from game.socket_tickets where expires_at <= now()'
    );
    await this.pool.query(
      `insert into game.socket_tickets (token_hash, player_id, expires_at)
       values ($1, $2, $3)`,
      [tokenHash, playerId, expiresAt]
    );
  }

  async consumeSocketTicket(tokenHash) {
    const result = await this.pool.query(
      `with consumed as (
         delete from game.socket_tickets
         where token_hash = $1 and expires_at > now()
         returning player_id
       )
       select
         players.id,
         players.display_name,
         players.normalized_name,
         players.auth_provider,
         players.discord_user_id,
         players.created_at,
         players.last_login_at,
         coalesce(decks.card_ids, array[]::text[]) as card_ids
       from consumed
       join game.players players on players.id = consumed.player_id
       left join game.player_decks decks on decks.player_id = players.id`,
      [tokenHash]
    );
    const row = result.rows[0];
    return row ? { player: mapPlayer(row), deckCardIds: row.card_ids } : null;
  }

  async createOauthState({ stateHash, codeVerifier, expiresAt }) {
    await this.pool.query(
      'delete from game.oauth_states where expires_at <= now()'
    );
    await this.pool.query(
      `insert into game.oauth_states (state_hash, code_verifier, expires_at)
       values ($1, $2, $3)`,
      [stateHash, codeVerifier, expiresAt]
    );
  }

  async consumeOauthState(stateHash) {
    const result = await this.pool.query(
      `delete from game.oauth_states
       where state_hash = $1 and expires_at > now()
       returning code_verifier, expires_at`,
      [stateHash]
    );
    return result.rows[0]
      ? { codeVerifier: result.rows[0].code_verifier, expiresAt: result.rows[0].expires_at }
      : null;
  }

  async consumeRateLimit({ keyHash, limit, windowSeconds }) {
    const result = await this.pool.query(
      `insert into game.auth_rate_limits (key_hash, attempts, window_started_at)
       values ($1, 1, now())
       on conflict (key_hash) do update
       set
         attempts = case
           when game.auth_rate_limits.window_started_at <= now() - make_interval(secs => $2::int)
             then 1
           else game.auth_rate_limits.attempts + 1
         end,
         window_started_at = case
           when game.auth_rate_limits.window_started_at <= now() - make_interval(secs => $2::int)
             then now()
           else game.auth_rate_limits.window_started_at
         end
       returning attempts`,
      [keyHash, windowSeconds]
    );
    const attempts = Number(result.rows[0].attempts);
    return { allowed: attempts <= limit, attempts };
  }
}
