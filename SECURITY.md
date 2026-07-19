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

## Partidas WebSocket

- O servidor é autoritativo: o cliente envia intenções, nunca resultados de dano, energia ou cartas compradas.
- Cada conexão fica vinculada a um jogador e sala; o código da sala não autoriza ações em nome de outra sessão.
- Toda ação inclui a versão esperada do estado para bloquear replay e comandos concorrentes obsoletos.
- Turno, dono da unidade, alcance, posição, ocupação, custo e frequência das habilidades são validados novamente no servidor.
- A mão e o baralho completos são enviados apenas ao próprio jogador; o rival recebe somente as contagens.
- Mensagens têm limite de 4 KiB, frequência limitada e tipos conhecidos; conexões sem heartbeat são encerradas.
- A origem aceita em desenvolvimento é exatamente `http://localhost:4173`; em produção ela deve ser substituída pelo domínio HTTPS oficial.
- Cabeçalhos HTTP defensivos, nomes normalizados e códigos de sala criptograficamente aleatórios reduzem superfícies adicionais de abuso.

Essas barreiras impedem trapaças comuns no cliente, mas nenhuma aplicação pública pode prometer “zero hacks”. Antes de produção, adicione autenticação persistente, TLS/WSS, métricas, auditoria, limites distribuídos por IP/conta e testes de carga.
