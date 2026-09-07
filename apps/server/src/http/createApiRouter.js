import { createAuthService, AuthError } from '../auth/authService.js';
import { createIdentityRepository } from '../auth/createIdentityRepository.js';
import { ValidationError } from '../auth/validation.js';

import { createApiRoutes } from './apiRoutes.js';
import { setApiHeaders, sendJson } from './jsonTransport.js';
import { validateRuntimeSecurity } from './requestPolicy.js';

export function createApiRouter({
  config,
  pool = null,
  repository = createIdentityRepository({ pool, config }),
  fetchImpl = globalThis.fetch
}) {
  validateRuntimeSecurity(config, repository);
  const authService = createAuthService({ repository, config, fetchImpl });
  const routes = createApiRoutes({ config, authService });

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

      const route = routes.get(`${request.method} ${url.pathname}`);
      if (route) {
        await route(request, response, url);
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
