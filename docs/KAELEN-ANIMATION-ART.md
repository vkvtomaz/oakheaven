# Kaelen — especificação de animação 2D

Data: 2026-11-18. Perfil usado: cgs_art_director, lido e aplicado por delegação explícita.
Escopo: auditoria visual e especificação; este documento não certifica frames produzidos ou jogo em execução.

## Auditoria de material real

| Arquivo inspecionado | Conteúdo | Uso adequado |
|---|---|---|
| `img/kaelen1.jpg` | Quatro vistas estáticas do ferreiro: cabelo e barba grisalhos, peitoral de aço, couro marrom, gola de pele, ombreiras/cristais violetas, martelo | Referência principal de identidade desta produção |
| `img/kaelen2.jpg` | Vistas frontal, lateral e traseira com fundo e legendas | Conferência de proporções e equipamento; não são passos de caminhada |
| `img/kaelen3.jpg` | Uma pose frontal de corpo inteiro com martelo apoiado no ombro | Retrato/material; não é frame recortado pronto |
| `img/spritesheet.jpg` | Prancha de herói, inimigos e torres; uma pose por entidade | Referência de linguagem; não é sequência animada |
| `public/art/hero.png` | Recorte do herói dessa prancha: elmo fechado e armadura com detalhes violetas | Sprite estático usado atualmente no mundo |
| `img/hud-wave3.jpg` | Três cenas completas pintadas com HUD, combate e perspectiva oblíqua | Referência de câmera e leitura; não extrair como animação |
| `src/assets/hero.png` | Imagem abstrata de camadas, diferente de um personagem | Não usar para Kaelen |

Há discrepância de identidade entre o sprite atual de elmo e os model sheets/retrato.
Para esta produção, escolheu-se `kaelen1.jpg` como referência principal para reconciliar
o personagem com o retrato já carregado no HUD. Essa é uma decisão desta produção,
não evidência de aprovação canônica anterior. Preservar os arquivos originais.
Nenhum dos arquivos inspecionados contém ciclo sequencial de movimento, ataque ou dano.

## Câmera e direções

O código usa arena XY de 960×540, colisão em coordenadas de tela e ordenação por Y.
O terreno é plano visto de cima e os objetos/personagens são sprites oblíquos de três
quartos. Não há transformação de grid isométrico ou perspectiva 3D de câmera no código.
Usar projeção ortográfica oblíqua com visão parcial do topo dos ombros/cabeça, coerente
com torres e props. Não usar perfil lateral da travessia como câmera da arena.

Produção completa: N, E, S, W relativos à tela, mantendo orientação em repouso pela
última direção de movimento/ataque. Cada direção tem sua própria pose; não espelhar
automaticamente martelo e acessórios assimétricos. Diagonais podem selecionar a direção
axial dominante. Uma primeira folha SE/E pode ser candidata para avaliar consistência,
mas não deve ser declarada cobertura das quatro direções.

## Formato de entrega

- PNG RGBA com transparência real; sRGB. Sem fundo pintado, quadriculado incorporado,
  sombra de chão, textos, números, bordas ou legendas nos pixels.
- Célula de referência: 256×256 px. Folha por direção: 6 colunas × 5 linhas = 1536×1280 px.
  Se a ferramenta gerar outra resolução, registrar dimensões reais e recortes explícitos;
  nunca presumir que o grid pedido foi obedecido.
- Pivô comum no ponto de apoio dos pés: (128,224) em cada célula, equivalente a âncora
  (0,5;0,875) para células completas. O corpo pode oscilar; o ponto de apoio permanece
  estável. Não centralizar individualmente cada frame pelo bounding box.
- Altura corporal de referência 168 px, da sola à cabeça em pé, reservando margens ao
  martelo. A escala de mundo deve manter o corpo legível em torno do tamanho atual
  de Kaelen; não aumentar hitbox, raio ou alcance para compensar o tamanho da arte.
