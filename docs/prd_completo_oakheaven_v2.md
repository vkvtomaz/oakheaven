# OAKHEAVEN — PRD Completo da Aplicação (v2: Gameplay, Level Design e Direção Visual)

**Finalidade:** fornecer contexto técnico, sistêmico e visual completo para que o Codex (ou outro agente de engenharia/game design) evolua OAKHEAVEN de forma incremental, substituindo primitivas provisórias e refinando o loop tático sem partir de premissas incorretas.  
**Estado base documentado (Baseline):** protótipo jogável após o commit `6ff27d3`.  
**Stack obrigatória:** PixiJS 8.23, TypeScript 7 e Vite 8.  
**Plataforma atual:** navegador desktop, teclado e mouse.  
**Resolução lógica:** $960 \times 540$ pixels (proporção $16:9$), escalada proporcionalmente por CSS.

---

## 1. Resumo Executivo e Lore Oficial

### 1.1 Conceito de Jogo
OAKHEAVEN combina:
- travessia lateral rápida com escolha de risco (`PlatformScene`);
- exploração e coleta de recursos com tempo limitado (`ForestScene`);
- planejamento tático, construção e evolução de torres (`DefenseScene` — Waves 1 e 2);
- batalha climática exclusivamente em arena top-down unindo tower defense e combate direto de ação (`LastStandScene` — Wave 3: **A Última Linha**).

### 1.2 Universo e Fantasia Narrativa
Durante vinte invernos, **Kaelen** (44 anos, quase dois metros de altura, ex-comandante da Vanguarda de Ferro e mestre em engenharia de cerco) viveu para a guerra. Cansado do sangue, retirou-se para o vale isolado de **OakHeaven** como ferreiro e lenhador ao lado de sua esposa **Elena** (curandeira) e de seus dois filhos, **Toren** (12 anos) e **Lyra** (7 anos).

Numa noite sem lua, monólitos negros dos invasores **Ceifadores de Éter** rasgaram o céu para drenar o núcleo energético do vale, corrompendo a flora e a fauna locais. Um disparo orbital destruiu a casa de Kaelen, tirando a vida de sua esposa e de seus dois filhos e dizimando a vila. Único sobrevivente, Kaelen enterrou Elena, Toren e Lyra no alto da colina sob uma velha árvore petrificada — o **Santuário** — e jurou que nenhuma criatura pisará sobre o túmulo de sua família.

Vestindo sua antiga armadura medieval reforçada com placas de quitina alienígena e empunhando um martelo de guerra híbrido energizado por cristal de éter, Kaelen coleta materiais durante o dia, ergue engenhos híbridos de defesa e entra pessoalmente na arena quando a última linha ameaça romper.

### 1.3 Mapeamento entre Código e Lore

| Identificador no Código | Nome Oficial na Lore / UI | Papel no Jogo |
| :--- | :--- | :--- |
| `kaelen` | Kaelen, o Último Guardião | Protagonista jogável (coleta, reparo e combate com martelo) |
| `sanctuary` | Santuário da Colina (Túmulo da Família) | Núcleo defensivo sob a árvore petrificada (3 lápides + aura dourada) |
| `Scout` | Rastejador de Éter | Inimigo quadrúpede rápido e frágil (rota e flancos) |
| `Bruto` | Golias de Obsidiana | Tanque encouraçado lento e resistente com núcleo violeta |
| `Alpha` | O Carrion / Alpha de Éter | Chefe da Noite 1 (colosso biomecânico com rugido supressor) |
| `Balesta Voltaica` | Balesta de Arco Voltaico | Torre de alvo único e longo alcance (feixe elétrico) |
| `Forja de Escória` | Forja de Escória | Torre de área contínua e lentidão (plasma fervente) |
| `Monólito Repulsor` | Monólito Repulsor | Torre de pulso gravitacional e controle de grupo (empurrão) |
| `Canhão de Quitina` | Canhão de Estilhaços de Quitina | Artilharia pesada de curto alcance (múltiplos alvos) |
| `Barricada Energizada` | Barricada de Espinhos Energizados | Bloqueio físico de estrada com dano de contato |

---

## 2. Decisões Inegociáveis do Projeto

Estas regras definem a identidade técnica e de design do projeto e **não devem ser violadas** pelo Codex:

1. **Waves 1 e 2** permanecem tower defense tático em visão superior (`DefenseScene`).
2. **Wave 3 (`LastStandScene`)** é **exclusivamente arena top-down**; nunca deve voltar a ser plataforma lateral.
3. **Perspectiva lateral (`PlatformScene`)** pertence unicamente à travessia entre a vila e a floresta.
4. **Movimentação de Kaelen** ocorre em oito direções (diagonal normalizada) tanto na `ForestScene` quanto na `LastStandScene`.
5. **Flanqueadores** abandonam a estrada principal na Wave 3, caçam torres vivas, recebem dano reduzido das torres ($45\%$) e dano integral de Kaelen ($100\%$), tornando o jogador indispensável.
6. **Persistência real:** as torres construídas persistem na batalha final através de `GameState` e do mesmo `WaveSystem`.
7. **Stack limpa:** manter PixiJS 8.23 + TypeScript 7 + Vite 8, sem motores externos de física ou pathfinding complexo (manter colisões geométricas simples AABB/circulares e navegação por waypoints/alvos).
8. **Qualidade de build:** respeitar `erasableSyntaxOnly`, evitar *parameter properties*, manter `noUnusedLocals` e `noUnusedParameters` ativos e preservar `npm run build` e `npm test` passando a cada incremento.

