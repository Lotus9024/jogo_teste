import { createAuthService, AuthError } from '../auth/authService.js';
import { createIdentityRepository } from '../auth/createIdentityRepository.js';
import { ValidationError } from '../auth/validation.js';

const MAX_JSON_BYTES = 16 * 1024;
const JSON_CONTENT_TYPE = 'application/json; charset=utf-8';

function parseCookies(header) {
  const cookies = Object.create(null);
  for (const part of String(header ?? '').split(';')) {
    const separator = part.indexOf('=');
    if (separator <= 0) continue;
    const name = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (name && !Object.hasOwn(cookies, name)) cookies[name] = value;
  }
  return cookies;
}

function cookieName(config, purpose) {
  const prefix = config.sessionCookieSecure ? '__Host-' : '';
  return `${prefix}nexus_${purpose}`;
}

function serializeCookie(name, value, {
  maxAge,
  httpOnly = true,
  secure = false,
  sameSite = 'Lax'
} = {}) {
  const attributes = [
    `${name}=${value}`,
    'Path=/',
    `SameSite=${sameSite}`
  ];
  if (httpOnly) attributes.push('HttpOnly');
  if (secure) attributes.push('Secure');
  if (Number.isFinite(maxAge)) attributes.push(`Max-Age=${Math.max(0, Math.floor(maxAge))}`);
  return attributes.join('; ');
}

function setApiHeaders(response, request, config) {
  const origin = request.headers.origin;
  if (origin && config.clientOrigins.includes(origin)) {
    response.setHeader('Access-Control-Allow-Origin', origin);
    response.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  response.setHeader('Vary', 'Origin');
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Pragma', 'no-cache');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
  if (config.sessionCookieSecure) {
    response.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  response.setHeader('Content-Type', JSON_CONTENT_TYPE);
}

function sendJson(response, status, payload, extraHeaders = {}) {
  for (const [name, value] of Object.entries(extraHeaders)) response.setHeader(name, value);
  response.writeHead(status);
  response.end(JSON.stringify(payload));
}

function sendRedirect(response, location, extraHeaders = {}) {
  for (const [name, value] of Object.entries(extraHeaders)) response.setHeader(name, value);
  response.removeHeader('Content-Type');
  response.writeHead(302, { Location: location });
  response.end();
}

function clientIp(request, config) {
  if (config.trustProxy) {
    const forwarded = String(request.headers['x-forwarded-for'] ?? '').split(',')[0].trim();
    if (forwarded && forwarded.length <= 64) return forwarded;
  }
  return String(request.socket?.remoteAddress ?? 'unknown').slice(0, 64);
}

async function readJson(request) {
  const contentType = String(request.headers['content-type'] ?? '').toLowerCase();
  if (!/^application\/json(?:\s*;|$)/u.test(contentType)) {
    throw new AuthError('Envie os dados em JSON.', { code: 'UNSUPPORTED_MEDIA_TYPE', status: 415 });
  }
  const declaredLength = Number(request.headers['content-length'] ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_JSON_BYTES) {
    throw new AuthError('Solicitação muito grande.', { code: 'PAYLOAD_TOO_LARGE', status: 413 });
  }
  const chunks = [];
  let bytes = 0;
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes > MAX_JSON_BYTES) {
      throw new AuthError('Solicitação muito grande.', { code: 'PAYLOAD_TOO_LARGE', status: 413 });
    }
    chunks.push(chunk);
  }
  try {
    const payload = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error();
    return payload;
  } catch {
    throw new AuthError('JSON inválido.', { code: 'INVALID_JSON', status: 400 });
  }
}

function requireTrustedWrite(request, config) {
  const origin = request.headers.origin;
  const hasTrustedOrigin = typeof origin === 'string' && config.clientOrigins.includes(origin);
  const localTestRequest = config.nodeEnv !== 'production' && !origin;
  if ((!hasTrustedOrigin && !localTestRequest) || request.headers['x-nexus-request'] !== 'browser') {
    throw new AuthError('Solicitação inválida.', { code: 'FORBIDDEN', status: 403 });
  }
}

function sessionTokenFrom(request, config) {
  return parseCookies(request.headers.cookie)[cookieName(config, 'session')] ?? '';
}

