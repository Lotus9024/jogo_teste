# Tronos em Ruínas

Jogo de estratégia por turnos para navegador: monte seu Deck, desenvolva um reino, invoque tropas e destrua o castelo rival em um tabuleiro 3D de fantasia sombria. O cliente usa Three.js e o servidor valida as ações da partida.

**Novo jogador? Comece pelo [Guia do jogador](docs/GUIA-DO-JOGADOR.md).** Com o projeto local ativo, abra também o [manual navegável](http://localhost:4173/guide.html).

## Documentação

| Documento | Conteúdo |
| --- | --- |
| [Guia do jogador](docs/GUIA-DO-JOGADOR.md) | Primeira partida, controles, turnos, combate, economia e dúvidas frequentes |
| [Catálogo de cartas](docs/CATALOGO-DE-CARTAS.md) | Todas as 26 cartas, atributos, habilidades, requisitos e interações |
| [Desenvolvimento](docs/DESENVOLVIMENTO.md) | Instalação, execução, configuração, testes, banco e contribuição |
| [Arquitetura](docs/ARQUITETURA.md) | Módulos, responsabilidades, fluxo de uma ação e limites atuais |
| [Revisão das regras](docs/REVISAO-DAS-REGRAS.md) | Divergências comprovadas, limitações e sugestões ainda não aplicadas |
| [Segurança](SECURITY.md) | Modelo de confiança e política de credenciais e banco |
| [Créditos](CREDITS.md) | Créditos dos recursos visuais |

## Executar localmente

Use Node.js 22.12 ou superior; o ambiente de publicação do frontend utiliza Node.js 24. Na raiz deste repositório:

```bash
npm ci
npm run dev
```

- Jogo: [http://localhost:4173](http://localhost:4173).
- Manual: [http://localhost:4173/guide.html](http://localhost:4173/guide.html).
- Saúde da API: [http://localhost:3001/health](http://localhost:3001/health).
- WebSocket: `ws://localhost:3001/ws`.

O desenvolvimento pode funcionar sem PostgreSQL: nesse caso, a identidade local usa armazenamento em arquivo. Produção exige PostgreSQL disponível. Leia [Desenvolvimento](docs/DESENVOLVIMENTO.md) antes de configurar banco, cookies ou hospedagem.

Para simular dois jogadores, use **perfis de navegador separados**, por exemplo uma janela normal e uma janela anônima. Duas abas do mesmo perfil compartilham a sessão e não representam duas identidades independentes.

## O jogo atual

| Regra | Valor |
| --- | --- |
| Formato principal | Duelo de 2 jogadores |
| Outros formatos | 3 e 4 jogadores, experimentais |
| Tabuleiro | 15 × 15 casas; cada castelo ocupa 3 × 3 |
| Vida inicial do castelo | 10 |
| Turno | 120 segundos |
| Mão inicial / limite normal | 7 / 7 cartas |
| Compra automática | 1 carta no início do próprio turno, se houver espaço |
| Energia inicial / recuperação | 10 / +3 por próprio turno |
| Limite de energia | 10 no nível 1; 12 no nível 2 |
| Evolução ao nível 2 | 8 cidadãos e 1 estrada concluída; concede +2 de energia |
| Deck escolhido | 15 cartas distintas: 7 comuns, 5 incomuns e 3 raras |

O Deck escolhido define o conjunto elegível para compras. A pilha de compra é gerada em lotes de 18, pode repetir cartas e é renovada quando acaba; não se trata de uma pilha finita contendo uma cópia de cada carta escolhida.

Há salas públicas, salas privadas por código, espectadores e reconexão. **Jogar com IA** ainda está indisponível no menu. O **DEV MODE**, quando habilitado no ambiente de desenvolvimento, é uma mesa livre para testar miniaturas e interações; não substitui a validação das regras online.

## Estrutura

```text
apps/client/       Interface, cena 3D, interações e conexão com a partida
apps/server/       HTTP, autenticação, WebSocket e motor autoritativo
packages/shared/  Configuração, catálogo, protocolo e regras puras
docs/              Manual do jogador e documentação técnica
scripts/           Verificações e descoberta de testes
local-tools/       Ferramentas auxiliares e experimentos independentes
```

O estado das partidas fica **na memória do processo do servidor**. Contas, sessões e Decks podem persistir em PostgreSQL, mas reiniciar o servidor encerra as partidas ativas. Os limites concretos estão em [Arquitetura](docs/ARQUITETURA.md) e [Revisão das regras](docs/REVISAO-DAS-REGRAS.md).

## Verificar mudanças

```bash
npm run check
npm test
npm run build
```

Mudanças visuais também exigem verificação no navegador: login/convidado, Deck, salas, invocação, movimento, ataques, habilidades, gráficos e telas menores. O fluxo de contribuição e publicação está em [Desenvolvimento](docs/DESENVOLVIMENTO.md); as instruções permanentes do repositório estão em [AGENTS.md](AGENTS.md).
