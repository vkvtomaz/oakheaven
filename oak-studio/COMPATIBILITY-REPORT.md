# Studio v5 — correção de compatibilidade Codex

Data: 2026-11-18. Resultado: operação explícita demonstrada; port integral pendente.

## Evidências e correções

- Codex instalado: 0.169.0-alpha.11.1. `--strict-config app-server --print-startup-config`: exit 0.
- Documentação atual confirma agentes standalone .codex/agents e skills .agents/skills.
  A configuração existente está correta para esse schema; não foi alterada nem recebeu registros legados.
- Probe em processo novo: user state falhou por SQLite code 14/permissão. Probe isolado corrigido
  inicializou e skills/list(forceReload=true) descobriu 78/78 cgs Skills. Nenhum turno de modelo
  foi criado pelo probe. Este é teste real do loader, não execução dos 78 workflows.
- O catálogo Work Mode consultado na auditoria anterior não era evidência suficiente de falha
  na descoberta local. A ausência nele não justifica mover ou duplicar as Skills.
- .agents recusou escrita com PermissionError. Instalados ficaram intactos. Dois adapters completos
  estão em compat/skills; originais integrais em compat/originals. Nenhum push/commit foi feito.
- Configuração portátil JSON e ferramenta Python standard-library substituem o bootstrap dos pilotos.
  Nenhum yaml-helper, shell dinâmico Claude ou hook é executado. Legacy project.yaml não é usado
  silenciosamente; fonte e valores são impressos. Demais chaves exigem mapeamento por workflow.
- Seleção nativa de role não existe na assinatura de collaboration.spawn_agent desta sessão.
  Foram selecionados explicitamente os TOMLs art_director e gameplay_programmer por leitura
  e adoção pelo filho. task_name não foi tratado como seleção nativa.

## Testes efetivamente executados

| Teste | Resultado | Limite |
|---|---|---|
| cgs_art_director explícito | Concluiu análise e retornou perfil/evidências | Sem seleção nativa |
| cgs_gameplay_programmer explícito + dev-story | config/profile/typecheck exit 0; READY FOR IMPLEMENTATION | Story inline Config/Data; sem implementação |
| smoke-check quick --read-only em filho independente | npm test: 38/38; tsc --noEmit: exit 0 | Gate NOT ASSESSED: sem browser/manual |
| studio.py catalog | 49 perfis + 78 metadados examinados | Validação estrutural |
| studio.py profile ../invalid | Rejeitado pelo parser | Não permite traversal por nome |
| studio.py verify compat-baseline.json | 121 arquivos src/img/public idênticos por SHA-256 | Baseline desta missão |
| Carregador novo skills/list | 78 nomes cgs retornados | Estado isolado; corpos antigos ainda instalados |

O primeiro probe isolado expirou por deficiência de drenagem de stderr no próprio probe;
a correção foi testada e o resultado final está em discovery-isolated.json. O bloqueio original
do banco do usuário permanece. Não foi copiada autenticação nem alterada confiança do projeto.

## Como usar agora

Peça ao coordenador para ler `oak-studio/compat/skills/cgs-dev-story/SKILL.md` e
executar `--read-only` com uma story; para QA, ler o adapter cgs-smoke-check e executar
`quick --read-only`. O coordenador carrega CODEX-RUNTIME.md e delega com perfil explícito.
Usar apenas `$cgs-dev-story` pode carregar o corpo antigo instalado.

Scripts: `python oak-studio/tools/studio.py config`, `catalog`, `profile cgs_art_director`.
Probe: `python oak-studio/tools/probe_runtime.py <caminho-do-codex.exe> --isolated`.
Não instalar dependências. Revisar comandos antes de executar. Hooks Claude continuam desativados.

## Limites e continuação

76 workflows permanecem pendentes. Converter progressivamente exige revisão de cada fase,
helpers, configurações, gates, artefatos e referências, seguida de forward-test. Não foram
feitas substituições cegas nem apresentada uma camada de instruções como port integral.
Os ramos de escrita/implementação dos pilotos também não foram executados por esta missão
proibir alterações ao jogo. Browser, movimento, build gerador e replay não foram testados.
O plano de promoção é o contrato CODEX-RUNTIME.md. Instalação nativa das adaptações depende
de um ambiente com escrita autorizada em .agents, não de dependências adicionais.

