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

<!-- OAK-CODEX-STUDIO:START -->
## OAKHEAVEN Codex Full Game Studio (ported from Claude Code Game Studios)

The current project is **OAKHEAVEN**, an existing PixiJS/TypeScript dark-fantasy game.
This instruction supplements, not replaces, any existing project instructions above/below it.

- Full upstream studio source (read-only reference): `oak-studio/upstream/`.
- Native Codex subagents: `.codex/agents/cgs_*.toml`.
- Native Codex Skills: `.agents/skills/cgs-*/SKILL.md` (invoke with `$cgs-<workflow>`).
- Index, limitations and migration status: `oak-studio/MIGRATION-REPORT.md` and `oak-studio/INDEX.md`.
- Upstream project-specific docs are **templates**, not OAKHEAVEN facts. Analyze real code and `img/` before acting.

### Operating rules

1. Prefer `minimal` mode for small tasks, `standard` for gameplay/visual development, `full` only for major milestones. These are workflow choices, not automatically enforced Codex settings.
2. Keep max **3 simultaneous subagents**; delegate independent tasks, do not use all roles at once.
3. Preserve game mechanics (PixiJS, input, economy, towers, enemies, acts, collisions, state progression), website and existing artwork. Never reset the project or replace it with the upstream template.
4. For visual work, inspect available `img/` assets, implement in the running game, check browser screenshots if accessible; if not, report NOT VALIDATED VISUALLY. No screenshot fabrication.
5. For gameplay or animation, require an actual movement/state test. A static translated PNG is not an animated sprite sheet.
6. Keep small edits focused; use existing tests and run build. Only claim test results actually observed.
7. Existing OAKHEAVEN `AGENTS.md` instructions and explicit user instructions win over contradictory upstream workflow prompts.
8. Do not execute upstream hooks/scripts without inspecting them for compatibility and safety. Hooks from Claude are **preserved, not enabled** by this port.
9. Do not commit, push, deploy, delete files or run destructive git commands unless the user specifically authorizes the action.
10. Keep a durable progress log in `docs/OAK-STUDIO-PROGRESS.md` when an extensive mission ends. Respect existing logs.

### Example mission
`Use $cgs-dev-story for a small feature while a cgs_gameplay_programmer implements it, with independent QA validation. Avoid changing unrelated scenes.`

<!-- OAK-CODEX-STUDIO:END -->

<!-- OAKHEAVEN-STUDIO-SESSION-GUARD:START -->
## OAKHEAVEN Studio v5.1 — protocolo de sessões curtas

**Objetivo:** entregar melhorias reais ao jogo SEM expandir uma sessão indefinidamente.
Este bloco prevalece sobre instruções anteriores do Studio v3/v5 que exijam
"auditoria completa", "overhaul de todo o jogo" ou delegação ampla para
uma solicitação pequena. Instruções explícitas do usuário continuam prioritárias.

### Execução obrigatória
1. Comece por `STUDIO-HANDOFF.md` (se existir) e `git status --short`;
   leia APENAS os arquivos relacionados à tarefa atual. Não inventarie `img/`,
   os 49 perfis, as 78 Skills ou todas as cenas sem pedido específico.
2. Realize **UMA microentrega** por conversa: um defeito ou subsistema, preferencialmente
   em uma cena e até quatro arquivos de produção. Se a solicitação for maior,
   faça primeiro a mudança de maior impacto possível, sem começar auditoria global.
3. Por padrão, **não use subagentes**. Use no máximo UM quando houver trabalho
   paralelo realmente independente e justificativa clara; não encadeie subagentes.
   Agentes/Skills do Studio v5 continuam disponíveis para uso sob demanda.
4. Consulte no máximo a Skill e o perfil especializados estritamente relevantes.
   Evite carregar upstream, frameworks completos, templates e relatórios longos.
5. Depois da primeira implementação verificável, execute testes FOCADOS,
   TypeScript ou build conforme impacto e tempo da sessão. Uma única tentativa
   por ferramenta bloqueada; navegador/HTTP indisponível -> relatar bloqueio,
   sem tentativas repetidas nem contorno de segurança.
6. Faça no máximo uma rodada curta de correção após falha de teste.
   Se houver problemas adicionais, documente-os como pendências e finalize.
7. Ao encerrar, atualize sucintamente `STUDIO-HANDOFF.md` (estado confirmado,
   arquivos alterados, teste executado, próximo micro-passo). Não reescreva o
   histórico inteiro nem gere grandes relatórios a cada tarefa.
8. Preserve `src/`, `img/`, gameplay, mudanças locais e documentos já existentes.
   Não faça commit, push, deploy ou ações destrutivas sem autorização.
9. Não declare validação visual sem observar jogo/screenshots reais. O objetivo
   desta política é evitar loops, não reduzir a honestidade da validação.

### Modelo de conclusão
- Alterei: arquivos e efeito observável.
- Validei: comandos com resultados reais.
- Pendente: o que não foi observado/testado.
- Próxima microtarefa: instrução curta para nova conversa.

**Regra anti-loop:** se perceber que a tarefa exige reexaminar o projeto inteiro,
encerrar com uma entrega parcial concreta e um handoff. Não iniciar outra cadeia
longa de investigação, execução e correção na mesma conversa.
<!-- OAKHEAVEN-STUDIO-SESSION-GUARD:END -->
