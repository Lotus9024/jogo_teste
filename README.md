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

Abra o cliente em duas abas. Na primeira, escolha **Criar sala**; na segunda, informe o código de seis caracteres e escolha **Entrar**. Cada jogador vê o próprio castelo na parte inferior: o assento azul permanece azul e o vermelho permanece vermelho, enquanto a câmera e os lados do campo são invertidos para o segundo jogador.

## Partida online atual

- Mão inicial de 5 cartas, limite de 7 e compra automática no início do turno.
- Guerreiro, Guarda e Arqueiro com vida, dano, movimento, alcance, energia, habilidade e instantânea.
- Invocação por arrastar, movimento destacado no grid, ataques a unidades e castelos e uma ação por unidade/turno.
- Turnos alternados de 3 minutos, energia inicial 10, recuperação +4 e limite 12.
- Vitória quando o castelo adversário chega a zero dos 20 HP.

O estado decisivo vive somente no servidor. A interface pode prever o destino de um arraste, mas energia, alcance, turno, propriedade, dano, compra e vitória sempre são recalculados e validados pelo backend.

## DEV MODE

O botão **DEV MODE** no menu abre uma mesa local livre para testar cartas e miniaturas sem criar sala. É possível comprar no baralho 3D, invocar em qualquer casa livre, visualizar movimentos válidos em azul e atacar unidades destacadas em vermelho arrastando uma tropa sobre o alvo.

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
