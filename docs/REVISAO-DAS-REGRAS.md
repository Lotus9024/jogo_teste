# Revisão das regras e limitações

[Início](../README.md) · [Guia do jogador](GUIA-DO-JOGADOR.md) · [Catálogo](CATALOGO-DE-CARTAS.md)

Esta revisão separa **bugs observáveis**, **divergências entre texto e implementação** e **decisões de design ainda não medidas**. Não é uma proposta de trocar as regras durante a refatoração. Salvo a proteção operacional descrita em R01, os comportamentos abaixo foram preservados para que a regra desejada seja decidida explicitamente.

Base da análise: catálogo, configuração, motor autoritativo, testes, contratos de sala e apresentação do cliente. Os cenários marcados como reproduzidos foram executados em estados sintéticos na memória com Node.js, sem alterar partidas, contas ou banco. A existência de testes passando não elimina lacunas nesses cenários.

## Prioridades

| ID | Tipo | Prioridade sugerida | Situação |
| --- | --- | --- | --- |
| R01 | Operação + decisão de regra | Alta | Exceção na expiração protegida; política de pendência ainda aberta |
| R02 | Bug de ação | Alta | Clone de Henry pode agir no nascimento |
| R03 | Bug de ação | Alta | Henry não recebe o segundo ataque de Espanquem |
| R04 | Divergência de texto | Alta | Desordem inclui diagonais e deduplica dano por construção |
| R05 | Divergência temporal | Alta | Enxame inicia Desordem antes do prazo escrito |
| R06 | Bug de estado/economia | Alta | Retirar resistência pode deixar construção com 0 HP ativa |
| R07 | Regra incompleta experimental | Alta para 3/4 | W.O. encerra a partida inteira e escolhe um outro jogador |
| R08 | Apresentação experimental | Média | Nevasca visual usa assentos 1/2 em mesas 3/4 |
| R09 | Regra incompleta experimental | Alta para 3/4 | Unidades e instantâneas de jogadores eliminados |
| R10 | Interação inconsistente | Média | Avanço por abate não passa pelo dano de entrada no fogo |
| R11 | Terminologia/contrato | Média | “Deck”, pilha e descarte não representam a mesma coleção |
| R12 | Clareza de regras | Média | “Ao lado”, “turno”, categoria e bênção têm sentidos diferentes |

## R01 — Prazo encerrado com escolha ou mão pendente

**Evidência:** [gameEngine.js](../apps/server/src/game/gameEngine.js), `applyTurnTimeout`; [turnLifecycle.js](../apps/server/src/game/turnLifecycle.js), `turnEndRequirement`/`endTurn`; [createSocketServer.js](../apps/server/src/realtime/createSocketServer.js), tick.

**Antes da proteção:** se o turno expirasse com `pendingMageAltarChoices > 0` ou mão acima de sete, a passagem automática chamava a mesma validação da passagem manual, que lançava uma exceção. A reprodução com uma escolha pendente retornou a mensagem “Escolha uma carta do seu baralho pelo Altar Mago antes de passar o turno.” e conservou o jogador ativo. O caminho de temporizador não tratava essa exceção, podendo encerrar o processo Node e perder todas as salas em memória.

**Tratamento nesta refatoração:** a expiração identifica essas pendências e conserva o mesmo turno, as cartas e a escolha, sem lançar erro para fora do tick. Não escolhe nem descarta em nome do jogador. Testes do servidor cobrem o caso e a retomada depois da resolução.

**Decisão pendente:** um jogador pode continuar no turno com relógio zerado enquanto não resolve a pendência. É necessário decidir uma política de jogo: prorrogação limitada, escolha/descarte determinístico, derrota por inatividade ou outra solução. Cada alternativa muda a experiência e precisa ser aprovada como regra. Recomenda-se apresentar claramente a pendência e o relógio expirado; não introduzir descarte automático silencioso.

## R02 — Clone de Henry ignora a indisponibilidade inicial

