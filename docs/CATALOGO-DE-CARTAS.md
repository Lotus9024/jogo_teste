# Catálogo de cartas

[Início](../README.md) · [Guia do jogador](GUIA-DO-JOGADOR.md) · [Revisão das regras](REVISAO-DAS-REGRAS.md)

As **26 cartas** do catálogo atual estão descritas abaixo. Os atributos da tabela vêm de [cardCatalog.js](../packages/shared/src/cardCatalog.js); as notas foram conferidas nos handlers do servidor. Não foram alteradas regras para produzir este manual. As referências R01–R12 apontam para divergências e decisões pendentes na revisão das regras.

## Como ler

**Energia** é o custo de jogar a carta, antes dos descontos. **Vida** e **dano** são valores impressos, antes de bônus. **Obra** conta rodadas até a conclusão no início do turno do dono. Um traço significa que o atributo não se aplica ou que a carta não executa aquela ação. Para Enxame e Clone, a peça resultante está explicada nas notas.

**Reto** exige mesma linha ou coluna. **Livre** conta o maior deslocamento nos eixos, incluindo diagonais. **Ortogonal** soma os deslocamentos: uma diagonal adjacente vale 2. **Frente** segue a orientação do dono. Movimento e ataque podem usar métricas diferentes.

Habilidades normais custam energia e consomem a ação, salvo exceção explícita. Instantâneas não consomem a ação e podem ser usadas no turno rival. A recarga de 2 corresponde a **turnos globais**, não necessariamente dois turnos próprios. Passivas não exigem botão.

## Consulta rápida

| Carta | Categoria | Raridade | Energia | Vida | Dano | Movimento | Ataque | Obra |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Barreira de madeira | BÁSICA | COMUM | 2 | 3 | 0 | — | — | 1 |
| Casa de madeira | BÁSICA | COMUM | 3 | 1 | 0 | — | — | 1 |
| Cidadão | BÁSICA | COMUM | 2 | 1 | 1 | 1 livre | 1–1 ortogonal | 0 |
| Goblin | GOBLIN | COMUM | 2 | 1 | 1 | 1 livre | 1–1 ortogonal | 0 |
| Guarda | BÁSICA | COMUM | 5 | 3 | 1 | 1 livre | 1–1 livre | 0 |
| Guerreiro | BÁSICA | COMUM | 5 | 2 | 2 | 2 reto | 1–2 reto | 0 |
| Operador | BÁSICA | COMUM | 3 | 1 | 0 | 1 livre | — | 0 |
| Rua | BÁSICA | COMUM | 1 | — | 0 | — | — | 1 |
| Área de construtor | BÁSICA | INCOMUM | 5 | 1 | 0 | — | — | 1 |
| Arqueiro | BÁSICA | INCOMUM | 6 | 2 | 1 | 1 livre | 3–4 ortogonal | 0 |
| Canhão | BÁSICA | INCOMUM | 7 | 1 | 3 | 1 frente | 3–6 frente | 2 |
| Casa Goblin | BÁSICA | INCOMUM | 4 | 1 | 0 | — | — | 0 |
| Clone Goblin | GOBLIN | INCOMUM | Cópia +2 | 1 | 1 | 1 reto | 1–1 ortogonal | 0 |
| Enxame Goblin | GOBLIN | INCOMUM | 6 | 1 | 1 | 1 livre | 1–1 ortogonal | 0 |
| Espanquem | GOBLIN | INCOMUM | 6 | — | 0 | — | — | 0 |
| Estrada de Pedregulhos | BÁSICA | INCOMUM | 5 | — | 0 | — | — | 1 |
| Goblin Bombardeiro | GOBLIN | INCOMUM | 4 | 1 | 1 | 1 reto | 1–1 ortogonal | 0 |
| Henry | GOBLIN | INCOMUM | 4 | 1 | 1 | 1 livre | 1–1 livre | 0 |
| Nevasca | MAGO | INCOMUM | 4 | — | 1 | — | — | 0 |
| Torre | BÁSICA | INCOMUM | 7 | 5 | 0 | — | — | 2 |
| Altar Goblin | GOBLIN | RARA | 5 | 1 | 0 | — | — | 1 |
| Altar Mago | MAGO | RARA | 6 | 1 | 0 | — | — | 1 |
| Guerreiro Real | BÁSICA | RARA | 7 | 3 | 5 | 2 reto | 1–2 reto | 0 |
| Mago | MAGO | RARA | 6 | 2 | 2 | 1 livre | 1–3 ortogonal | 0 |
| Torre Goblin | GOBLIN | RARA | 10 → mín. 5 | 5 | 0 | — | — | 1 |
| Torre Real | BÁSICA | RARA | 8 | 7 | 5 | — | — | 3 |

