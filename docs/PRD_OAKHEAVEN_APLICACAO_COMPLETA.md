# OAKHEAVEN — PRD completo da aplicação

**Finalidade:** fornecer contexto suficiente para que uma IA, game designer ou desenvolvedor externo consiga analisar OAKHEAVEN e sugerir melhorias sem partir de premissas incorretas.  
**Estado documentado:** protótipo jogável após o commit 6ff27d3.  
**Stack:** PixiJS 8.23, TypeScript 7 e Vite 8.  
**Plataforma atual:** navegador desktop, teclado e mouse.  
**Resolução lógica:** 960 × 540 pixels, escalada proporcionalmente por CSS.

---

## 1. Resumo executivo

OAKHEAVEN é um protótipo que combina:

- exploração com tempo limitado;
- coleta de recursos;
- planejamento e construção de torres;
- tower defense em duas waves;
- batalha final top-down com tower defense e combate de ação.

O jogador controla Kaelen. Durante o dia, ele atravessa uma área de ligação, entra na floresta e coleta madeira, ferro, éter e quitina. Ao retornar, usa os recursos para construir uma defesa ao redor do santuário.

As duas primeiras waves são tower defense. Na terceira, **A Última Linha**, Kaelen entra fisicamente na arena, luta com o martelo, intercepta inimigos que abandonam a rota principal e repara torres sob pressão.

A intenção é que as escolhas da expedição e da construção determinem as condições da batalha final, mas que nenhuma composição de torres seja suficiente para vencer a wave 3 sem participação ativa de Kaelen.

---

## 2. Visão do produto

### 2.1 Fantasia

O jogador deve sentir que é o último defensor de uma comunidade ameaçada. Kaelen não é apenas um comandante que observa torres automáticas: ele coleta materiais, constrói a defesa e entra pessoalmente na batalha quando a linha rompe.

### 2.2 Pilares

1. **Preparação com consequência:** recursos determinam as torres possíveis.
2. **Defesa territorial:** posição, alcance, controle e durabilidade importam.
3. **Escalada dramática:** exploração → preparação → cerco → última defesa.
4. **Ação tática:** Kaelen escolhe entre atacar, interceptar, reparar e proteger.
5. **Clareza antes de complexidade:** sistemas novos entram incrementalmente.

### 2.3 Decisões desejadas

- Quais recursos priorizar?
- Construir dano, controle ou bloqueio?
- Onde posicionar torres?
- Gastar madeira reparando ou guardar?
- Interceptar flanqueador ou proteger o santuário?
- Atacar Alpha ou salvar estrutura crítica?

---

## 3. Decisões já tomadas

Estas decisões fazem parte da identidade:

- Waves 1 e 2 permanecem tower defense em visão superior.
- Wave 3 é exclusivamente arena top-down.
- Wave 3 não deve voltar a ser plataforma lateral.
- Kaelen se move em oito direções na wave 3.
- Parte dos inimigos abandona a rota.
- Flanqueadores devem tornar Kaelen indispensável.
- Torres persistem na batalha final.
- O mesmo WaveSystem é transferido entre cenas.
- A stack continua PixiJS + TypeScript + Vite.
- Desenvolvimento e balanceamento são incrementais.

### Elementos adiados

- sabotadores complexos;
- multiplayer;
- árvore de habilidades;
- inventário elaborado;
- pathfinding avançado;
- múltiplas fases de chefe;
- progressão permanente;
- reconstrução de torres destruídas.

Podem ser analisados como futuro, não como requisito imediato.

---

## 4. Público e posicionamento

O público ainda não foi formalizado. O protótipo sugere afinidade com jogadores de:

- tower defense;
- ação top-down acessível;
- preparação seguida por defesa;
- runs curtas/noites fechadas;
- composição e gestão de recursos.

Questões abertas:

- Casual, intermediário ou desafiador?
- Campanha narrativa, runs ou noites?
- Duração ideal de sessão?
- Web, desktop ou ambos?

---

## 5. Fluxo completo

~~~text
Inicialização
    ↓
Travessia de ida — PlatformScene
    ↓
