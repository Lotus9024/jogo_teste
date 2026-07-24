import {
  createOpaqueToken,
  createPkceChallenge,
  createSessionCsrfToken,
  hashOpaqueToken,
  hashPassword,
  hashRateLimitKey,
  safeTokenEqual,
  verifyPassword
} from './security.js';
import { IdentityConflictError } from './repositoryErrors.js';
import { normalizeKingName, validateDeckCardIds, validatePassword } from './validation.js';

export class AuthError extends Error {
  constructor(message, { code = 'AUTH_ERROR', status = 400 } = {}) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
    this.status = status;
  }
}

function addSeconds(date, seconds) {
  return new Date(date.getTime() + seconds * 1000);
}

function addHours(date, hours) {
  return addSeconds(date, hours * 60 * 60);
}

function publicPlayer(player) {
  return {
    id: player.id,
    name: player.displayName,
    accountKind: player.authProvider
  };
}

function discordNameCandidates(username, discordUserId) {
  let base;
  try {
    base = normalizeKingName(username).displayName;
  } catch {
    base = `Rei ${discordUserId.slice(-6)}`;
  }
  const suffix = discordUserId.slice(-4);
  return [
    base,
    `${[...base].slice(0, 19).join('')} ${suffix}`.replace(/\s+/gu, ' ').trim(),
    `Rei ${discordUserId.slice(-12)}`
  ];
}