function csrfTokenFrom(request) {
  return String(request.headers['x-csrf-token'] ?? '');
}

function sessionCookie(config, session) {
  return serializeCookie(cookieName(config, 'session'), session.sessionToken, {
    maxAge: Math.max(1, Math.round((session.expiresAt.getTime() - Date.now()) / 1000)),
    secure: config.sessionCookieSecure
  });
}

function clearSessionCookie(config) {
  return serializeCookie(cookieName(config, 'session'), '', {
    maxAge: 0,
    secure: config.sessionCookieSecure
  });
}

function oauthCookie(config, state) {
  return serializeCookie(cookieName(config, 'oauth'), state, {
    maxAge: config.oauthStateTtlSeconds,
    secure: config.sessionCookieSecure
  });
}

function clearOauthCookie(config) {
  return serializeCookie(cookieName(config, 'oauth'), '', {
    maxAge: 0,
    secure: config.sessionCookieSecure
  });
}

function callbackRedirect(config, success) {
  const url = new URL(config.publicClientUrl);
  url.searchParams.set(success ? 'auth' : 'authError', 'discord');
  return url.toString();
}

function validateRuntimeSecurity(config, repository) {
  if (config.nodeEnv !== 'production') return;
  if (repository.storageKind !== 'postgres') throw new Error('PostgreSQL é obrigatório em produção.');
  if (!config.databaseSsl) throw new Error('DATABASE_SSL=true é obrigatório em produção.');
  if (!config.sessionCookieSecure) throw new Error('Cookies seguros são obrigatórios em produção.');
  if (!config.clientOrigins.length) throw new Error('CLIENT_ORIGIN é obrigatória em produção.');
  let clientUrl;
  try {
    clientUrl = new URL(config.publicClientUrl);
  } catch {
    throw new Error('PUBLIC_CLIENT_URL é obrigatória em produção.');
  }
  if (clientUrl.protocol !== 'https:' || !config.clientOrigins.includes(clientUrl.origin)) {
    throw new Error('PUBLIC_CLIENT_URL deve usar HTTPS e estar em CLIENT_ORIGIN.');
  }
  if (config.discordRedirectUri) {
    let discordRedirectUrl;
    try {
      discordRedirectUrl = new URL(config.discordRedirectUri);
    } catch {
      throw new Error('DISCORD_REDIRECT_URI é inválida.');
    }
    if (
      discordRedirectUrl.protocol !== 'https:'
      || discordRedirectUrl.origin !== clientUrl.origin
      || discordRedirectUrl.pathname !== '/api/auth/discord/callback'
    ) {
      throw new Error(
        'DISCORD_REDIRECT_URI deve usar o mesmo domínio público do jogo e o caminho /api/auth/discord/callback.'
      );
    }
  }
}

