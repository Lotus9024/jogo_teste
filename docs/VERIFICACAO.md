# Verificação da refatoração

Verificação local em 7 de setembro de 2026. [Guia do jogador](GUIA-DO-JOGADOR.md) · [Revisão das regras](REVISAO-DAS-REGRAS.md).

## Resultado

| Verificação | Resultado |
| --- | --- |
| Instalação | `npm ci`, seguida de instalação registrada na lockfile das dependências do guia e playtest |
| Sintaxe e tokens | `npm run check`: 208 módulos, sem erro; paleta documentada consistente com CSS |
| Testes | `npm test`: **259 testes passaram** — 108 cliente, 123 servidor, 28 compartilhados |
| Build | `npm run build`: frontend, guia, servidor e pacote compartilhado concluídos |
| Playtest | `PLAYTEST_BROWSER=chrome npm run playtest`: seis grupos de verificações passaram em ambiente isolado |
| Auditoria estática da interface | Modo strict: zero achados no escopo da aplicação |
| DESIGN.md | Lint: zero erros; quatro avisos de tokens usados via CSS/prosa, sem referência em componente no frontmatter |
| Dependências de produção | `npm audit --omit=dev`: zero vulnerabilidades reportadas nessa execução |
| Preview final | HTTP 200 em `/` e `/guide.html`; `/health` com `ok: true` |

Os números de testes e módulos são um registro desta revisão, não metas fixas para versões futuras.

## Fluxos exercitados

- Campo obrigatório: mensagem, `aria-invalid` e foco; convidado e montagem de Deck pelos controles reais.
- Salvamento assíncrono bloqueia edição/fechamento para evitar divergência entre Deck enviado e salvo localmente.
- Sala experimental: foco inicial no cancelamento, Tab contido, Escape e restauração do fundo.
- Dois contextos de navegador: sala privada, entrada com Enter, sete cartas para cada jogador e troca de turno sincronizada.
- Configurações: foco contido e devolvido ao controle que abriu o painel.
- Guia e documentos: títulos, navegação, âncoras, viewport de 390px e ausência de overflow da página.
- Falha de restauração de sessão: menu permanece utilizável, incluindo janela estreita e reduced-motion.
- Inspeção WebGL adicional: invocação do Mago, seleção/destinos, rotação de câmera, alto/baixo e perda/restauração real de contexto. Sem exceções JavaScript nessas verificações.
- Enquadramento retrato: tabuleiro cabe horizontalmente sem mudar posição, rotação ou zoom do jogador. Energia e comandos permanecem visíveis no HUD estreito.

O roteiro automatizado usa as portas 4174/3099 e identidades em memória. O preview do jogador continua separado em 4173/3001. Evidências locais são geradas em `.local-data/playtest` e não entram no Git.

## Ganhos verificáveis

- Casas do tabuleiro: 225 meshes individuais passaram a dois lotes instanciados, preservando as 225 posições e dimensões de jogo. Isso reduz as chamadas referentes às casas de 225 para 2, não as chamadas totais da cena.
- Musgo: geometria passou de 5.120 para 128 triângulos, com textura procedural recortada.
- Renderização suspensa em aba oculta, delta limitado na retomada e sombras atualizadas quando unidades mudam. Nenhum benchmark de FPS em hardware variado foi realizado.
- Fachadas de HTTP e WebSocket delegam política, serialização, projeção pública, mensagens e diretório a módulos coesos.
- Mensagens de sockets antigos são ignoradas; efeitos de combate/Nevasca chegam ao cliente sem expor mão ou pilha de rivais.

## Limites e pendências

- PostgreSQL não estava conectado no preview final; identidade usa o fallback local em arquivo. Migrations e `db:verify` não foram executados contra um banco nesta tarefa. Partidas continuam em memória e não sobrevivem ao reinício do servidor.
- O build avisa que o chunk separado de Three.js tem cerca de 639 kB minificado (164 kB gzip). O guia não carrega esse chunk; reduzir mais o motor requer análise própria.
- A auditoria completa de dependências apontou avisos na cadeia de ferramentas de desenvolvimento (PostCSS/Nanoid/Vite). Não foi aplicada atualização forçada de versão principal; audite novamente antes de expor um servidor de desenvolvimento fora da máquina.
- O pipeline CI foi incluído para instalação, check, testes, build e playtest. Este relatório comprova as execuções locais; não afirma que uma execução remota do GitHub Actions já terminou.
- Não houve benchmark de carga, pentest, matriz integral de navegadores/leitores de tela nem cobertura completa das interações de todas as 26 cartas. Os cenários automatizados e a inspeção visual não equivalem a certificação de acessibilidade.
- A revisão das regras registra 12 inconsistências ou lacunas. A proteção técnica do timeout evita queda do processo, mas não define descarte/escolha automática. Balanceamento e regras foram preservados para decisão futura.
