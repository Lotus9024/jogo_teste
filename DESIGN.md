---
version: alpha
name: "Tronos em Ruínas"
description: "Mesa de guerra dark fantasy, com pedra escura, bronze envelhecido e magia violeta."
colors:
  primary: "#a98245"
  bone: "#d7d0bd"
  muted: "#a6a393"
  gold: "#a98245"
  gold-hi: "#d0ac66"
  surface: "#101511"
  background: "#050707"
  focus: "#f1d795"
typography:
  display:
    fontFamily: "Cinzel, Georgia, serif"
  body:
    fontFamily: "Inter, system-ui, sans-serif"
  data:
    fontFamily: "ui-monospace, Consolas, monospace"
rounded:
  control: "6px"
  panel: "12px"
spacing:
  control: "12px"
  section: "24px"
components:
  button:
    rounded: "6px"
    textColor: "{colors.bone}"
  dialog:
    rounded: "12px"
    backgroundColor: "{colors.surface}"
---

# Identidade visual de Tronos em Ruínas

## Overview

Uma mesa de guerra de pedra suspensa num reino em ruínas. A miniatura e o terreno 3D são a assinatura; os menus devem parecer parte desse mundo, mas a leitura das decisões vem primeiro. Público: jogadores de estratégia em navegador; idioma atual pt-BR, foco em desktop com adaptações para telas estreitas. O guia é uma biblioteca de consulta, não uma página promocional.

As regras são autoridade do servidor. A interface apresenta energia, alcance e disponibilidade sem inventar custos ou prever decisões definitivas. Consulte [arquitetura](docs/ARQUITETURA.md) e [contrato de interface](UX-CONTRACT.md).

## Colors

`apps/client/src/styles/tokens.css` é a fonte canônica dos tokens novos e consolidados. O frontmatter espelha seus valores; `npm run check` verifica a paleta. O arquivo entra depois dos temas legados na cascata. Cada cor acima corresponde à variável CSS de mesmo nome (`gold-hi` → `--gold-hi`); famílias correspondem a `--font-display`, `--font-body`, `--font-data`; raios e espaçamentos a `--control-radius`, `--panel-radius`, `--space-control` e `--space-section`.

Osso para conteúdo, bronze para hierarquia e ações principais, violeta para detalhes arcanos existentes. As cores de cada reino e a indicação de aliados/inimigos permanecem próprias do tabuleiro. Verde, azul e vermelho dos recursos mantêm seus significados. Estado nunca depende só de cor: incluir nome, valor, seleção ou mensagem.

## Typography

Cinzel nos títulos e selos; Inter nos formulários e explicações; monoespaçada para números que mudam durante o turno. Fallbacks locais devem manter tudo utilizável sem fontes remotas. Guia com corpo de 16px e entrelinha 1,8; rótulos do HUD com pelo menos 8–9px neste layout compacto. Não reduzir explicações das configurações a legendas decorativas.

## Layout

Menu em um painel estreito na lateral em desktop; centralizado em telas pequenas. Comandos e cartas ficam nas bordas, sem acrescentar painéis permanentes no centro do campo. O guia abre em outra aba para consulta sem sair da partida; seu conteúdo rola naturalmente e tabelas têm rolagem própria. Breakpoints do refinamento: 620px no jogo; 720/1150px no guia. Modais limitados pela altura dinâmica da janela; ações sempre alcançáveis.

## Elevation & Depth

Painéis de pedra quase opacos, bordas finas e luz contida. O mundo carrega a profundidade: casas chanfradas, luz direcional, sombras atualizadas quando objetos mudam. Qualidade baixa reduz custo de luz/sombra sem mudar áreas válidas nem a posição das peças. Evitar brilhar todas as bordas e desfocar o tabuleiro a ponto de eliminar a cena.

## Shapes

Controles com raio de 6px, painéis de consulta com 12px. O menu principal usa canto de 3px e selo em forma de escudo como variante temática. Casas chanfradas preservam altura e coordenadas. Não usar decoração como alvo interativo.

## Components

Botões precisam de hover, foco visível, estado desativado e bloqueio durante envio. A ação principal no lobby usa bronze; ações arcanas existentes conservam violeta. Campos inválidos recebem mensagem e foco, sem balões nativos. Configuração, Deck e confirmação experimental usam `createModalFocus` para isolar fundo, conter Tab, fechar por Escape e restaurar foco. Durante salvamento do Deck, o fechamento aguarda a resposta. O HUD usa `createStatusController` para feedback transitório; erros de formulário ficam no rodapé do lobby.

Scrollbars globais vêm de tokens.css, com cores de repouso/hover/arraste, padrões e fallback WebKit; forced-colors usa cores de sistema. Ícones de carta continuam usando o acervo creditado em CREDITS.md. Movimento deve comunicar estado; respeitar prefers-reduced-motion em CSS e pausar animações quando a aba está oculta.

## Do's and Don'ts

- Manter o campo legível e o mesmo significado de cor entre guia, lobby e partida.
- Mostrar as regras atuais com fonte rastreável; registrar divergências sem corrigir balanceamento na apresentação.
- Não transformar o HUD em dashboard nem repetir controles sobre o centro do tabuleiro.
- Não trocar o visual dark fantasy por neon genérico ou esconder foco e barras de rolagem.

### Reconciliação desta refatoração

| Evidência anterior | Decisão | Implementação |
|---|---|---|
| Base bronze era sobrescrita por tokens violeta em um tema global | Bronze volta à hierarquia de texto/ações do lobby; violeta permanece nos detalhes arcanos | tokens.css e interface-polish.css |
| Pequenos textos de configuração tinham 8px | Explicações passam a 12px | interface-polish.css |
| Galeria tinha scrollbar própria e não havia baseline única | Novos contêineres herdam baseline global, galeria conserva variante de cor | tokens.css |