**Evidência:** [summonAction.js](../apps/server/src/game/actions/summonAction.js), criação de `summonedUnit`; [moveAction.js](../apps/server/src/game/actions/moveAction.js), `normalMoveUsed`; [attackAction.js](../apps/server/src/game/actions/attackAction.js), validação de Henry; texto de `goblin_clone` no [catálogo](../packages/shared/src/cardCatalog.js).

**Reprodução:** dê Clone Goblin a um jogador cujo `lastPlayedGoblinTroopCardId` seja `henry`; invoque em `(6,10)` e tente mover para `(6,9)` imediatamente. O clone nasce com `actionUsed: true`, mas o movimento é aceito porque Henry verifica `movedThisTurn`, que começa falso. O ataque usa `attackedThisTurn`, também falso.

**Impacto:** contradiz “a cópia entra sem poder agir” e faz o resultado depender da tropa copiada.

**Recomendação:** distinguir indisponibilidade de nascimento dos créditos próprios de movimento/ataque e testar Clone de Goblin, Henry e Bombardeiro, com e sem Espanquem. Preservar a prontidão do Henry lançado diretamente. É necessário definir a precedência de Espanquem sobre o texto de Clone.

## R03 — Espanquem não libera um novo ataque de Henry

**Evidência:** [summonAction.js](../apps/server/src/game/actions/summonAction.js), ramo `goblin_spanking`; [attackAction.js](../apps/server/src/game/actions/attackAction.js), `usingHenryBonus`.

**Reprodução:** um Henry já atacou. Lance Espanquem e tente atacar novamente. O feitiço concede `bonusAttacks: 1`, mas o ramo de Henry somente aceita `bonusActions`. A resposta é “Esta unidade já atacou neste turno.” mesmo com o crédito de ataque disponível.

**Impacto:** o mesmo efeito funciona em outros Goblins e falha em Henry, apesar do texto “todos os seus Goblins”. O bônus extra de movimento segue uma rota diferente e pode funcionar, ampliando a inconsistência.

**Recomendação:** unificar o consumo de créditos extras por tipo de ação e cobrir sequências mover→atacar, atacar→mover, Espanquem antes/depois, Henry direto e clonado. Não aumentar a quantidade de ações além do que a regra aprovada determinar.

## R04 — Desordem escrita e executada divergem

**Evidência:** [kingdomEffects.js](../apps/server/src/game/kingdomEffects.js), `alliedBasicConstructionsBesideGoblin` e `damageAlliedConstructionsBesideGoblins`; textos de Goblin, Enxame e Bombardeiro em [cardCatalog.js](../packages/shared/src/cardCatalog.js).

**Reprodução:** coloque uma Barreira de madeira de 3 HP em `(7,10)` e dois Goblins aliados em `(6,9)` e `(8,9)`. No início do turno, a Barreira fica com **2 HP**. Isso comprova dois comportamentos: diagonais contam e dois Goblins causam apenas 1 de dano total naquele início de turno.

O texto fala em construção “diretamente ao lado”; o cálculo usa as oito casas vizinhas. O texto de Enxame diz que cada Goblin aplica Desordem separadamente, mas o motor deduplica as construções antes de aplicar o dano do início de turno. Entradas individuais continuam podendo causar dano em chamadas separadas.

**Recomendação:** decidir explicitamente quatro versus oito vizinhos e dano por construção versus por Goblin. Depois alinhar textos, preview, testes e manual. Até essa decisão, o guia descreve o comportamento atual e não multiplica o dano prometido.

## R05 — O prazo de Desordem do Enxame usa turnos globais

**Evidência:** [summonAction.js](../apps/server/src/game/actions/summonAction.js), `disorderReadyTurn: turnIndex(state) + 2`; [gameQueries.js](../apps/server/src/game/gameQueries.js), `turnIndex`; [kingdomEffects.js](../apps/server/src/game/kingdomEffects.js), verificação de início de turno.