---

## 3. Estado Atual da Aplicação (Baseline Commit `6ff27d3`)

*Seção de referência do que já está implementado no código antes das melhorias deste PRD v2.*

### 3.1 Fluxo Atual implementado
~~~text
Inicialização
    -> Travessia de ida (PlatformScene - lateral)
    -> Exploração e coleta (ForestScene - top-down, 120s compartilhados)
    -> Travessia de retorno (PlatformScene - lateral)
    -> Preparação e Wave 1: A Incursão (DefenseScene - top-down)
    -> Preparação/Reparos e Wave 2: O Cerco (DefenseScene - top-down)
    -> Wave 3: A Última Linha (LastStandScene - arena top-down com Kaelen)
    -> Vitória ou Derrota -> Reinício completo (Tecla R)
~~~

### 3.2 Economia e Coleta Atuais (`ForestScene`)
- **Tempo atual:** 120 segundos compartilhados entre travessia e floresta (`forcedRetreat = true` ao zerar).
- **Reserva inicial no `GameState`:** 3 Madeiras, 1 Ferro, 0 Éter, 0 Quitina.

| Nó | Recurso | Qtd. Nós | Recursos/Nó | Golpes | Tempo/Golpe | Tempo/Nó | Máximo Total (c/ inicial) |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| Árvore | Madeira (M) | 4 | 3 | 6 | $0{,}5\text{ s}$ | $3{,}0\text{ s}$ | 15 |
| Destroços | Ferro (F) | 3 | 2 | 8 | $0{,}6\text{ s}$ | $4{,}8\text{ s}$ | 7 |
| Cristal | Éter (E) | 2 | 1 | 12 | $1{,}0\text{ s}$ | $12{,}0\text{ s}$ | 2 |
| Carcaça | Quitina (Q) | 2 | 2 | 8 | $0{,}8\text{ s}$ | $6{,}4\text{ s}$ | 4 |

### 3.3 Torres Atuais (`towers`)
- Reparo entre waves (`DefenseScene`): clique sem seleção, custa 1 Madeira, restaura $+35\text{ HP}$ (torre destruída não reconstrói).
- Reparo em combate (`LastStandScene`): segurar `E` por 45 ticks ($\approx 0{,}75\text{ s}$), custa 1 Madeira, $+35\text{ HP}$, interrompido se sofrer dano ou sair do alcance.

| Torre | Função | Custo Atual | Alcance | Dano | Intervalo (ticks) | HP |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| Balesta Voltaica | Alvo único (mais próximo do santuário) | 3M + 1F | 220 | 2,0 | 30 | 100 |
| Forja de Escória | Área contínua + lentidão ($55\%$ vel.) | 2M + 2F + 1E | 110 | 0,8 | 40 | 120 |
| Monólito Repulsor | Empurrão radial (fraco no Bruto/Alpha) | 2M + 1F + 2E | 125 | 0,0 | 85 | 110 |
| Canhão de Quitina | Até 3 alvos simultâneos | 2M + 2F + 2Q | 135 | 3,0 | 60 | 140 |
| Barricada Energizada | Bloqueio na estrada + dano contínuo | 3M | contato | 0,7 | contínuo | 180 |

*(Nota: $60\text{ ticks} \approx 1\text{ segundo}$.)*

### 3.4 Inimigos, Waves e Kaelen Atuais
- **Inimigos base:**
  - `Scout`: $6\text{ HP}$, vel. $1{,}55$, raio $12$, dano $1$ (Wave 3 rota: $1{,}45\times = 9\text{ HP}$; flanco: $1{,}8\times = 11\text{ HP}$).
  - `Bruto`: $16\text{ HP}$, vel. $1{,}10$, raio $17$, dano $2$ (Wave 3 rota: $1{,}55\times = 25\text{ HP}$; flanco: $1{,}8\times = 29\text{ HP}$).
  - `Alpha`: $85\text{ HP}$, vel. $0{,}80$, raio $27$, destrói santuário ao tocar (Wave 3: $1{,}9\times = 162\text{ HP}$, possui 1 rugido único que aumenta cooldown das torres).
- **Waves atuais:**
  - Wave 1 (*A Incursão*): 8 Scouts (intervalo 48 ticks) -> Recompensa: 2 Madeiras.
  - Wave 2 (*O Cerco*): 8 Scouts + 4 Brutos (intervalo 40 ticks) -> Recompensa: 3 Madeiras.
  - Wave 3 (*A Última Linha*): 32 inimigos (23 Scouts, 8 Brutos, 1 Alpha por último; 8 são flanqueadores norte/sul com $+12\%$ vel., $+25\%$ dano de contato, $45\%$ dano recebido de torres e $100\%$ de Kaelen).
- **Kaelen atual na Wave 3:** $100\text{ HP}$, velocidade $4$, ataque em `Espaço` ou `F` (cone frontal alcance $66$, dano $4$, contra Alpha $3{,}2$, cooldown $22\text{ ticks}$, **apenas 1 hit por golpe**), invulnerabilidade de $42\text{ ticks}$ ao sofrer contato.