Exploração e coleta — ForestScene
    ↓
Travessia de retorno — PlatformScene
    ↓
Preparação — DefenseScene
    ↓
Wave 1: A Incursão
    ↓
Preparação, reparos e construção
    ↓
Wave 2: O Cerco
    ↓
Preparação, reparos e construção
    ↓
Wave 3: A Última Linha — arena top-down
    ↓
Vitória ou derrota
    ↓
Reinício completo
~~~

O jogo representa uma noite. Os campos act e night existem, mas ainda não controlam conteúdo.

---

## 6. Travessia — PlatformScene

### Função

Liga base e floresta. Usa perspectiva lateral e plataforma simples. Essa perspectiva pertence somente à travessia, nunca à wave 3.

### Controles

- A/D ou esquerda/direita: mover;
- Espaço, W ou cima: pular.

### Comportamento

- plataformas e obstáculos;
- ida leva à floresta;
- volta leva à defesa;
- cronômetro continua;
- sem combate ou coleta.

---

## 7. Exploração — ForestScene

### Objetivo e tempo

Coletar recursos e retornar. A expedição dura 120 segundos, contando travessia e floresta. Ao zerar, a defesa é iniciada e forcedRetreat fica verdadeiro.

### Controles

- WASD ou setas: oito direções;
- segurar E: extrair;
- portal azul: retornar.

Diagonal normalizada.

### Recursos

| Nó | Recurso | Nós | Quantidade | Golpes | Tempo/golpe | Tempo/nó |
|---|---:|---:|---:|---:|---:|---:|
| Árvore | Madeira | 4 | 3 | 6 | 0,5 s | 3 s |
| Destroços | Ferro | 3 | 2 | 8 | 0,6 s | 4,8 s |
| Cristal | Éter | 2 | 1 | 12 | 1 s | 12 s |
| Carcaça | Quitina | 2 | 2 | 8 | 0,8 s | 6,4 s |

### Economia máxima, incluindo reserva inicial

- 15 madeiras;
- 7 ferros;
- 2 éteres;
- 4 quitinas.

Extração completa: aproximadamente 63,2 segundos sem deslocamento. Recursos raros são lentos para incentivar escolhas.

### Feedback

- barra dos nós;
- instrução contextual;
- impacto;
- notificação;
- inventário e tempo.

---

## 8. Defesa — DefenseScene

### Função

Construção, reparo, waves 1–2 e transição para a batalha final.

### Layout

- menu à esquerda;
- estrada central;
- santuário à esquerda;
- entrada pela direita;
- torres fora da estrada;
- barricadas na estrada.

### Controles

- mouse: selecionar, posicionar, reparar;
- 1–5: selecionar torre;
- Escape: cancelar;
- Enter: iniciar;
- R: reiniciar após resultado.

### Construção

- exige defesa viva para iniciar wave;
- área válida limitada;
- sem sobreposição;
- sem torre sobre santuário;
- torres comuns fora da estrada;
- barricadas na estrada;
- custos imediatos;
- torres persistidas no GameState.

### Reparo entre waves

- clicar em torre danificada sem seleção;
- 1 madeira;
- +35 HP;
- limite no máximo;
- destruída não volta.

### Waves 1 e 2

| Wave | Nome | Inimigos | Intervalo | Composição | Recompensa |
|---|---|---:|---:|---|---:|
| 1 | A Incursão | 8 | 48 ticks | 8 scouts | 2 madeiras |
| 2 | O Cerco | 12 | 40 ticks | 8 scouts + 4 brutos | 3 madeiras |

60 ticks são aproximadamente um segundo.

---

## 9. Torres

| Torre | Função | Custo | Alcance | Dano | Intervalo | HP |
|---|---|---|---:|---:|---:|---:|
| Balesta Voltaica | alvo único | 3M + 1F | 220 | 2 | 30 | 100 |
| Forja de Escória | área/lentidão | 2M + 2F + 1E | 110 | 0,8 | 40 | 120 |
| Monólito Repulsor | empurrão | 2M + 1F + 2E | 125 | 0 | 85 | 110 |
| Canhão de Quitina | até 3 alvos | 2M + 2F + 2Q | 135 | 3 | 60 | 140 |
| Barricada Energizada | bloqueio/contato | 3M | contato | 0,7 | contínuo | 180 |

