import test from 'node:test';
import assert from 'node:assert/strict';
import { NexusApi, resolveApiBase } from './nexusApi.js';
import { lobbyTemplate } from '../ui/shell/lobbyTemplate.js';

function jsonResponse(status, payload) {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => payload,
  };
}

test('Jogar com IA permanece desativado enquanto o modo não está disponível', () => {
  const html = lobbyTemplate();
  assert.match(html, /id="play-ai"[^>]*disabled/u);
  assert.match(html, /id="play-ai"[^>]*aria-disabled="true"/u);
});

test('a API usa o backend local somente em endereços locais', () => {
  assert.equal(resolveApiBase({ hostname: '127.0.0.1' }), 'http://127.0.0.1:3001/api');
  assert.equal(resolveApiBase({ hostname: '192.168.1.20' }), 'http://192.168.1.20:3001/api');
  assert.equal(resolveApiBase({ hostname: 'nexus.example' }), '/api');
});

test('o token CSRF fica apenas em memória e protege alterações autenticadas', async () => {
  const calls = [];
  const api = new NexusApi({
    baseUrl: '/api',
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      if (url.endsWith('/auth/login')) {
        return jsonResponse(200, {
          authenticated: true,
          csrfToken: 'csrf-seguro',
          player: { name: 'Rainha' },
          deckCardIds: [],
        });
      }
      return jsonResponse(200, { ticket: 'ticket-curto' });
    },
  });
  await api.login('Rainha', 'senha-segura');
  assert.equal(await api.createSocketTicket(), 'ticket-curto');
  assert.equal(calls[1].options.headers['X-CSRF-Token'], 'csrf-seguro');
  assert.equal(calls[1].options.credentials, 'include');
});

test('restaurar sessão aceita resposta 401 sem expor erro', async () => {
  const api = new NexusApi({
    fetchImpl: async () => jsonResponse(401, { message: 'Não autenticado' }),
  });
  assert.deepEqual(await api.restoreSession(), { authenticated: false });
});
