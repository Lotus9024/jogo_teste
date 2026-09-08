# HUD, castelos e animações

[Guia do jogador](GUIA-DO-JOGADOR.md) · [Miniaturas](MODELOS-3D.md) · [Arquitetura](ARQUITETURA.md)

Esta revisão mantém regras, atributos e custos. O foco é reduzir interferência da interface e dar retorno visual às ações.

## Interface discreta

- Uma linha no canto superior reúne reino/estado, rodada e relógio. No DEV, o número do reino não se repete como se fosse um contador de turno.
- Uma barra de recursos reúne Castelo, Energia, Vida, Cidadãos e Passar turno, sem uma caixa decorativa para cada número.
- Nenhum painel aparece ou fica fixado ao passar o mouse/clicar no castelo. O clique permanece disponível para atacar a base com uma tropa selecionada e alcance válido.
- Cursor nativo, controles menores e lixeira discreta. Estados de foco, turno indisponível e descarte continuam distinguíveis.
- A barra curta do castelo rival usa uma âncora na arquitetura. Textos de evolução permanecem no guia, sem tooltip sobre o tabuleiro.

O estilo de batalha é definido em `apps/client/src/styles/minimal-hud.css`; `gameHudTemplate.js` preserva os IDs usados pelos controladores. A remoção do painel inclui o markup, a geração de conteúdo, a lógica de fixação e seus estilos.

## Castelos e obras

Os castelos passam a ser fortalezas mais baixas, com portaria arqueada aberta, quatro torres de canto, pátio e torre de menagem com telhado de quatro águas. A superfície ocupada continua seguindo as mesmas casas do tabuleiro. A arquitetura cabe no quadrado da base também ao orientar portões para os cantos nos formatos experimentais.

`world/castle/createCastleArchitecture.js` constrói os volumes, e `createCastleMaterials.js` fornece os materiais. `castleStructure` é o grupo visual de impacto; a fundação permanece estática. `castleStatusAnchor` posiciona o indicador de vida sem depender de uma altura fixa global.

Nas obras, `constructionModelKit.js` compartilha andaimes, estoques, escadas, cavaletes e ferramentas. As construções conservam os grupos de estado e pontos de encaixe. Ruas e Estradas de Pedregulhos mantêm o alcance das conexões e recebem superfícies contínuas, com norte/sul alinhados aos mesmos eixos que o motor utiliza.

## Retorno das ações

`createBattleAnimationController.js` coordena deslocamentos e efeitos; `animation/createUnitMotion.js` anima partes da miniatura. Passos, rodas, espada, lança, arco, martelo, cajado e armas próprias respondem às ações. Impacto, habilidades, invocação, conclusão e derrota têm retorno curto e localizado.

O servidor continua decidindo a jogada. O cliente anima efeitos novos e diferenças confirmadas de estado; receber novamente o mesmo evento não deve repetir a animação. O estado inicial de uma reconexão não dispara todos os efeitos antigos. Mudanças de sala e entrada no DEV limpam apresentações pendentes.

Poses são aplicadas ao rig/arma ou a `castleStructure`, preservando a raiz lógica, a escala final, orientação, encaixes e atributos. O balanço ambiente respeita a animação da ação para não disputar os mesmos objetos. Com movimento reduzido, o retorno é mais curto e de menor amplitude; não há tremor global de câmera.

## Verificação

Na integração local desta revisão, `npm test` passou **291 testes** (140 cliente, 123 servidor, 28 compartilhados); `npm run check` conferiu 222 módulos. Build dos workspaces e os sete grupos do playtest passaram. A auditoria estática da interface retornou zero achados. Nenhum módulo do servidor nem regra compartilhada foi alterado.

As suítes cobrem ausência de popup e ataque por clique no castelo, dimensões dos castelos, normais/bordas das ruas, estados de obra, restauração das poses, eventos repetidos e caminhos de movimento reduzido. O playtest verifica HUD em telas estreitas e uma partida em dois contextos independentes. Capturas e relatórios locais ficam em `.local-data`, fora do Git.

A revisão visual não é um benchmark de FPS em todos os dispositivos. Os formatos de três e quatro jogadores continuam experimentais; os problemas de regras documentados em [Revisão das regras](REVISAO-DAS-REGRAS.md) não foram redefinidos por estas mudanças de apresentação.