### Balesta

- um alvo;
- prioriza mais próximo do santuário;
- dano instantâneo e feixe.

### Forja

- todos no alcance;
- dano em área;
- velocidade reduzida a 55%.

### Repulsor

- empurra para longe;
- scouts sofrem mais;
- brutos resistem;
- Alpha quase não é empurrado.

### Canhão

- até três alvos;
- curto alcance e dano elevado.

### Barricada

- bloqueia rota;
- recebe ataques;
- dano por contato;
- funciona contra flanqueadores.

Cada torre persiste com id, tipo, tier, posição, HP e cooldown. Tier existe, mas só há tier 1 e nenhum upgrade.

---

## 10. Inimigos

### Stats base

| Tipo | HP | Velocidade | Raio | Dano | Papel |
|---|---:|---:|---:|---:|---|
| Scout | 6 | 1,55 | 12 | 1 | rápido/frágil |
| Bruto | 16 | 1,1 | 17 | 2 | resistente |
| Alpha | 85 | 0,8 | 27 | chefe |

### Rota

- waypoints centrais;
- objetivo: santuário;
- bloqueio por barricada;
- contato com Kaelen;
- dano ao chegar;
- Alpha destrói o santuário.

### Flanqueadores

- 25% da wave 3;
- alternam norte/sul;
- aviso visual;
- procuram torre viva;
- recalculam alvo;
- sem torre, vão ao santuário;
- velocidade +12%;
- dano de contato +25%;
- recebem 45% do dano das torres;
- recebem 100% do dano de Kaelen.

A resistência existe para impedir vitória automática pelas torres.

### HP efetivo na wave 3

| Unidade | Papel | Multiplicador | HP |
|---|---|---:|---:|
| Scout | rota | 1,45× | 9 |
| Scout | flanco | 1,8× | 11 |
| Bruto | rota | 1,55× | 25 |
| Bruto | flanco | 1,8× | 29 |
| Alpha | chefe | 1,9× | 162 |

---

## 11. Wave 3 — A Última Linha

### Objetivo

Combinar defesa automática, ameaças laterais, combate direto, reparos e priorização. Kaelen e torres devem ser necessários.

### Arena

- top-down;
- santuário à esquerda;
- entrada à direita;
- estrada central;
- flancos norte/sul;
- torres herdadas;
- Kaelen na defesa.

### Introdução

- três segundos;
- flancos indicados;
- movimento e reparo liberados;
- spawn após contagem.

### Composição

- 32 inimigos;
- 23 scouts;
- 8 brutos;
- 1 Alpha;
- 8 flanqueadores;
- Alpha por último.

### Duração e ritmo

- janela de spawn acima de 45 segundos;
- duração total estimada acima de 60 segundos;
- oito blocos de pressão;
- intervalos entre blocos;
- spawns rápidos dentro de cada bloco;
- pausas permitem reposicionar e reparar.

### Alertas

- marca ciano;
- entrada pisca;
- HUD informa lado;
- mensagem indica dano integral de Kaelen.

### Alpha

- cerca de 162 HP;
- resistente a empurrão;
- mata o santuário ao chegar;
- rugido único;
- rugido aumenta cooldown das torres;
- efeito e alerta.

---

## 12. Kaelen na wave 3

### Movimento

- WASD/setas;
- oito direções;
- diagonal normalizada;
- velocidade 4;
- limites;
- colisão com estruturas.

### Ataque

- Espaço ou F;
- cone frontal simplificado;
- direção pelo último movimento;
- alcance 66;
- dano 4;
- Alpha recebe 3,2;
- cooldown 22 ticks;
- um hit por golpe;
- efeito visual;
- segurar tecla não repete.

### Vida

- 100 HP;
- contato causa três vezes dano base;
- modificador de flanco;
- 42 ticks de invulnerabilidade;
- piscada e knockback;
- separação de inimigos.

### Reparo em combate

