# OAKHEAVEN — validação do overhaul visual

## Estado vigente — QA HTTP em 18/11/2026

Resultado: ambiente investigado e procedimento manual HTTP reproduzível entregue; nenhuma cena observada nesta execução. Não houve nova produção de arte nem alteração de sistemas.

### Retentativa HTTP — 18/11/2026, 21:14 (Brasília)

Nova execução observada: `npm run dev -- --host 127.0.0.1 --port 5173 --strictPort`. Vite 8.3.8 informou `ready in 265 ms` e URL `http://127.0.0.1:5173/`. A porta não foi alterada automaticamente. Nenhuma resposta HTTP foi confirmada: Python urllib retornou WinError 10013 para as raízes em 127.0.0.1 e localhost; o navegador integrado retornou `net::ERR_CONNECTION_TIMED_OUT` em 127.0.0.1 (tab 6).

Travessia inicial, floresta, onda 1, onda 2 e onda 3/Última Linha continuam **NÃO OBSERVADAS**. Não houve screenshot, evidência de movimento ou defeito novo do jogo comprovado. A restrição funcional comprovada é do acesso automatizado; impacto visual do jogo permanece indeterminado. Nenhuma configuração de segurança, arte ou sistema foi alterado. Sem file://, commit, push ou deploy. Resultados anteriores de 57 testes/TypeScript/build não foram reexecutados nem apresentados como novos.

