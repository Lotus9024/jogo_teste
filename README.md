# Tronos em Ruínas

Jogo de tabuleiro dark fantasy 3D para navegador. O repositório usa um monorepo com frontend Three.js, servidor WebSocket autoritativo e PostgreSQL.

## Estrutura

```text
apps/
  client/                 # Vite, Three.js e HUD 2D
    src/network/          # Cliente WebSocket
  server/                 # HTTP, WebSocket e regras autoritativas
    src/database/         # Pool PostgreSQL e migrations
    src/game/             # Estado e regras das partidas
    src/realtime/         # Protocolo e conexões WebSocket
packages/
  shared/                 # Eventos e configurações usados pelos dois lados
```

O cliente nunca deve decidir sozinho o resultado de movimentos, ataques, compras ou gastos de energia. Ele envia uma intenção; o servidor valida, altera o estado e transmite o novo estado aos jogadores.

## Desenvolvimento local

```bash
npm ci
npm run dev
```

- Cliente: `http://localhost:4173`
- Servidor e health check: `http://localhost:3001/health`
- WebSocket: `ws://localhost:3001/ws`

## PostgreSQL

Para iniciar o banco local com Docker:

```bash
docker compose up -d postgres
copy apps\server\.env.example apps\server\.env
npm run db:migrate
```

O servidor pode iniciar sem PostgreSQL durante o desenvolvimento visual. O endpoint `/health` informa se o banco está configurado e conectado.

## Comandos

- `npm run dev`: cliente e servidor juntos.
- `npm run dev:client`: somente o frontend.
- `npm run dev:server`: somente o backend.
- `npm run build`: valida todos os workspaces e gera o cliente.
- `npm test`: testes do protocolo e das salas.
- `npm run db:migrate`: aplica migrations pendentes.
