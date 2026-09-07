# Arquitetura

[Início](../README.md) · [Desenvolvimento](DESENVOLVIMENTO.md) · [Revisão das regras](REVISAO-DAS-REGRAS.md)

## Visão do sistema

O projeto é um monorepo JavaScript ESM com npm workspaces. O navegador renderiza a mesa em Three.js, apresenta os menus em DOM e envia intenções ao servidor. O servidor Node.js executa autenticação HTTP e partidas WebSocket. `packages/shared` contém os dados e as funções puras consumidas pelos dois lados.

```text
Navegador
  UI / ponteiro → controlador → intenção + versão esperada
  ↑                                     ↓ WebSocket
  reconciliação ← estado público + mão ← motor autoritativo
                                        ↑
                         transporte → identidade → sala

HTTP /api → serviço de autenticação → repositório de identidade
                                      ├─ PostgreSQL (produção)
                                      ├─ arquivo local (desenvolvimento)
                                      └─ memória (testes / configuração)
```

**Persistência de identidade e persistência de partida são coisas diferentes.** O `RoomManager` mantém salas e estados em um `Map` na memória. O repositório de identidade armazena contas, sessões, tickets, vínculos de autenticação e Decks. A presença de tabelas de jogo em migrations não significa que o motor esteja persistindo suas ações nessas tabelas.

## Contrato entre camadas

| Camada | Responsabilidade | Dependências que deve evitar |
| --- | --- | --- |
| `packages/shared` | Configuração, catálogo, cotas, protocolo e consultas puras | DOM, Three.js, WebSocket, banco e variáveis secretas |
| `server/game` | Validar e executar regras, economia, combate e turnos | DOM, objetos Three.js e decisões visuais |
| `server/realtime` | Autenticar o socket, ordenar mensagens e publicar estados | Reimplementar regras de cartas |
| `server/http` e `server/auth` | Contrato HTTP, identidade, sessão e autorização | Estado visual do navegador |
| `client/network` | Enviar intenções e reconciliar o estado recebido | Decidir dano, compras ou energia online |
| `client/gameplay` | Seleção, prévias e coordenação das interações | Acessar o banco ou aceitar a prévia como resultado online |
| `client/ui` | Menus, HUD, cartas e modais acessíveis no DOM | Criar autoridade paralela sobre a partida |
| `client/core`, `world`, `models` | Câmera, renderização, ambiente e miniaturas | Mutar as regras de servidor |

O modo DEV possui simulação local para testes visuais. Essa simulação não é a autoridade das partidas online e pode divergir em interações; correções de regra precisam começar pela implementação e pelos testes autoritativos.

## Mapa dos módulos compartilhados

| Módulo | Conteúdo |
| --- | --- |
| `gameConfig.js` | Tamanho de campo, energia, mão, prazos e evolução do castelo |
| `cardCatalog.js` | Definições imutáveis das 26 cartas |
| `cardCosts.js` | Descontos, elegibilidade Real/Goblin e vida de nascimento |
| `boardRules.js` | Distâncias, casas de castelo, orientação, lançamento e linha direta |
| `kingdomEconomy.js` | Rede de estradas, cidadãos e bônus de terreno |
| `deckRules.js` | Cotas por raridade, normalização e validação do Deck |
| `protocol.js` | Tipos de eventos, envelope e limites de mensagem |
| `cards.js` | Fachada pública de compatibilidade, reexportando os módulos de cartas |

Uma mudança de valor impresso pertence ao catálogo. Uma função pura de alcance pertence às regras compartilhadas. A permissão de executar uma ação continua sendo conferida pelo servidor mesmo que o cliente importe a mesma função.

## Servidor

### Composição e transporte

`src/index.js` carrega a configuração, verifica o banco, cria o roteador HTTP, o gerenciador de salas e o servidor WebSocket. Não deve acumular regras de partida.

O HTTP está dividido em:

- `http/createApiRouter.js`: composição e despacho;
- `http/apiRoutes.js`: operações de autenticação, Deck e ticket;
- `http/cookies.js`: nomes e serialização dos cookies;
- `http/jsonTransport.js`: leitura limitada de JSON e respostas;
- `http/requestPolicy.js`: política de origem, escrita e segurança do ambiente.

