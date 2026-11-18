# Arena principal — polimento de 18/11/2026

Escopo desta passagem: somente a apresentação de `DefenseScene`, ondas 1 e 2. Travessia, floresta e Última Linha mantiveram sua apresentação anterior. Regras e dados de gameplay não foram alterados.

## Direção e composição

Diorama em 3/4 com pedra envelhecida, madeira escura, vegetação dessaturada e energia violeta. O santuário, o caminho original em S e a entrada inimiga formam a leitura principal. As áreas de construção ficam livres de construções decorativas.

Removidos desta arena: forja decorativa, dois telhados isolados, bloco de piso elevado, sucata e cristais espalhados, pequenos fragmentos aleatórios, círculos dourados do santuário, molduras azuis dominantes e barras verdes de torres com vida cheia.

Substituídos: torres/inimigos ilustrados da prancha por recortes dos renders individuais; retratos retangulares dos cards pelos mesmos sprites do mundo; piso repetido por composição com materiais suavemente mesclados; faixa de textura da estrada por pedras orientadas ao trajeto, acostamento de terra e transição com vegetação.

## Assets efetivamente instanciados

| Fonte em `img/` | Derivado | Altura no mundo |
| --- | --- | --- |
| `balesta-arco-voltaico.jpg` | `public/art/arena/arc_ballista.png` | 76 px |
| `forja-escoria.jpg` | `public/art/arena/slag_forge.png` | 70 px |
| `monolito-repulsor.jpg` | `public/art/arena/repulsor.png` | 86 px |
| `canhao-de-quitina.jpg` | `public/art/arena/chitin_cannon.png` | 56 px |
| `barricada-espinhos.jpg` | `public/art/arena/spike_barricade.png` | 40 px |
| `rastejador-de-eter.jpg` | `public/art/arena/scout.png` | 37 px |
| `golias-de-obsidiana.jpg` | `public/art/arena/brute.png` | 52 px |
| `tumulo-familia-kaelen.jpg` | `public/art/sanctuary.png` | 145 px |
| `itens-3d.jpg` | `public/art/ore.png` | 4 pedras decorativas de 12–23 px, em dois grupos |
| `itens-3d.jpg` e `exploracao-floresta.jpg` | amostras materiais em canvas | terreno e pedras da estrada |

Os sete novos recortes preservam os originais, removem o fundo e usam margem de aproximadamente 4 px ao redor da silhueta. Script: `tools/prepare-arena-assets.ps1`. O Alpha pertence à transição para a Última Linha e ficou fora deste polimento; seu concept completo não foi usado como sprite novo.

Escala uniforme, pivô na base e sombras de contato discretas padronizam os atores. O terreno é composto uma vez em 1920×1080, exibido em 960×540. Waypoints, largura lógica de estrada de 78 px, limites de construção, coordenadas dos atores e raios de colisão permanecem iguais.

A interface usa painel lateral de 208×358 e cabeçalho de 936×58, reduzindo a cobertura aproximada de 37% para 25% da tela. Cards usam nomes curtos, mesmos sprites do mundo e custos originais. O botão de onda chama a mesma ação de Enter. Ajuda fica abaixo da área construível.

## Verificação real

- `npm run build`: aprovado.
- `npm test`: 38/38 testes aprovados.
- `git diff --check`: aprovado.
- Chromium isolado com render WebGL/SwiftShader: arena carregou e foi capturada.
- Smoke por `KeyboardEvent` e `PointerEvent` no canvas real: construção, reparo/economia, upgrade com confirmação, cancelamento e botão de onda aprovados.
- 360 atualizações de combate: 3 inimigos ativos e 4 abates; movimento e ataques confirmados por asserções.
- As capturas usam a classe real `Game`/`DefenseScene` com uma fixture fixa de cinco torres, não um desenho ou mockup. A imagem “antes” reexecuta a apresentação anterior, preservada na fixture de comparação. Recursos da fixture não alteram os valores iniciais do jogo normal.
- A captura offline embute imagens para evitar a restrição de rede do executor; os caminhos normais da arena também foram conferidos no servidor Vite.

Capturas reais em `docs/visual/screenshots/`:

- `arena-before.png`: renderer anterior, mesma fixture e resolução.
- `arena-after.png`: arena polida em preparação.
- `arena-combat.png`: teste de inputs e combate, com estado após seis segundos simulados.

Ainda não existem frames de animação reais nos renders fornecidos. Poses estáticas continuam em uso. Esta passagem não modifica nem valida visualmente as demais fases.

## Arquivos desta passagem

`src/visual/arenaArt.ts`, `src/scenes/DefenseScene.ts`, `src/main.ts`, sete PNGs em `public/art/arena/`, `tools/prepare-arena-assets.ps1` e ferramentas de captura/fixture em `tools/arena-review.ts` e `tools/capture-arena.mjs`.

Executar: `npm run dev`, abrir o endereço do Vite e seguir o ciclo normal até a defesa. Para repetir a captura de preparação: `node tools/capture-arena.mjs arena-after`. Para repetir o smoke: `node tools/capture-arena.mjs arena-combat --combat` (Chrome instalado no caminho indicado pelo script).

Nenhum commit, push ou deploy realizado.
