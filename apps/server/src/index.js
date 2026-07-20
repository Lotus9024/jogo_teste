import { createServer } from 'node:http';
import { config } from './config.js';
import { databaseHealth } from './database/pool.js';
import { RoomManager } from './game/roomManager.js';
import { createSocketServer } from './realtime/createSocketServer.js';

const rooms = new RoomManager();
const server = createServer(async (request, response) => {
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
    return response.end(JSON.stringify({ ok: true, service: 'tronos-server', database: await databaseHealth() }));
  }

  response.writeHead(404);
  response.end(JSON.stringify({ error: 'Not found' }));
});

createSocketServer(server, rooms);
server.requestTimeout = 10_000;
server.headersTimeout = 12_000;
server.keepAliveTimeout = 5_000;
server.maxHeadersCount = 40;
server.listen(config.port, config.host, () => console.log(`Servidor HTTP/WebSocket em http://localhost:${config.port}`));
