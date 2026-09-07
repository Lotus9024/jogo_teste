# Guia do jogador

[Início](../README.md) · [Catálogo de cartas](CATALOGO-DE-CARTAS.md) · [Revisão das regras](REVISAO-DAS-REGRAS.md)

Este manual explica a partida online atual de **Tronos em Ruínas**, com foco no duelo de dois jogadores. Os números foram conferidos no catálogo e no motor do jogo. Os modos de três e quatro jogadores são experimentais; suas limitações estão na revisão das regras.

## 1. Seu objetivo

Você governa um castelo, administra energia e cidadãos e joga cartas para formar um exército. Vença reduzindo a vida do castelo adversário de **10 a zero**. Construções ajudam a proteger seu campo e desenvolver sua economia; destruir uma Casa rival também pode reduzir seus cidadãos e fazê-lo perder o nível 2.

O tabuleiro tem **15 × 15 casas**. O castelo ocupa **3 × 3 casas**: tropas não entram nessas casas, mas podem atacar o castelo quando pelo menos uma delas estiver ao alcance e com linha de ataque válida.

## 2. Sua primeira partida

1. Entre com uma conta ou escolha **Jogar sem login** e informe um nome de rei. Discord depende da configuração do serviço.
2. Abra **Deck**, selecione **7 cartas comuns, 5 incomuns e 3 raras** e salve. Cada carta ocupa uma vaga; não é possível escolher cópias repetidas. Seu Deck pode conter no máximo **um Altar**, Goblin ou Mago.
3. Escolha **Criar sala**. Para aprender, mantenha **2 jogadores**. Dê um nome à sala e escolha pública ou privada.
4. Em uma sala privada, passe o código de **seis caracteres** à pessoa com quem vai jogar. Ela abre **Entrar em salas**, informa o código e entra. Salas públicas aparecem na listagem.
5. A partida começa quando todos os lugares estão ocupados. O primeiro jogador ocupa o assento azul e começa; o segundo ocupa o vermelho. A câmera se adapta à sua perspectiva.
6. No seu turno, arraste uma carta da mão até uma casa de invocação destacada. Observe custo, tempo de construção e requisitos antes de soltar.
7. Planeje o próximo turno e pressione **Passar turno**. Você não precisa gastar toda a energia.

Se os botões de sala estiverem indisponíveis, confira se o Deck foi salvo completo e se a conexão foi estabelecida. Duas pessoas no mesmo computador precisam de perfis ou sessões de navegador separados; duas abas comuns compartilham o mesmo login.

### Uma composição para aprender as cartas

Este exemplo é válido pelas cotas e mostra combate, economia e magia. Não é uma recomendação de balanceamento competitivo:

| Raridade | Cartas |
| --- | --- |
| 7 comuns | Guerreiro, Guarda, Barreira de madeira, Operador, Cidadão, Casa de madeira, Rua |
| 5 incomuns | Arqueiro, Torre, Canhão, Área de construtor, Nevasca |
| 3 raras | Mago, Guerreiro Real, Torre Real |

Há uma escolha estratégica nesse exemplo: **Guerreiro Real e Torre Real exigem ausência de cartas próprias das categorias Mago e Goblin na arena ao serem lançados**. Você poderá experimentar esse requisito, sem presumir que todas as cartas do Deck combinam ao mesmo tempo.

## 3. Como ler a mesa

| Elemento | Significado |
| --- | --- |
| Energia | Recurso usado para jogar cartas e ativar habilidades |
| Vida | Resistência restante do seu castelo |
| Cidadãos | População fornecida por Casas, Cidadãos e Operadores |
| Nível do castelo | Indica os benefícios econômicos e a área de invocação |
| Turno e relógio | Quem pode executar ações normais e quanto tempo resta |
| Mão | Cartas disponíveis para jogar ou descartar |
| Indicador de vida da peça | Vida atual da tropa ou construção |
| Símbolo de habilidade | Ação especial da peça, quando disponível |
| Casas destacadas | Destinos e alvos indicados pela seleção atual |

Selecione uma peça ou passe o ponteiro sobre uma carta para consultar informações. Uma peça com a aparência de obra ainda não concluiu a construção. A confirmação do servidor determina a posição e os recursos finais; uma mensagem de erro informa por que uma intenção não foi aceita.

## 4. Controles

