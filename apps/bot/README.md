# Bot e Codex Advisor

Workspace `@tronos/bot`: cliente textual, assessor estratégico e lançadores de arena. O assessor lê um snapshot, faz cálculos e devolve prioridades; não controla jogador algum. Os lançadores conectam terminais à partida, mas não implementam decisões automáticas.

Use Node.js 22.12 ou superior e execute `npm ci` na raiz do repositório. O modo `--file` funciona sem inicializar cliente HTTP.

## Organização e comandos

```text
apps/bot/
  src/          Terminal, assessor, Deck e lançadores
  test/         Testes incluídos no npm test da raiz
  scripts/      Verificação de sintaxe
  .local-data/  Handshake temporário, fora do Git
```

Na raiz do repositório:

```powershell
npm run bot:terminal -- criar "Meu bot"
npm run dev:bot -- --source http://127.0.0.1:4310
npm run bot:arena -- criar "Meu bot"
npm run bot:pair
```

Execute cada comando de longa duração em seu próprio terminal conforme o fluxo escolhido. O backend local precisa estar disponível em `http://127.0.0.1:3001`. Os controles textuais usam 4310/4311; o espectador usa 4174 em `/spectator/spectator.html`. Essa porta também pertence ao playtest isolado: não execute ambos simultaneamente. `npm run dev` não inicia uma partida do bot automaticamente.

O espectador permanece no frontend (`apps/client/spectator`), separado da lógica textual. O handshake dos lançadores fica em `apps/bot/.local-data/communication.json`. Logs, antigos handshakes e experimentos locais não pertencem às fontes deste workspace. Os comandos abaixo com `node apps/bot/...` são executados da raiz.

## Garantia de somente leitura

- A rede expõe apenas `getState()`.
- A única requisição implementada é `GET /state`.
- Não abre WebSocket, não importa `game-terminal.mjs` e não possui função de envio de ações.
- Aceita somente endereços locais (`localhost`, `127.x.x.x` ou `::1`).
- Cada relatório identifica a `state.version` analisada.
- Antes de publicar uma análise da rede, o Advisor relê o estado e descarta o cálculo se a versão mudou.
- O teste automatizado verifica a ausência de um canal de execução.

Nenhum arquivo existente do jogo precisa ser alterado para usar a ferramenta.

## Montagem de Deck no terminal

Ao executar o terminal diretamente em uma janela interativa, ele mostra todas as cartas e pede a seleção antes de criar ou entrar na sala:

```powershell
node apps/bot/src/game-terminal.mjs criar "Codex Azul"
```

Para automações e outros chats Codex, o lançador também usa o Deck recomendado quando `--deck` não é informado:

```powershell
node apps/bot/src/arena-code.mjs criar "Codex Azul"
```

O Deck precisa ter exatamente 7 cartas comuns, 5 incomuns e 3 raras, respeitando a validação de `@tronos/shared`. Sem terminal interativo e sem `--deck`, é usado um Deck recomendado válido. Para escolher outro, acrescente `--deck` seguido dos 15 IDs separados por vírgula.

## Uso rápido

Com um `game-terminal.mjs` já aberto, informe a porta HTTP dele:

```powershell
node apps/bot/src/codex-advisor.mjs --source http://127.0.0.1:4352
```

Também é possível colar diretamente a URL do espectador. O Advisor extrai o parâmetro `source`:

```powershell
node apps/bot/src/codex-advisor.mjs --source "http://127.0.0.1:4174/spectator/spectator.html?source=http://127.0.0.1:4352"
```

Para acompanhar cada nova versão do estado:

```powershell
node apps/bot/src/codex-advisor.mjs --source http://127.0.0.1:4352 --watch 500
```

Saída compacta para outra IA consumir:

```powershell
node apps/bot/src/codex-advisor.mjs --source http://127.0.0.1:4352 --watch 500 --ndjson
```

JSON legível de uma única análise:

```powershell
node apps/bot/src/codex-advisor.mjs --source http://127.0.0.1:4352 --json --top 10
```

Análise offline de uma resposta salva de `/state`:

```powershell
node apps/bot/src/codex-advisor.mjs --file caminho\snapshot.json
```

Ajuda completa:

```powershell
node apps/bot/src/codex-advisor.mjs --help
```

## O que é calculado

- Ataques legais já disponíveis, incluindo bloqueio de linha.
- Dano atual e potencial contra cada base.
- Letal imediato e atacantes responsáveis.
- Canhão reto de alcance 3–6, Operador atrás, bloqueadores, área e fogo amigo.
- Arqueiro a 3–4; montado alcança 5 e ignora tropas e construções no trajeto.
- Fogo do Mago, Ácido instantâneo e Rajada cardinal instantânea da Torre, ambas utilizáveis fora do turno.
- Peças expostas, dano combinado e valor material ameaçado.
- Canhões operados ou inutilizados, Operadores críticos e Arqueiros montados.
- Movimentos legais, bônus de Rua e a restrição Básica da Estrada de Pedregulhos.
- Cidadão e Operador contando para a população enquanto permanecem na arena.
- Enxame Goblin, carga explosiva do Goblin Bombardeiro e ações adicionais da Marcha Goblin.
- Escolha obrigatória de carta quando o Altar Mago termina de ser construído.
- Custos efetivos após Altares e desconto acumulado da Torre Goblin, que exige dois Goblins em campo e não custa menos de 5.
- Invocações legais da mão própria e encaixes de sinergia.
- Cidadãos, Ruas, progresso para nível 2 e desperdício no teto de energia.
- Valor material ponderado por custo, HP, prontidão e sinergia.

As sugestões vêm estruturadas com UUIDs e coordenadas. São recomendações para decisão manual; o programa não as executa.

## Certeza dos resultados

O relatório separa dois níveis:

- **Alta:** legalidade obtida diretamente das regras oficiais e do snapshot atual.
- **Média:** avaliação posicional ou projeção de peças quando voltarem a ficar prontas.

A mão e o deck do adversário não aparecem no snapshot. O Advisor nunca inventa uma carta oculta; essa incerteza é registrada nos limites do relatório.

O servidor atual não inclui uma versão das regras no snapshot. Por isso, cada saída registra o fingerprint das definições locais usadas e informa que a sincronização com o processo do servidor não pôde ser comprovada. Reiniciar servidor e Advisor depois de alterar cartas evita divergência de versões.

## Testes

```powershell
npm test --workspace @tronos/bot
```

Os testes cobrem o contrato de rede somente leitura, Canhão/Operador, bloqueios, Arqueiro, Torre, economia e a ausência de qualquer canal de execução.