### 3.5 Arquitetura de Arquivos Existente
- **Núcleo:** `main.ts`, `Game.ts`, `Scene.ts`, `Input.ts`, `GameState.ts`.
- **Sistemas e Dados:** `ExpeditionSystem`, `WaveSystem`, `repair`, `towerCombat`, `towers`, `enemies`.
- **Cenas:** `PlatformScene`, `ForestScene`, `DefenseScene`, `LastStandScene`.
- **Visual atual no código:** formas geométricas primitivas do PixiJS (`Graphics`), sem texturas/sprites carregados e sem áudio.

---

## 4. Direção Visual e Integração da Pasta `img/` (Especificação para o Codex)

O repositório agora conta com **36 arquivos de referência visual, assets base e mockups de UI/cenas** dentro da pasta `img/`. O Codex deve inspecionar o diretório `img/` e utilizar essas referências para substituir o visual puramente geométrico por uma estética **Dark Fantasy Medieval + Sci-Fi Alienígena Bioluminescente**.

### 4.1 Inventário Completo de Referências na Pasta `img/`

| Categoria | Arquivos em `img/` | Uso Técnico e Visual no Projeto |
| :--- | :--- | :--- |
| **Spritesheet Top-Down** | `img/spritesheet.jpg` | Grade ortográfica $70^\circ$ com fundo sólido magenta escuro (`#2A1B2E`) contendo Kaelen, Scout, Bruto, Alpha e as 5 torres para extração/recorte de sprites 2D ou referência direta de silhueta top-down. |
| **Guia de VFX e Feedback** | `img/vfx.jpg` | **Referência primária de programação visual no PixiJS** para os 6 efeitos: *Voltaic Beam*, *Slag Slow Zone*, *Repulsor Pulse*, *Kaelen Hammer Cleave & Slam*, *Flank Alert UI* e *Alpha Suppressor Roar*. |
| **Mockups de HUD e Cenas** | `img/hud-waves.jpg`<br>`img/hud-wave3.jpg`<br>`img/hud-wave3-2.jpg`<br>`img/exploracao-floresta.jpg`<br>`img/plataforma-travessia.jpg` | Referências exatas de layout de interface, posicionamento de barras, estrada sinuosa, portal azul à esquerda na floresta, rota dupla na travessia, alertas ciano de flanco e barra de chefe na Wave 3. |
| **Key Art e Telas** | `img/capa-oakheaven.jpg`<br>`img/poster.jpg` | Artes oficiais mostrando Kaelen na colina com os ecos dourados da família. `img/capa-oakheaven.jpg` ($16:9$) deve ser usada como fundo da **Tela Inicial (Title Overlay)** e tela de Vitória. |
| **Props Centrais e Kit** | `img/tumulo-familia-kaelen.jpg`<br>`img/forja-de-kaelen.jpg`<br>`img/itens-3d.jpg` | Design do Santuário (árvore petrificada + 3 lápides + aura dourada), Forja de Kaelen e nós coletáveis de recursos (sucata, minério de ferro, cristais de éter, base rúnica de torre). |
| **Torres Individuais** | `img/balesta-arco-voltaico.jpg`<br>`img/forja-escoria.jpg`<br>`img/monolito-repulsor.jpg`<br>`img/canhao-de-quitina.jpg`<br>`img/barricada-espinhos.jpg` | Detalhamento de cores, materiais (carvalho escuro, ferro batido, cobre e cristal/plasma violeta) para renderização das torres e ícones da barra de construção `[1]` a `[5]`. |
| **Protagonista e Família** | `img/kaelen1.jpg`, `img/kaelen2.jpg`, `img/kaelen3.jpg`<br>`img/elena-esposa.jpg`<br>`img/toren-filho.jpg`<br>`img/lyra-filha.jpg` | Referências de Kaelen (armadura com quitina roxa e martelo energizado) para retrato de HUD/sprite, e da família para elementos narrativos sutis / ecos dourados no Santuário. |
| **Inimigos Atuais (Noite 1)** | `img/rastejador-de-eter.jpg`<br>`img/golias-de-obsidiana.jpg`<br>`img/golias-de-obsidiana2.jpg`<br>`img/carrion-boss.jpg` | Design oficial do `Scout` (Rastejador), `Bruto` (Golias com cristal nas costas) e `Alpha` (Carrion colossal com sino/cristais). |
| **Expansão Futura (Atos 2–3)** | `img/arraia-de-plasma.jpg`<br>`img/arraia-de-plasma-costas.jpg`<br>`img/parasita-esporo.jpg`<br>`img/sentinela-prismatica.jpg`<br>`img/tecela-das-cinzas.jpg`<br>`img/executor-orbital.jpg` | Assets reservados para noites futuras (Voador, Sabotador, Atirador e Chefes dos Atos 2 e 3). Não obrigatórios na Noite 1. |
| **Atmosfera da Vila** | `img/praca-de-oakheaven-dia.jpg`<br>`img/praca-de-oakheaven-noite.jpg`<br>`img/praca-de-oakheaven-2.5d.jfif` | Paleta de iluminação diurna vs. noturna, flora alienígena bioluminescente e arquitetura medieval arruinada. |

### 4.2 Estratégia Técnica de Renderização e Pipeline de Assets no PixiJS 8

