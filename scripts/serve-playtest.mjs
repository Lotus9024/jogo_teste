import { createServer } from 'node:http';

// A separate process and repository keep browser QA away from local accounts.
// Set these before dynamic imports: the WebSocket factory reads shared config.
Object.assign(process.env, {
  NODE_ENV: 'development',
  HOST: '127.0.0.1',
  PORT: '3099',
  CLIENT_ORIGIN: 'http://localhost:4174,http://127.0.0.1:4174',
  PUBLIC_CLIENT_URL: 'http://localhost:4174/',
  TRUST_PROXY: 'false',
  SESSION_COOKIE_SECURE: 'false',
  SESSION_TTL_HOURS: '168',
  SOCKET_TICKET_TTL_SECONDS: '30',
  SOCKET_TICKET_RATE_LIMIT: '20',
  SOCKET_TICKET_RATE_WINDOW_SECONDS: '60',
  OAUTH_STATE_TTL_SECONDS: '600',
  OAUTH_START_RATE_LIMIT: '10',
  OAUTH_START_RATE_WINDOW_SECONDS: '900',
  DATABASE_URL: '',
  MIGRATION_DATABASE_URL: '',
  DATABASE_SSL: 'false',
  DATABASE_CERTIFICATE_BASE64: '',
  DISCORD_CLIENT_ID: '',
  DISCORD_CLIENT_SECRET: '',
  DISCORD_REDIRECT_URI: '',
  LOCAL_AUTH_FILE: '',
});

const [configuration, identity, routing, realtime, game] = await Promise.all([
  import('../apps/server/src/config.js'),
  import('../apps/server/src/auth/memoryIdentityRepository.js'),
  import('../apps/server/src/http/createApiRouter.js'),
  import('../apps/server/src/realtime/createSocketServer.js'),
  import('../apps/server/src/game/roomManager.js'),
]);

const repository = new identity.MemoryIdentityRepository();
const api = routing.createApiRouter({ config: configuration.config, repository });
const rooms = new game.RoomManager();
const server = createServer(async (request, response) => {
  try {
    if (await api.handle(request, response)) return;
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.setHeader('Cache-Control', 'no-store');
    if (request.url === '/health') {
      response.writeHead(200);
      response.end(JSON.stringify({ ok: true, service: 'nexus-playtest', storage: 'memory' }));
      return;
    }
    response.writeHead(404);
    response.end(JSON.stringify({ error: 'Not found' }));
  } catch {
    if (response.headersSent) response.destroy();
    else {
      response.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      response.end(JSON.stringify({ error: 'Falha no servidor de playtest.' }));
    }
  }
});
const websocket = realtime.createSocketServer(server, rooms, api.authService);
server.requestTimeout = 10_000;
server.headersTimeout = 12_000;
server.keepAliveTimeout = 5_000;
server.maxHeadersCount = 40;

function shutdown() {
  for (const socket of websocket.clients) socket.terminate();
  websocket.close();
  server.close();
  server.closeIdleConnections();
}
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);

try {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(3099, '127.0.0.1', resolve);
  });
  console.log('Playtest em memória: http://localhost:3099 · WebSocket /ws · frontend permitido :4174.');
  console.log('Contas e salas temporárias desaparecem ao encerrar este processo.');
} catch {
  console.error('Não foi possível iniciar o playtest em 127.0.0.1:3099. Verifique se a porta está livre.');
  shutdown();
  process.exitCode = 1;
}
