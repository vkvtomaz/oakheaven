# Kaelen — arena vertical slice

Data: 2026-11-18. Cena: LastStandScene (Última Linha, onda 3).
Implementado; validação automatizada aprovada. Gameplay no navegador ainda não observado.

## Implementação

- `src/visual/kaelenFeedback.ts`: feedback sobre a textura estática atual, com estados
  idle, movimento, ataque e dano. Prioridade dano > ataque > movimento > idle.
- `src/scenes/LastStandScene.ts`: eventos reais disparam o feedback; movimento visual
  considera deslocamento após colisões. Recuo de dano resolve colisões e ordenação
  imediatamente, inclusive em golpe fatal.
- `tests/kaelen-feedback.test.ts`: estados, limites, conservação do root/hitbox,
  restauração de tint/transforms e equivalência temporal.

Somente o Sprite filho recebe respiração sutil, balanço de deslocamento, impulso
de golpe e flash quente. Sombra, posição lógica, escala base, direção de combate,
alpha de invulnerabilidade, habilidades, câmera e progressão foram preservados.
Delta usa os ticks normalizados de 60 Hz do PixiJS já usados pelo jogo; a proteção
existente contra pausas longas do ticker não foi alterada.

Asset efetivamente reutilizado: `public/art/hero.png`, carregado em `loadGameArt`,
via `createActor('hero', 58)`. Nenhum asset novo ou frame foi produzido.
Estes efeitos NÃO constituem ciclos desenhados de caminhada ou martelada.

## Equipe e verificação

Perfis carregados explicitamente: cgs_gameplay_programmer (integração),
cgs_technical_artist (helper/testes), cgs_art_director (referências/limites),
cgs_lead_programmer (revisão independente), cgs_qa_tester (smoke).
Usados os adapters dev-story e smoke-check em oak-studio/compat/skills.
Config: oak-studio/runtime.json; workflow minimal, QA standard.
Nenhum ADR ou dependência de story foi definido para esta mudança limitada.

Revisão encontrou uma lacuna no teste FPS que amostrava um ciclo completo;
teste reforçado para amostrar um instante não periódico e expiração de estados.

Comandos: `npm test`, `node node_modules/typescript/bin/tsc --noEmit`,
`npm run build`. Todos aprovados nesta missão: 44 testes (38 existentes + 6 novos), nenhum erro TypeScript e build exit 0. O build Vite compilou 785 módulos.

Navegador: a abertura integrada falhou com “Tab 1 is not part of browser session”.
O Chrome carregou localhost:5173 e o site foi visto em screenshot real na sessão.
A tentativa de iniciar o canvas por acessibilidade falhou com geometria indisponível;
ações subsequentes sofreram interrupção por entrada do usuário na janela compartilhada.
Não foi observada movimentação ou combate no canvas. Não há screenshot de gameplay
retido nem certificação visual desta slice. Testes do helper usam um Sprite simulado;
não substituem teste integrado da cena, colisões ou movimento em navegador.

## Iniciar e testar manualmente

1. Execute `npm run dev` e abra o endereço exibido (normalmente http://localhost:5173).
   Clique INICIAR DEFESA e mantenha foco no palco. O jogo começa pela travessia.
2. Progrida pelo fluxo existente: A/D e Espaço na travessia; WASD e E na floresta.
   Reúna recursos, retorne, construa torres (1–5/clique) e inicie as ondas com Enter.
   Ao iniciar a terceira onda, o jogo entra na Última Linha; aguarde a introdução.
3. Arena: WASD/setas. Observe resposta horizontal/vertical/diagonal, parada imediata
   e idle discreto. Contra limites/torres, o herói não deve continuar balançando se
   não houver deslocamento. Compare distâncias por tempo em 30/60/120 FPS se possível.
4. Toque e solte F ou Espaço: ataque básico. Segure até a carga e solte: Quebra-Terra.
   Observe o impulso curto da pose e o feedback já existente do golpe. Com a habilidade
   em recarga, confirme preservação do ataque básico.
5. Aproxime-se de um invasor: confirme perda de HP, breve flash e invulnerabilidade
   existentes; recuo não deve ultrapassar limites ou permanecer dentro de uma torre.
   Perto de torre danificada segure E e confira reparo; reparo deve bloquear ataque.
6. Após dano/ataque, pare: tint e transforms devem se recuperar. M alterna áudio;
   R reinicia após resultado. Confirme vitória/derrota e ausência de regressão de progressão.

## Assets que faltam para animação completa

- Frames de idle, caminhada, golpe básico, carga/Quebra-Terra e reação de dano;
  adicionar reparo se tiver animação própria.
- Direções coerentes com o movimento em dois eixos (4 ou 8 direções após definição
  artística), mesma identidade, proporções, escala e pivô nos pés.
- Fundo transparente, margens que comportem martelo, atlas/metadados e tempos de
  cada clip, incluindo instante visual de impacto alinhado à mecânica existente.

`img/spritesheet.jpg` reúne personagens/torres e contém uma pose de Kaelen; não é
uma sequência de animação. Novos frames precisam de produção e inspeção próprias.
Site, assets e outros workflows não foram alterados. Sem dependências, commit, push ou deploy.


## Atualização posterior — frames reais integrados em 2026-11-18

O relatório acima documenta a etapa provisória anterior. A Última Linha agora usa src/visual/kaelenAnimation.ts e kaelenArt.ts com 22 frames reais da folha anterior, preservada em img/kaelen-animation-source.png. O helper provisório foi mantido em disco, mas não é usado nessa cena. São 5 idle, 6 walk, 5 attack e 6 hurt, apenas direção SE. Testes finais: 52/52; TypeScript/build aprovados. O gameplay continua NÃO VALIDADO VISUALMENTE por bloqueio do navegador. Consulte STUDIO-HANDOFF.md para arquivos, pipeline, limitações, comandos e próxima ação.
