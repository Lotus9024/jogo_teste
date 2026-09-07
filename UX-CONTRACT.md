# Contrato da interface

Identidade visual: [DESIGN.md](DESIGN.md). Regras e custos: `packages/shared/src/gameConfig.js`, `cards.js` e handlers autoritativos em `apps/server/src/game/actions/`. Este contrato registra apresentação e recuperação, sem redefinir regras.

## Canonical UI Map

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
|---|---|---|---|---|
| Form | ui/lobby/formValidation.js | auth/validation.js | Convidado, registro, login, sala | Mensagem, foco, envio único no navegador |
| Scrollbar | styles/tokens.css | DESIGN.md | Galeria preserva cor arcana; guia/tabelas têm rolagem própria | Estilo computado e viewport estreito |
| Toast | ui/createStatusController.js | UX-CONTRACT.md | Erro transitório no HUD; erro persistente no lobby | Novo erro substitui o anterior |
| Modal | ui/createModalFocus.js | UX-CONTRACT.md | Configurações, Deck e confirmação de sala experimental | Tab contido, fundo inert, Escape, retorno de foco |
| Navigation | ui/createNexusLobbyController.js | packages/shared/src/protocol.js | Entrada, conta, hub, salas, espera | Voltar preserva fluxo e cancela espera existente |
| Documentation | guide.html e src/guide.js | docs/GUIA-DO-JOGADOR.md | Jogador, catálogo, engenharia e revisão | Mesmos Markdown versionados, links e tabelas acessíveis |
| Model preview | models.html e src/modelStudio.js | createCardUnit.js e assets/models | Miniaturas prontas e em construção | 21 peças, estado de obra, teclado, rotação e viewport estreito |

Outros overlays legados mantêm seus controladores; a migração para o primitivo de foco deve ocorrer ao tocar cada fluxo, sem alegar cobertura integral de acessibilidade.

## Fluxos e estados

Entrada → identificação → deck válido → conexão → criar/entrar sala → espera → partida. O backend define sessão, propriedade, ações, custos e vitória. A UI somente libera ações quando sessão, conexão e deck permitem. A restauração inicial bloqueia envios concorrentes; falha deixa a entrada utilizável. Falha de logout preserva a sessão visual e explica como tentar novamente.

Formulários usam novalidate e feedback próprio. Erros locais indicam campo inválido e recebem foco. O backend continua validando os dados; uma mensagem local nunca autoriza uma ação. Senhas seguem mascaradas e aceitam colagem/autocomplete. Não persistir senha nem incluir valores sensíveis em URLs ou logs. Ao salvar Deck, edição e fechamento aguardam a resposta; a seleção confirmada corresponde ao mesmo snapshot enviado ao servidor.

Salas têm estados vazio, disponível, lotada/espectador e privada. Código de sala aceita Enter sem recarregar o documento. Criar 3/4 jogadores mantém aviso experimental e foco inicial no cancelamento. Nenhuma confirmação nova altera a regra de abandono durante partida.

No guia, navegação por URL `?doc=...#secao`, cabeçalhos semânticos e tabelas roláveis. Sem buscas remotas ou paginação artificial. O link no HUD abre outra aba e anuncia isso no nome acessível. Conteúdo HTML convertido de Markdown é sanitizado.

Locale é pt-BR. Foco deve ser visível, texto legível sobre o mundo e controles alcançáveis em viewport estreito. Reduced-motion remove transições cosméticas, sem alterar duração de turnos. A biblioteca é imprimível. Testes de navegador cobrem somente os fluxos efetivamente descritos em docs/VERIFICACAO.md.