Como os arquivos atuais em `img/` são imagens `.jpg`/`.jfif` com fundo de estúdio ou fundo chroma (`#2A1B2E` em `img/spritesheet.jpg`), **o Codex nunca deve carregar um `.jpg` bruto como quadrado opaco caminhando pelo mapa**. A atualização visual deve seguir duas frentes coordenadas:

1. **Extração Limpa de Texturas / Chroma-Key em Canvas Offscreen (ou Script de Pré-processamento):**
   - Criar um utilitário leve de carregamento (`src/visual/AssetLoader.ts` ou script em `scripts/`) que:
     - Carregue `img/capa-oakheaven.jpg`, `img/plataforma-travessia.jpg` e cenários como *backgrounds* ambientados (aplicando escurecimento/vinheta para garantir legibilidade total das entidades e do HUD em $960 \times 540$).
     - Recorte regiões de `img/spritesheet.jpg` removendo a cor de fundo `#2A1B2E` com tolerância de distância de cor em `HTMLCanvasElement` 2D antes de gerar `PIXI.Texture`, **ou** gere miniaturas circulares/emolduradas das imagens `img/balesta-arco-voltaico.jpg`, `img/kaelen3.jpg`, etc., para os **cards de UI e retratos do HUD** (onde molduras metálicas recortam perfeitamente fundos sólidos).
     - Mantenha **fallback procedural rico em `PIXI.Graphics` estilizado** (camadas detalhadas, contornos, brilhos e silhuetas fiéis) caso o carregamento assíncrono falhe em ambiente de teste headless (`npm test`), garantindo que nenhum teste unitário quebre por dependência de DOM/Canvas de imagem.

2. **Camadas de Renderização Padronizadas (`PIXI.Container`):**
   Em `ForestScene`, `DefenseScene` e `LastStandScene`, organizar a cena exatamente em 6 camadas (`zIndex` explícito):
   - `0 - groundLayer`: terreno base texturizado/estilizado, estrada em "S" com bordas de pedra, ruínas estáticas e bases rúnicas de posicionamento (`img/itens-3d.jpg`).
   - `1 - groundDecalLayer`: poças de plasma da Forja de Escória, aura dourada do Santuário, anéis de alcance de torre selecionada e círculos pulsantes de spawn nos flancos.
   - `2 - entityLayer`: Santuário, Barricadas, Torres, Nós de Recursos, Inimigos e Kaelen (ordenados sutilmente por `y` para sensação de profundidade $70^\circ$).
   - `3 - vfxLayer`: feixes elétricos, arcos do martelo, ondas de choque do Repulsor/Alpha, faíscas de impacto e partículas leves.
   - `4 - worldUiLayer`: barras de HP flutuantes compactas, anel circular de progresso ao reparar/coletar (`[Hold E]`) e ícones de status (lentidão roxa, cooldown quebrado do rugido).
   - `5 - hudLayer`: molduras fixas de ferro forjado e madeira escura seguindo `img/hud-waves.jpg` e `img/hud-wave3.jpg`.

### 4.3 Paleta Hexadecimal Oficial (Design System)

O Codex deve centralizar estas cores em um arquivo `src/visual/theme.ts`:

| Elemento Semântico | Hex Principal | Hex Secundário / Brilho | Referência Visual |
| :--- | :---: | :---: | :--- |
| **Moldura UI (Ferro Forjado / Ardósia)** | `#161822` | `#3A3F54` (borda metálica) | `img/hud-waves.jpg` |
| **Detalhe UI (Carvalho Escuro)** | `#2C1E16` | `#593E2E` | `img/forja-de-kaelen.jpg` |
| **Santuário / Ecos da Família (Âmbar)** | `#F5B942` | `#FFE699` (aura sagrada) | `img/tumulo-familia-kaelen.jpg` |
| **Energia de Éter / Plasma (Violeta)** | `#9D4EDD` | `#E0AAFF` (núcleo brilhante) | `img/vfx.jpg` |
| **Arco Voltaico / Portal Floresta** | `#4EA8DE` | `#90E0EF` | `img/balesta-arco-voltaico.jpg` |
| **Alerta de Flanco (Ciano Neon)** | `#00F5D4` | `#80FFDB` | `img/hud-wave3.jpg` / `img/vfx.jpg` |
| **Vida de Kaelen / Perigo / Rugido Alpha** | `#D90429` | `#FF4D6D` | `img/hud-wave3.jpg` / `img/vfx.jpg` |
| **Recursos (Madeira / Ferro / Éter / Quitina)** | `#C68B59` / `#A5B4FC` | `#C77DFF` / `#7209B7` | `img/itens-3d.jpg` |

### 4.4 Catálogo de VFX Obrigatórios (Baseado em `img/vfx.jpg`)

Cada ação mecânica deve ter representação gráfica imediata conforme os 6 painéis de `img/vfx.jpg`:

