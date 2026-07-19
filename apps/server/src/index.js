import { createServer } from 'node:http';
import { config } from './config.js';
import { databaseHealth } from './database/pool.js';
import { RoomManager } from './game/roomManager.js';
import { createSocketServer } from './realtime/createSocketServer.js';

const rooms = new RoomManager();
const server = createServer(async (request, response) => {
  response.setHeader('Access-Control-Allow-Origin', config.clientOrigin);
  response.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (request.url === '/health') {
    response.writeHead(200);
    return response.end(JSON.stringify({ ok: true, service: 'tronos-server', database: await databaseHealth() }));
  }

  response.writeHead(404);
  response.end(JSON.stringify({ error: 'Not found' }));
});

createSocketServer(server, rooms);
server.listen(config.port, config.host, () => console.log(`Servidor HTTP/WebSocket em http://localhost:${config.port}`));