| Ação | Controle |
| --- | --- |
| Consultar carta ou peça | Passar o ponteiro / selecionar |
| Jogar uma carta | Arrastar da mão até o tabuleiro |
| Mover uma tropa | Selecionar e arrastar para um destino válido |
| Atacar | Arrastar sua tropa até um alvo válido; o Mago usa o comando de fogo |
| Girar a câmera | Arrastar uma região livre da cena com o botão esquerdo |
| Aproximar / afastar | Roda do mouse sobre a cena |
| Percorrer uma mão larga | Roda do mouse sobre a área das cartas |
| Habilidade contextual | Ícone da peça ou tecla **F** com a peça selecionada |
| Passar turno | Botão **Passar turno** ou **Enter**, fora de campos e botões |
| Descartar | Arrastar a carta à lixeira, ou selecionar a carta e clicar na lixeira |
| Configurações | Engrenagem |
| Fechar configurações / Deck / galeria DEV | **Esc**, conforme a janela aberta |

**F depende da peça**: no Mago ativa Ácido; em um Clone Goblin ativa Fortalecer Clone; na Torre Goblin inicia a escolha do reforço; nas demais peças disponíveis aciona a habilidade contextual. Para o **fogo do Mago**, clique no símbolo de fogo, escolha uma ou duas casas e clique novamente no símbolo para confirmar.

O campo 3D depende principalmente de ponteiro e arraste. Os controles de menu têm suporte de teclado, mas este manual não promete operação completa do combate apenas por teclado ou acessibilidade integral em dispositivos de toque.

## 5. Turnos, energia e cartas

### Turno e rodada

Cada jogador tem **120 segundos** para seu turno. Uma **rodada** é a passagem pelos turnos dos participantes. No duelo: Azul → Vermelho → nova rodada.

A partida começa com **7 cartas na mão**, **10 de energia** e castelo de **nível 1**. O primeiro turno não concede uma compra adicional à mão inicial.

No início dos próximos turnos seus, o jogo conclui obras prontas, recalcula o reino e seus efeitos, aplica os efeitos de início de turno, recupera energia e tenta comprar uma carta. Suas unidades ficam novamente disponíveis. Efeitos especiais podem incluir uma compra adicional ou uma escolha do Altar Mago.

Você recupera **3 de energia** por próprio turno, até seu limite. Energia não usada permanece. Uma Área de construtor ativa aumenta a recuperação para **4**, mesmo que você tenha várias. O limite é **10 no nível 1** e **12 no nível 2**.

O prazo normalmente faz o turno passar automaticamente. Há uma limitação conhecida com escolha do Altar Mago pendente ou mão acima de sete; resolva essas pendências antes de deixar o relógio terminar. Veja **R01** na revisão das regras.

### Deck, pilha e sorteio

O Deck que você monta tem **15 cartas diferentes**. Ele define quais cartas podem aparecer nas compras normais; não é uma fila de quinze compras únicas.

A pilha começa em lotes de **18 compras** e é renovada quando esvazia. Cartas podem aparecer repetidas na mão e na arena. Cada compra normal sorteia a raridade de acordo com seu nível:

| Nível do castelo | Comum | Incomum | Rara |
| --- | --- | --- | --- |
| 1 | 2/3, aproximadamente 66,7% | 1/3, aproximadamente 33,3% | 0% |
| 2 | 50% | 30% | 20% |

Essas são probabilidades de raridade, não a chance individual de cada carta. Há ajustes no sorteio: Operadores ficam menos prováveis se você já tiver um ou dois na mão; a Casa de madeira ganha um peso maior a partir da rodada 5 se ainda não tiver sido comprada. Isso **não garante** a compra de uma Casa. Altares têm uma restrição adicional descrita adiante.

### Limite da mão e descarte

A compra normal não acontece se você já tiver **7 cartas**. Compras especiais de Altares podem ultrapassar esse limite. Antes de passar o turno, jogue ou descarte até voltar a sete e conclua qualquer escolha do Altar Mago.

Você pode descartar no seu turno, sem gastar energia e sem receber reembolso ou compra imediata. Cartas jogadas também vão para o registro de descarte; esse registro não é a fonte única das compras futuras.

## 6. Invocação e construção

Na situação normal, cartas entram em uma casa livre **a até dois passos ortogonais da área ocupada pelo seu castelo**. No nível 2, a área de lançamento se expande lateralmente. Use o destaque visual como referência para os limites exatos.

Não é possível ocupar o interior de castelos. Construções e máquinas não podem cobrir uma estrada, e uma estrada não pode ser criada sob uma construção ou máquina. Tropas podem ocupar estradas. O Arqueiro pode compartilhar a casa com uma Torre aliada concluída, conforme a seção de combate.