1. **Voltaic Beam (Balesta Voltaica):** linha poligonal quebrada em zigue-zague (3 a 5 segmentos com jitter aleatório) em `#90E0EF` sobre brilho externo `#9D4EDD` (duração $8\text{ ticks}$) + 4 faíscas radiais no alvo.
2. **Slag Slow Zone (Forja de Escória):** decalque circular persistente no raio $110\text{ px}$ em `#3C096C` translúcido ($35\%$ alpha) com anéis internos borbulhantes em `#9D4EDD` quando houver inimigos na área; inimigos afetados recebem contorno ou gotas violetas.
3. **Repulsor Pulse (Monólito Repulsor):** anel concêntrico duplo em `#E0AAFF` que expande do raio $15\text{ px}$ até $125\text{ px}$ em $14\text{ ticks}$ com fade-out gradual.
4. **Kaelen Hammer Cleave & Slam:**
   - Golpe básico: crescente semitransparente frontal cobrindo o cone de alcance com gradiente âmbar (`#F5B942`) e borda violeta (`#9D4EDD`) + *hitstop* visual de $3\text{ ticks}$ ao acertar múltiplos inimigos.
   - Golpe carregado (*Quebra-Terra*): anel sísmico rachado no chão (raio $75\text{ px}$) em ouro e violeta.
5. **Flank Alert UI:** triângulo direcional neon `#00F5D4` piscando nas brechas norte/sul + círculo de alvo pulsante no chão antes do spawn + silhueta/anel `#00F5D4` sob todo inimigo flanqueador vivo (comunicando visualmente que ele recebe $100\%$ de dano de Kaelen e apenas $45\%$ das torres).
6. **Alpha Suppressor Roar:** onda acústica escura carmesim/roxa (`#D90429` + `#7209B7`) expandindo a partir do Alpha; torres atingidas exibem pequeno ícone pulsante de engrenagem/relógio travado em vermelho enquanto durar a penalidade de cooldown.

### 4.5 Especificação Visual por Cena

- **Tela Inicial / Overlay de Partida (Nova camada leve em `Game.ts` ou `TitleScene`):** exibir `img/capa-oakheaven.jpg` ajustada em $960 \times 540$, título **OAKHEAVEN**, subtítulo curto da lore (*"Proteja onde Elena, Toren e Lyra descansam"*) e instrução `[Enter / Espaço] Iniciar Expedição`.
- **`PlatformScene` (`img/plataforma-travessia.jpg`):** fundo atmosférico de ruínas medievais e névoa violeta ao fundo, plataformas com textura de pedra/madeira escura, cronômetro centralizado no topo em moldura metálica e placas indicativas `< Santuário` e `Floresta >`.
- **`ForestScene` (`img/exploracao-floresta.jpg`):** portal azul espiralado à esquerda, solo musgoso com flora corrompida nos cantos, nós de recursos visualmente distintos (troncos de carvalho, destroços metálicos fumegantes, cristais roxos brilhantes e carcaças quitinosas), barra superior de tempo e contadores claros com ícones no canto superior direito.
- **`DefenseScene` (`img/hud-waves.jpg`):** sidebar vertical esquerda (`X: 0..95`) com 5 cards ilustrados (usando recortes das artes das torres em `img/`), atalhos `[1]`–`[5]`, custos coloridos por disponibilidade, estrada em "S" bem demarcada, Santuário à esquerda com árvore petrificada, 3 lápides e aura dourada (`#F5B942`), e tooltip contextual de reparo/upgrade ao passar o mouse sobre uma torre.
- **`LastStandScene` (`img/hud-wave3.jpg` e `img/hud-wave3-2.jpg`):** iluminação noturna dramática (contraste entre a aura dourada do Santuário à esquerda e a névoa violeta à direita), retrato de Kaelen + barra de vida no topo esquerdo, vida do Santuário no topo central, alertas ciano de flanco bem legíveis, anel circular `[Segure E]` ao reparar em combate e barra imponente do chefe **ALPHA** na base da tela assim que ele entrar na arena.

---

## 5. Evolução de Game Design e Loop de Gameplay

As alterações abaixo resolvem os gargalos diagnosticados no protótipo (ausência de escassez real nos 120s, armadilha econômica do Monólito de 2 Éteres, passividade nas Waves 1–2, ataque unitário de Kaelen e chefe esponja de HP), preservando integralmente a arquitetura atual.

### 5.1 Ciclo Diurno: Travessia com Risco e Escassez Real na Floresta
- **Problema atual:** extrair todos os 11 nós leva $63{,}2\text{ s}$ num relógio de $120\text{ s}$, permitindo limpar $100\%$ da floresta em toda partida.
- **Alteração na `ForestScene`:** reduzir o tempo total da expedição de $120\text{ s}$ para **$90\text{ s}$** e expandir o mapa para **15 nós** ($5$ Árvores, $4$ Destroços, $3$ Cristais de Éter e $3$ Carcaças de Quitina = $89{,}4\text{ s}$ de extração pura sem contar deslocamento). Torna-se matematicamente impossível coletar tudo, forçando o jogador a escolher sua build.
- **Alteração na `PlatformScene`:** dividir as plataformas em duas rotas:
  - **Rota Baixa (Estrada):** plana e segura ($\approx 8\text{ s}$ de travessia).
  - **Rota Alta (Telhados Quebrados):** exige saltos precisos ($\approx 5\text{ s}$ de travessia) e contém 1 feixe de sucata coletável por contato na ida ($+1$ Madeira instantânea).
- **Penalidade de `forcedRetreat`:** se o cronômetro zerar antes de entrar no portal azul, Kaelen retorna exausto perdendo até $2$ Madeiras do inventário (mínimo $0$), mas nunca perde a partida imediatamente.