**Constatação pelo fluxo:** no duelo, um Enxame lançado pelo assento 1 no índice 0 fica pronto no índice 2, que é o **próximo turno próprio**. O texto diz “daqui 2 turnos seus”. Em três ou quatro participantes, a volta ao dono também ultrapassa esse índice antes do segundo turno próprio.

**Impacto:** construções aliadas podem sofrer Desordem uma volta antes do que o jogador planejou.

**Recomendação:** definir se o prazo desejado é “no próximo turno”, “no segundo próximo turno do dono” ou dois turnos globais. Se for por dono, armazenar essa unidade temporal explicitamente em vez de um literal `+2` compartilhado com outros tipos de recarga.

## R06 — Construção com zero de vida continua na arena

**Evidência:** [kingdomEffects.js](../apps/server/src/game/kingdomEffects.js), `refreshBuilderResistance`; [kingdomProgress.js](../apps/server/src/game/kingdomProgress.js), `refreshKingdomProgress`; [kingdomEconomy.js](../packages/shared/src/kingdomEconomy.js), contagem de cidadãos.

**Reprodução:** uma Casa de madeira está com `hp: 1`, `maxHp: 2` e `builderResistanceBonus: 1`; o bônus da Área de construtor deixa de existir. Ao recalcular, a Casa fica com **0 HP**, mas permanece no array de unidades e continua contribuindo **3 cidadãos**.

**Impacto:** a peça pode ocupar campo e sustentar cidadãos ou requisitos mesmo sem vida. A retirada de bônus não passa pela remoção de `damageUnit`.

**Recomendação:** decidir se a perda de resistência pode matar. Se puder, aplicar a remoção normal e recalcular economia até estado consistente; se não puder, a regra deve estabelecer explicitamente um piso de vida. Testar remoção/desativação de múltiplas Áreas, Casas, Torres com Arqueiros montados e Altares. A refatoração não escolheu uma dessas regras.

## R07 — W.O. em três ou quatro jogadores encerra toda a partida

**Evidência:** [roomManager.js](../apps/server/src/game/roomManager.js), `#finishByForfeit`.

**Constatação pelo código:** a saída ou desconexão definitiva de um participante marca a sala inteira como `finished` e define como vencedor o primeiro jogador cujo ID seja diferente do desistente. Não existe continuação entre os demais sobreviventes nesse caminho.

**Impacto:** em mesa de três ou quatro, desistir pode declarar um vencedor por ordem da lista, mesmo com outros castelos vivos. A mesma função é coerente para o duelo, mas não implementa uma regra completa de todos contra todos.

**Recomendação:** definir eliminação individual, destino das peças e condição de vitória para o formato. Criar matriz de cenários para desistente ativo/inativo, um ou vários desconectados e vitória por castelo versus W.O. Manter o formato marcado como experimental até essas decisões.

## R08 — Duração visual da Nevasca presume dois assentos

**Evidência:** [battleEffects.js](../apps/server/src/game/battleEffects.js), `castBlizzard` e `finishSnowstormTurn`.

**Constatação pelo código:** `targetSeat` é definido por `player.seat === 1 ? 2 : 1`. Assim, o efeito visual em mesas maiores expira com turnos de 1 ou 2, inclusive quando o conjurador é 3 ou 4. A penalidade de movimento das tropas é separada e diminui nos turnos dos próprios donos.

**Impacto:** a aparência da área e o prazo real da redução de movimento podem discordar. Não foi concluído que todas as penalidades de movimento estejam erradas; o problema identificado é a referência fixa da duração visual.

**Recomendação:** vincular a apresentação ao mesmo critério temporal da regra aprovada, ou mostrar o efeito como evento de lançamento e os prazos nas próprias tropas. Testar unidades de todos os donos dentro da área, incluindo aliados.

## R09 — Eliminação não define o destino das unidades e instantâneas

**Evidência:** [attackAction.js](../apps/server/src/game/actions/attackAction.js), redução de base e sobreviventes; [turnLifecycle.js](../apps/server/src/game/turnLifecycle.js), filtro de assentos com vida; [abilityAction.js](../apps/server/src/game/actions/abilityAction.js), `useInstantAction`.

