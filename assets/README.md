# Arquivos-fonte visuais

Esta pasta guarda somente arquivos editáveis de produção, como projetos Blender e mapas de textura em alta resolução.

- `objs/`: fontes de modelos 3D que ainda precisam ser editadas ou reexportadas.
- `textures/`: pacotes-fonte de materiais e suas texturas auxiliares.
- `apps/client/public/assets/`: arquivos otimizados que o navegador carrega durante o jogo.

Os dois modelos de árvore usados em execução continuam separados em `public/assets/models/trees`. Como a fonte Blender da segunda variação era idêntica à da primeira, somente uma cópia editável foi mantida em `assets/objs/tree-1`.

Não importe arquivos desta pasta diretamente no cliente. Exporte primeiro uma versão otimizada para `apps/client/public/assets` e referencie-a por `/assets/...`.