### 5.2 Economia na Forja: Rebalanceamento do Monólito e Torres Tier 2
O estado `towers[]` em `GameState.ts` já possui o campo `tier`, atualmente fixo em `1`. Ativar o **Tier 2** na `DefenseScene` (atalho `Shift + Clique` ou botão contextual sobre torre com HP cheio) aprofunda decisões sem exigir árvore de talentos complexa.

| Torre | Custo Tier 1 | Custo Upgrade Tier 2 | Mudança Mecânica no Tier 2 |
| :--- | :---: | :---: | :--- |
| **Balesta Voltaica** | 3M + 1F | 2F + 1E | Dano sobe para $2{,}8$ e o raio salta para $+1$ inimigo próximo ($50\%$ dano). |
| **Forja de Escória** | 2M + 2F + 1E | 2M + 1E | Dano sobe para $1{,}3$, HP vai a $160$ e lentidão melhora de $55\%$ para $45\%$ da vel. |
| **Monólito Repulsor** | **2M + 1F + 1E** *(antes 2E)* | 2F + 1E | Tier 1 passa a causar **$1{,}0$ de dano** por pulso; Tier 2 aplica micro-stun de $20\text{ ticks}$. |
| **Canhão de Quitina** | 2M + 2F + 2Q | 2F + 2Q | Atinge até $4$ alvos simultâneos e dano sobe de $3{,}0$ para $4{,}2$. |
| **Barricada Energizada** | 3M | 2M + 1Q | HP máximo sobe de $180$ para $260$ e dano de contato sobe de $0{,}7$ para $1{,}2$. |

### 5.3 Ritmo das Waves 1 e 2 (Redução de Passividade)
- **Sobrecarga Tática de Kaelen (`DefenseScene`):** durante as Waves 1 e 2, clicar sobre uma torre ativa aciona **Sobrecarga de Éter** ($+35\%$ de cadência de tiro por $5\text{ s}$, recarga global de $15\text{ s}$). Mantém o jogador engajado observando o campo sem precisar colocar o avatar na arena antes da Wave 3.
- **Onboarding de Flanco na Wave 2:** a Wave 2 passa a ter `8 Scouts + 4 Brutos + 2 Scouts Flanqueadores` (1 norte, 1 sul nos segundos finais com alerta ciano), ensinando visualmente o comportamento lateral antes do caos da Wave 3, e recompensando `3 Madeiras + 1 Ferro`.

### 5.4 Combate de Kaelen e Chefe Alpha na Wave 3 (`LastStandScene`)
- **Martelo "Lamento de OakHeaven" (Cleave Frontal):**
  - Substituir o limite de `1 hit por golpe` por **até 3 alvos no cone frontal** (alcance $68\text{ px}$): causa $4{,}0$ de dano ao inimigo mais próximo e $2{,}5$ aos até dois inimigos secundários no arco, com empurrão leve e $3\text{ ticks}$ de *hitstop* visual.
- **Golpe Carregado — Quebra-Terra (Segurar `Espaço` ou `F` por $35\text{ ticks}$):**
  - Libera impacto circular ao redor de Kaelen (raio $75\text{ px}$), causando $7{,}0$ de dano em área, empurrão forte em Scouts/flanqueadores e recarga própria de $90\text{ ticks}$ ($1{,}5\text{ s}$).
- **Chefe Alpha em Dois Gatilhos Táticos ($162\text{ HP}$):**
  1. **Aos $70\%$ de HP ($\le 113\text{ HP}$) — Rugido Supressor:** emite onda escura que aumenta o cooldown das torres em raio $200\text{ px}$ por $5\text{ s}$ (com indicador visual de travamento).
  2. **Aos $35\%$ de HP ($\le 56\text{ HP}$) — Postura de Obsidiana:** durante $4\text{ s}$, o Alpha trava os pés, reduz o dano recebido de torres em $75\%$ e convoca $2$ Scouts flanqueadores extras. **Contra-ataque:** acertar o Alpha com o **Quebra-Terra** carregado de Kaelen durante essa postura quebra a blindagem imediatamente, atordoa o chefe por $60\text{ ticks}$ ($1\text{ s}$) e causa $+10$ de dano bônus.

---

## 6. Level Design Tático da Primeira Fase ($960 \times 540$)

Toda a geometria abaixo opera na resolução fixa $960 \times 540$ usando listas simples de waypoints e retângulos AABB, sem câmera móvel nem pathfinding dinâmico.

### 6.1 Planta da Praça Central (`DefenseScene` e `LastStandScene`)

Substituir uma rota horizontal simples por uma **Estrada Sinuosa em "S" com 4 Waypoints**, dobrando o tempo útil de cobertura das torres de curto alcance (`Forja` e `Canhão`) e criando bolsões claros de decisão:

