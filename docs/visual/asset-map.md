# OAKHEAVEN — integração visual

Atualização de 18/11/2026: a arena principal recebeu um polimento separado, agora verificado em Chromium com screenshots e smoke de inputs/combate. Consulte `docs/visual/arena-polish.md` para o mapeamento vigente dessa arena. O registro abaixo descreve a integração inicial e suas limitações naquele momento.

O jogo original continua em PixiJS 8 + TypeScript + Vite, em 960×540. A entrada do portal inicia a travessia existente. As melhorias seguem o ciclo normal: travessia, coleta, retorno, construção, ondas 1–2 e Última Linha.

## Fontes e integração

| Imagem original em `img/` | Tratamento | Instanciação nas cenas |
| --- | --- | --- |
| `spritesheet.jpg` | Nove recortes estáticos, remoção do fundo conectado às bordas, exclusão das legendas | Kaelen na travessia/floresta/Última Linha; scout, brute, alpha e cinco torres na defesa e Última Linha |
| `itens-3d.jpg` | Recortes separados de pedra, telhado, ponte, plataforma rúnica, madeira, sucata, minério e cristal | Props, plataformas, bônus, recursos coletáveis e portal; fragmentos de cristal nos impactos elétricos |
| `itens-3d.jpg` | Amostra do topo do piso, repetida em canvas | Estrada que acompanha exatamente `MAIN_ROAD_DRAW_POINTS`; chão da travessia e caminhos da floresta |
| `praca-de-oakheaven-2-5d.jfif` | Recorte apenas dos primeiros 790 pixels verticais, escala uniforme, enquadramento lateral | Fundo arquitetônico da travessia, sem incluir o personagem pintado na parte inferior |
| `exploracao-floresta.jpg` | Pequena amostra ambiental sem rótulos ou personagens; repetição e iluminação em canvas | Textura orgânica de chão na floresta e defesa; a cena completa NÃO é usada como mapa |
| `forja-do-kaelen.jpg` | Recorte com transparência | Forja ambiental na travessia e arena |
| `tumulo-familia-kaelen.jpg` | Recorte com transparência | Santuário na defesa/Última Linha e marco ambiental da travessia |
| `kaelen3.jpg`, imagens individuais das cinco torres e `capa=oakheaven.jpg` | Pré-carregamento; enquadramento uniforme, sem deformação | Retrato, cards existentes de construção e título |

Os 19 PNGs derivados ficam em `public/art/`. Os originais permanecem intactos. Recriação no Windows, sem instalar pacotes:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File tools/prepare-visual-assets.ps1
```

`plataforma-travessia.jpg`, cenas completas com HUD, imagens de chefes futuros e `vfx.jpg` permanecem referências. Não existem frames suficientes para inventar animações de caminhada/ataque; os atores usam poses estáticas reais. Arcos elétricos, indicadores de alcance, pulsos e sinais de combate continuam procedurais. Os impactos elétricos incluem fragmentos da arte de cristal.

## Arquivos de implementação

- `src/visual/art.ts`: carregamento explícito, parser para JFIF, sprites, sombras, recortes ambientais e texturas de terreno calculadas uma vez.
- `src/main.ts`: espera a arte antes de criar o jogo.
- `src/visual/layers.ts`: ordenação de entidades por profundidade.
- `src/scenes/EnhancedPlatformScene.ts`: cenário, plataformas, bônus e Kaelen; superfícies e física originais.
- `src/scenes/ForestScene.ts`: terreno, props, recursos e Kaelen; posições e regras originais de coleta/retorno.
- `src/scenes/DefenseScene.ts` e `src/scenes/LastStandScene.ts`: cenário compartilhado, torres e inimigos; barras reposicionadas, estados de dano preservados.
- `src/visual/sanctuary.ts`, `src/visual/vfx.ts`: santuário e impactos com arte.
- `src/visual/ui.ts`, `src/scenes/TitleScene.ts`: proporção preservada em cards e capa.
- `src/core/Game.ts`: libera contextos gráficos nas transições sem destruir texturas compartilhadas.

Não foram alterados custos, dano, alcance, velocidade, colisões, waypoints, duração da expedição ou progressão. O nó de madeira mantém a lógica de árvore, mas aparece como madeira coletável; falta uma árvore verde isolada adequada.

## Verificação e limites

- `npm run build`: executado com sucesso (TypeScript + Vite).
- `npm test`: 38 testes existentes aprovados.
- `git diff --check`: sem erros de whitespace.
- PNGs inspecionados visualmente durante o preparo; caminhos e empacotamento conferidos no build.
- Servidor Vite iniciado em `http://127.0.0.1:5173/`.
- **Visual em runtime não verificado.** O navegador integrado falhou com `ERR_CONNECTION_TIMED_OUT`; o controle do Chrome foi encerrado pelo ambiente por não conseguir determinar a URL com confiança. Uma checagem HTTP local também foi bloqueada por `WinError 10013`. Não há screenshot real nem smoke-test de combate no navegador nesta entrega.

Ainda precisam de validação visual no navegador: escala final de props, detalhes das bordas, repetição das texturas, profundidade e leitura das barras em combate. Ainda faltam animações reais e vegetação isolada; alguns recortes podem conservar halos suaves de iluminação. Não se trata de arte final aprovada.

## Executar

```powershell
npm run dev
```

Abra o endereço mostrado pelo Vite, clique em **Jogar agora** e depois em **Iniciar defesa**. A/D e Espaço controlam a travessia; WASD e E controlam movimento/coleta na floresta. Construa pelo painel ou teclas 1–5 e use Enter para iniciar as ondas. A Última Linha preserva os comandos existentes de movimento, martelo e reparo.

Nenhum commit, push ou deploy foi realizado.