O WebSocket está dividido em:

- `realtime/createSocketServer.js`: conexão, limites, heartbeat, fila por socket e temporizadores;
- `realtime/handleClientMessage.js`: despacho dos eventos;
- `realtime/socketValidation.js`: validação dos dados de identidade e ticket;
- `realtime/roomState.js`: representação pública e privada do estado;
- `realtime/roomBroadcast.js`: envio do estado e diretório às conexões.

### Salas

`game/roomManager.js` cria salas, insere participantes, reconecta identidades, registra espectadores e controla saída, W.O. e tick. `roomPolicy.js` concentra normalização e validação de códigos, nomes, identidades e capacidade; `roomDirectory.js` projeta os dados da listagem.

Salas aceitam 2, 3 ou 4 participantes; `GAME_CONFIG.maxPlayers = 2` é o padrão, apesar do nome sugerir um máximo rígido. O bot interno apenas passa o turno e não é um adversário tático. A UI mantém essa opção indisponível.

### Motor de partida

| Módulo | Responsabilidade |
| --- | --- |
| `gameEngine.js` | Fachada de ações, versão do estado, efeitos e expiração |
| `createInitialState.js` | Estado inicial, sorteio e compra de cartas |
| `gameQueries.js` | Jogador, coordenadas, ocupação, área de reino e índice de turno |
| `actions/index.js` | Registro de intenções permitidas |
| `actions/summonAction.js` | Validação e lançamento de cartas |
| `actions/moveAction.js` | Movimento e deslocamento conjunto de Canhão/Operador |
| `actions/attackAction.js` | Ataques a peças/bases/casas e fogo do Mago |
| `actions/abilityAction.js` | Habilidades normais, instantâneas e reforço Goblin |
| `actions/discardAction.js` | Descarte voluntário |
| `actions/deckChoiceAction.js` | Escolha pendente do Altar Mago |
| `combat.js` | Dano, remoção, montagem em torre, bloqueios, fogo e disparos |
| `battleEffects.js` | Bênçãos reais, Nevasca e eventos de animação |
| `kingdomEffects.js` | Desordem, Área de construtor e requisitos no reino |
| `kingdomProgress.js` | Cidadãos, níveis, limites e recuperação de construções |
| `turnLifecycle.js` | Passagem de turno e efeitos de início/fim |

`effects` é uma lista transitória para apresentação. Ela não é um histórico durável nem um replay da partida. Os testes montam estados sintéticos em `test-support/match.js` e validam domínios em `test/`.

### Fluxo de uma ação online

1. O navegador envia um evento `game:action` com a intenção e a versão conhecida.
2. O transporte associa a conexão à identidade, à sala e ao papel de participante.
3. O `RoomManager` encontra a sala e encaminha a ação ao motor.
4. O motor exige versão atual e um tipo registrado; o handler valida propriedade, fase, turno, coordenadas, requisitos e recursos aplicáveis.
5. O handler altera o estado da partida. O motor recalcula o reino e incrementa a versão.
6. O servidor publica a projeção do estado: todos recebem o campo e contagens; cada participante recebe sua própria mão. Espectadores não recebem mãos particulares.
7. O cliente reconcilia peças, cartas, recursos, efeitos e relógio. Uma intenção rejeitada gera erro e não autoriza a interface a efetivar o resultado por conta própria.

O motor **muta o estado em memória**. Ele não é uma transação geral com rollback de todos os campos; restaura os efeitos quando um handler falha. Ao introduzir novos handlers, valide completamente antes de mutar, ou implemente transações explícitas com testes que cubram rejeições após operações parciais.

### Estado e tempo

O estado contém `version`, `phase`, `round`, `activeSeat`, prazo do turno, vencedor, jogadores, unidades, estradas e efeitos temporários. Jogadores mantêm energia, vida, cidadãos, nível, mão e metadados de compra. Peças mantêm posição, dono, vida, ação usada, recargas e efeitos.