~~~text
+--------------------------------------------------------------------------------+ (0,0) -> (960,0)
| [HUD] |                  [BRECHA FLANCO NORTE (610, 20)]                       |
| MENU  |                 [Ruína AABB Norte: (490,105, 85x24)]                   |
| TORRE |    (Retaguarda N)                           (WP2: Curva Alta 690,185)  |
|  1-5  |                    [Bolsão Nobre Norte]          /===========\         |
|       |   (SANTUÁRIO)        (390..470, 245)            /             \        |
| X:    |   (145, 270) <==(WP4: 190,270)====\   /==(555,270)==\          (WP1:   |
| 0..95 |   [3 Lápides]                      \ /  [Gargalo]    \====== 940, 270) |
|       |                                (WP3: 420,355)      [Bolsão Sul]        |
|       |    (Retaguarda S)               Curva Baixa       (640..720, 295)      |
|       |             [Ruína AABB Sul: (380,425, 85x24)]                         |
|       |                  [BRECHA FLANCO SUL (500, 520)]                        |
+--------------------------------------------------------------------------------+ (0,540) -> (960,540)
~~~

- **Faixa Lateral de Construção (`DefenseScene`):** `X: 0..95, Y: 0..540` (na `LastStandScene`, essa área vira margem murada fechada ou permanece limite oeste em `X >= 95` para manter coordenadas idênticas das torres herdadas!).
  - **Regra Crítica de Coordenadas:** o sistema de coordenadas $(x, y)$ das torres salvas em `GameState.towers[]` deve ser **$100\%$ idêntico** entre `DefenseScene` e `LastStandScene`.
- **Santuário da Colina:** centro em `(145, 270)`, raio de proteção `36 px` (proibido construir sobre ele).
- **Waypoints da Estrada Principal (largura visual da estrada: `48 px`):**
  1. `WP1 (Entrada Leste)`: `(940, 270)`
  2. `WP2 (Inflexão Alta Leste)`: `(690, 185)`
  3. `WP3 (Inflexão Baixa Central)`: `(420, 355)`
  4. `WP4 (Portão do Santuário)`: `(190, 270)` -> segue ao centro `(145, 270)`.
- **Gargalos Naturais para Barricadas (na estrada):**
  - Diagonal central `(555, 270)` — ponto onde torres dos dois bolsões centrais convergem fogo simultâneo.
  - Reta final `(260, 300)` — última trava para segurar o Alpha perto do Santuário.
- **Brechas de Flanco e Obstáculos Táticos (`LastStandScene` e fim da Wave 2):**
  - `Brecha Norte`: spawn em `(610, 20)`.
  - `Brecha Sul`: spawn em `(500, 520)`.
  - **2 Ruínas Sólidas AABB:** `Muro Desabado Norte (x: 490, y: 105, w: 85, h: 24)` e `Fonte Quebrada Sul (x: 380, y: 425, w: 85, h: 24)`. Impedem corrida cega em linha reta e canalizam flanqueadores por corredores previsíveis onde Kaelen pode interceptá-los.

### 6.2 Zoneamento da Floresta (`ForestScene` — $960 \times 540$)
- **Portal Azul de Retorno:** fixo à esquerda em `(75, 270)`, raio de interação `34 px`.
- **Zona 1 — Anel Seguro (`X: 160..380`):** 3 Árvores + 1 Destroço de Ferro (garante base mínima rapidamente).
- **Zona 2 — Anel Intermediário (`X: 400..670`):** 2 Árvores + 3 Destroços de Ferro + 2 Carcaças de Quitina, separados por dois troncos caídos horizontais (colisão AABB simples) que exigem contorno.
- **Zona 3 — Profundezas Corrompidas (`X: 720..900`):** 3 Cristais de Éter (`(840, 95)`, `(880, 270)`, `(830, 445)`) + 1 Carcaça de Quitina, exigindo deslocamento máximo sob pressão do relógio de $90\text{ s}$.

---

## 7. Áudio Procedural Leve (Sem Dependências Externas)

Como o projeto não possui arquivos de áudio nem bibliotecas externas além do PixiJS, implementar um sintetizador enxuto via **Web Audio API nativa** (`src/audio/SoundFX.ts`, $< 120$ linhas, com botão `M` para mutar e fallback silencioso em testes Node/headless):
- Impacto metálico grave no martelo de Kaelen e estrondo sub-grave no *Quebra-Terra*;
- Estalo agudo elétrico no tiro da Balesta Voltaica;
- Pulso ressonante grave no Monólito Repulsor;
- Bip duplo em ciano ao surgir alerta de flanco;
- Rugido distorcido de baixa frequência nas transições de fase do Alpha.

---

## 8. Roadmap Incremental de Execução para o Codex

Para evitar regressões, o desenvolvimento deve ocorrer em **três fases independentes e testáveis**, validando `npm run build` e `npm test` ao final de cada uma:

### Fase 1 — Overhaul Visual, HUD, Estrada em "S" e Quick Wins (Prioridade Máxima)
1. Criar `src/visual/theme.ts` e `src/visual/AssetLoader.ts` integrando as referências da pasta `img/` (`capa-oakheaven.jpg`, `spritesheet.jpg` com remoção de `#2A1B2E`, ícones/retratos das torres e de Kaelen, e fallbacks seguros para testes).
2. Implementar a **Tela Inicial (Title Overlay)** com `img/capa-oakheaven.jpg` e contexto curto de OakHeaven.
3. Reestilizar `PlatformScene`, `ForestScene`, `DefenseScene` e `LastStandScene` seguindo `img/plataforma-travessia.jpg`, `img/exploracao-floresta.jpg`, `img/hud-waves.jpg` e `img/hud-wave3.jpg` (6 camadas de renderização, Santuário com árvore petrificada + 3 lápides + aura dourada).
4. Implementar os **6 VFX de `img/vfx.jpg`** no PixiJS.
5. Atualizar os waypoints da estrada para a **curva em "S"** (mantendo coordenadas idênticas entre `DefenseScene` e `LastStandScene`) e reduzir o custo do **Monólito Repulsor Tier 1** para `2M + 1F + 1E` com `1.0` de dano.