Para executar manualmente, mantenha o terminal Vite aberto e use [entrada normal](http://127.0.0.1:5173/) ou [localhost](http://localhost:5173/). Siga o procedimento sequencial abaixo: travessia (A/D e Espaço), floresta (WASD e E), retorno, onda 1, onda 2 e Última Linha (WASD, F/Espaço e E). Registre captura/vídeo e ações testadas por cena; não certifique as cinco torres sem observar cada tipo. A [prévia da Última Linha](http://127.0.0.1:5173/dev/kaelen.html) é apenas complementar. Se o processo não estiver mais ativo, reinicie o comando acima. Nenhuma alteração de firewall ou proteção é necessária para seguir este roteiro no próprio navegador.

### Inicialização e endereço efetivos

O package.json define `dev: vite`. Não existe vite.config.* na raiz. A entrada index.html/src/main.ts carrega arte/fontes e o portal; iniciar pelo portal cria Game(app, 'platform-out').

Comando executado na raiz do repositório:

```powershell
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Vite 8.3.8 informou `ready in 710 ms` e `Local: http://127.0.0.1:5173/`. strictPort impede fallback silencioso para 5174. Isso confirma a URL anunciada pelo processo; uma resposta HTTP bem-sucedida NÃO foi confirmada. A consulta Get-NetTCPConnection não retornou listener visível no ambiente da ferramenta, logo não é evidência adicional de escuta.

Links para abrir manualmente na própria máquina:

- [Entrada normal pelo portal](http://127.0.0.1:5173/)
- [Mesmo servidor pelo nome localhost](http://localhost:5173/)
- [Prévia existente da Última Linha](http://127.0.0.1:5173/dev/kaelen.html) — só complementar; não certifica as cenas anteriores nem o percurso normal.
- [Manifesto do atlas para diagnóstico HTTP](http://127.0.0.1:5173/art/kaelen/atlas.json)

Se o servidor não estiver mais ativo, execute novamente o comando acima e mantenha o terminal aberto. Se a porta estiver ocupada, use o servidor que já estiver aberto após conferir sua origem ou escolha explicitamente outra porta, por exemplo `--port 5174 --strictPort`, ajustando todos os links. Não é necessário mudar firewall, proxy ou proteção do navegador.

### Evidência real da tentativa de acesso

| Superfície | URL/ação | Resultado observado |
| --- | --- | --- |
| Processo Vite | Inicialização na porta fixa 5173 | Ready; URL anunciada, sem confirmação HTTP |
| HTTP no terminal (Python urllib) | / em 127.0.0.1 e localhost | WinError 10013: acesso ao socket proibido |
| HTTP no terminal (Python urllib) | /src/main.ts, /art/kaelen/atlas.json, /art/kaelen/kaelen-se.png | Mesmo WinError 10013; sem status HTTP/404 observável |
| Navegador integrado | http://127.0.0.1:5173/ | net::ERR_CONNECTION_TIMED_OUT |
| Navegador integrado | http://localhost:5173/ | Erro de ferramenta: Tab 5 is not part of browser session; página não observada |
| Integridade de whitespace | git diff --check | Exit 0 antes da atualização documental |

Nenhum file:// foi aberto ou tentado nesta execução. Nenhuma proteção foi desativada, nenhum túnel criado e nenhuma interface pública exposta. Evidência textual resumida em http-runtime-qa.log. Não foi possível observar canvas, console de página, carregar assets com sucesso ou capturar screenshots do gameplay. Nenhum teste de movimento em runtime foi concluído.

### Matriz atual das cenas

| Ordem | Cena | Observação real nesta execução | Evidência visual |
| --- | --- | --- | --- |
| 1 | Travessia inicial | NÃO OBSERVADA | Nenhuma; acesso HTTP bloqueado |
| 2 | Floresta | NÃO OBSERVADA | Nenhuma; acesso HTTP bloqueado |
| 3 | Arena, onda 1 | NÃO OBSERVADA | Nenhuma; acesso HTTP bloqueado |
| 4 | Arena, onda 2 | NÃO OBSERVADA | Nenhuma; acesso HTTP bloqueado |
| 5 | Onda 3 / Última Linha | NÃO OBSERVADA | Nenhuma; acesso HTTP bloqueado |

Não há defeito novo do jogo comprovado por observação. O erro de socket é comprovado no ambiente da ferramenta; a causa exata do timeout (isolamento/rede/processo) não foi determinada. Não atribuir o timeout à engine nem afirmar falha de assets/colisão sem evidência.

| Achado | Certeza | Impacto visual | Impacto funcional |
| --- | --- | --- | --- |
| Acesso automatizado indisponível | Comprovado pelos erros acima | Impede avaliar todas as cenas | Bloqueia o QA automatizado; não comprova defeito no jogo do usuário |
| Kaelen lateral permanece em pose estática | Limitação já confirmada em código, sem observação nova | Relevante na travessia | Não há regressão funcional comprovada |
| Inimigos/torres têm poses estáticas com VFX procedurais | Limitação já documentada em código | Faltam ciclos artísticos reais | Não há regressão funcional comprovada |
| Escala, halos, sobreposição, sincronismo percebido e performance GPU | Ainda não avaliados | Indeterminado | Indeterminado; não registrar como defeitos confirmados |

### Procedimento manual reproduzível

1. Na raiz `C:\Users\ACER\Desktop\PROJETOS\oakheaven\oakheaven`, inicie o comando Vite acima. Confirme no terminal a URL. No navegador local abra a entrada normal, clique Jogar agora/Iniciar defesa e foque o canvas. Não use a prévia da onda 3 para pular o início.
2. **Travessia inicial:** A/D ou setas e Espaço. Teste rota baixa/lama, saltos/aterrissagem nas plataformas e limites; confira apoio dos pés, materiais, HUD e desaparecimento da transição. Grave alguns segundos de deslocamento e salto. Atravesse à direita.
3. **Floresta:** WASD/setas, aproxime-se de madeira/sucata e segure E. Observe idle, passos, golpe de coleta, resistência e inventário; confira luz dos cristais, profundidade e HUD. Grave passos e coleta; fotografe o cenário. Retorne pelo portal inferior esquerdo e pela travessia de volta. A retirada por anoitecer também leva à defesa.
4. **Onda 1:** construa com painel/1–5, conforme recursos, e pressione Enter. Observe inimigos na rota, disparo/impacto, dano/morte e HUD. Balesta: clarão elétrico; forja: brasas; monólito: anéis/repulsão sem dano; canhão: emissão de tiro; barricada: contato e dano visíveis sem um suprimir o outro. Registre quais tipos realmente conseguiu construir; não declare os cinco testados se faltarem recursos.
5. **Onda 2:** conclua a primeira, repare/construa durante a preparação e inicie a próxima. Confira que os efeitos existem antes da onda 3, que não ficam presos na preparação e que a economia/torres persistem. Capture combate e transição entre ondas.
6. **Onda 3/Última Linha:** avance pelo fluxo normal, aguarde a introdução, mova com WASD, toque F/Espaço para ataque, segure/solte para carga, use E para reparo e receba um golpe. Observe frames de Kaelen, recuperação, invulnerabilidade, colisões, efeitos, torres e HUD. A prévia HTTP serve apenas para repetir essa etapa isoladamente.
7. Em cada cena registre `observada/pendente`, ações testadas, screenshot/vídeo, resultado e defeitos reproduzíveis. Registre problemas visuais separados de problemas funcionais. Se houver falha HTTP no navegador local, guarde a mensagem exata e a saída do terminal, sem alterar proteções.

Os testes 57/57, TypeScript e build são resultados da execução anterior documentada; não foram repetidos nesta tarefa porque não houve mudança no código. Nova execução de git diff --check feita. Próxima ação: executar o roteiro no navegador local e preencher a matriz com evidências reais. Nenhuma aprovação visual é atribuída pelo procedimento escrito.

---

## Histórico — validação automatizada anterior


Data: 18/11/2026. Resultado: regressão automatizada aprovada; validação visual bloqueada.

## Evidências desta retomada

| Verificação executada | Resultado observado |
| --- | --- |
| `npm test` | 57 testes, 57 aprovados, zero falhas/skip; exit 0 |
| `node node_modules/typescript/bin/tsc --noEmit` | Exit 0 |
| `npm run build` | Exit 0; 789 módulos transformados |
| `node tools/build-full-game-review.mjs` | Exit 0; revisão offline recompilada; navegador NÃO iniciado pelo script |
| Barricada | Teste `barricade contact and damage feedback have independent throttles` aprovado |
| Navegador | Abertura da revisão local recusada pela política de URL: protocolo `file://` não permitido |

Não há script de lint no package.json. Nenhuma biblioteca foi instalada. A geração do diagnóstico emitiu aviso do Vite: inlineDynamicImports ignorado porque codeSplitting está desativado; o processo terminou com exit 0.

A restrição do navegador não foi contornada por outro navegador, servidor alternativo, CDP ou automação nativa. A interrupção com Esc da sessão anterior não é evidência de teste bem-sucedido. Não houve screenshot novo, animação observada nem smoke de navegador executado nesta retomada. Screenshots antigos em screenshots/ são históricos e não certificam o código atual.

## Estado de cada cena, na ordem solicitada

| Cena | Evidência atual | Estado visual |
| --- | --- | --- |
| Travessia inicial | Código de EnhancedPlatformScene/art revisado; testes existentes de velocidade, bônus e queda aprovados | NÃO OBSERVADA; pendente movimento, salto, escala e camadas no canvas |
| Floresta | Hooks de Kaelen/coleta/luz revisados; testes do atlas/controlador/expedição aprovados | NÃO OBSERVADA; pendente passos, golpes de coleta, luz, profundidade e HUD |
| Arena, onda 1 | DefenseScene usa CombatFeedback sem condição de onda; helper testado com Pixi real, sem renderer | NÃO OBSERVADA; pendente trajetória, cinco torres e efeitos em combate |
| Arena, onda 2 | Mesmo caminho de render/feedback da onda 1; sem restrição `wave === 3` nos hooks | NÃO OBSERVADA; pendente transição 1→2 e combate |
| Última Linha, onda 3 | Atlas/controlador e lógica existentes aprovados em testes; ligação dos efeitos revisada | NÃO OBSERVADA; aprovação manual anterior de movimentação, relatada pelo usuário, não certifica os efeitos novos |
| Travessia de retorno | Mesma classe EnhancedPlatformScene, com goingBack=true | NÃO OBSERVADA; pendente portal, retorno e entrada na preparação |

Testes unitários não substituem renderização nem demonstram que todas as cenas foram jogadas.

## Correção da barricada e consistência estática

A correção anterior está presente: CombatFeedback usa contactTimes para ativação da barricada, hurtTimes para dano e trailTimes para rastros. O teste reproduz ativação seguida de dano no mesmo tick, confirma ambos os efeitos, verifica bloqueio de repetição e expiração independente. Não foi necessária nova mudança de código de produção nesta retomada.

DefenseScene, usada nas ondas 1–2, emite efeitos no disparo real das quatro torres de alcance, no contato da barricada, nos ataques dos inimigos e na aplicação de dano/morte. LastStandScene possui os mesmos grupos de eventos. Balesta: clarão elétrico; forja: brasas; monólito: anéis; canhão: emissão mais espessa; barricada: faíscas de contato. Isso confirma a ligação no código; aparência, sincronismo percebido e legibilidade continuam sem aceite visual.

Kaelen continua usando atlas real SE na floresta e Última Linha. Travessia mantém pose estática por diferença de perspectiva. Atmosfera fica entre chão e decals/entidades; transição tem eventMode=none, dura 18 ticks e não pausa lógica/input. O teste de substituição de cena durante a transição passou. Performance em GPU e clareza dos efeitos não foram medidas.

## Roteiro manual — entrada normal

1. Execute `npm run dev` na raiz. Abra o endereço mostrado pelo Vite, use Jogar agora/Iniciar defesa no portal e comece pela travessia. A entrada normal do portal inicia platform-out; o título interno participa do reinício.
2. **Travessia:** mova com A/D ou setas; pule com Espaço. Confira apoio dos pés no topo das plataformas, limites, lama, poeira ao aterrissar, piso e leitura do HUD. A pose lateral estática é uma lacuna conhecida. Atravesse até a direita para entrar na floresta.
3. **Floresta:** use WASD/setas; aproxime-se de madeira/sucata e segure E. Confira idle→walk→idle, ataque na coleta, redução de resistência/inventário, indicador e destruição do recurso. Nos cristais, confira luz discreta sem encobrir o personagem. Vá ao portal inferior esquerdo e faça a travessia de volta. Ao anoitecer, a retirada automática permanece válida.
4. **Onda 1:** na preparação, selecione com 1–5 ou painel e construa em posições válidas, conforme recursos disponíveis. Enter inicia a onda. Observe estrada, inimigos, disparos, dano/morte, reparo e HUD. A balesta deve emitir no disparo; forja na ação de fogo; monólito ao repelir (sem dano); canhão no tiro; barricada somente em contato. Para cobrir as cinco torres sem depender da coleta, use o diagnóstico descrito abaixo.
5. **Onda 2:** conclua a primeira, prepare/repare e inicie a segunda. Confira que os efeitos continuam antes da onda 3, que não ficam congelados na preparação e que recursos/torres permanecem coerentes.
6. **Última Linha:** avance pela progressão normal até a terceira onda. Aguarde a introdução, mova Kaelen, toque F/Espaço para atacar, segure/solte para carga e use E para reparo. Confira dano/invulnerabilidade, colisões e retorno ao idle. Compare atlas, torres e inimigos com as ondas anteriores.
7. Em cada troca de cena, confira que a revelação desaparece rapidamente, não intercepta cliques, não deixa tela escura e não mantém partículas da cena anterior. Reinicie com R quando permitido.

Capture uma imagem por cena e pelo menos duas capturas de estados distintos de movimento/ataque; idealmente grave trechos curtos. Registre sintomas, onda, torre e ação para qualquer falha. Uma imagem estática não comprova animação.

## Diagnóstico manual complementar

`node tools/build-full-game-review.mjs` recompila `tmp/full-game-review/index.html` com os assets incorporados. O usuário pode abri-lo manualmente se o próprio navegador permitir. Não é deploy. Ele usa Game e cenas reais, mas atalhos injetam inventário, torres e HP de diagnóstico; isso NÃO testa a progressão normal.

Use Travessia, Floresta, Onda 1, Onda 2 e Onda 3 nessa ordem. Pausar/Continuar permitem comparar camadas e escalas. O botão Smoke das cenas reais contém verificações de movimento/coleta/torres; ele NÃO foi executado nesta retomada. Só considerar o resultado que aparecer na tela após execução. Os acessos privados são exclusivos do diagnóstico e não integram a entrada de produção. A passagem pelo portal e progressão normal continua obrigatória para aceite integrado.

## Arte pendente e próxima entrega

Ainda necessários: Kaelen lateral (idle/corrida/salto/queda e direções adequadas), direções adicionais além de SE, clips próprios de morte/carga/reparo quando aplicáveis; inimigos com frames reais de movimento/ataque/dano/morte; peças/frames de ação das torres quando exigirem animação articulada. Os efeitos procedurais atuais não equivalem a esses frames. Falta vegetação isolada apropriada; madeira coletável não representa uma árvore animada.

Próxima entrega recomendada: executar este roteiro e registrar evidências reais de todas as cenas antes de nova produção artística ou redesenho. Nenhuma cena recebe aprovação visual por esta validação automatizada.