Tropas geralmente entram sem uma ação normal disponível e precisam aguardar seu próximo turno. **Henry** é a exceção impressa: entra pronto para agir. **Espanquem** também concede prontidão às tropas Goblin lançadas depois do feitiço naquele turno. Existem divergências específicas envolvendo Clone e Henry, registradas em **R02/R03**.

Uma carta com construção de **1 rodada** conclui no início do seu próximo turno; com **2**, no início do segundo próximo turno, e assim por diante. Obras podem receber dano antes de terminar. Bônus econômicos e habilidades que exigem conclusão ainda não funcionam durante a obra. A **Casa Goblin** tem construção imediata, mas não nasce com a ação normal liberada.

## 7. Movimento e combate

### Distâncias

O movimento e o ataque são propriedades independentes. Um Arqueiro consegue se mover na diagonal, mas seu alcance de ataque utiliza distância ortogonal.

| Termo usado neste manual | Como contar |
| --- | --- |
| Reto | Mesma linha ou coluna; sem diagonais |
| Livre | A distância é o maior deslocamento horizontal ou vertical; uma diagonal vizinha vale 1 |
| Ortogonal | Some o deslocamento horizontal e o vertical; uma diagonal vizinha vale 2 |
| Ao redor, raio 1 | O centro e suas oito casas vizinhas, quando o efeito incluir o centro |
| Adjacência ortogonal | Somente as quatro casas que compartilham uma borda |

Na maioria das tropas, você escolhe **mover ou atacar** uma vez no seu turno. **Henry** pode mover uma vez e atacar uma vez, em qualquer ordem. As habilidades normais também consomem a ação da unidade. Não há custo adicional de energia para o movimento ou ataque comum.

Outras peças bloqueiam o caminho e a linha de ataque. Cada ação de movimento segue o trajeto direto verificado pelo jogo, sem fazer curvas automaticamente. Não é possível atravessar uma peça para chegar ao destino.

Um ataque comum atinge um inimigo válido e causa dano igual ao atributo de ataque, modificado pelos efeitos ativos. Não há rolagem de acerto nem contra-ataque automático. Ao chegar a zero de vida, a peça é removida. Quando um combatente comum derrota o alvo, avança para a casa dele se ela ficar livre; **Arqueiro e Canhão permanecem onde estavam**.

### Arqueiros e torres

O Arqueiro ataca a **3 ou 4 passos ortogonais**: um inimigo próximo demais está fora de alcance. Ele atira por cima de Barreiras de madeira, mas tropas e outras construções bloqueiam sua linha.

Arraste ou invoque um Arqueiro sobre uma **Torre** ou **Torre Real** aliada concluída e vazia. Só cabe um Arqueiro montado por torre. Montado, ele ganha **+1 de alcance máximo** e ignora peças na linha de tiro. O alcance mínimo continua 3. Ele **não pode sair da torre** por movimento; se a torre for destruída, o Arqueiro também é removido.

A Torre comum dá ao Arqueiro montado a instantânea **Rajada cardinal**: custa 2 de energia e atinge o primeiro inimigo em cada direção reta, até 3 casas, por 2 de dano. Na Torre Real, o Arqueiro montado ganha +1 de dano, mas não recebe essa rajada. Arqueiros no entorno de uma Torre Real concluída ganham +1 de alcance máximo; esse bônus não soma ao bônus de estar montado.

### Canhão e Operador

O Canhão precisa de um **Operador aliado disponível exatamente uma casa atrás**, considerando a direção do dono. Ele avança **uma casa para frente**, levando o Operador para sua antiga posição. A ação consome a disponibilidade dos dois.

O tiro também exige esse Operador e consome a ação dele. O Canhão atira somente **para frente**, na mesma linha, a **3–6 casas**. Causa **3 de dano no centro e 1 nas oito casas ao redor**, inclusive em aliados. Pode mirar uma casa sem tropa. Para causar dano ao castelo, use o ataque ao castelo; o dano de área em peças não equivale automaticamente a dano à base.

### Mago, fogo e Ácido

O fogo é o ataque normal do Mago: escolha **uma ou duas casas diferentes**, a até **3 passos ortogonais**, e confirme no símbolo de fogo. Não há bloqueio por peças. Cada casa recebe **2 de dano imediato** em seu ocupante ou na base inimiga atingida. Aliados também podem sofrer o efeito.