14 regras, hooks e scripts upstream seguem **Preservado apenas como referência**.
Agentes e Skills oak anteriores não foram alterados. Não houve src/img/public alterado,
commit, push, deploy ou novas dependências.

## Matriz completa: 49 agentes e 78 Skills

“Validado em runtime” abaixo se restringe ao ramo explícito descrito, não certifica todos
os ramos do componente. Descoberta nativa dos metadados é distinta de workflow executado.

| Tipo | Componente | Classificação | Escopo comprovado / pendência |
|---|---|---|---|
| Agent | `cgs_accessibility_specialist` | Convertido, mas ainda não testado | Schema TOML verificado; comportamento não exercitado |
| Agent | `cgs_ai_programmer` | Convertido, mas ainda não testado | Schema TOML verificado; comportamento não exercitado |
| Agent | `cgs_analytics_engineer` | Convertido, mas ainda não testado | Schema TOML verificado; comportamento não exercitado |
| Agent | `cgs_art_director` | Validado em runtime | Delegação explícita, perfil lido e retorno recebido; seleção nativa não testada |
| Agent | `cgs_audio_director` | Convertido, mas ainda não testado | Schema TOML verificado; comportamento não exercitado |
| Agent | `cgs_community_manager` | Convertido, mas ainda não testado | Schema TOML verificado; comportamento não exercitado |
| Agent | `cgs_creative_director` | Convertido, mas ainda não testado | Schema TOML verificado; comportamento não exercitado |
| Agent | `cgs_devops_engineer` | Convertido, mas ainda não testado | Schema TOML verificado; comportamento não exercitado |
| Agent | `cgs_economy_designer` | Convertido, mas ainda não testado | Schema TOML verificado; comportamento não exercitado |
| Agent | `cgs_engine_programmer` | Convertido, mas ainda não testado | Schema TOML verificado; comportamento não exercitado |
| Agent | `cgs_game_designer` | Convertido, mas ainda não testado | Schema TOML verificado; comportamento não exercitado |
| Agent | `cgs_gameplay_programmer` | Validado em runtime | Delegação explícita, perfil lido e retorno recebido; seleção nativa não testada |
| Agent | `cgs_godot_csharp_specialist` | Convertido, mas ainda não testado | Schema TOML verificado; comportamento não exercitado |
| Agent | `cgs_godot_gdextension_specialist` | Convertido, mas ainda não testado | Schema TOML verificado; comportamento não exercitado |
| Agent | `cgs_godot_gdscript_specialist` | Convertido, mas ainda não testado | Schema TOML verificado; comportamento não exercitado |
| Agent | `cgs_godot_shader_specialist` | Convertido, mas ainda não testado | Schema TOML verificado; comportamento não exercitado |
| Agent | `cgs_godot_specialist` | Convertido, mas ainda não testado | Schema TOML verificado; comportamento não exercitado |
| Agent | `cgs_lead_programmer` | Convertido, mas ainda não testado | Schema TOML verificado; comportamento não exercitado |
| Agent | `cgs_level_designer` | Convertido, mas ainda não testado | Schema TOML verificado; comportamento não exercitado |
| Agent | `cgs_live_ops_designer` | Convertido, mas ainda não testado | Schema TOML verificado; comportamento não exercitado |
| Agent | `cgs_localization_lead` | Convertido, mas ainda não testado | Schema TOML verificado; comportamento não exercitado |
| Agent | `cgs_narrative_director` | Convertido, mas ainda não testado | Schema TOML verificado; comportamento não exercitado |
| Agent | `cgs_network_programmer` | Convertido, mas ainda não testado | Schema TOML verificado; comportamento não exercitado |
| Agent | `cgs_performance_analyst` | Convertido, mas ainda não testado | Schema TOML verificado; comportamento não exercitado |
| Agent | `cgs_producer` | Convertido, mas ainda não testado | Schema TOML verificado; comportamento não exercitado |
| Agent | `cgs_prototyper` | Convertido, mas ainda não testado | Schema TOML verificado; comportamento não exercitado |
| Agent | `cgs_qa_lead` | Convertido, mas ainda não testado | Schema TOML verificado; comportamento não exercitado |
| Agent | `cgs_qa_tester` | Convertido, mas ainda não testado | Schema TOML verificado; comportamento não exercitado |
| Agent | `cgs_release_manager` | Convertido, mas ainda não testado | Schema TOML verificado; comportamento não exercitado |
| Agent | `cgs_security_engineer` | Convertido, mas ainda não testado | Schema TOML verificado; comportamento não exercitado |
| Agent | `cgs_sound_designer` | Convertido, mas ainda não testado | Schema TOML verificado; comportamento não exercitado |
| Agent | `cgs_systems_designer` | Convertido, mas ainda não testado | Schema TOML verificado; comportamento não exercitado |
| Agent | `cgs_technical_artist` | Convertido, mas ainda não testado | Schema TOML verificado; comportamento não exercitado |
| Agent | `cgs_technical_director` | Convertido, mas ainda não testado | Schema TOML verificado; comportamento não exercitado |
| Agent | `cgs_tools_programmer` | Convertido, mas ainda não testado | Schema TOML verificado; comportamento não exercitado |
| Agent | `cgs_ue_blueprint_specialist` | Convertido, mas ainda não testado | Schema TOML verificado; comportamento não exercitado |
| Agent | `cgs_ue_gas_specialist` | Convertido, mas ainda não testado | Schema TOML verificado; comportamento não exercitado |
| Agent | `cgs_ue_replication_specialist` | Convertido, mas ainda não testado | Schema TOML verificado; comportamento não exercitado |
| Agent | `cgs_ue_umg_specialist` | Convertido, mas ainda não testado | Schema TOML verificado; comportamento não exercitado |
| Agent | `cgs_ui_programmer` | Convertido, mas ainda não testado | Schema TOML verificado; comportamento não exercitado |
| Agent | `cgs_unity_addressables_specialist` | Convertido, mas ainda não testado | Schema TOML verificado; comportamento não exercitado |
| Agent | `cgs_unity_dots_specialist` | Convertido, mas ainda não testado | Schema TOML verificado; comportamento não exercitado |
| Agent | `cgs_unity_shader_specialist` | Convertido, mas ainda não testado | Schema TOML verificado; comportamento não exercitado |
| Agent | `cgs_unity_specialist` | Convertido, mas ainda não testado | Schema TOML verificado; comportamento não exercitado |
| Agent | `cgs_unity_ui_specialist` | Convertido, mas ainda não testado | Schema TOML verificado; comportamento não exercitado |
| Agent | `cgs_unreal_specialist` | Convertido, mas ainda não testado | Schema TOML verificado; comportamento não exercitado |
| Agent | `cgs_ux_designer` | Convertido, mas ainda não testado | Schema TOML verificado; comportamento não exercitado |
| Agent | `cgs_world_builder` | Convertido, mas ainda não testado | Schema TOML verificado; comportamento não exercitado |
| Agent | `cgs_writer` | Convertido, mas ainda não testado | Schema TOML verificado; comportamento não exercitado |
| Skill | `cgs-adopt` | Incompatível ou pendente | Descoberta nativa OK; workflow original não portado integralmente |
| Skill | `cgs-architecture-decision` | Incompatível ou pendente | Descoberta nativa OK; workflow original não portado integralmente |
| Skill | `cgs-architecture-review` | Incompatível ou pendente | Descoberta nativa OK; workflow original não portado integralmente |
| Skill | `cgs-art-bible` | Incompatível ou pendente | Descoberta nativa OK; workflow original não portado integralmente |
| Skill | `cgs-asset-audit` | Incompatível ou pendente | Descoberta nativa OK; workflow original não portado integralmente |
| Skill | `cgs-asset-spec` | Incompatível ou pendente | Descoberta nativa OK; workflow original não portado integralmente |
| Skill | `cgs-balance-check` | Incompatível ou pendente | Descoberta nativa OK; workflow original não portado integralmente |
| Skill | `cgs-brainstorm` | Incompatível ou pendente | Descoberta nativa OK; workflow original não portado integralmente |
| Skill | `cgs-bug-report` | Incompatível ou pendente | Descoberta nativa OK; workflow original não portado integralmente |
| Skill | `cgs-bug-triage` | Incompatível ou pendente | Descoberta nativa OK; workflow original não portado integralmente |
| Skill | `cgs-changelog` | Incompatível ou pendente | Descoberta nativa OK; workflow original não portado integralmente |
| Skill | `cgs-code-review` | Incompatível ou pendente | Descoberta nativa OK; workflow original não portado integralmente |
| Skill | `cgs-consistency-check` | Incompatível ou pendente | Descoberta nativa OK; workflow original não portado integralmente |
| Skill | `cgs-content-audit` | Incompatível ou pendente | Descoberta nativa OK; workflow original não portado integralmente |
| Skill | `cgs-create-architecture` | Incompatível ou pendente | Descoberta nativa OK; workflow original não portado integralmente |
| Skill | `cgs-create-control-manifest` | Incompatível ou pendente | Descoberta nativa OK; workflow original não portado integralmente |
| Skill | `cgs-create-epics` | Incompatível ou pendente | Descoberta nativa OK; workflow original não portado integralmente |
| Skill | `cgs-create-stories` | Incompatível ou pendente | Descoberta nativa OK; workflow original não portado integralmente |
| Skill | `cgs-cut` | Incompatível ou pendente | Descoberta nativa OK; workflow original não portado integralmente |
| Skill | `cgs-day-one-patch` | Incompatível ou pendente | Descoberta nativa OK; workflow original não portado integralmente |
| Skill | `cgs-design-review` | Incompatível ou pendente | Descoberta nativa OK; workflow original não portado integralmente |
| Skill | `cgs-design-system` | Incompatível ou pendente | Descoberta nativa OK; workflow original não portado integralmente |
| Skill | `cgs-dev-story` | Validado em runtime | Adapter explícito: readiness somente leitura |
| Skill | `cgs-estimate` | Incompatível ou pendente | Descoberta nativa OK; workflow original não portado integralmente |
| Skill | `cgs-gate-check` | Incompatível ou pendente | Descoberta nativa OK; workflow original não portado integralmente |
| Skill | `cgs-help` | Incompatível ou pendente | Descoberta nativa OK; workflow original não portado integralmente |
| Skill | `cgs-hotfix` | Incompatível ou pendente | Descoberta nativa OK; workflow original não portado integralmente |
| Skill | `cgs-launch-checklist` | Incompatível ou pendente | Descoberta nativa OK; workflow original não portado integralmente |
| Skill | `cgs-localize` | Incompatível ou pendente | Descoberta nativa OK; workflow original não portado integralmente |
| Skill | `cgs-map-systems` | Incompatível ou pendente | Descoberta nativa OK; workflow original não portado integralmente |
| Skill | `cgs-milestone-review` | Incompatível ou pendente | Descoberta nativa OK; workflow original não portado integralmente |
| Skill | `cgs-next-step` | Incompatível ou pendente | Descoberta nativa OK; workflow original não portado integralmente |
| Skill | `cgs-onboard` | Incompatível ou pendente | Descoberta nativa OK; workflow original não portado integralmente |
| Skill | `cgs-patch-notes` | Incompatível ou pendente | Descoberta nativa OK; workflow original não portado integralmente |
| Skill | `cgs-perf-profile` | Incompatível ou pendente | Descoberta nativa OK; workflow original não portado integralmente |
| Skill | `cgs-playtest-report` | Incompatível ou pendente | Descoberta nativa OK; workflow original não portado integralmente |
| Skill | `cgs-project-settings` | Incompatível ou pendente | Descoberta nativa OK; workflow original não portado integralmente |
| Skill | `cgs-project-stage-detect` | Incompatível ou pendente | Descoberta nativa OK; workflow original não portado integralmente |
| Skill | `cgs-propagate-design-change` | Incompatível ou pendente | Descoberta nativa OK; workflow original não portado integralmente |
| Skill | `cgs-prototype` | Incompatível ou pendente | Descoberta nativa OK; workflow original não portado integralmente |
| Skill | `cgs-qa-plan` | Incompatível ou pendente | Descoberta nativa OK; workflow original não portado integralmente |
| Skill | `cgs-quick-design` | Incompatível ou pendente | Descoberta nativa OK; workflow original não portado integralmente |
| Skill | `cgs-regression-suite` | Incompatível ou pendente | Descoberta nativa OK; workflow original não portado integralmente |
| Skill | `cgs-release-checklist` | Incompatível ou pendente | Descoberta nativa OK; workflow original não portado integralmente |
| Skill | `cgs-retrospective` | Incompatível ou pendente | Descoberta nativa OK; workflow original não portado integralmente |
| Skill | `cgs-reverse-document` | Incompatível ou pendente | Descoberta nativa OK; workflow original não portado integralmente |
| Skill | `cgs-review-all-gdds` | Incompatível ou pendente | Descoberta nativa OK; workflow original não portado integralmente |
| Skill | `cgs-scope-check` | Incompatível ou pendente | Descoberta nativa OK; workflow original não portado integralmente |
| Skill | `cgs-security-audit` | Incompatível ou pendente | Descoberta nativa OK; workflow original não portado integralmente |
| Skill | `cgs-settings` | Incompatível ou pendente | Descoberta nativa OK; workflow original não portado integralmente |
| Skill | `cgs-setup-engine` | Incompatível ou pendente | Descoberta nativa OK; workflow original não portado integralmente |
| Skill | `cgs-skill-improve` | Incompatível ou pendente | Descoberta nativa OK; workflow original não portado integralmente |
| Skill | `cgs-skill-test` | Incompatível ou pendente | Descoberta nativa OK; workflow original não portado integralmente |
| Skill | `cgs-smoke-check` | Validado em runtime | Adapter explícito: quick somente leitura; automação PASS, gate NOT ASSESSED |
| Skill | `cgs-soak-test` | Incompatível ou pendente | Descoberta nativa OK; workflow original não portado integralmente |
| Skill | `cgs-sprint-plan` | Incompatível ou pendente | Descoberta nativa OK; workflow original não portado integralmente |
| Skill | `cgs-sprint-status` | Incompatível ou pendente | Descoberta nativa OK; workflow original não portado integralmente |
| Skill | `cgs-start` | Incompatível ou pendente | Descoberta nativa OK; workflow original não portado integralmente |
| Skill | `cgs-story-done` | Incompatível ou pendente | Descoberta nativa OK; workflow original não portado integralmente |
| Skill | `cgs-story-readiness` | Incompatível ou pendente | Descoberta nativa OK; workflow original não portado integralmente |
| Skill | `cgs-team-audio` | Incompatível ou pendente | Descoberta nativa OK; workflow original não portado integralmente |
| Skill | `cgs-team-combat` | Incompatível ou pendente | Descoberta nativa OK; workflow original não portado integralmente |
| Skill | `cgs-team-level` | Incompatível ou pendente | Descoberta nativa OK; workflow original não portado integralmente |
| Skill | `cgs-team-live-ops` | Incompatível ou pendente | Descoberta nativa OK; workflow original não portado integralmente |
| Skill | `cgs-team-narrative` | Incompatível ou pendente | Descoberta nativa OK; workflow original não portado integralmente |
| Skill | `cgs-team-polish` | Incompatível ou pendente | Descoberta nativa OK; workflow original não portado integralmente |
| Skill | `cgs-team-qa` | Incompatível ou pendente | Descoberta nativa OK; workflow original não portado integralmente |
| Skill | `cgs-team-release` | Incompatível ou pendente | Descoberta nativa OK; workflow original não portado integralmente |
| Skill | `cgs-team-ui` | Incompatível ou pendente | Descoberta nativa OK; workflow original não portado integralmente |
| Skill | `cgs-tech-debt` | Incompatível ou pendente | Descoberta nativa OK; workflow original não portado integralmente |
| Skill | `cgs-test-evidence-review` | Incompatível ou pendente | Descoberta nativa OK; workflow original não portado integralmente |
| Skill | `cgs-test-flakiness` | Incompatível ou pendente | Descoberta nativa OK; workflow original não portado integralmente |
| Skill | `cgs-test-helpers` | Incompatível ou pendente | Descoberta nativa OK; workflow original não portado integralmente |
| Skill | `cgs-test-setup` | Incompatível ou pendente | Descoberta nativa OK; workflow original não portado integralmente |
| Skill | `cgs-ux-design` | Incompatível ou pendente | Descoberta nativa OK; workflow original não portado integralmente |
| Skill | `cgs-ux-review` | Incompatível ou pendente | Descoberta nativa OK; workflow original não portado integralmente |
| Skill | `cgs-vertical-slice` | Incompatível ou pendente | Descoberta nativa OK; workflow original não portado integralmente |
| Skill | `cgs-write-changelog` | Incompatível ou pendente | Descoberta nativa OK; workflow original não portado integralmente |

## Fontes

- https://developers.openai.com/codex/subagents (standalone profiles e schema)
- https://developers.openai.com/codex/skills (descoberta .agents/skills)
- Schema gerado pelo próprio codex app-server: SkillsListParams(forceReload, cwds).
- Auditoria anterior desta conversa e oak-studio/MIGRATION-REPORT.md, lidos antes das mudanças.
