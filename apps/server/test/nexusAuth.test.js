import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { afterEach, describe, test } from 'node:test';
import { DEFAULT_DECK_CARD_IDS } from '@tronos/shared/cards';
import { createAuthService } from '../src/auth/authService.js';
import { MemoryIdentityRepository } from '../src/auth/memoryIdentityRepository.js';
import { PostgresIdentityRepository } from '../src/auth/postgresIdentityRepository.js';
import { hashOpaqueToken, hashPassword, verifyPassword } from '../src/auth/security.js';
import { normalizeKingName } from '../src/auth/validation.js';
import { createDatabaseConnectionOptions } from '../src/database/tls.js';
import { createApiRouter } from '../src/http/createApiRouter.js';

const openServers = new Set();
const baseConfig = Object.freeze({
  nodeEnv: 'test',
  clientOrigins: Object.freeze(['http://localhost:4173']),
  publicClientUrl: 'http://localhost:4173/',
  trustProxy: false,
  sessionCookieSecure: false,
  sessionTtlHours: 24,
  socketTicketTtlSeconds: 30,
  socketTicketRateLimit: 20,
  socketTicketRateWindowSeconds: 60,
  oauthStateTtlSeconds: 600,
  oauthStartRateLimit: 10,
  oauthStartRateWindowSeconds: 900,
  discordClientId: '',
  discordClientSecret: '',
  discordRedirectUri: '',
  databaseSsl: false
});

afterEach(async () => {
  await Promise.all([...openServers].map(server => new Promise(resolve => server.close(resolve))));
  openServers.clear();
});

function cookieValue(setCookie) {
  return String(setCookie).split(';')[0];
}

async function startRouter(router) {
  const server = createServer(async (request, response) => {
    if (await router.handle(request, response)) return;
    response.writeHead(404).end();
  });
  openServers.add(server);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return `http://127.0.0.1:${server.address().port}`;
}

