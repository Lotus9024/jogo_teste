# Segurança do jogo e do banco de dados

## Modelo de confiança

O navegador nunca recebe credenciais do PostgreSQL e nunca se conecta diretamente ao banco. Ações de partida passam pelo servidor WebSocket autoritativo; autenticação e Deck passam pela API HTTP. O servidor valida a identidade e a intenção antes de executar a operação.

As partidas ficam atualmente na memória do `RoomManager`; não existe persistência automática de toda jogada no PostgreSQL. A persistência implementada cobre identidade, sessões, tickets e Decks. Reiniciar o servidor perde as salas ativas, mesmo com banco disponível.

Em desenvolvimento, o repositório de identidade pode usar arquivo local ou memória quando não há banco conectado. Em produção, PostgreSQL disponível, TLS no banco, cookies seguros e origem HTTPS explícita são exigidos na inicialização. Essas exigências devem ser preservadas.

## Papéis

- `tronos_admin`: administração local e provisionamento. A senha fica fora do repositório.
- `tronos_owner`: proprietário sem permissão de login. Possui os objetos do schema `game`.
- `tronos_migrator`: pode assumir o papel de owner somente durante migrations.
- `tronos_app`: usado pelo servidor. Pode conectar, ler e alterar dados, mas não pode executar DDL, criar schemas, criar tabelas temporárias ou ler o histórico de migrations.

## Política do PostgreSQL local

- Cluster ligado somente a `localhost`, porta `55432`.
- Autenticação exclusivamente `scram-sha-256`; conexões externas são rejeitadas.
- Schema `public` sem privilégios para `PUBLIC`.
- Schema isolado `game` e `search_path` fixo em `game, pg_catalog`.
- Senhas aleatórias, fora do Git e com ACL restrita no Windows.
- Pool limitado, timeout de conexão, query e transação ociosa.
- Queries da aplicação devem continuar parametrizadas; nunca concatenar dados recebidos do cliente.
- Backups não devem conter arquivos `.env` ou credenciais administrativas.

Esta política descreve o cluster Windows provisionado para o projeto. A definição de Docker Compose é uma alternativa de desenvolvimento e não comprova, por si só, o isolamento de papéis, rede e privilégios descrito aqui. Valide a configuração efetiva com `db:verify` e as verificações operacionais pertinentes.

## Verificação

Execute `npm run db:verify`. O comando falha se o papel da aplicação ganhar permissão de criação, acesso ao histórico de migrations ou perder acesso normal aos dados do jogo.

Em produção, use TLS fornecido pela hospedagem, rotacione as credenciais, limite a rede ao servidor da aplicação e use um gerenciador de segredos.

## Identidade e sessões

- O projeto já oferece convidado, conta com nome/senha e Discord quando configurado.
- Senhas são derivadas com scrypt e salt aleatório; sessões e tickets usam tokens opacos. Nunca registre senha, cookie ou ticket nos logs.
- Cookies de sessão são `HttpOnly`, com `SameSite=Lax`; produção exige `Secure` e usa o prefixo `__Host-`.
- Escritas HTTP verificam origem e o cabeçalho de solicitação do cliente; operações autenticadas pertinentes também verificam CSRF da sessão.
- O WebSocket exige ticket temporário de uso único emitido para a sessão autenticada. Código de sala não substitui autenticação.
- Discord usa estado e PKCE; mantenha a URL de callback alinhada ao domínio público e ao proxy `/api`.
- Nunca coloque credenciais em variáveis `VITE_*`: elas podem ser incorporadas ao frontend.

## Partidas WebSocket

- O servidor é autoritativo: o cliente envia intenções, nunca resultados de dano, energia ou cartas compradas.
- Cada conexão fica vinculada a um jogador e sala; o código da sala não autoriza ações em nome de outra sessão.
- Toda ação inclui a versão esperada do estado para bloquear replay e comandos concorrentes obsoletos.
- Turno, dono da unidade, alcance, posição, ocupação, custo e frequência das habilidades são validados novamente no servidor.
- A projeção da sala envia a mão somente ao próprio jogador e contagens aos rivais. A lista elegível de escolha do Altar Mago também é privada; espectadores não recebem essas informações. A pilha completa não é transmitida como estado público.
- Mensagens têm limite de 4 KiB, frequência limitada e tipos conhecidos; conexões sem heartbeat são encerradas.
- Desenvolvimento aceita `http://localhost:4173`, `http://127.0.0.1:4173`, IPv4 locais na porta 4173 e origens explicitamente configuradas. Produção usa somente as origens configuradas. Não substitua essa lista por aceitação irrestrita para resolver falhas de conexão.
- Cabeçalhos HTTP defensivos, nomes normalizados e códigos de sala criptograficamente aleatórios reduzem superfícies adicionais de abuso.

## Verificação e limites

As responsabilidades de transporte foram separadas em `http/` e `realtime/`, mantendo as políticas de origem, cookies, limites e projeção de mãos. Testes em `apps/server/test` cobrem autenticação, mensagens, salas e regras; `npm run check`, `npm test` e `npm run build` são as verificações gerais. `npm run db:verify` é uma verificação distinta contra o banco configurado.

Essas proteções não são uma garantia de ausência de vulnerabilidades. A refatoração e seus testes não equivalem a um pentest ou teste de carga. Métricas sem dados privados, auditoria operacional, limites coordenados entre instâncias e recuperação de partidas continuam sendo evoluções possíveis. Mantenha TLS/WSS no ambiente público, gerencie segredos fora do Git e leia [Arquitetura](docs/ARQUITETURA.md) para os limites de persistência e concorrência.