**Constatação pelo código:** ao zerar uma base em mesa maior, seus turnos deixam de integrar a lista de sobreviventes, mas suas peças não são removidas por esse evento. A ação instantânea confere fase e dono da unidade, sem exigir base viva. O jogador eliminado pode continuar tendo uma peça com energia/instantânea elegível enquanto a partida não acaba.

**Impacto:** o formato não define claramente se a eliminação retira toda influência do participante. Também há cálculos de turno que usam todos os jogadores e outros que usam somente sobreviventes, o que precisa ser revisto para durações após eliminação.

**Recomendação:** decidir se peças desaparecem, ficam neutras ou continuam sob algum controle; então aplicar a política a ações, economia, efeitos, recargas e espectadores. Não reutilizar a condição de turno do duelo como prova de eliminação completa.

## R10 — Avanço após abate não trata entrada em fogo

**Evidência:** [moveAction.js](../apps/server/src/game/actions/moveAction.js) chama `applyFireEntryDamage`; [attackAction.js](../apps/server/src/game/actions/attackAction.js), `attackUnit`, muda coordenadas após um abate sem chamar essa função; [combat.js](../apps/server/src/game/combat.js), regras de fogo.

**Constatação pelo fluxo:** uma tropa que anda até uma casa em chamas recebe dano de entrada. Um combatente que ocupa a mesma casa por derrotar a peça nela usa outro caminho e não recebe esse dano naquele momento. Ele ainda pode receber o dano de expiração posteriormente.

**Impacto:** duas formas de entrar no terreno podem produzir resultados diferentes sem uma exceção clara na carta. O problema não implica necessariamente ausência de todo dano residual.

**Recomendação:** confirmar se “entrar no fogo” inclui avanço por abate, invocação e reforços; documentar exceções ou centralizar os efeitos de entrada em uma operação comum. Testar entrada voluntária, captura, Canhão/Operador e peça recém-gerada.

## R11 — Deck escolhido, pilha e descarte têm semânticas distintas

**Evidência:** [deckRules.js](../packages/shared/src/deckRules.js), soma de 15 escolhas; [gameConfig.js](../packages/shared/src/gameConfig.js), `deckSize: 18`; [createInitialState.js](../apps/server/src/game/createInitialState.js), `createDeck`, `drawCard`, `weightedCardForRarity`; [deckChoiceAction.js](../apps/server/src/game/actions/deckChoiceAction.js).

**Constatação:** o jogador escolhe 15 IDs distintos. O sistema gera uma pilha de 18 IDs, porém `drawCard` remove um item dela e sorteia outro ID independentemente para a mão. A escolha do Altar Mago remove o ID da pilha se ele estiver lá, mas ainda concede a carta se não estiver. O descarte não determina a composição das próximas compras normais.

**Classificação:** contrato e expectativa potencialmente confusos, não demonstração de uma regra de compra “errada”. O sorteio pode ser intencional. A documentação foi corrigida para descrever seu funcionamento.

**Recomendação:** decidir se o produto quer um catálogo elegível com sorteio renovável ou um baralho físico finito. Caso mantenha o sistema atual, nomear distintamente “composição do Deck” e “compras restantes no lote”, e evitar UI que prometa uma próxima carta fixa. Trocar o algoritmo de compra exigiria decisão de regra e balanceamento.

## R12 — Vocabulário e exceções precisam de padronização

**Evidência:** [cardCatalog.js](../packages/shared/src/cardCatalog.js), [boardRules.js](../packages/shared/src/boardRules.js), [cardCosts.js](../packages/shared/src/cardCosts.js), [kingdomEffects.js](../apps/server/src/game/kingdomEffects.js) e [battleEffects.js](../apps/server/src/game/battleEffects.js).

