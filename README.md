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

O Windows local usa um cluster isolado em `127.0.0.1:55432`. As credenciais ficam em `apps/server/.env`, que é ignorado pelo Git.

```bash
npm run db:start
npm run db:provision
npm run db:migrate
npm run db:verify
```

O Docker Compose permanece disponível como alternativa. Consulte `SECURITY.md` antes de alterar papéis ou permissões.

## Comandos

- `npm run dev`: cliente e servidor juntos.
- `npm run dev:client`: somente o frontend.
- `npm run dev:server`: somente o backend.
- `npm run build`: valida todos os workspaces e gera o cliente.
- `npm test`: testes do protocolo e das salas.
- `npm run db:migrate`: aplica migrations pendentes.
- `npm run db:verify`: testa as restrições do papel usado pela aplicação.