- Mesmo rosto, barba, cabelo, proporções, paleta e mão do martelo em todos os frames.
  Luz neutra constante de cima/esquerda; brilhos violetas discretos e consistentes.
- Entregar atlas/JSON separado com frame rect, nome, direção, duração, pivot e indicação
  loop. Sugestão: `char_kaelen_<direction>_256.png`; nomes de clips `idle_e`, `walk_e`, etc.

## Clips

Cada linha contém seis quadros desenhados de uma ação; leitura esquerda para direita.
Tempos abaixo são metas visuais para integração, não mudanças autorizadas nas regras.

| Linha | Clip | Movimento necessário | Duração sugerida | Repetição |
|---|---|---|---|---|
| 0 | Idle | Respiração corporal discreta, mãos/equipamento estáveis, fechamento natural | 6 frames a 6 FPS, 1 s | Loop |
| 1 | Walk | Contato esquerdo, passagem, contato direito e passagem; pernas/braços realmente mudam | 6 frames a 12 FPS, 0,5 s | Loop enquanto há deslocamento real |
| 2 | Attack | Impacto na liberação seguido de extensão, follow-through e recuperação | 6 frames em cerca de 0,20 s | Uma vez |
| 3 | Hurt | Reação de torso/cabeça, absorção e retorno à guarda; sem troca de personagem | 6 frames em 0,10–0,17 s | Uma vez; pode interromper ataque visual |
| 4 | Death | Perda de equilíbrio, joelhos, queda e assentamento no chão | 6 frames a 10 FPS, 0,6 s | Uma vez; manter último frame |

Combate existente: o dano básico/Quebra-Terra ocorre imediatamente ao soltar a ação,
não no meio de uma antecipação nova. Portanto o clip de soltura deve começar no impacto;
uma pose de antecipação pode ser usada durante a carga existente. Não atrasar dano nem
reaplicá-lo por evento de frame. Cooldown básico é 22 ticks normalizados, carga é 35,
invulnerabilidade após dano é 42. Esses valores não são duração obrigatória da arte.
A morte é aplicável porque HP zero causa derrota; animação não deve atrasar a derrota,
ativar movimento pós-morte ou mudar o reinício. A sobreposição de resultado pode cobri-la.

## Critérios para aceitar uma folha gerada

1. Confirmar seis células reais por linha e cinco linhas; nenhum personagem invade a
   célula vizinha. Cabeça, martelo e pés devem caber sem corte involuntário.
2. Verificar alfa efetivo e ausência de halo/fundo. Uma miniatura sobre preto não prova
   transparência; conferir sobre fundo claro e escuro.
3. Abrir a sequência em loop à duração prevista. Walk precisa alternar contato de pés;
   repetir uma pose transladada não atende ao pedido. Idle não pode mudar rosto/roupa.
4. Medir pivô/alinhamento de pés e estabilidade de proporção. Rejeitar escala que varia
   acidentalmente, membros extras, martelo que troca de mão e armadura que se transforma.
5. Conferir a 58–70 px de altura aproximada de mundo, junto a chão/torres existentes.
   A precisão no atlas grande não substitui leitura no jogo.
6. Só depois integrar. Se uma ou mais linhas falharem, registrar quais e manter o
   fallback daquele estado; não apresentar a folha inteira como produção concluída.

## Prompt externo de partida

Usar `img/kaelen1.jpg` como referência de identidade e `img/hud-wave3.jpg` como referência
de vista oblíqua. Solicitar o mesmo ferreiro grisalho robusto, peitoral de aço gasto,
avental de couro marrom, ombreiras de cristal violeta e martelo pesado. Produzir uma
direção por vez, câmera ortográfica fixa, grid exato 6×5, seis poses sequenciais para
idle/walk/attack/hurt/death, dimensões e pivô acima, fundo transparente, sem texto.
Inspecionar o resultado contra os critérios; o prompt não garante um atlas utilizável.
