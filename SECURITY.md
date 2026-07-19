# Segurança do banco de dados

## Modelo de confiança

O navegador nunca recebe credenciais do PostgreSQL e nunca se conecta diretamente ao banco. Toda ação passa pelo servidor WebSocket, que valida a intenção antes de persistir qualquer mudança.

## Papéis

- `tronos_admin`: administração local e provisionamento. A senha fica fora do repositório.
- `tronos_owner`: proprietário sem permissão de login. Possui os objetos do schema `game`.
- `tronos_migrator`: pode assumir o papel de owner somente durante migrations.
- `tronos_app`: usado pelo servidor. Pode conectar, ler e alterar dados, mas não pode executar DDL, criar schemas, criar tabelas temporárias ou ler o histórico de migrations.

## Regras aplicadas

- Cluster ligado somente a `localhost`, porta `55432`.
- Autenticação exclusivamente `scram-sha-256`; conexões externas são rejeitadas.
- Schema `public` sem privilégios para `PUBLIC`.
- Schema isolado `game` e `search_path` fixo em `game, pg_catalog`.
- Senhas aleatórias, fora do Git e com ACL restrita no Windows.
- Pool limitado, timeout de conexão, query e transação ociosa.
- Queries da aplicação devem continuar parametrizadas; nunca concatenar dados recebidos do cliente.
- Backups não devem conter arquivos `.env` ou credenciais administrativas.

## Verificação

Execute `npm run db:verify`. O comando falha se o papel da aplicação ganhar permissão de criação, acesso ao histórico de migrations ou perder acesso normal aos dados do jogo.

Em produção, use TLS fornecido pela hospedagem, rotacione as credenciais, limite a rede ao servidor da aplicação e use um gerenciador de segredos.