- perto de torre viva/danificada;
- segurar E;
- 45 ticks (~0,75 s);
- 1 madeira;
- +35 HP;
- hit interrompe;
- sair cancela;
- soltar E para repetir;
- destruída não volta.

---

## 13. Vitória, derrota e reinício

### Vitória

- todos os spawns emitidos;
- zero inimigos;
- zero spawns em alerta.

### Derrota

- waves 1–2: santuário zero;
- wave 3: santuário ou Kaelen zero.

### Reinício

- R;
- estado inicial;
- primeira travessia;
- sem save/checkpoint.

---

## 14. HUD

### Floresta

Inventário, tempo, instrução, progresso e notificação.

### Defesa

Inventário, wave, santuário, spawns, abates e mensagens.

### Última Linha

Wave, Kaelen, santuário, torres, madeira, invasores, ativos, reparo, alertas, Alpha e resultado.

---

## 15. Estado global

~~~text
act
night
wave
inventory: wood, iron, ether, chitin
expedition: remainingSeconds, forcedRetreat
kaelen: hp, maxHp
sanctuary: hp, maxHp
towers[]: id, type, tier, x, y, hp, maxHp, cooldown
defeatedEnemies
~~~

### Inicial

- ato 1;
- noite 1;
- wave 1;
- 3 madeira;
- 1 ferro;
- 0 éter;
- 0 quitina;
- Kaelen 100/100;
- santuário 5/5;
- zero torres/abates;
- 120 segundos.

---

## 16. Arquitetura

### Núcleo

**main.ts:** inicializa PixiJS, canvas e Game.  
**Game.ts:** estado, ticker, tempo, cenas, limpeza e restart.  
**Scene.ts:** enter, update e exit opcional.  
**Input.ts:** teclas seguradas/pressionadas e blur.  
**GameState.ts:** estado persistente.

### Sistemas

**ExpeditionSystem:** tempo e retirada.  
**WaveSystem:** fases, composição, delays, recompensa e progressão.  
**repair:** custo, duração, valor e validação.  
**towerCombat:** seleção e empurrão.

### Dados

**towers:** stats, custos e gasto.  
**enemies:** stats, papéis, lados, HP e resistência.

### Cenas

- PlatformScene: travessia;
- ForestScene: coleta;
- DefenseScene: construção/waves 1–2;
- LastStandScene: wave 3 top-down.

Não existe alternativa lateral para wave 3.

---

## 17. Execução e qualidade

### Comandos

~~~bash
npm run dev
npm run build
npm test
npm run preview
~~~

### Testes

- composição;
- brutos e Alpha;
- flancos;
- duração;
- resistência;
- reparo;
- prioridade de alvos.

Último estado: TypeScript e build aprovados, 6 testes passando.

### Git

- 6986a9c — checkpoint;
- 8304582 — arena top-down;
- 6ff27d3 — wave 3 longa/difícil.

---

## 18. Restrições técnicas

- erasableSyntaxOnly;
- evitar parameter properties;
- noUnusedLocals/noUnusedParameters;
- 960 × 540;
- escala CSS;
- sem câmera/física;
- colisão simples;
- sem pathfinding geral;
- IA por rotas/alvos;
- só PixiJS como dependência de gameplay.

---

## 19. Visual e áudio

### Visual

- primitivas PixiJS;
- formas/cores;
- barras;
- feixes/impactos;
- marca ciano;
- sem sprites animados.

### Referências

A pasta img contém conceitos de Kaelen, torres, inimigos, chefes, personagens e cenários. Não são sprites prontos e não estão integrados.

### Áudio

Sem música, efeitos, mixer ou volume.

---

## 20. Limitações conhecidas

### Gameplay

- uma noite;
- sem progressão pós-vitória;
- act/night ociosos;
- sem upgrades;
- sem dificuldade configurável;
- sem tutorial/pause;
- sem sabotadores;
- Alpha com uma habilidade;
- mapas fixos;
- balanceamento por playtest manual.

### UX/acessibilidade

- teclado/mouse;
- sem controle/touch;
- sem remapeamento;
- sem opções visuais;
- sem escala de texto;
- sem áudio;
- HUD abreviado.