O fogo permanece temporariamente: entrar na casa pode causar **1 de dano**, e um ocupante que ainda não tenha recebido esse dano residual pode sofrê-lo quando o fogo expirar. No duelo, ele expira no fim do turno rival. Duas casas diferentes do mesmo castelo podem receber dano na mesma conjuração. Não presuma que uma casa em chamas é segura por estar vazia.

**Ácido** custa 4 e causa **3 de dano** em todas as peças ao redor do Mago, aliadas ou inimigas, poupando o próprio conjurador. O efeito não representa dano ao castelo nem destruição automática de estradas.

### Habilidades instantâneas

Uma instantânea pode ser usada **no turno rival**, desde que você tenha energia e ela esteja disponível. Não consome a ação normal. Os prazos de recarga atuais contam **turnos globais**: em um duelo, uma recarga de 2 retorna após dois avanços de turno. Não interprete “2 turnos” como dois turnos completos seus em todas as cartas; essa terminologia está em revisão.

## 8. Seu reino: Casas, estradas e nível 2

**Cidadãos não são energia**: não são gastos ao jogar cartas. São contados a partir do que você controla na arena.

| Fonte concluída | Cidadãos |
| --- | --- |
| Casa de madeira | 3; passa a 4 junto de Rua conectada ou 5 junto de Estrada de Pedregulhos conectada |
| Casa Goblin | 2; não recebe bônus de estrada |
| Cidadão | 1 enquanto estiver na arena |
| Operador | 1 enquanto estiver na arena |

Para conectar uma Casa, ela deve estar **ortogonalmente adjacente** a uma estrada concluída ligada ao seu castelo por outras estradas suas concluídas. A ligação da rede também é ortogonal. Duas estradas ao lado da mesma Casa não somam seus bônus: vale o maior bônus aplicável.

Estradas só podem ser colocadas dentro da sua área de reino, conectadas a uma borda do castelo ou a uma estrada sua já concluída. Elas não ampliam indefinidamente a área em que você pode construir.

A **Rua** dá +1 de movimento a uma tropa que começa o movimento sobre ela. A **Estrada de Pedregulhos** dá +2 somente a cartas Básicas. O bônus vem da casa de origem; ele não é acumulado a cada casa percorrida, nem exige que a tropa tenha o mesmo dono da estrada. O Canhão usa sua regra especial de avanço.

### Evolução automática

Com **8 cidadãos e pelo menos 1 estrada sua concluída**, o castelo vai automaticamente para o nível 2:

- o limite de energia sobe de 10 para 12;
- você ganha **2 de energia imediatamente**, respeitando o novo limite;
- sua área de invocação aumenta lateralmente;
- cartas raras entram no sorteio normal;
- no início do seu turno em rodadas pares, construções concluídas recuperam **1 de vida**, até sua vida máxima.

Perder cidadãos ou a última estrada e deixar de cumprir o requisito faz o castelo **voltar ao nível 1**. O limite de energia volta a 10. O nível não acrescenta vida à base. Níveis 3 e 4 presentes em controles DEV são ferramentas de teste, não progressão online implementada.

### Área de construtor

Uma Área de construtor concluída e ativa concede +1 de energia por turno e +1 de vida máxima/resistência às construções aliadas. O bônus de energia não acumula; o de resistência acumula entre Áreas ativas.

O efeito fica suspenso se houver uma **carta sua da categoria Goblin ou Mago na sua área de reino**. A Casa Goblin é da categoria Básica e não desativa o bônus por si só. A perda do bônus tem uma inconsistência conhecida em construções com pouca vida: **R06** na revisão.

## 9. Goblins, Altares e cartas reais

**Desordem** é o custo tático dos Goblins comuns, de Henry e do Bombardeiro: eles causam dano a construções Básicas aliadas concluídas próximas. A Casa Goblin é imune. O motor atual considera também diagonais e, no início do turno, limita o dano a 1 por construção afetada, mesmo perto de vários Goblins. Isso diverge de partes do texto das cartas; o detalhamento está em **R04/R05**.

O **Enxame Goblin** coloca três Goblins aleatoriamente em casas livres da sua área de lançamento; exige pelo menos três espaços. O **Clone Goblin** copia a última tropa Goblin que você lançou diretamente: Goblin, Henry ou Bombardeiro. Ele não copia Enxame, Casa, Torre ou Altar e não herda melhorias temporárias da peça original. Seu custo impresso é o da tropa copiada +2, antes dos descontos aplicáveis.

