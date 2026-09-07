import {
  parseCookies,
  cookieName,
  sessionTokenFrom,
  csrfTokenFrom,
  sessionCookie,
  clearSessionCookie,
  oauthCookie,
  clearOauthCookie,
  callbackRedirect
} from './cookies.js';
import { sendJson, sendRedirect, readJson } from './jsonTransport.js';
import { clientIp, requireTrustedWrite } from './requestPolicy.js';
/** Route handlers own use cases; the router owns HTTP policy and error translation. */
export function createApiRoutes({ config, authService }) {
  return new Map([
    ['POST /api/auth/guest', async (request, response) => {
      requireTrustedWrite(request, config);
      const body = await readJson(request);
      const session = await authService.createGuest({
        name: body.name,
        ipAddress: clientIp(request, config)
      });
      sendJson(response, 201, session.response, { 'Set-Cookie': sessionCookie(config, session) });
    }],
    ['POST /api/auth/register', async (request, response) => {
      requireTrustedWrite(request, config);
      const body = await readJson(request);
      const session = await authService.register({
        name: body.name,
        password: body.password,
        ipAddress: clientIp(request, config)
      });
      sendJson(response, 201, session.response, { 'Set-Cookie': sessionCookie(config, session) });
    }],
    ['POST /api/auth/login', async (request, response) => {
      requireTrustedWrite(request, config);
      const body = await readJson(request);
      const session = await authService.login({
        name: body.name,
        password: body.password,
        ipAddress: clientIp(request, config)
      });
      sendJson(response, 200, session.response, { 'Set-Cookie': sessionCookie(config, session) });
    }],
    ['GET /api/auth/session', async (request, response) => {
      const { response: payload } = await authService.sessionResponse(
        sessionTokenFrom(request, config)
      );
      sendJson(response, 200, payload);
    }],
    ['POST /api/auth/logout', async (request, response) => {
      requireTrustedWrite(request, config);
      await authService.logout({
        sessionToken: sessionTokenFrom(request, config),
        csrfToken: csrfTokenFrom(request)
      });
      sendJson(response, 200, { authenticated: false }, { 'Set-Cookie': clearSessionCookie(config) });
    }],
    ['GET /api/deck', async (request, response) => {
      const cardIds = await authService.readDeck({
        sessionToken: sessionTokenFrom(request, config)
      });
      sendJson(response, 200, { cardIds });
    }],
    ['PUT /api/deck', async (request, response) => {
      requireTrustedWrite(request, config);
      const body = await readJson(request);
      const cardIds = await authService.saveDeck({
        sessionToken: sessionTokenFrom(request, config),
        csrfToken: csrfTokenFrom(request),
        cardIds: body.cardIds
      });
      sendJson(response, 200, { cardIds });
    }],
    ['POST /api/auth/socket-ticket', async (request, response) => {
      requireTrustedWrite(request, config);
      const ticket = await authService.createSocketTicket({
        sessionToken: sessionTokenFrom(request, config),
        csrfToken: csrfTokenFrom(request)
      });
      sendJson(response, 201, { ticket });
    }],
    ['GET /api/auth/discord/start', async (request, response) => {
      const oauth = await authService.beginDiscord({
        ipAddress: clientIp(request, config)
      });
      sendRedirect(response, oauth.authorizationUrl, { 'Set-Cookie': oauthCookie(config, oauth.state) });
    }],
    ['GET /api/auth/discord/callback', async (request, response, url) => {
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
    }]
  ]);
}