describe('segurança da identidade Nexus', () => {
  test('normaliza nomes com NFKC, espaços e comparação sem diferenciar maiúsculas', () => {
    assert.deepEqual(normalizeKingName('  Ｒei   Azul  '), {
      displayName: 'Rei Azul',
      normalizedName: 'rei azul'
    });
  });

  test('protege senhas com scrypt e salt', async () => {
    const first = await hashPassword('cofre-seguro-123');
    const second = await hashPassword('cofre-seguro-123');
    assert.notEqual(first, second);
    assert.equal(first.includes('cofre-seguro-123'), false);
    assert.equal(await verifyPassword('cofre-seguro-123', first), true);
    assert.equal(await verifyPassword('senha-incorreta', first), false);
  });

  test('reserva nomes sem diferenciar caixa', async () => {
    const service = createAuthService({
      repository: new MemoryIdentityRepository(),
      config: baseConfig
    });
    await service.createGuest({ name: 'Rei Corvo', ipAddress: '127.0.0.1' });
    await assert.rejects(
      service.register({
        name: 'rei corvo',
        password: 'cofre-seguro-123',
        ipAddress: '127.0.0.2'
      }),
      error => error.code === 'NAME_UNAVAILABLE' && error.status === 409
    );
  });

  test('exige CSRF, persiste Deck e consome ticket WebSocket uma única vez', async () => {
    const service = createAuthService({
      repository: new MemoryIdentityRepository(),
      config: baseConfig
    });
    const session = await service.register({
      name: 'Rei Seguro',
      password: 'cofre-seguro-123',
      ipAddress: '127.0.0.1'
    });
    await assert.rejects(
      service.saveDeck({
        sessionToken: session.sessionToken,
        csrfToken: 'invalido',
        cardIds: DEFAULT_DECK_CARD_IDS
      }),
      error => error.code === 'INVALID_CSRF'
    );
    await service.saveDeck({
      sessionToken: session.sessionToken,
      csrfToken: session.csrfToken,
      cardIds: DEFAULT_DECK_CARD_IDS
    });
    const ticket = await service.createSocketTicket({
      sessionToken: session.sessionToken,
      csrfToken: session.csrfToken
    });
    const identity = await service.consumeSocketTicket(ticket);
    assert.equal(identity.name, 'Rei Seguro');
    assert.deepEqual(identity.deckCardIds, DEFAULT_DECK_CARD_IDS);
    assert.equal(await service.consumeSocketTicket(ticket), null);
  });

  test('mantém o mesmo CSRF HMAC por sessão em várias abas sem rotação', async () => {
    const service = createAuthService({
      repository: new MemoryIdentityRepository(),
      config: baseConfig
    });
    const session = await service.register({
      name: 'Rei Multi Aba',
      password: 'cofre-seguro-123',
      ipAddress: '127.0.0.1'
    });
    const firstTab = await service.sessionResponse(session.sessionToken, { rotateCsrf: true });
    const secondTab = await service.sessionResponse(session.sessionToken, { rotateCsrf: true });
    assert.equal(firstTab.response.csrfToken, session.csrfToken);
    assert.equal(secondTab.response.csrfToken, session.csrfToken);
    await service.saveDeck({
      sessionToken: session.sessionToken,
      csrfToken: firstTab.response.csrfToken,
      cardIds: DEFAULT_DECK_CARD_IDS
    });
    await service.saveDeck({
      sessionToken: session.sessionToken,
      csrfToken: secondTab.response.csrfToken,
      cardIds: DEFAULT_DECK_CARD_IDS
    });
  });

  test('limita emissão de tickets WebSocket por jogador', async () => {
    const service = createAuthService({
      repository: new MemoryIdentityRepository(),
      config: {
        ...baseConfig,
        socketTicketRateLimit: 2
      }
    });
    const session = await service.register({
      name: 'Rei dos Tickets',
      password: 'cofre-seguro-123',
      ipAddress: '127.0.0.1'
    });
    await service.saveDeck({
      sessionToken: session.sessionToken,
      csrfToken: session.csrfToken,
      cardIds: DEFAULT_DECK_CARD_IDS
    });
    await service.createSocketTicket({
      sessionToken: session.sessionToken,
      csrfToken: session.csrfToken
    });
    await service.createSocketTicket({
      sessionToken: session.sessionToken,
      csrfToken: session.csrfToken
    });
    await assert.rejects(
      service.createSocketTicket({
        sessionToken: session.sessionToken,
        csrfToken: session.csrfToken
      }),
      error => error.code === 'RATE_LIMITED' && error.status === 429
    );
  });

  test('usa state e PKCE no Discord sem colocar segredo na URL', async () => {
    const requests = [];
    const fetchImpl = async (url, options = {}) => {
      requests.push({ url, options });
      if (String(url).endsWith('/oauth2/token')) {
        return new Response(JSON.stringify({ access_token: 'access-token-efemero' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return new Response(JSON.stringify({
        id: '123456789012345678',
        username: 'Rei Discord'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    };
    const service = createAuthService({
      repository: new MemoryIdentityRepository(),
      config: {
        ...baseConfig,
        discordClientId: 'client-id',
        discordClientSecret: 'client-secret',
        discordRedirectUri: 'http://localhost:3001/api/auth/discord/callback'
      },
      fetchImpl
    });
    const oauth = await service.beginDiscord({ ipAddress: '127.0.0.1' });
    const authorizationUrl = new URL(oauth.authorizationUrl);
    assert.equal(authorizationUrl.searchParams.get('state'), oauth.state);
    assert.equal(authorizationUrl.searchParams.get('code_challenge_method'), 'S256');
    assert.ok(authorizationUrl.searchParams.get('code_challenge'));
    assert.equal(oauth.authorizationUrl.includes('client-secret'), false);

    const session = await service.finishDiscord({
      code: 'discord-code',
      state: oauth.state,
      cookieState: oauth.state,
      ipAddress: '127.0.0.1'
    });
    assert.equal(session.response.player.accountKind, 'discord');
    assert.equal(requests.length, 2);
    assert.match(String(requests[0].options.body), /code_verifier=/u);
    await assert.rejects(
      service.finishDiscord({
        code: 'discord-code',
        state: oauth.state,
        cookieState: oauth.state,
        ipAddress: '127.0.0.1'
      }),
      error => error.code === 'INVALID_OAUTH'
    );
  });

  test('limita o início do OAuth e remove states expirados', async () => {
    let currentTime = new Date('2026-01-01T00:00:00.000Z');
    const repository = new MemoryIdentityRepository({ now: () => currentTime });
    const service = createAuthService({
      repository,
      config: {
        ...baseConfig,
        discordClientId: 'client-id',
        discordClientSecret: 'client-secret',
        discordRedirectUri: 'http://localhost:3001/api/auth/discord/callback',
        oauthStartRateLimit: 2
      },
      now: () => currentTime
    });
    await repository.createOauthState({
      stateHash: hashOpaqueToken('estado-antigo'),
      codeVerifier: 'verificador-antigo',
      expiresAt: new Date(currentTime.getTime() + 1_000)
    });
    currentTime = new Date(currentTime.getTime() + 2_000);
    await service.beginDiscord({ ipAddress: '127.0.0.1' });
    await service.beginDiscord({ ipAddress: '127.0.0.1' });
    assert.equal(repository.oauthStates.size, 2);
    await assert.rejects(
      service.beginDiscord({ ipAddress: '127.0.0.1' }),
      error => error.code === 'RATE_LIMITED' && error.status === 429
    );
  });
});

describe('TLS do PostgreSQL', () => {
  test('mantém verificação de certificado mesmo contra parâmetros inseguros na URL', () => {
    const options = createDatabaseConnectionOptions(
      'postgresql://app:senha@db.example/nexus?sslmode=no-verify&ssl=0&uselibpqcompat=true',
      {
        databaseSsl: true,
        databaseCertificate: 'CERTIFICADO'
      }
    );
    assert.deepEqual(options.ssl, {
      rejectUnauthorized: true,
      ca: 'CERTIFICADO'
    });
    assert.equal(options.connectionString.includes('sslmode'), false);
    assert.equal(options.connectionString.includes('uselibpqcompat'), false);
    assert.equal(options.connectionString.includes('ssl='), false);
  });
});

describe('limpeza do repositório PostgreSQL', () => {
  test('remove OAuth states e tickets expirados antes de inserir novos registros', async () => {
    const statements = [];
    const repository = new PostgresIdentityRepository({
      async query(statement) {
        statements.push(String(statement).replace(/\s+/gu, ' ').trim());
        return { rows: [], rowCount: 1 };
      }
    });
    const expiresAt = new Date('2026-01-01T00:01:00.000Z');
    await repository.createOauthState({
      stateHash: hashOpaqueToken('novo-state'),
      codeVerifier: 'novo-verificador',
      expiresAt
    });
    await repository.createSocketTicket({
      tokenHash: hashOpaqueToken('novo-ticket'),
      playerId: '00000000-0000-0000-0000-000000000001',
      expiresAt
    });
    assert.match(statements[0], /delete from game\.oauth_states where expires_at <= now\(\)/u);
    assert.match(statements[2], /delete from game\.socket_tickets where expires_at <= now\(\)/u);
  });
});

describe('API HTTP Nexus', () => {
  test('registra, restaura sessão e salva Deck usando cookie HttpOnly e CSRF', async () => {
    const router = createApiRouter({
      config: baseConfig,
      repository: new MemoryIdentityRepository()
    });
    const origin = await startRouter(router);
    const registerResponse = await fetch(`${origin}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'http://localhost:4173',
        'X-Nexus-Request': 'browser'
      },
      body: JSON.stringify({
        name: 'Rainha Rubra',
        password: 'cofre-seguro-123'
      })
    });
    assert.equal(registerResponse.status, 201);
    const registration = await registerResponse.json();
    const setCookie = registerResponse.headers.get('set-cookie');
    assert.match(setCookie, /nexus_session=/u);
    assert.match(setCookie, /HttpOnly/u);
    assert.match(setCookie, /SameSite=Lax/u);
    assert.equal(registration.authenticated, true);

    const deckResponse = await fetch(`${origin}/api/deck`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieValue(setCookie),
        Origin: 'http://localhost:4173',
        'X-Nexus-Request': 'browser',
        'X-CSRF-Token': registration.csrfToken
      },
      body: JSON.stringify({ cardIds: DEFAULT_DECK_CARD_IDS })
    });
    assert.equal(deckResponse.status, 200);

    const sessionResponse = await fetch(`${origin}/api/auth/session`, {
      headers: { Cookie: cookieValue(setCookie) }
    });
    assert.equal(sessionResponse.status, 200);
    const restored = await sessionResponse.json();
    assert.equal(restored.player.name, 'Rainha Rubra');
    assert.deepEqual(restored.deckCardIds, DEFAULT_DECK_CARD_IDS);
    assert.equal(restored.csrfToken, registration.csrfToken);
  });

  test('recusa escrita de origem não autorizada', async () => {
    const router = createApiRouter({
      config: baseConfig,
      repository: new MemoryIdentityRepository()
    });
    const origin = await startRouter(router);
    const response = await fetch(`${origin}/api/auth/guest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://evil.example',
        'X-Nexus-Request': 'browser'
      },
      body: JSON.stringify({ name: 'Intruso' })
    });
    assert.equal(response.status, 403);
  });

  test('não permite fallback em memória em produção', () => {
    assert.throws(
      () => createApiRouter({ config: { ...baseConfig, nodeEnv: 'production' } }),
      /DATABASE_URL/u
    );
  });

  test('exige TLS verificado no PostgreSQL em produção', () => {
    const repository = new MemoryIdentityRepository();
    repository.storageKind = 'postgres';
    assert.throws(
      () => createApiRouter({
        config: {
          ...baseConfig,
          nodeEnv: 'production',
          clientOrigins: Object.freeze(['https://nexus.example']),
          publicClientUrl: 'https://nexus.example/',
          sessionCookieSecure: true,
          databaseSsl: false
        },
        repository
      }),
      /DATABASE_SSL=true/u
    );
  });

  test('mantém o callback do Discord no mesmo domínio público do jogo', () => {
    const repository = new MemoryIdentityRepository();
    repository.storageKind = 'postgres';
    assert.throws(
      () => createApiRouter({
        config: {
          ...baseConfig,
          nodeEnv: 'production',
          clientOrigins: Object.freeze(['https://nexus.example']),
          publicClientUrl: 'https://nexus.example/',
          sessionCookieSecure: true,
          databaseSsl: true,
          discordClientId: 'client-id',
          discordClientSecret: 'client-secret',
          discordRedirectUri: 'https://api.example/api/auth/discord/callback'
        },
        repository
      }),
      /mesmo domínio público/u
    );
  });
});