Há três escalas de tempo que não devem ser confundidas:

- **tempo real**: prazo do turno e prazo de desconexão;
- **rodada**: conclusão de obras e recuperação em rodadas pares;
- **índice global de turno**: recargas e vários efeitos de cartas.

Nevasca também mantém uma duração por turnos do dono da unidade. As diferenças semânticas e o caso de Enxame estão na revisão das regras.

## Cliente

`src/main.js` compõe controladores e conecta callbacks. A infraestrutura compartilhada nasce em `core/createGameRuntime.js` e `core/createGameScene.js`; o loop de renderização pertence a `core/createRenderLoop.js`.

| Diretório | Conteúdo |
| --- | --- |
| `core/` | Renderer, luzes, câmera, céu, qualidade e loop |
| `world/` | Campo, castelos, baralhos físicos, ilha e ambientação |
| `world/terrain/` | Geometria, texturas e detalhes do terreno |
| `assets/models/` | Fábricas procedurais das miniaturas e efeitos |
| `models/` | Instanciação comum, estados de construção e montagem |
| `gameplay/` | Coordenadas, seleção, arraste, prévias, animações e modo local |
| `network/` | API Nexus, socket e reconciliação da partida |
| `ui/` | Cartas, Deck, HUD, configurações, apresentação de vitória e lobby |
| `ui/lobby/` | Validação de formulários e apresentação da listagem de salas |
| `ui/shell/` | Templates DOM das superfícies principais |
| `ui/badges/` | Indicadores 3D de vida e habilidades |
| `styles/` | CSS por superfície e agregadores que preservam a cascata |

O manual navegável usa `guide.html` como entrada separada de build e renderiza a documentação do repositório. Conteúdo de jogador pertence a `docs/`; não mantenha uma segunda cópia textual escondida nos templates do jogo.

Ao criar uma peça 3D, mantenha coordenadas de jogo independentes da altura da miniatura. Reutilize materiais e geometrias quando adequado, limite animações ao módulo visual e trate descarte de recursos quando objetos forem removidos. Não altere alcance, ocupação, vida ou dono para acomodar uma nova aparência.

## HTTP e WebSocket públicos

| Método / caminho | Operação |
| --- | --- |
| `GET /health` | Saúde HTTP e situação da conexão PostgreSQL |
| `POST /api/auth/guest` | Criar identidade de convidado |
| `POST /api/auth/register` | Registrar conta por nome e senha |
| `POST /api/auth/login` | Iniciar sessão |
| `GET /api/auth/session` | Restaurar sessão |
| `POST /api/auth/logout` | Encerrar sessão |
| `GET /api/deck` / `PUT /api/deck` | Consultar / salvar Deck |
| `POST /api/auth/socket-ticket` | Obter ticket temporário para o socket |
| `GET /api/auth/discord/start` | Iniciar OAuth, quando configurado |
| `GET /api/auth/discord/callback` | Finalizar OAuth |
| `WS /ws` | Autenticação do socket e eventos de sala/partida |

Consulte `protocol.js` para eventos e envelopes exatos. O cliente autentica o socket com um ticket de uso único, associado à sessão HTTP; código de sala não representa identidade ou permissão de jogar. Cookies, CSRF, verificação de origem e limites de mensagem estão detalhados em [Segurança](../SECURITY.md).

## Limites atuais e evolução sugerida

O projeto já separa regras, transporte e apresentação, mas não equivale a um serviço distribuído completo. Reinícios perdem partidas, salas não são coordenadas entre processos e não há replay autoritativo persistido. Multiplicar instâncias do servidor sem um projeto de coordenação rompe a visão única das salas.

Próximos passos técnicos possíveis, sem mudar regras: persistir snapshots e um log de intenções, injetar relógio e RNG no motor inteiro para replays determinísticos, medir desempenho de cena com cenários fixos, adicionar observabilidade sem segredos e reduzir duplicação de regras no modo DEV. Cada mudança precisa de um escopo próprio e testes de recuperação, concorrência e compatibilidade.