export function createAuthService({ repository, config, fetchImpl = globalThis.fetch, now = () => new Date() }) {
  const dummyPasswordHash = hashPassword('nexus-dummy-password-do-not-use');

  async function enforce(scope, ipAddress, normalizedName, { limit, windowSeconds }) {
    const identities = [
      `${scope}:ip:${ipAddress || 'unknown'}`,
      normalizedName ? `${scope}:name:${normalizedName}` : null
    ].filter(Boolean);
    for (const identity of identities) {
      const result = await repository.consumeRateLimit({
        keyHash: hashRateLimitKey(identity),
        limit,
        windowSeconds
      });
      if (!result.allowed) {
        throw new AuthError('Muitas tentativas. Aguarde um pouco e tente novamente.', {
          code: 'RATE_LIMITED',
          status: 429
        });
      }
    }
  }

  async function issueSession(player) {
    const sessionToken = createOpaqueToken();
    const csrfToken = createSessionCsrfToken(sessionToken);
    const expiresAt = addHours(now(), config.sessionTtlHours);
    await repository.createSession({
      tokenHash: hashOpaqueToken(sessionToken),
      playerId: player.id,
      csrfHash: hashOpaqueToken(csrfToken),
      expiresAt
    });
    return {
      sessionToken,
      csrfToken,
      expiresAt,
      response: {
        authenticated: true,
        player: publicPlayer(player),
        deckCardIds: [],
        csrfToken
      }
    };
  }

  async function loadSession(sessionToken) {
    if (typeof sessionToken !== 'string' || sessionToken.length < 40 || sessionToken.length > 128) return null;
    return repository.getSession(hashOpaqueToken(sessionToken));
  }

  async function sessionResponse(sessionToken) {
    const session = await loadSession(sessionToken);
    if (!session) throw new AuthError('Sessão inválida ou expirada.', { code: 'UNAUTHORIZED', status: 401 });
    const csrfToken = createSessionCsrfToken(sessionToken);
    return {
      session,
      response: {
        authenticated: true,
        player: publicPlayer(session.player),
        deckCardIds: [...session.deckCardIds],
        csrfToken
      }
    };
  }

  async function requireCsrf(sessionToken, csrfToken) {
    const session = await loadSession(sessionToken);
    if (!session) throw new AuthError('Sessão inválida ou expirada.', { code: 'UNAUTHORIZED', status: 401 });
    const expectedToken = createSessionCsrfToken(sessionToken);
    if (typeof csrfToken !== 'string' || !csrfToken || !safeTokenEqual(csrfToken, expectedToken)) {
      throw new AuthError('Solicitação inválida.', { code: 'INVALID_CSRF', status: 403 });
    }
    return session;
  }

  async function createGuest({ name, ipAddress }) {
    const identity = normalizeKingName(name);
    await enforce('guest', ipAddress, identity.normalizedName, { limit: 5, windowSeconds: 60 * 60 });
    let player;
    try {
      player = await repository.createPlayer({
        ...identity,
        authProvider: 'guest'
      });
    } catch (error) {
      if (error instanceof IdentityConflictError) {
        throw new AuthError('Este nome de rei não está disponível.', { code: 'NAME_UNAVAILABLE', status: 409 });
      }
      throw error;
    }
    return issueSession(player);
  }

  async function register({ name, password, ipAddress }) {
    const identity = normalizeKingName(name);
    const safePassword = validatePassword(password);
    await enforce('register', ipAddress, identity.normalizedName, { limit: 5, windowSeconds: 60 * 60 });
    const passwordHash = await hashPassword(safePassword);
    let player;
    try {
      player = await repository.createPlayer({
        ...identity,
        authProvider: 'password',
        passwordHash
      });
    } catch (error) {
      if (error instanceof IdentityConflictError) {
        throw new AuthError('Este nome de rei não está disponível.', { code: 'NAME_UNAVAILABLE', status: 409 });
      }
      throw error;
    }
    return issueSession(player);
  }

  async function login({ name, password, ipAddress }) {
    const identity = normalizeKingName(name);
    const safePassword = typeof password === 'string' && password.length <= 128
      ? password
      : '';
    await enforce('login', ipAddress, identity.normalizedName, { limit: 8, windowSeconds: 15 * 60 });
    const player = await repository.findPlayerByNormalizedName(identity.normalizedName);
    const passwordHash = player?.authProvider === 'password' && player.passwordHash
      ? player.passwordHash
      : await dummyPasswordHash;
    const valid = await verifyPassword(safePassword, passwordHash);
    if (safePassword.length < 10 || !valid || player?.authProvider !== 'password') {
      throw new AuthError('Nome de rei ou senha inválidos.', { code: 'INVALID_CREDENTIALS', status: 401 });
    }
    await repository.touchPlayerLogin(player.id);
    const session = await issueSession(player);
    session.response.deckCardIds = await repository.getDeck(player.id);
    return session;
  }

  async function logout({ sessionToken, csrfToken }) {
    const session = await requireCsrf(sessionToken, csrfToken);
    await repository.deleteSession(session.tokenHash);
  }

  async function saveDeck({ sessionToken, csrfToken, cardIds }) {
    const session = await requireCsrf(sessionToken, csrfToken);
    const safeCardIds = validateDeckCardIds(cardIds);
    return repository.saveDeck(session.player.id, safeCardIds);
  }

  async function readDeck({ sessionToken }) {
    const session = await loadSession(sessionToken);
    if (!session) throw new AuthError('Sessão inválida ou expirada.', { code: 'UNAUTHORIZED', status: 401 });
    return repository.getDeck(session.player.id);
  }

  async function createSocketTicket({ sessionToken, csrfToken }) {
    const session = await requireCsrf(sessionToken, csrfToken);
    await enforce('socket-ticket', session.player.id, null, {
      limit: config.socketTicketRateLimit ?? 20,
      windowSeconds: config.socketTicketRateWindowSeconds ?? 60
    });
    const deckCardIds = validateDeckCardIds(await repository.getDeck(session.player.id));
    const ticket = createOpaqueToken();
    await repository.createSocketTicket({
      tokenHash: hashOpaqueToken(ticket),
      playerId: session.player.id,
      expiresAt: addSeconds(now(), config.socketTicketTtlSeconds)
    });
    return ticket;
  }

  async function consumeSocketTicket(ticket) {
    if (typeof ticket !== 'string' || ticket.length < 40 || ticket.length > 128) return null;
    const consumed = await repository.consumeSocketTicket(hashOpaqueToken(ticket));
    if (!consumed) return null;
    try {
      return {
        playerId: consumed.player.id,
        name: consumed.player.displayName,
        deckCardIds: validateDeckCardIds(consumed.deckCardIds)
      };
    } catch {
      return null;
    }
  }

  async function beginDiscord({ ipAddress } = {}) {
    if (!config.discordClientId || !config.discordClientSecret || !config.discordRedirectUri) {
      throw new AuthError('Login com Discord indisponível.', { code: 'DISCORD_UNAVAILABLE', status: 503 });
    }
    await enforce('discord-start', ipAddress, null, {
      limit: config.oauthStartRateLimit ?? 10,
      windowSeconds: config.oauthStartRateWindowSeconds ?? 15 * 60
    });
    const state = createOpaqueToken();
    const codeVerifier = createOpaqueToken(48);
    await repository.createOauthState({
      stateHash: hashOpaqueToken(state),
      codeVerifier,
      expiresAt: addSeconds(now(), config.oauthStateTtlSeconds)
    });
    const authorizationUrl = new URL('https://discord.com/oauth2/authorize');
    authorizationUrl.search = new URLSearchParams({
      response_type: 'code',
      client_id: config.discordClientId,
      scope: 'identify',
      redirect_uri: config.discordRedirectUri,
      state,
      code_challenge: createPkceChallenge(codeVerifier),
      code_challenge_method: 'S256'
    }).toString();
    return { state, authorizationUrl: authorizationUrl.toString() };
  }

  async function finishDiscord({ code, state, cookieState, ipAddress }) {
    if (
      typeof code !== 'string' ||
      code.length < 4 ||
      code.length > 512 ||
      typeof state !== 'string' ||
      !safeTokenEqual(state, cookieState)
    ) {
      throw new AuthError('Login com Discord inválido.', { code: 'INVALID_OAUTH', status: 400 });
    }
    await enforce('discord', ipAddress, null, { limit: 10, windowSeconds: 15 * 60 });
    const oauthState = await repository.consumeOauthState(hashOpaqueToken(state));
    if (!oauthState) throw new AuthError('Login com Discord expirado.', { code: 'INVALID_OAUTH', status: 400 });

    const tokenResponse = await fetchImpl('https://discord.com/api/v10/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: config.discordRedirectUri,
        client_id: config.discordClientId,
        client_secret: config.discordClientSecret,
        code_verifier: oauthState.codeVerifier
      }),
      signal: AbortSignal.timeout(6_000)
    });
    if (!tokenResponse.ok) throw new AuthError('Não foi possível entrar com Discord.', { code: 'OAUTH_FAILED', status: 502 });
    const tokenPayload = await tokenResponse.json();
    if (typeof tokenPayload.access_token !== 'string') {
      throw new AuthError('Não foi possível entrar com Discord.', { code: 'OAUTH_FAILED', status: 502 });
    }
    const userResponse = await fetchImpl('https://discord.com/api/v10/users/@me', {
      headers: { Authorization: `Bearer ${tokenPayload.access_token}` },
      signal: AbortSignal.timeout(6_000)
    });
    if (!userResponse.ok) throw new AuthError('Não foi possível entrar com Discord.', { code: 'OAUTH_FAILED', status: 502 });
    const user = await userResponse.json();
    if (!/^\d{5,32}$/u.test(String(user.id ?? ''))) {
      throw new AuthError('Não foi possível entrar com Discord.', { code: 'OAUTH_FAILED', status: 502 });
    }

    let player = await repository.findPlayerByDiscordId(String(user.id));
    if (!player) {
      for (const candidate of discordNameCandidates(String(user.global_name || user.username || ''), String(user.id))) {
        try {
          const identity = normalizeKingName(candidate);
          player = await repository.createPlayer({
            ...identity,
            authProvider: 'discord',
            discordUserId: String(user.id)
          });
          break;
        } catch (error) {
          if (!(error instanceof IdentityConflictError)) throw error;
          player = await repository.findPlayerByDiscordId(String(user.id));
          if (player) break;
        }
      }
    }
    if (!player) throw new AuthError('Não foi possível criar seu nome de rei.', { code: 'NAME_UNAVAILABLE', status: 409 });
    await repository.touchPlayerLogin(player.id);
    const session = await issueSession(player);
    session.response.deckCardIds = await repository.getDeck(player.id);
    return session;
  }

  return Object.freeze({
    beginDiscord,
    consumeSocketTicket,
    createGuest,
    createSocketTicket,
    finishDiscord,
    loadSession,
    login,
    logout,
    readDeck,
    register,
    saveDeck,
    sessionResponse
  });
}
