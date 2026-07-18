# Mesa de Guerra — tabuleiro 3D

Protótipo de tabuleiro medieval 3D 15×15 criado com Three.js. Inclui três miniaturas procedurais de alta tesselação — mago, guerreiro e arqueira — com materiais de pedra, metal, couro, tecido e madeira. O HUD permanece em HTML/CSS, separado da cena WebGL. As sombras projetadas estão desativadas para manter a leitura limpa da grade.

As miniaturas usam escala de tabuleiro e estão centralizadas na grade: a silhueta completa de cada unidade cabe em uma única casa de 1,08 × 1,08 unidade.

O HUD dark fantasy mostra os dois reinos, jogador ativo e rodada. Ao selecionar uma unidade, exibe HP, dano, movimento, custo, disponibilidade e descrição da habilidade especial. O botão **Encerrar turno** alterna o jogador ativo.

A bandeja inferior contém seis cartas fictícias completas. Cada carta informa nome, descrição, vida, dano, movimento, custo, habilidade, raridade e tipo. No hover a carta sobe para leitura; no clique permanece selecionada.

## Executar

```powershell
npm install
npm run dev
```

Abra o endereço HTTP exibido pelo Vite (normalmente `http://localhost:5173`).

## Interação

- Arrastar: girar a câmera mantendo a visão superior
- Scroll: zoom
- Clique: selecionar uma tropa

## Build de produção

```powershell
npm run build
npm run preview
```
