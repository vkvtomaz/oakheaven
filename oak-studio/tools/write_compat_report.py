"""Generate an evidence-scoped matrix; never equates discovery with execution."""
import json
from pathlib import Path
import re
import tomllib

ROOT = Path(__file__).resolve().parents[2]
rows = []
for p in sorted((ROOT/'.codex/agents').glob('cgs_*.toml')):
    d = tomllib.loads(p.read_text(encoding='utf-8-sig'))
    tested = d['name'] in ('cgs_art_director','cgs_gameplay_programmer')
    rows.append({'kind':'Agent','name':d['name'], 'status': 'Validado em runtime' if tested else 'Convertido, mas ainda não testado',
        'scope': 'Delegação explícita, perfil lido e retorno recebido; seleção nativa não testada' if tested else 'Schema TOML verificado; comportamento não exercitado',
        'path':str(p.relative_to(ROOT)).replace('\\','/')})
discovery=json.loads((ROOT/'oak-studio/compat/discovery-isolated.json').read_text())
found={s['name'] for g in discovery['skills']['result']['data'] for s in g.get('skills',[])}
assert len([n for n in found if n.startswith('cgs-')])==78
for p in sorted((ROOT/'.agents/skills').glob('cgs-*/SKILL.md')):
    text=p.read_text(encoding='utf-8-sig')
    tested=p.parent.name in ('cgs-dev-story','cgs-smoke-check')
    deps=[t for t in ('CLAUDE_SKILL_DIR','yaml-helper.sh','!`','subagent_type','AskUserQuestion','project.yaml') if t in text]
    # Read all supporting files, so unresolved dependencies in references are not hidden.
    refs=[q for q in p.parent.rglob('*') if q.is_file() and q.suffix in ('.md','.sh','.py','.json','.yaml')]
    for q in refs: q.read_text(encoding='utf-8-sig',errors='replace')
    rows.append({'kind':'Skill','name':p.parent.name,'status':'Validado em runtime' if tested else 'Incompatível ou pendente',
        'scope': ('Adapter explícito: readiness somente leitura' if p.parent.name=='cgs-dev-story' else 'Adapter explícito: quick somente leitura; automação PASS, gate NOT ASSESSED') if tested else 'Descoberta nativa OK; workflow original não portado integralmente',
        'native_discovered':p.parent.name in found,'legacy_dependencies':deps,'support_files_read':len(refs),
        'path': ('oak-studio/compat/skills/'+p.parent.name+'/SKILL.md') if tested else str(p.relative_to(ROOT)).replace('\\','/')})
assert len(rows)==127
(ROOT/'oak-studio/compat/matrix.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf-8')
header='''# Studio v5 — correção de compatibilidade Codex

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
'''
table='\n'.join('| '+r['kind']+' | `'+r['name']+'` | '+r['status']+' | '+r['scope']+' |' for r in rows)
sources='''

## Fontes

- https://developers.openai.com/codex/subagents (standalone profiles e schema)
- https://developers.openai.com/codex/skills (descoberta .agents/skills)
- Schema gerado pelo próprio codex app-server: SkillsListParams(forceReload, cwds).
- Auditoria anterior desta conversa e oak-studio/MIGRATION-REPORT.md, lidos antes das mudanças.
'''
(ROOT/'oak-studio/COMPATIBILITY-REPORT.md').write_text(header+table+sources,encoding='utf-8')
print('127 componentes; matriz JSON e relatório escritos')
