# Instruções permanentes do projeto

## Repositório obrigatório

- Trabalhe sempre no projeto GitHub `Lotus9024/jogo_teste`:
  `https://github.com/Lotus9024/jogo_teste.git`.
- Antes de iniciar qualquer tarefa, localize o checkout desse repositório. Se ele não existir, clone-o.
- Confirme que o remoto `origin` aponta para esse repositório antes de alterar arquivos ou publicar mudanças.

## Fluxo obrigatório em toda tarefa

1. Obtenha a versão mais recente com `git fetch --prune` e `git pull --ff-only`.
2. Preserve alterações locais. Nunca use `reset --hard` nem descarte trabalho do usuário.
3. Instale as dependências conforme a lockfile; prefira `npm ci` com `package-lock.json`.
4. Implemente diretamente neste repositório, com mudanças rápidas e objetivas.
5. Rode o projeto localmente e informe o endereço utilizado.
6. Execute testes, build e verificações relevantes.
7. Faça um commit curto contendo apenas os arquivos da tarefa.
8. Envie o commit ao GitHub com `git push` para a branch atual.

## Regras de publicação

- Finalize implementações com commit e push quando autenticação e remoto estiverem disponíveis.
- Nunca publique segredos, `.env`, credenciais, cookies, `node_modules`, caches ou arquivos temporários.
- Não misture mudanças anteriores do usuário sem autorização explícita.
- Inclua em cada commit somente os arquivos alterados pela tarefa atual.
- Se surgir qualquer conflito durante pull, merge ou rebase, avise o usuário antes de continuar a publicação.
- Na resposta final inclua resumo, testes, commit, branch enviada e URL local.

## Projetos e destinos de deploy

- Código-fonte: GitHub `Lotus9024/jogo_teste`.
- Frontend: projeto Netlify `nexuschessdemo`, ID `f26cfbca-b41e-429f-b413-dd6a8dddcef7`, publicado em `https://nexuschessdemo.netlify.app`. A configuração está no `netlify.toml`, o build é `npm run build --workspace @tronos/client` e a pasta publicada é `apps/client/dist`.
- Backend: projeto Square Cloud `Tronos em Ruinas API`, subdomínio `tronos-em-ruinas-api`, publicado em `https://tronos-em-ruinas-api.squareweb.app` e iniciado por `apps/server/src/index.js`, conforme `squarecloud.app`.
- Banco de dados: PostgreSQL usado pelo backend por meio de `DATABASE_URL` e `MIGRATION_DATABASE_URL`. Nunca revele nem publique os valores dessas variáveis.

Quando o usuário pedir um deploy, explique antes quais destes projetos serão atualizados e o que pertence a cada um. Respeite o escopo pedido: “deploy na Netlify” atualiza somente o frontend; publique também o backend na Square Cloud ou execute migrations somente quando isso for solicitado explicitamente ou for indispensável para uma mudança de backend já autorizada. Ao concluir, informe os projetos efetivamente publicados, suas URLs e os links de logs ou administração disponíveis.