O **Altar Goblin** exige duas tropas Goblin suas na área do reino. Ao terminar, concede uma carta Goblin aleatória. O **Altar Mago** não pode ser lançado enquanto você controlar uma tropa Goblin; ao terminar, abre uma escolha de carta do seu Deck. Ambos reduzem em 1 os custos da respectiva categoria, respeitando o mínimo da carta.

Você só pode incluir **um Altar no Deck**. Depois de receber um Altar, ele fica bloqueado para novas compras enquanto estiver na mão ou na arena. Descartá-lo ou perdê-lo libera a possibilidade de recebê-lo novamente.

**Guerreiro Real** exige 10 cidadãos; **Torre Real**, 12. Ambos verificam a ausência de cartas próprias das categorias Goblin e Mago na arena ao serem lançados. A bênção do Guerreiro Real é aplicada aos Guerreiros aliados existentes quando ele entra. A bênção da Torre Real é aplicada às construções aliadas concluídas existentes quando ela termina. São melhorias concedidas naquele momento, não auras para peças lançadas no futuro.

Veja os números e requisitos das **26 cartas** no [Catálogo](CATALOGO-DE-CARTAS.md).

## 10. Reconexão, saída e espectadores

Se a conexão cair durante uma partida, o servidor reserva **240 segundos, ou 4 minutos**, antes de declarar derrota por desconexão no duelo. A reconexão exige a mesma identidade e uma partida ainda existente no servidor. O relógio da partida não representa uma pausa garantida durante esse período.

O botão **Sair · W.O.** exige um segundo clique em **Confirmar W.O.** dentro de quatro segundos. Confirmar abandona a partida e concede a vitória por desistência no duelo. Não confunda sair voluntariamente com uma desconexão temporária.

Salas públicas cheias permitem assistir. Espectadores veem o tabuleiro e informações públicas, sem a mão particular dos participantes, e não podem jogar ações. Para três e quatro participantes, eliminação, W.O. e alguns efeitos ainda têm limitações; esses modos não devem ser usados como referência de regras competitivas.

## 11. Desempenho e mesa de testes

Na engrenagem, selecione **Baixo** se a cena estiver lenta. Essa opção reduz o custo visual de resolução, sombras e detalhes. **Alto** preserva mais detalhes. A preferência fica salva no navegador. A centralização de câmera ao selecionar uma criatura pode ser desligada.

O **DEV MODE**, quando visível, abre uma mesa local com energia e cartas ilimitadas. Clique no baralho 3D para abrir a galeria e escolher cartas. As configurações DEV permitem mudar níveis, ativar construção instantânea e limpar o campo; a peça selecionada pode ser alterada ou removida. Esses controles não modificam a partida online. Use essa mesa para reconhecer peças e praticar controles; confirme regras no modo online.

## 12. Dúvidas frequentes

**Minha carta não entra.** Verifique turno, energia, espaço livre, área de lançamento, estrada sob a construção e requisitos específicos. Casa Goblin não pode ficar em uma das oito casas vizinhas de outra Casa Básica, inclusive outra Casa Goblin.

**Minha tropa não age.** Ela pode ter acabado de entrar, já usado a ação, estar em construção, montada numa torre ou sem movimento por Nevasca. Henry e efeitos Goblin têm exceções.

**Meu Arqueiro não ataca um alvo ao lado.** Ele precisa de pelo menos três passos ortogonais. Montá-lo em uma torre não reduz esse mínimo.

**Tenho uma carta rara no Deck, mas não a compro.** Compras normais no nível 1 não sorteiam raras. É preciso chegar ao nível 2; a compra continua aleatória.

**A Casa está perto de uma Rua e não recebe bônus.** A Casa precisa tocar a Rua por uma borda; a rede deve estar concluída, pertencer a você e alcançar o castelo. Casa Goblin não recebe esse bônus.

**Acabou a pilha; perdi?** Não. A pilha é renovada. Não há derrota por falta de cartas.

**Quero jogar contra o computador.** A IA do menu ainda está indisponível. A mesa DEV é uma alternativa para treino manual, sem adversário autônomo.

**A mensagem diz que o estado mudou.** Outra ação ou efeito chegou antes da sua intenção. Observe o estado atualizado e tente novamente, sem presumir que o arraste anterior foi confirmado.

**O jogo reiniciou e a sala sumiu.** Partidas vivem na memória do servidor. Persistência de conta e Deck não garante recuperação de uma partida após reinício do serviço.
