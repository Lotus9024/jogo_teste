# Miniaturas 3D

[Guia do jogador](GUIA-DO-JOGADOR.md) · [Arquitetura](ARQUITETURA.md)

As **21 miniaturas físicas** receberam novas geometrias. São as mesmas instâncias produzidas pelas fábricas usadas nas partidas, sem alteração de custo, vida, dano, alcance ou regras. Enxame invoca o modelo Goblin; ruas e feitiços mantêm suas apresentações próprias.

## Ver os modelos

Abra **Explorar miniaturas** no menu ou acesse [a galeria local](http://localhost:4173/models.html). Não precisa criar conta. Selecione a peça, arraste para girar e use a roda do mouse para aproximar. Com foco no visor, esquerda/direita giram a peça e cima/baixo ajustam a distância. **Restaurar vista** devolve o enquadramento inicial.

Construções compatíveis possuem **Ver em construção** e **Ver concluída**. Isso muda somente a peça exibida na galeria. A rotação automática inicia desligada e fica indisponível quando o sistema pede movimento reduzido. A galeria pode ser aberta em outra aba sem sair da partida.

## Direção das miniaturas

| Família | Mudanças |
| --- | --- |
| Guerreiro e Guarda | Torso esculpido, peitoral, ombreiras, elmos, tecido separado e armas com espessura; Guarda mantém escudo e lança |
| Arqueiro | Casaco de caça, capuz, capa, arco recurvo, flecha encaixada, aljava e mãos alinhadas |
| Operador e Cidadão | Avental, óculos/ferramentas de ofício; colete, provisões e forquilha no camponês |
| Goblins e Henry | Rostos, presas, orelhas e equipamento de sucata; Clone com acabamento arcano, Bombardeiro com recipientes de pólvora, Henry com duas lâminas e cachecol |
| Mago | Túnica com pregas, capuz vazado, grimório, detalhes bordados, cajado curvo e orbe em uma armação de bronze |
| Guerreiro Real e Torre Real | Coroas vazadas, símbolos de bronze e mantos/bandeiras com volume; herdam as novas bases Guerreiro/Torre |
| Casas, torres e Barreira | Telhas, armações, ferragens, portais, contrafortes e carpintaria; formas assimétricas nas construções Goblin |
| Canhão | Cano com interior aberto, ferragens, eixo, aros e raios nas rodas |
| Altares e Área de construtor | Santuário com cristal e inscrições, cairn com ossos e sucata e bancada de trabalho coberta |

## Organização para desenvolvimento

As fábricas ficam em `apps/client/src/assets/models/`, uma por família/peça. `characterPieceModels.js` tornou-se uma fachada de compatibilidade: não adicionar ali novas geometrias.

- `unitModelKit.js`: materiais e pedestal chanfrado, plataforma, anel e rig compartilhados.
- `miniatureGeometry.js`: perfis com espessura/chanfro e superfícies de tecido com pregas.
- `humanMiniatureKit.js`: anatomia e equipamento humanos, com buffers reutilizados nas formas repetidas.
- `creatureMiniatureKit.js`: anatomia, acessórios e materiais das criaturas.
- `models/createCardUnit.js`: continua sendo o ponto de criação da miniatura com os atributos reais da carta.
- `modelStudio.js`: consulta visual independente, sem conexão com autenticação ou partidas.

Preservar os nomes usados por animações, seleção e testes: `rig`, `unitPedestal`, `teamPlatform`, `selectionRing`, `mageStaff`, `mageFireOrb`, pontos de montagem e os grupos `*BuiltParts`/`*ConstructionParts`. A direção frontal está em `modelFrontZ`; o runtime orienta cada dono para o rival.

## Verificação e limites

Na entrega desta remodelagem: **272 testes passaram** (121 cliente, 123 servidor e 28 compartilhados), `npm run check` conferiu 216 módulos e o build dos três workspaces foi concluído. O playtest passou pelos sete grupos de fluxo, incluindo as 21 miniaturas, obras, teclado e viewport de 390px; não registrou exceções JavaScript. A auditoria estática da interface retornou zero achados. O build conserva o aviso de tamanho do chunk Three.js, agora em aproximadamente 641 kB minificado.

Os testes de modelos conferem limites da casa com escala 0,55, vértices finitos, normais, UVs, seleção por equipe, montagem do Arqueiro, estados de obra e continuidade das âncoras de animação. O cano do Canhão é verificado também por raycast para garantir que a boca esteja aberta. `scripts/playtest.mjs` percorre as 21 peças e estados de obra no navegador, além dos fluxos de partida já existentes.

Os humanos têm entre 3.432 e 4.098 triângulos no conjunto final medido. Arqueiro e Cidadão usam menos triângulos que antes; Guerreiro/Guarda ganham geometria para a nova armadura. Criaturas ficam na faixa de aproximadamente 6–8 mil triângulos. Detalhes repetidos de telhas usam instâncias. Isso não comprova aumento de FPS em toda situação: a comparação de desempenho da partida inteira exige benchmark com várias peças.

A iluminação de estúdio evidencia a forma; a aparência na arena depende das luzes e da qualidade gráfica selecionada. Não são modelos fotogramétricos nem arquivos externos baixados: a geometria permanece editável e versionada no projeto. Não houve mudança de balanceamento nem de ocupação lógica do tabuleiro.
