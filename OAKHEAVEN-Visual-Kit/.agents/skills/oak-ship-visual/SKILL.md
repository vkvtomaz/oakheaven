---
name: oak-ship-visual
description: Implementar AGORA o overhaul visual do OAKHEAVEN com as imagens reais de img, entregando primeiro mapa jogável, sem ficar só em plano ou auditoria.
---

# Ship visual — execução, não só planejamento

Objetivo: obter o máximo de resultado in-game verificável sem comprometer o jogo existente.

## Faça em sequência, sem exigir aprovações intermediárias de alterações locais reversíveis
1. Reconheça o projeto: leia `AGENTS.md`, `docs/OAK-VISUAL-PLAYBOOK.md`, `package.json`, renderizador, mapa, sprites e organização de `img`. Não suponha a versão do PixiJS.
2. Verifique `git status` e preserve alterações anteriores; não faça limpeza destrutiva.
3. Audite rapidamente os assets com `$oak-asset-audit`. Se disponível, execute `tools/oak_asset_inventory.py`. O inventário é auxiliar: inspecione as imagens visualmente e identifique os arquivos de maior valor. **Limite esta etapa ao necessário para começar a implementar**.
4. Se houver subagentes, delegue de modo breve a `oak_asset_curator` e `oak_art_director` a investigação, em paralelo, sem editar arquivos. Use `oak_gameplay_guard` para alertas sobre render/collision se necessário. Não espere subagentes para trabalho trivial; prossiga se indisponíveis.
5. Escolha o cenário inicial real do jogo, não uma demo separada. Defina internamente um mapa de arquivos a modificar e inicie a integração, usando `$oak-pixi-integration`.
6. Prioridade de maior impacto visível: (a) piso/caminhos/fundo, (b) props/arquitetura, (c) torres, herói e inimigos, (d) ataques/impactos, (e) HUD. Integre sprites/recortes realmente disponíveis. Não renderize uma ilustração inteira como sprite de objeto. Não deixe o principal representado por círculos/retângulos se já existir imagem correspondente aproveitável.
7. O objetivo mínimo é uma **fase que possa ser aberta e jogada** com novo visual, e depois ampliar para as demais fases se tecnicamente viável. Não reduza a missão a um único mockup ou screenshot não-interativo.
8. Rode comandos reais do projeto e verifique execução. Se possível, abra o jogo com browser tool, capture antes/depois e inspecione erros. Faça correções concretas. Use `$oak-visual-qa` no fechamento.
9. Entregue o que realmente foi implementado, sem anunciar jogo terminado se houver módulos/arte faltantes. Informe arquivos usados e não utilizados, impeditivos e comandos para rodar.

## Critério de aceite da primeira fase
- Entrada normal do jogo abre o mapa original com o novo visual (não app separado).
- Pelo menos terreno/caminho e os principais elementos de combate possuem integração real com imagens de `img` adequadas quando existirem.
- Escala, transparência e empilhamento fazem sentido; sem imagem esticada de modo distorcido.
- Torres ainda atiram; inimigos continuam seguindo rotas; HUD/input funcionam conforme jogo original.
- Nenhum arquivo de asset referenciado resulta em tela quebrada/404 conhecido.
- Build real foi executado, com resultado relatado. Screenshots reais somente se capturados.

## Regras contra maquiagem
- Não diga "integrei os sprites" apenas por importar imagens no código. Devem ser instanciadas e visíveis em runtime.
- Não gere dezenas de `Graphics` de substituição quando há imagens utilizáveis.
- Se uma referência contiver somente cena pronta, ela é direção visual; não force recortes ruins ou gere sprites falsos. Documente a lacuna.
- Se não conseguir conferir browser, diga claramente "visual em runtime não verificado" e forneça passo de verificação.