| Termo / caso | Funcionamento atual que precisa ficar explícito |
| --- | --- |
| “Ao lado” | Estradas e bônus de vida da Torre Goblin usam 4 vizinhos; Desordem, Casa Goblin e aura da Torre Real usam 8 |
| “Turno” | Recargas usam índices globais; construção usa rodada; Nevasca nas tropas usa turno do dono |
| Casa Goblin | Tem família Goblin, mas categoria Básica; conta de modo diferente nos filtros |
| “Construção” | Canhão é `machine`, incluído em dano de explosão, mas não em todo bônus de `construction` |
| Bênção Real | É concedida às peças existentes no momento do evento; não beneficia futuras peças automaticamente |
| Casa Goblin ao lado de outra Casa | A restrição é verificada ao lançar Casa Goblin; não é uma proibição simétrica geral de toda Casa |
| Área de construtor | Texto fala em “uma carta” Goblin/Mago na base; o motor restringe a verificação às cartas do próprio dono |
| Torre Real com dano 5 impresso | Não possui ataque normal: alcance zero; o bônus ao Arqueiro é +1, não 5 |
| Instantânea de Torre | O efeito funcional é executado pelo Arqueiro montado na Torre comum |

**Recomendação:** adotar palavras explícitas como “vizinha por borda”, “qualquer das oito casas vizinhas”, “turnos do dono” e “turnos globais”. Separar categoria, família e tipo nos textos de referência. Esse trabalho de redação não autoriza trocar as métricas do motor.

## Hipóteses de balanceamento — não são bugs comprovados

Não foram medidos taxa de vitória, duração média, vantagem de primeiro jogador ou força relativa dos Decks. As sugestões abaixo exigem dados e playtests com regras congeladas:

| Hipótese | Por que investigar | Medição proposta |
| --- | --- | --- |
| Vantagem do primeiro assento | O primeiro participante sempre inicia | Partidas pareadas trocando assentos e mantendo Decks; taxa de vitória com intervalo de confiança |
| Partida decidida por economia cedo | Nível 2 altera energia, área e acesso a raras; perder Casas reverte o nível | Rodada da evolução e da primeira rara; taxa de virada após perder população |
| Recompensa repetida por reevolução | Voltar a cumprir requisitos concede novamente +2 energia | Contar ciclos de queda/subida e energia líquida obtida em cenários reais |
| Fogo concentrado na base | Duas casas do mesmo castelo podem receber 2 de dano cada | Frequência de 4 dano numa conjuração e oportunidade de resposta |
| Bênçãos e Clone acumuláveis | Reentradas de cartas reais e Fortalecer Clone podem aumentar atributos repetidamente | Pico de vida/dano por duração de partida e custo de respostas |
| Partidas sem fim por falta de progresso | Não há derrota por esgotar a pilha, empate por repetição ou limite geral de rodadas | Duração e frequência de turnos sem progresso; motivos dos abandonos |
| Variância do acesso à economia | Compras são aleatórias e a Casa recebe peso adicional, sem garantia | Distribuição da primeira Casa e da primeira evolução por Deck |
| Mistura de famílias com conflitos de requisitos | Cartas reais, Altares e Área de construtor usam exclusões diferentes | Frequência de cartas sem jogada útil e erros de requisito entre novos jogadores |

Antes de ajustar números, corrija ambiguidades de texto e registre eventos mínimos de partida sem dados privados: assento, Deck anonimizado quando apropriado, rodada, ação, motivo de encerramento e evolução econômica. Um conjunto pequeno de partidas manuais ajuda a encontrar problemas, mas não sustenta sozinho uma declaração de equilíbrio competitivo.

## Ordem de trabalho recomendada

1. Manter a proteção operacional do timeout e definir a política de pendência de turno.
2. Decidir a semântica de nascimento, créditos extras e resistência; corrigir R02/R03/R06 com testes de regressão após aprovação da regra desejada.
3. Unificar os textos de Desordem, Enxame, duração e adjacência sem mudar valores por acidente.
4. Completar eliminação, W.O. e durações antes de promover três e quatro jogadores a formatos estáveis.
5. Medir os cenários de balanceamento com dados e só então propor alterações numéricas.