## Regras detalhadas por carta

### Barreira de madeira

Identificador: `wooden_barrier` · BÁSICA · COMUM.

Bloqueia a passagem e ataques comuns. Arqueiros podem atirar por cima. É uma construção Básica afetada por Desordem depois de concluída. Não se move nem ataca.

### Casa de madeira

Identificador: `wooden_house` · BÁSICA · COMUM.

Gera 3 cidadãos quando concluída. Uma Rua conectada ao castelo adjacente por uma borda eleva o total para 4; Estrada de Pedregulhos eleva para 5. Vale apenas o maior bônus de estrada, sem somar vizinhos.

### Cidadão

Identificador: `citizen` · BÁSICA · COMUM.

Conta como 1 cidadão enquanto permanecer na arena. Seu movimento permite diagonais, mas o ataque é ortogonal a uma casa. Não é consumido ao cumprir requisito de cidadãos.

### Goblin

Identificador: `goblin` · GOBLIN · COMUM.

Move nas oito direções, mas o ataque comum é ortogonal a uma casa. Desordem afeta construções Básicas aliadas concluídas próximas, exceto Casa Goblin. O motor inclui diagonais e deduplica o dano por construção no início do turno; consulte R04.

### Guarda

Identificador: `guard` · BÁSICA · COMUM.

Move e ataca nas oito direções. Escolha mover ou atacar no turno; não possui contra-ataque automático nem habilidade ativa.

### Guerreiro

Identificador: `warrior` · BÁSICA · COMUM.

Combatente sem habilidade especial. Movimento e ataque exigem mesma linha ou coluna. Ao derrotar uma peça, ocupa a casa dela se ficar livre.

### Operador

Identificador: `operator` · BÁSICA · COMUM.

Conta como 1 cidadão enquanto estiver na arena. Para operar o Canhão deve estar uma casa exatamente atrás, pertencer ao mesmo jogador e ter a ação disponível. Mover ou disparar o Canhão gasta a ação dos dois. O Operador não faz ataques normais.

### Rua

Identificador: `road` · BÁSICA · COMUM.

Terreno sem pontos de vida e sem ataque normal contra ele. Fica em camada própria, pode compartilhar a casa com tropas, mas não com construções ou máquinas. Precisa ligar-se por bordas ao castelo ou a estrada sua já concluída e ficar na área do reino. Depois de pronta, concede +1 movimento a quem começa sobre ela e +1 cidadão a Casas de madeira conectadas. Pode ser removida pela explosão do Bombardeiro.

### Área de construtor

Identificador: `builder_area` · BÁSICA · INCOMUM.

Após concluir, uma ou mais Áreas ativas dão ao reino +1 energia por turno no total. Cada Área ativa também soma +1 vida máxima/resistência às construções aliadas. O efeito desativa com carta sua da categoria Goblin ou Mago na sua área de invocação; carta inimiga não participa dessa checagem. A Casa Goblin é Básica. A perda de resistência pode deixar peça com zero de vida sem remoção (R06).

### Arqueiro

Identificador: `archer` · BÁSICA · INCOMUM.

