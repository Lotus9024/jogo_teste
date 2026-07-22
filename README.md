# Tronos em Ruínas

Jogo de tabuleiro dark fantasy 3D para navegador. O repositório usa um monorepo com frontend Three.js, servidor WebSocket autoritativo e PostgreSQL.

## Organização do código

```text
apps/
  client/
    src/main.js                   # Ponto de composição; conecta os módulos
    src/core/                     # Runtime, cena, câmera e loop de renderização
    src/gameplay/                 # Interação, ações, habilidades e modo DEV
    src/network/                  # Socket e reconciliação da partida online
    src/ui/                       # Mão, baralho, configurações e templates DOM
      badges/                     # Badges 3D de vida e habilidades
      shell/                      # Templates do lobby, HUD, galeria e modal
    src/world/                    # Tabuleiro, castelos, ilha e ambiente
      terrain/                    # Geometria, materiais e detalhes do terreno
    src/assets/models/            # Uma fábrica por miniatura 3D
    src/styles/                   # Folhas por superfície; agregadores preservam a cascata
      cards/                      # Preview, base da mão e refinamentos
      game-ui/                    # HUD, comandos, painéis e interações
  server/
    src/game/gameEngine.js        # Fachada pública do motor autoritativo
    src/game/actions/             # Um handler por intenção do jogador
    src/game/                     # Combate, consultas, reino e ciclo de turno
    src/realtime/                 # Transporte e conexões WebSocket
    src/database/                 # Pool, migrations e segurança PostgreSQL
    test/                         # Suítes separadas por domínio da partida
    test-support/                 # Montagem compartilhada dos cenários de teste
packages/
  shared/src/cardCatalog.js       # Dados imutáveis das cartas
  shared/src/boardRules.js        # Regras puras de alcance e tabuleiro
  shared/src/kingdomEconomy.js    # Ruas, cidadãos e bônus do reino
  shared/src/cards.js             # Fachada compatível de exports públicos
  shared/src/gameConfig.js        # Configuração única da partida
  shared/src/protocol.js          # Contratos das mensagens online
```

`main.js`, `createWorld.js`, `createMagicTerrain.js`, `gameShell.js`, `unitHealthBadge.js`, `gameEngine.js` e `cards.js` são fachadas ou pontos de composição. Eles devem continuar pequenos: a implementação pertence ao módulo do domínio correspondente.

### Limites entre as camadas

- `packages/shared` não conhece DOM, Three.js, WebSocket nem banco. Ele concentra catálogo, configuração, protocolo e funções puras usadas pelos dois lados.
- `apps/server` é a autoridade da partida. Cada mensagem vira uma intenção em `game/actions`; consultas, combate, progressão e turnos permanecem separados.
- `apps/client/src/core` cria a infraestrutura visual. `gameplay` coordena as regras de interação; `ui` cuida do DOM; `world` monta a cena; `network` sincroniza o estado remoto.
- Controladores recebem dependências explicitamente. Ao adicionar um comportamento, prefira criar ou ampliar um controlador coeso em vez de voltar a concentrá-lo em `main.js`.
- `styles/cards.css` e `styles/game-ui.css` são apenas agregadores. A ordem dos `@import` faz parte da cascata e deve ser preservada.
- As ferramentas auxiliares em `local-tools` são independentes do runtime do jogo e não fazem parte desta organização.

O cliente nunca decide sozinho o resultado de movimentos, ataques, compras ou gastos de energia. Ele envia uma intenção; o servidor valida, altera o estado e transmite o novo estado aos jogadores.

### Onde implementar cada mudança

- Carta, custo ou atributo: `packages/shared/src/cardCatalog.js`.
- Alcance, coordenadas ou movimento: `packages/shared/src/boardRules.js` e validação autoritativa em `apps/server/src/game/actions`.
- Nova ação online: handler em `apps/server/src/game/actions`, contrato em `packages/shared/src/protocol.js` quando necessário e controlador em `apps/client/src/gameplay`.
- Miniatura: `apps/client/src/assets/models`; instanciação comum em `apps/client/src/models`.
- Elemento do HUD: template em `apps/client/src/ui/shell`, controlador em `apps/client/src/ui` e estilo na subpasta correspondente.
- Elemento permanente da cena: `apps/client/src/world`; detalhe específico da ilha em `world/terrain`.

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
- `npm test`: testes do cliente, regras compartilhadas, motor e salas.
- `npm run db:migrate`: aplica migrations pendentes.
- `npm run db:verify`: testa as restrições do papel usado pela aplicação.

Antes de considerar uma reorganização concluída, rode `npm test` e `npm run build`. Como o jogo usa WebGL, valide também lobby, DEV MODE, arraste de cartas, movimento, habilidades, configurações e redimensionamento diretamente no navegador.