### Fase 2 — Profundidade de Loop Diurno, Upgrades Tier 2 e Ritmo de Waves
1. Ajustar `ExpeditionSystem` e `ForestScene` para **$90\text{ s}$** e **15 nós** distribuídos nas 3 zonas + penalidade leve de madeira em `forcedRetreat`.
2. Adicionar a **Rota Alta de telhados** com $+1$ Madeira bônus na `PlatformScene`.
3. Ativar **Upgrade Tier 2** das 5 torres na `DefenseScene` (`Shift + Clique` ou botão contextual) usando a propriedade `tier` já existente em `GameState`.
4. Adicionar a **Sobrecarga Tática** por clique nas Waves 1–2 e os 2 flanqueadores introdutórios no final da Wave 2.

### Fase 3 — Combate Avançado de Kaelen, Alpha em 2 Fases e Web Audio
1. Expandir o ataque de Kaelen na `LastStandScene` para **cleave de até 3 inimigos** + *hitstop* de $3\text{ ticks}$ + **Quebra-Terra carregado** (segurar ataque por $35\text{ ticks}$).
2. Implementar os **2 gatilhos do Alpha** ($70\%$ HP Rugido Supressor; $35\%$ HP Postura de Obsidiana quebrável pelo Quebra-Terra) e os 2 obstáculos AABB de ruínas nos flancos.
3. Integrar `src/audio/SoundFX.ts` via Web Audio API nativa com toggle de mudo (`Tecla M`).
4. Adicionar novos testes unitários cobrindo Tier 2, cleave/golpe carregado, quebra de postura do Alpha e economia de 90s.

---

## 9. Métricas de Validação e Fora de Escopo

### 9.1 Critérios de Aceite e Playtest
- `npm run build` e `npm test` aprovados sem erros de TypeScript (`erasableSyntaxOnly`, zero variáveis não usadas).
- Coleta média na floresta fica entre $60\%$ e $75\%$ dos nós (impossível limpar $100\%$ sem risco extremo).
- Todas as 5 torres têm leitura visual imediata em $960 \times 540$ e nenhuma torre é inútil contra a composição da noite.
- Flanqueadores são imediatamente reconhecíveis pelo contorno/alerta ciano (`#00F5D4`).
- Wave 3 exige alternar entre limpar flancos, quebrar a postura do Alpha aos $35\%$ de HP e reparar torres com `E`.

### 9.2 Estritamente Fora de Escopo Atual
- Converter a Wave 3 em plataforma lateral;
- Multiplayer, backend ou placares online;
- Motores externos de física ou pathfinding A* dinâmico;
- Árvore complexa de talentos ou inventário com equipamentos;
- Reconstrução de torres já reduzidas a $0\text{ HP}$.

---

## 10. Prompt Pronto para Enviar ao Codex

~~~text
Leia integralmente o arquivo PRD_OAKHEAVEN_APLICACAO_COMPLETA.md e inspecione a estrutura atual do código e todos os arquivos existentes na pasta img/.

Sua missão é evoluir OAKHEAVEN respeitando rigorosamente a stack (PixiJS 8.23 + TypeScript 7 + Vite 8), a resolução lógica 960x540, as restrições de compilação (erasableSyntaxOnly, noUnusedLocals, noUnusedParameters) e as decisões inegociáveis do projeto (especialmente manter Waves 1-2 em DefenseScene top-down e Wave 3 exclusivamente em arena top-down na LastStandScene).

Execute o Roadmap da Seção 8 de forma incremental (começando pela Fase 1 completa, seguida pelas Fases 2 e 3):
1. Inspecione os 36 arquivos da pasta img/ e implemente a nova Direção Visual, Paleta (theme.ts), Tela Inicial (capa-oakheaven.jpg), extração limpa de sprites/ícones sem fundo quadrado opaco (spritesheet.jpg e artes das torres/personagens com fallback seguro para testes headless), HUD em molduras dark-fantasy/éter (seguindo hud-waves.jpg, hud-wave3.jpg, exploracao-floresta.jpg e plataforma-travessia.jpg) e os 6 efeitos visuais de vfx.jpg.
2. Implemente o novo Level Design tático com a estrada em "S" de 4 waypoints compartilhando coordenadas idênticas entre DefenseScene e LastStandScene, o Santuário das três lápides em (145, 270) e os obstáculos de flanco.
3. Implemente as melhorias de Gameplay e Balanceamento: expedição de 90s com 15 nós e rota dupla na travessia, rebalanceamento do Monólito (1 Éter + 1 dano), upgrades Tier 2 das torres, cleave de até 3 alvos + golpe carregado Quebra-Terra para Kaelen, e o chefe Alpha com gatilhos em 70% e 35% de HP.
4. Ao final de cada etapa, rode `npm test` e `npm run build`, adicione testes cobrindo as novas regras e garanta zero regressões.
~~~