O movimento permite diagonais, mas o ataque usa distância ortogonal (|dx| + |dz|). Ataca apenas a 3 ou 4. Ignora Barreira de madeira na linha de tiro. Em Torre concluída ganha alcance máximo 5, ignora bloqueios, não pode mover e morre com a torre. Na Torre Real também ganha +1 dano. Próximo a Torre Real, sem estar montado, ganha +1 alcance máximo.

### Canhão

Identificador: `cannon` · BÁSICA · INCOMUM.

É máquina, não construção para os bônus que verificam estritamente o tipo construction. Precisa terminar a obra. Avança uma casa somente para frente, com Operador disponível atrás; não ganha deslocamento extra das estradas. Tira 3 no centro e 1 nas oito casas vizinhas, incluindo aliados. O disparo tem distância mínima 3, máxima 6, direção frontal e bloqueio de linha. Atacar uma casa vazia não equivale a atacar um castelo.

### Casa Goblin

Identificador: `goblin_house` · BÁSICA · INCOMUM.

Apesar do nome e da família Goblin, sua categoria é Básica. Gera 2 cidadãos, não recebe cidadãos extras de estrada e é imune à Desordem. Não pode ser colocada em nenhuma das oito casas ao redor de outra Casa Básica, incluindo outra Casa Goblin; a checagem atual vale para Casas de qualquer dono. Conclui imediatamente, mas a habilidade normal aguarda disponibilidade. Ninhada cria um Goblin exatamente à frente, fora dos castelos e sem ocupante, que entra sem ação.

**Habilidade: Ninhada Goblin.** Energia: 3. Recarga: 2 turnos globais. Gera um Goblin na casa à frente. A casa precisa estar livre, e o Goblin nasce sem poder agir neste turno.

### Clone Goblin

Identificador: `goblin_clone` · GOBLIN · INCOMUM.

O custo impresso depende da última tropa Goblin lançada diretamente: Goblin (2+2=4), Henry (4+2=6) ou Bombardeiro (4+2=6), antes dos descontos. Não funciona sem histórico elegível. Não copia Enxame, feitiços, construções ou altares. A unidade resultante utiliza os atributos impressos da tropa copiada; os atributos de exibição desta carta não substituem os da cópia. Fortalecer Clone pode ser repetido após cada recarga e os bônus acumulam. O texto diz que entra sem agir, mas há exceção indevida para Henry (R02).

**Instantânea: Fortalecer Clone (Instantâneo).** Energia: 2. Recarga: 2 turnos globais. A cópia recebe +1 de vida máxima, recupera 1 de vida e ganha +1 de dano.

### Enxame Goblin

Identificador: `goblin_swarm` · GOBLIN · INCOMUM.

A carta desaparece e gera três unidades Goblin em casas aleatórias livres da sua área de invocação. Precisa haver três espaços; a casa onde você solta a carta não fixa a posição dos três. Cada Goblin tem atributos próprios e pode receber +1 vida se nascer ortogonalmente ao lado de Torre Goblin concluída. Não atualiza a última tropa elegível para Clone. O prazo de Desordem é divergente: hoje começa no próximo turno próprio em duelo, não no segundo próximo (R05).

### Espanquem

Identificador: `goblin_spanking` · GOBLIN · INCOMUM.

Feitiço sem peça própria na arena. Concede um crédito adicional de movimento e um de ataque às tropas Goblin suas já presentes; tropas Goblin lançadas depois, nesse turno, entram prontas. O motor usa créditos separados, e Henry não consome o crédito extra de ataque como esperado (R03). Gerar Goblins com habilidades de Casa/Torre não é a mesma rota de lançar uma carta.

### Estrada de Pedregulhos

Identificador: `cobblestone_road` · BÁSICA · INCOMUM.

Segue a mesma rede e prazo de obra da Rua. Dá +2 movimento somente a cartas Básicas que começam sobre ela e +2 cidadãos às Casas de madeira conectadas. Não soma com outra estrada junto à mesma Casa. Sua categoria não impede uma tropa inimiga Básica de receber movimento; o dono da estrada não é consultado nesse bônus.