### Tecnologia

- cenas grandes;
- alguma duplicação;
- sem persistência;
- sem telemetria;
- sem testes visuais;
- sem editor;
- valores em TypeScript;
- sem pipeline de assets;
- sem CI.

---

## 21. Perguntas para game design

### Identidade

- Qual é a proposta mais forte?
- O híbrido é coerente?
- Qual público/dificuldade?
- Quais referências ajudam?

### Loop

- Travessia lateral adiciona valor?
- 120 segundos geram escolhas?
- Ritmo funciona?
- Duração ideal de noite?
- Como reduzir passividade?

### Economia

- Recursos geram decisões?
- Custos geram variedade?
- Recompensas adequadas?
- Reparo compete com construção?
- Limite de torres?

### Torres

- Identidades distintas?
- Alguma domina?
- Upgrades de baixo escopo?
- Barricada clara?
- Como comunicar sinergias?

### Kaelen

- Ataque profundo?
- Esquiva/carregado/habilidade?
- Relevante sem substituir torres?
- Reparo tem risco?
- Como reforçar martelo?

### Wave 3

- Duração/composição funcionam?
- Resistência de torres é elegante?
- Melhor forma de exigir Kaelen?
- Alerta suficiente?
- Alpha precisa de habilidade?
- Pressão sem só HP?

### Progressão

- Noites, atos, mapas ou runs?
- Sistemas que suportam progressão?
- Como introduzir sabotadores?
- Recompensas?
- Narrativa?

### Apresentação/onboarding

- Direção visual?
- Animação/cor/áudio?
- Efeitos de maior retorno?
- Como ensinar três sistemas?
- Acessibilidade mínima?
- Como explicar flanqueadores?

---

## 22. Restrições para sugestões

Devem:

- preservar wave 3 top-down;
- manter Kaelen e torres relevantes;
- respeitar stack;
- separar curto/médio/longo prazo;
- indicar custo, risco e impacto;
- evitar reescrita;
- considerar incremental;
- separar fato de hipótese.

Não pressupor:

- multiplayer;
- grande equipe;
- alto orçamento;
- backend;
- física/pathfinding complexos;
- procedural existente;
- conceitos prontos como sprites.

---

## 23. Formato desejado da análise

1. diagnóstico;
2. pontos fortes;
3. problemas com evidências;
4. loop;
5. economia;
6. torres;
7. Kaelen;
8. wave 3/Alpha;
9. prioridades;
10. baixo custo/alto impacto;
11. roadmap em três horizontes;
12. métricas de playtest;
13. fora de escopo.

Para cada recomendação: problema, alteração, impacto no jogador, impacto técnico, risco e validação.

---

## 24. Prompt pronto para outra IA

~~~text
Atue como game designer sênior e analista de sistemas. Leia integralmente o PRD de OAKHEAVEN.

O jogo combina exploração com tempo limitado, coleta, tower defense e ação top-down. Waves 1 e 2 são tower defense; wave 3 é exclusivamente arena top-down, com Kaelen atacando, interceptando flanqueadores e reparando torres. Não proponha wave 3 lateral.

Analise identidade, loop, ritmo, economia, torres, Kaelen, inimigos, dificuldade, chefe, UX, onboarding e progressão. Considere PixiJS + TypeScript + Vite e o escopo incremental.

Para cada recomendação, explique problema, benefício, custo, risco, dependências e validação em playtest.

Separe em diagnóstico, pontos fortes, problemas prioritários, melhorias imediatas, médio prazo, expansão futura, métricas de playtest e ideias fora de escopo.

Priorize profundidade e coerência sobre quantidade de funcionalidades.
~~~

---

## 25. Critério de sucesso

OAKHEAVEN atingirá a proposta quando:

- coleta gerar decisões;
- torres tiverem funções claras;
- waves 1–2 validarem a defesa;
- wave 3 exigir Kaelen;
- flancos forem pressão legível;
- reparar/atacar/proteger competirem;
- Alpha for clímax, não só HP;
- vitória vier de preparação e execução;
- derrota ensinar;
- conteúdo novo não exigir reescrita.
