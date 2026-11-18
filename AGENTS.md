<!-- OAK-VISUAL-NIGHT:START -->
# OAKHEAVEN — modo entrega visual (Codex)

## Missão
Transformar o jogo **já existente** em uma versão visualmente apresentável, usando a pasta `img/` como fonte prioritária de REFERÊNCIAS e ASSETS. Uma imagem de referência NÃO é automaticamente um sprite utilizável. Executar trabalho real no código; evitar entregas compostas somente por planos.

## Regras de execução
1. Identificar a raiz do jogo, o stack real, os entrypoints, os renderizadores e a localização efetiva de `img` (ou equivalente). Não presumir caminhos nem componentes.
2. Seguir a Skill `$oak-ship-visual` para tarefas de overhaul visual. Consultar `docs/OAK-VISUAL-PLAYBOOK.md` e as imagens reais.
3. Usar imagens já fornecidas, adaptando-as sem deformar: recorte, transparência, enquadramento, atlas, escala e tratamento de bordas somente quando tecnicamente apropriados. Manter os originais intocados; derivados em local separado.
4. **Nunca considerar o visual final atendido** se chão, caminhos, construções, herói, torres ou inimigos importantes ainda forem apenas figuras geométricas provisórias, quando existem assets aplicáveis. `PIXI.Graphics` pode continuar para debug, hitboxes, indicadores, projéteis simples e efeitos procedurais intencionais; não substitui, por conveniência, a direção de arte.
5. Preservar gameplay, trajetórias, estado, economia, colisões, inputs e performance. Não reescrever a engine, não migrar framework nem instalar dependências sem necessidade demonstrada.
6. A perspectiva do jogo, tamanhos de mundo e escala devem ser inferidos do repositório e das imagens existentes, não inventados. Criar camada de terreno, caminho, props, entidades, efeitos e UI de acordo com o código real; ancoragem e ordenação coerentes.
7. Identificar quando uma imagem é **concept art/cena completa** em vez de sprite com fundo transparente. Não fingir recorte perfeito ou inventar animação sem frames. Listar lacunas e entregar o melhor resultado honesto com material existente.
8. Quando uma imagem puder ser integrada, comprovar o caminho de asset no código e o carregamento no jogo, não apenas copiar PNG para outra pasta.
9. Rodar validações existentes (build, lint, tests); testar a execução em navegador se houver ferramenta disponível. Capturar screenshot real quando possível e compará-la às imagens. Nunca inventar screenshot, teste ou resultado.
10. Preservar arquivos não relacionados e modificações já existentes. Não usar `git reset --hard`, `git clean -fd`, `rm -rf`, `git push`, `git commit` ou publicar/deploy sem pedido expresso. Não exibir segredos.

## Estratégia sem burocracia
- Para entregas urgentes, faça levantamento BREVE e implemente imediatamente a maior melhoria visível e segura, priorizando uma primeira fase jogável completa: cenário, estrada, objetos, herói, torre, inimigos, efeitos básicos e HUD legível.
- Se houver tempo e assets adequados, propague a linguagem visual para as demais cenas sem interromper funcionalidades existentes. Não gastar a maior parte da execução produzindo documentação.
- Delegação opcional: preferencialmente `oak_asset_curator` e `oak_art_director` para análises independentes, `oak_pixi_artist` para integração; `oak_visual_qa` para revisão. Nunca autorizar escrita concorrente nos mesmos arquivos.
- Se subagentes não estiverem disponíveis, executar essas funções sequencialmente na sessão principal. A missão não pode parar por isso.
- Não pedir confirmação a cada alteração reversível e não destrutiva; interromper apenas para bloqueios realmente críticos ou aprovações que o ambiente exigir.
- Entrega: indicar arquivos alterados, imagens efetivamente usadas, aspectos ainda provisórios, comandos realmente executados, screenshot (se disponível), problemas e como iniciar o jogo.
<!-- OAK-VISUAL-NIGHT:END -->