### Goblin Bombardeiro

Identificador: `goblin_bomber` · GOBLIN · INCOMUM.

Movimento reto; ataque comum ortogonal adjacente. A Carga explosiva é habilidade normal: percorre exatamente 4 casas para frente, exige caminho intermediário sem peças e destino dentro da arena e fora de castelos. A explosão afeta o destino e oito vizinhos, inclusive aliados: 3 dano em tropas, 4 em construções e máquinas; remove estradas atingidas e sacrifica o Bombardeiro. Não causa dano à base. Antes de explodir, aplica Desordem.

**Habilidade: Carga explosiva.** Energia: 2. Corre 4 blocos para a frente e explode. Causa 3 de dano em tropas e 4 em construções no centro e ao redor, destruindo também as ruas atingidas. O Goblin morre. Enquanto aguarda, também aplica Desordem às construções aliadas diretamente ao lado.

### Henry

Identificador: `henry` · GOBLIN · INCOMUM.

Pode fazer um movimento e um ataque por turno, em qualquer ordem, inclusive no turno em que é invocado diretamente. Aplica Desordem ao entrar e nos seus turnos. Clone de Henry e ataque extra de Espanquem têm divergências comprovadas: R02/R03 na revisão.

### Nevasca

Identificador: `blizzard` · MAGO · INCOMUM.

Feitiço lançado em qualquer casa da arena fora dos castelos. Afeta tropas no centro e nas oito casas vizinhas, inclusive suas: 1 dano imediato e -1 movimento por 2 encerramentos de turno do dono de cada tropa. Construções e máquinas não são tropas para esse efeito. Não empilha redução acima de 1; reaplicar pode renovar a duração. Novas tropas que entram na área depois não recebem automaticamente o efeito. A duração visual em 3/4 jogadores ainda tem limitação (R08).

### Torre

Identificador: `tower` · BÁSICA · INCOMUM.

A Torre não faz ataques normais. Abriga um Arqueiro aliado após a construção, por movimento ou invocação sobre sua casa. A Rajada cardinal efetiva pertence ao Arqueiro montado: atinge o primeiro inimigo encontrado em cada direção reta, até 3 casas, por 2 dano; não ataca castelos. Não oferece desmontagem.

**Instantânea: Rajada cardinal (Instantânea).** Energia: 2. Recarga: 2 turnos globais. Atira uma flecha em todas as 4 direções retas, com no máximo 3 blocos de distância e 2 de dano.

### Altar Goblin

Identificador: `goblin_altar` · GOBLIN · RARA.

Exige duas tropas Goblin suas na área de invocação. Após concluir, reduz custos de categoria Goblin em 1 (respeitando o mínimo da carta) e dá uma compra Goblin aleatória; a compra especial pode exceder sete cartas. Marcha concede +1 ação livre de mover ou atacar aos Goblins aliados a até 6 passos ortogonais. Só um Altar pode integrar o Deck; recebido um Altar, outro não é comprado enquanto ele estiver na mão ou arena.

**Habilidade: Marcha Goblin.** Energia: 4. Recarga: 2 turnos globais. Goblins no raio de 6 casas recebem +1 ação neste turno. A ação extra pode ser usada para mover ou atacar.

### Altar Mago

Identificador: `mage_altar` · MAGO · RARA.

Não pode ser lançado enquanto você controla uma tropa Goblin. Após concluir, reduz custos de categoria Mago em 1, mínimo 1, e permite escolher uma carta do Deck, inclusive rara. A escolha é obrigatória antes de passar turno e pode exceder o limite da mão. Selo enfraquecedor reduz em 1 o ataque de todas as tropas Goblin existentes na arena por 2 turnos globais, sem dano negativo. A restrição de Altar recebido é a mesma do Altar Goblin.

