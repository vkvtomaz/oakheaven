# OAKHEAVEN Game Studio — Status de migração (Codex)

Origem: https://github.com/Donchitos/Claude-Code-Game-Studios
Status: **conversão de catálogo feita; paridade funcional NÃO certificada**.

- Agentes convertidos: **49 / 49**
- Skills convertidas: **78** (originais: 78)
- Regras preservadas para consulta: **14**
- Entradas de hook originais catalogadas: **15**, NÃO ativadas
- Scripts, templates, project.yaml e toda a fonte preservados em `oak-studio/upstream/`.

## Limitações importantes

1. Hooks do Claude e permissões específicas não podem ser executados sem adaptação e revisão. **Não estão ativos.**
2. O conjunto de Skills contém referências e hipóteses de projetos novos; para OAKHEAVEN, o AGENTS.md exige preservação.
3. Os TOML e Skill frontmatters são verificados, mas a qualidade ou automação de todos os 78 fluxos ainda não foi validada em Codex.
4. Não copie o project.yaml nem src/ do original para a raiz do jogo.
5. Verifique a tela em runtime; build/testes verdes não provam qualidade visual.

## Como acionar

Abra uma nova conversa Codex na raiz e use `$cgs-dev-story` para uma funcionalidade pequena.
Para uma inspeção inicial use `$cgs-project-stage-detect` se existir (consulte INDEX.md).
Use `$oak-ship-visual` do kit anterior apenas se ele já estiver instalado.

## Documentação

A lista completa dos mapeamentos está em `MIGRATION-REPORT.json` e `INDEX.md`.


## Atualização de compatibilidade — 2026-11-18

Consultar COMPATIBILITY-REPORT.md e compat/matrix.json. Descoberta nativa de 78 Skills comprovada; execução integral não certificada. Dois adapters explícitos em compat/skills foram exercitados somente em leitura. Instalados em .agents permanecem intactos por bloqueio de escrita.
