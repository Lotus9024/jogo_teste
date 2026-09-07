# Desenvolvimento e contribuição

[Início](../README.md) · [Arquitetura](ARQUITETURA.md) · [Guia do jogador](GUIA-DO-JOGADOR.md)

## Pré-requisitos e instalação

O repositório obrigatório é [Lotus9024/jogo_teste](https://github.com/Lotus9024/jogo_teste). Trabalhe no checkout existente, confirme o remoto e preserve mudanças locais. Use Node.js **22.12 ou superior**; `netlify.toml` fixa Node.js 24 para o frontend. A versão instalada de Vite 7 aceita `^20.19.0 || >=22.12.0`; Node.js 22.12+ simplifica o ambiente do projeto.

```bash
git remote get-url origin
git status --short
git fetch --prune
git pull --ff-only
npm ci
```

Se ainda não houver checkout:

```bash
git clone https://github.com/Lotus9024/jogo_teste.git
cd jogo_teste
npm ci
```

Não use `reset --hard` para resolver divergência. Se o pull não puder avançar sem merge ou houver conflito, preserve o estado e siga as instruções de [AGENTS.md](../AGENTS.md). `npm ci` usa a lockfile e recria dependências instaladas; alterações no catálogo ou nas regras não exigem atualizar bibliotecas por conta própria.

## Rodar o jogo

```bash
npm run dev
```

| Serviço | Endereço padrão |
| --- | --- |
| Frontend | [http://localhost:4173](http://localhost:4173) |
| Manual | [http://localhost:4173/guide.html](http://localhost:4173/guide.html) |
| API HTTP | `http://localhost:3001/api` |
| Saúde | [http://localhost:3001/health](http://localhost:3001/health) |
| WebSocket | `ws://localhost:3001/ws` |

`npm run dev:client` e `npm run dev:server` iniciam apenas um lado. Mantenha o terminal ativo; `Ctrl+C` encerra o comando local. Se a porta estiver em uso, confirme o processo responsável antes de interrompê-lo. O Vite pode escolher outra porta quando a padrão estiver ocupada; uma origem diferente também precisa ser aceita no servidor.

O cliente usa os hosts locais reconhecidos para localizar a API na porta 3001. Para destinos explícitos, `VITE_API_URL` e `VITE_WS_URL` são configurações públicas de build. Tudo que começa com `VITE_` pode chegar ao navegador: nunca coloque senhas, strings de banco ou tokens administrativos nessas variáveis.

### Dois jogadores e reconexão

Abra uma janela comum e uma janela anônima, ou dois perfis de navegador. Crie identidades diferentes, monte e salve Decks válidos e entre na mesma sala. Duas abas do mesmo perfil usam o mesmo cookie, então o servidor pode rejeitar a segunda conexão como identidade já conectada.

Para testar desconexão, interrompa a conexão de apenas um participante e reconecte com a mesma sessão antes dos quatro minutos. Reiniciar o processo do servidor apaga as salas em memória; isso não é um teste de reconexão equivalente.

### DEV MODE

O botão DEV aparece quando o hostname é `localhost`, `127.0.0.1` ou um endereço de rede privada reconhecido pelo template do lobby, e abre uma mesa local de teste. A galeria do baralho permite escolher cartas; o menu permite testar níveis, construção instantânea, remoção de peças e limpeza do campo. Ele não precisa de um oponente, mas suas simulações locais não provam a correção das regras online.

## Configuração do servidor

O módulo `apps/server/src/config.js` lê variáveis do processo e `apps/server/.env`. Um exemplo de configuração sem valores privados existe em `apps/server/.env.example`. Não copie um arquivo real de outra máquina, não publique seus valores e não sobrescreva um `.env` existente.

| Variável | Finalidade |
| --- | --- |
| `NODE_ENV` | Ambiente; produção aciona exigências adicionais |
| `PORT`, `HOST` | Escuta do servidor; padrões 3001 e `0.0.0.0` |
| `CLIENT_ORIGIN` | Origens HTTP permitidas, separadas por vírgula |
| `PUBLIC_CLIENT_URL` | URL pública do jogo, usada em redirecionamentos |
| `DATABASE_URL` | Conexão do papel de aplicação PostgreSQL; segredo |
| `MIGRATION_DATABASE_URL` | Conexão do papel de migrations; segredo separado |
| `DATABASE_SSL` | TLS no banco; obrigatório em produção |
| `DATABASE_CERTIFICATE_BASE64` | Autoridade certificadora configurada para o banco |
| `SESSION_COOKIE_SECURE` | Cookies seguros; obrigatório em produção |
| `SESSION_TTL_HOURS` | Prazo das sessões; padrão 168 horas |
| `LOCAL_AUTH_FILE` | Caminho de persistência local de identidade |
| `TRUST_PROXY` | Confiança nos cabeçalhos de proxy; só habilitar atrás de proxy confiável |
| `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_REDIRECT_URI` | Configuração opcional do Discord; segredo apenas no servidor |
| `SOCKET_TICKET_*`, `OAUTH_*` | Validade e limites de emissão dos tickets/estados |

Sem banco conectado em desenvolvimento, o servidor usa identidade em arquivo local por padrão (`apps/server/.local-data/auth.json`), ignorado no Git. Memória é uma implementação alternativa usada em testes ou configuração explícita. **Em produção, não há fallback para arquivo ou memória:** o banco precisa estar disponível na inicialização.

Um `/health` com HTTP 200 significa que o endpoint respondeu; confira também `database.configured` e `database.connected`. Em desenvolvimento, `connected: false` pode ser esperado. Isso não comprova migrations aplicadas, permissões corretas ou uma partida completa funcionando.

## PostgreSQL

O ambiente Windows deste projeto possui scripts para um cluster local isolado na porta **55432**. Eles pressupõem PostgreSQL instalado e dados/segredos locais já preparados; não são um instalador genérico de PostgreSQL.

```bash
npm run db:start
npm run db:provision
npm run db:migrate
npm run db:verify
```

`db:start` utiliza `POSTGRES_BIN` quando definido e procura o cluster em `%LOCALAPPDATA%/TronosEmRuinas/postgres`. O provisionador depende do arquivo administrativo local indicado por `TRONOS_ADMIN_SECRET_FILE` ou de seu caminho padrão. Ele cria/configura papéis e **escreve `apps/server/.env`**; não execute novamente sem considerar a configuração já existente.

Se o computador não tiver o cluster preparado, use sua instalação PostgreSQL com papéis adequados ou a definição de [Docker Compose](../docker-compose.yml), configure as conexões localmente e siga a política em [Segurança](../SECURITY.md). O Compose não substitui automaticamente os papéis e permissões esperados pelas migrations do projeto.

`db:migrate` aplica arquivos SQL pendentes em ordem e registra seus nomes no schema `game`. Usa a identidade de migration, separada da aplicação. Não edite uma migration já aplicada como forma de atualizar bancos existentes: acrescente uma nova e valide sua compatibilidade. `db:verify` comprova permissões do papel de aplicação. `db:stop` encerra o cluster local do projeto.

## Comandos e verificações

| Comando | Escopo |
| --- | --- |
| `npm ci` | Instala dependências conforme a lockfile |
| `npm run dev` | Frontend e backend juntos |
| `npm run dev:client` / `npm run dev:server` | Um lado do sistema |
| `npm run check` | Verificação de sintaxe e organização configurada pelos scripts |
| `npm test` | Suítes dos workspaces com descoberta dos testes |
| `npm run build` | Build de todos os workspaces aplicáveis |
| `npm run verify` | Executa check, testes e build em sequência |
| `npm run playtest` | Inicia ambiente isolado e exercita os fluxos no navegador |
| `npm run build --workspace @tronos/client` | Gera frontend e manual em `apps/client/dist` |
| `npm run build --workspace @tronos/server` | Confere sintaxe dos módulos do servidor |
| `npm run preview --workspace @tronos/client` | Prévia local do frontend compilado; ainda requer API para jogar online |
| `npm start` | Inicia somente o backend |
| `npm run db:migrate` / `npm run db:verify` | Migrations e conferência de permissões |

O build do backend é uma verificação de JavaScript; não comprova conexão com PostgreSQL. Os testes usam principalmente ambientes isolados e estados sintéticos. Não substituem um teste de partida no navegador, uma migração real ou teste de carga.

A integração contínua instala pela lockfile e executa `check`, testes e build. `scripts/test-workspace.mjs` descobre arquivos de teste para evitar que uma nova suíte seja esquecida numa lista manual. `local-tools` contém auxiliares independentes; não presuma que todas as suas suítes façam parte do runtime ou do comando principal.

### Playtest automatizado local

Instale o navegador do Playwright e execute. O script inicia seus próprios serviços nas portas 4174 (cliente) e 3099 (API), sem ocupar o preview do jogador:

```bash
npx playwright install chromium
npm run playtest
```

No Windows, também é possível usar uma instalação existente do Chrome:

```powershell
$env:PLAYTEST_BROWSER = 'chrome'
npm run playtest
```

O script usa identidades, Decks e salas de teste exclusivamente em memória por meio de `scripts/serve-playtest.mjs`. Encerra seus serviços ao terminar e não consome os limites de autenticação do preview do jogador. Verifica troca de turno, bloqueio durante salvamento, foco, manual, janela estreita e erro de rede. Screenshots e relatório ficam em `.local-data/playtest`, ignorado pelo Git. `PLAYTEST_URL` pode apontar explicitamente para outro servidor local já ativo; nesse caso, os dados de teste seguem a persistência desse servidor, portanto prefira o modo isolado padrão.

### Verificação manual mínima

1. Abra o frontend e o manual; confira navegação e console.
2. Crie ou restaure uma identidade, salve um Deck válido e confirme os estados de carregamento e erro.
3. Com duas identidades, crie e entre numa sala; confirme perspectiva, sete cartas, energia 10, base 10 e relógio de dois minutos.
4. Invoque uma tropa e uma construção; valide obra, movimento, bloqueio, ataque e gasto de energia.
5. Teste uma instantânea no turno rival e o fluxo de seleção do fogo do Mago.
6. Confira reconexão e encerramento voluntário sem divulgar cookies ou tickets.
7. Compare gráficos Baixo/Alto e uma janela estreita; confira se o tabuleiro continua jogável e o HUD não esconde comandos.

Quando uma mudança afeta uma regra específica, acrescente a reprodução correspondente. Não altere dados de produção para montar um cenário de teste.

## Onde alterar e como contribuir

Use o mapa em [Arquitetura](ARQUITETURA.md). Dados de cartas pertencem ao catálogo; regras pertencem ao motor e às funções puras; HTML/CSS pertence à interface; miniaturas pertencem às fábricas de modelos. Preserve as fachadas pequenas e injete dependências em controladores coesos.

Para correção de comportamento, reproduza o problema, descreva o antes/depois e adicione um teste de resultado observável. Para refatoração, mantenha a API e as regras; rode a suíte existente. Atualize guia e catálogo junto de qualquer mudança de regra aprovada.

Antes de publicar:

```bash
npm run check
npm test
npm run build
git diff --check
git status --short
```

Revise e adicione ao staging somente os arquivos da tarefa. Use commit curto e descritivo, confirme a branch atual e envie o commit para ela, conforme [AGENTS.md](../AGENTS.md). Nunca inclua `.env`, `.local-data`, cookies, credenciais, `node_modules`, caches ou artefatos temporários. Não incorpore alterações prévias do usuário sem autorização.

## Publicação e operação

O frontend está configurado no Netlify por `netlify.toml`, com saída em `apps/client/dist`; o backend está configurado na Square Cloud por `squarecloud.app`. Fazer `git push` não comprova que ambos os serviços foram publicados. Migrations são uma operação separada.

O frontend utiliza um proxy `/api/*` para a API e uma conexão WSS para a partida. Mudanças de domínio precisam ser refletidas nas origens, nas URLs públicas, no OAuth e na política de conteúdo. Não remova verificações de origem ou cookies seguros para contornar erro de implantação.

Produção exige PostgreSQL, TLS, cookies seguros e origem HTTPS explícita. Faça backup de dados conforme a operação e planeje interrupções: **reiniciar o backend encerra as partidas em memória**. Para disponibilidade contínua com várias instâncias, será necessário um projeto de persistência e coordenação de salas.

## Solução de problemas

| Sintoma | O que conferir |
| --- | --- |
| `npm ci` falha por versão | `node --version` e versão mínima do Vite; não apague a lockfile para contornar |
| Frontend abre, mas login falha | Backend na porta 3001, `/health`, URL da API e origem aceita |
| Socket rejeitado | Sessão/ticket, origem, identidade já conectada e endpoint `/ws` |
| Sala não inicia | Deck completo de todos e número de vagas escolhido |
| Banco indisponível localmente | Cluster, porta 55432 e variáveis locais; não imprima a conexão completa |
| Migration sem permissão | Papel migrator e `MIGRATION_DATABASE_URL`; não conceda owner ao papel de aplicação |
| Turno expirado com escolha pendente | Resolver escolha/limite da mão; ver R01 em Revisão das regras |
| Erro de estado desatualizado | Repetir a intenção depois da reconciliação; conferir `expectedVersion` |
| Cena lenta | Baixar gráficos, observar WebGL e medir cenário; não reduzir regras para compensar renderização |