**Habilidade: Selo enfraquecedor.** Energia: 7. Recarga: 2 turnos globais. Todos os Goblins da arena recebem -1 de ataque por 2 turnos.

### Guerreiro Real

Identificador: `royal_warrior` · BÁSICA · RARA.

Exige 10 cidadãos e nenhuma carta própria de categoria Goblin ou Mago na arena no momento da invocação. Ao entrar, concede +1 vida máxima e cura 1 em todos os Guerreiros e Guerreiros Reais aliados existentes, inclusive ele: por isso sua vida inicial efetiva normalmente é 4. Bênçãos sucessivas acumulam. Não fortalece automaticamente Guerreiros lançados depois.

### Mago

Identificador: `mage` · MAGO · RARA.

O fogo substitui o ataque comum por arraste: selecione até duas casas diferentes a 1–3 passos ortogonais e confirme. Atinge sem bloqueio, causa 2 dano imediato por casa e pode acertar aliados ou casas do castelo inimigo. No duelo, o fogo permanece até o fim do turno rival, com 1 dano residual a ocupantes elegíveis. Ácido atinge peças nas oito casas vizinhas, aliadas ou inimigas, por 3 dano; poupa o próprio Mago e não afeta diretamente castelos ou estradas.

**Instantânea: Ácido (Instantâneo).** Energia: 4. Recarga: 2 turnos globais. Jogue um ácido em volta do Mago. Todas as cartas em volta tomam 3 de dano, inclusive as suas.

### Torre Goblin

Identificador: `goblin_tower` · GOBLIN · RARA.

Exige 2 tropas Goblin suas concluídas na arena. O custo é 10 menos 1 por tropa Goblin, com mínimo 5; descontos de Altar também respeitam esse mínimo. Goblins que nascem ortogonalmente adjacentes à Torre concluída recebem +1 vida; não é uma aura retroativa e várias Torres próximas não multiplicam esse bônus. Reforço custa 4 e consome a carta Goblin comum da mão. A casa pode ficar longe da Torre, mas deve estar livre, fora dos castelos e de toda área de invocação inimiga. O reforço entra sem ação.

**Habilidade: Reforço Goblin.** Energia: 4. Necessita de um Goblin na sua mão. Consome essa carta e invoca o Goblin em qualquer casa livre da arena, exceto na área da base inimiga. Ele nasce sem poder agir neste turno.

### Torre Real

Identificador: `royal_tower` · BÁSICA · RARA.

Exige 12 cidadãos e ausência de cartas próprias Goblin/Mago na arena no lançamento. Ao concluir a obra, concede +3 vida máxima e cura 3 de todas as construções aliadas concluídas existentes, inclusive ela; não é uma aura aplicada às próximas obras. Abriga um Arqueiro com +1 alcance e +1 dano. Dá +1 alcance a Arqueiros aliados nas oito casas vizinhas, sem empilhar com o bônus de montagem. O atributo impresso de dano 5 não autoriza ataque próprio: seu alcance é zero.

## Fontes e manutenção

- Valores, categorias e textos: [cardCatalog.js](../packages/shared/src/cardCatalog.js).
- Descontos e requisitos: [cardCosts.js](../packages/shared/src/cardCosts.js).
- Cotas e validação: [deckRules.js](../packages/shared/src/deckRules.js).
- Movimento e alcance: [boardRules.js](../packages/shared/src/boardRules.js).
- Casas e estradas: [kingdomEconomy.js](../packages/shared/src/kingdomEconomy.js).
- Aplicação autoritativa: [ações do servidor](../apps/server/src/game/actions/), [combate](../apps/server/src/game/combat.js), [efeitos de reino](../apps/server/src/game/kingdomEffects.js) e [efeitos de batalha](../apps/server/src/game/battleEffects.js).

Ao mudar uma carta, atualize a tabela, a nota da carta, os exemplos do guia e os testes relevantes na mesma mudança. Evite tratar texto de carta como prova de uma interação quando o motor mostra comportamento diferente.
