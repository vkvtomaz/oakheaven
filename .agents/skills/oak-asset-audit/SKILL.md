---
name: oak-asset-audit
description: Encontrar, classificar e mapear imagens reais de img para elementos existentes no OAKHEAVEN antes de integrar sprites.
---

# Auditoria rápida de assets

1. Localize `img` com case variations e pastas de imagem efetivas do projeto. Não mova nem apague originais.
2. Se Python estiver disponível, execute `python tools/oak_asset_inventory.py --root . --output docs/visual` (Windows também pode usar `py`). O script gera `asset-inventory.csv` e `asset-inventory.json`; com Pillow instalado também cria contact sheets. Se não houver Python, siga manualmente.
3. Leia visualmente um conjunto representativo dos arquivos, individualmente ou em contact sheets; não baseie decisões só no nome.
4. Classifique cada candidato: `ready`, `needs-prep`, `reference-only`, `duplicate`, `unknown`. Inspecione transparência real, proporção, enquadramento, estilo, perspectiva, tamanho de renderização e presença de vários objetos.
5. Relacione assets prontos à implementação: terreno, caminho, props, construções, herói, torres, inimigos, efeitos e HUD. Para imagens grandes, indique se servirão como fundo ou se precisam de recorte; nunca force tileabilidade inexistente.
6. Produza um mapeamento breve e útil em `docs/visual/asset-map.md`, sem sobrescrever eventual mapeamento manual. Priorize assets aplicáveis imediatamente.
7. Informe bloqueios concretos ao coordenador em poucas linhas. Não pare o trabalho de implementação quando existir material suficiente.