export function createApiRouter({
  config,
  pool = null,
  repository = createIdentityRepository({ pool, config }),
  fetchImpl = globalThis.fetch
}) {
  validateRuntimeSecurity(config, repository);
  const authService = createAuthService({ repository, config, fetchImpl });

  async function handle(request, response) {
    const url = new URL(request.url, 'http://nexus.internal');
    if (!url.pathname.startsWith('/api/')) return false;
    setApiHeaders(response, request, config);

    try {
      const origin = request.headers.origin;
      if (origin && !config.clientOrigins.includes(origin)) {
        throw new AuthError('Origem não permitida.', { code: 'FORBIDDEN', status: 403 });
      }

      if (request.method === 'OPTIONS') {
        if (!origin || !config.clientOrigins.includes(origin)) {
          throw new AuthError('Origem não permitida.', { code: 'FORBIDDEN', status: 403 });
        }
        response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
        response.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Nexus-Request, X-CSRF-Token');
        response.setHeader('Access-Control-Max-Age', '600');
        response.writeHead(204);
        response.end();
        return true;
      }

      if (request.method === 'POST' && url.pathname === '/api/auth/guest') {
        requireTrustedWrite(request, config);
        const body = await readJson(request);
        const session = await authService.createGuest({
          name: body.name,
          ipAddress: clientIp(request, config)
        });
        sendJson(response, 201, session.response, { 'Set-Cookie': sessionCookie(config, session) });
        return true;
      }

      if (request.method === 'POST' && url.pathname === '/api/auth/register') {
        requireTrustedWrite(request, config);
        const body = await readJson(request);
        const session = await authService.register({
          name: body.name,
          password: body.password,
          ipAddress: clientIp(request, config)
        });
        sendJson(response, 201, session.response, { 'Set-Cookie': sessionCookie(config, session) });
        return true;
      }

      if (request.method === 'POST' && url.pathname === '/api/auth/login') {
        requireTrustedWrite(request, config);
        const body = await readJson(request);
        const session = await authService.login({
          name: body.name,
          password: body.password,
          ipAddress: clientIp(request, config)
        });
        sendJson(response, 200, session.response, { 'Set-Cookie': sessionCookie(config, session) });
        return true;
      }

      if (request.method === 'GET' && url.pathname === '/api/auth/session') {
        const { response: payload } = await authService.sessionResponse(
          sessionTokenFrom(request, config)
        );
        sendJson(response, 200, payload);
        return true;
      }

      if (request.method === 'POST' && url.pathname === '/api/auth/logout') {
        requireTrustedWrite(request, config);
        await authService.logout({
          sessionToken: sessionTokenFrom(request, config),
          csrfToken: csrfTokenFrom(request)
        });
        sendJson(response, 200, { authenticated: false }, { 'Set-Cookie': clearSessionCookie(config) });
        return true;
      }

      if (request.method === 'GET' && url.pathname === '/api/deck') {
        const cardIds = await authService.readDeck({
          sessionToken: sessionTokenFrom(request, config)
        });
        sendJson(response, 200, { cardIds });
        return true;
      }

      if (request.method === 'PUT' && url.pathname === '/api/deck') {
        requireTrustedWrite(request, config);
        const body = await readJson(request);
        const cardIds = await authService.saveDeck({
          sessionToken: sessionTokenFrom(request, config),
          csrfToken: csrfTokenFrom(request),
          cardIds: body.cardIds
        });
        sendJson(response, 200, { cardIds });
        return true;
      }

      if (request.method === 'POST' && url.pathname === '/api/auth/socket-ticket') {
        requireTrustedWrite(request, config);
        const ticket = await authService.createSocketTicket({
          sessionToken: sessionTokenFrom(request, config),
          csrfToken: csrfTokenFrom(request)
        });
        sendJson(response, 201, { ticket });
        return true;
      }

      if (request.method === 'GET' && url.pathname === '/api/auth/discord/start') {
        const oauth = await authService.beginDiscord({
          ipAddress: clientIp(request, config)
        });
        sendRedirect(response, oauth.authorizationUrl, { 'Set-Cookie': oauthCookie(config, oauth.state) });
        return true;
      }

      if (request.method === 'GET' && url.pathname === '/api/auth/discord/callback') {
        try {
          const cookies = parseCookies(request.headers.cookie);
          const session = await authService.finishDiscord({
            code: url.searchParams.get('code'),
            state: url.searchParams.get('state'),
            cookieState: cookies[cookieName(config, 'oauth')],
            ipAddress: clientIp(request, config)
          });
          sendRedirect(response, callbackRedirect(config, true), {
            'Set-Cookie': [
              sessionCookie(config, session),
              clearOauthCookie(config)
            ]
          });
        } catch {
          sendRedirect(response, callbackRedirect(config, false), {
            'Set-Cookie': clearOauthCookie(config)
          });
        }
        return true;
      }

      sendJson(response, 404, { error: 'Rota não encontrada.', message: 'Rota não encontrada.', code: 'NOT_FOUND' });
      return true;
    } catch (error) {
      if (error instanceof AuthError || error instanceof ValidationError) {
        const status = error.status ?? 400;
        sendJson(response, status, { error: error.message, message: error.message, code: error.code });
        return true;
      }
      console.error('Falha na API Nexus:', error?.message ?? 'erro desconhecido');
      sendJson(response, 500, {
        error: 'Não foi possível concluir a solicitação.',
        message: 'Não foi possível concluir a solicitação.',
        code: 'INTERNAL_ERROR'
      });
      return true;
    }
  }

  return Object.freeze({ handle, authService, repository });
}
