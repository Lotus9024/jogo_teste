import { createServer } from 'node:http';
import { config } from './config.js';
import { databaseHealth, pool } from './database/pool.js';
import { RoomManager } from './game/roomManager.js';
import { createApiRouter } from './http/createApiRouter.js';
import { createSocketServer } from './realtime/createSocketServer.js';

const rooms = new RoomManager();
const initialDatabaseHealth = await databaseHealth();
if (config.nodeEnv === 'production' && !initialDatabaseHealth.connected) {
  throw new Error('PostgreSQL indisponível: o Nexus não inicia sessões em memória na produção.');
}
const api = createApiRouter({
  config,
  pool: initialDatabaseHealth.connected ? pool : null
});
const server = createServer(async (request, response) => {
  if (await api.handle(request, response)) return;

  const origin = request.headers.origin;
  if (origin && config.clientOrigins.includes(origin)) response.setHeader('Access-Control-Allow-Origin', origin);
  response.setHeader('Vary', 'Origin');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
  response.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (request.url === '/health') {
    response.writeHead(200);
    return response.end(JSON.stringify({ ok: true, service: 'nexus-server', database: await databaseHealth() }));
  }

  response.writeHead(404);
  response.end(JSON.stringify({ error: 'Not found' }));
});

createSocketServer(server, rooms, api.authService);
server.requestTimeout = 10_000;
server.headersTimeout = 12_000;
server.keepAliveTimeout = 5_000;
server.maxHeadersCount = 40;
server.listen(config.port, config.host, () => console.log(`Servidor HTTP/WebSocket em http://localhost:${config.port}`));
