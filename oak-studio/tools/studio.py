"""Portable, read-only Studio bridge. Python 3.11+, standard library only."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import tomllib

ROOT = Path(__file__).resolve().parents[2]

def snapshot():
    return {str(p.relative_to(ROOT)).replace('\\', '/'): hashlib.sha256(p.read_bytes()).hexdigest()
            for folder in ('src', 'img', 'public') for p in sorted((ROOT / folder).rglob('*')) if p.is_file()}

def config():
    path = ROOT / 'oak-studio/runtime.json'
    data = json.loads(path.read_text(encoding='utf-8'))
    # Never silently use upstream project.yaml as this game's configuration.
    return {'source': str(path.relative_to(ROOT)), 'legacy_project_yaml': (ROOT / 'project.yaml').exists(), **data}

def catalog():
    agents = []
    for p in sorted((ROOT / '.codex/agents').glob('cgs_*.toml')):
        d = tomllib.loads(p.read_text(encoding='utf-8-sig'))
        assert all(isinstance(d.get(k), str) and d[k] for k in ('name', 'description', 'developer_instructions')), p
        agents.append({'name': d['name'], 'path': str(p.relative_to(ROOT)), 'description': d['description']})
    skills = []
    for p in sorted((ROOT / '.agents/skills').glob('cgs-*/SKILL.md')):
        t = p.read_text(encoding='utf-8-sig')
        m = re.match(r'---\s*\n(.*?)\n---', t, re.S)
        assert m, p
        name = re.search(r'^name:\s*(.+)$', m[1], re.M).group(1).strip()
        assert name == p.parent.name, p
        skills.append({'name': name, 'path': str(p.relative_to(ROOT)), 'legacy_dependencies':
            [x for x in ('CLAUDE_SKILL_DIR', 'yaml-helper.sh', '!`', 'subagent_type') if x in t]})
    assert len(agents) == 49 and len(skills) == 78
    return {'agents': agents, 'skills': skills}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['config', 'catalog', 'profile', 'snapshot', 'verify'])
    parser.add_argument('value', nargs='?')
    args = parser.parse_args()
    if args.command == 'config': result = config()
    elif args.command == 'catalog': result = catalog()
    elif args.command == 'profile':
        if not args.value or not re.fullmatch(r'cgs_[a-z_]+', args.value): parser.error('Exact cgs_ role required')
        result = tomllib.loads((ROOT / '.codex/agents' / (args.value + '.toml')).read_text(encoding='utf-8-sig'))
    elif args.command == 'snapshot': result = snapshot()
    else:
        if not args.value: parser.error('baseline JSON path required')
        before = json.loads(Path(args.value).read_text(encoding='utf-8-sig'))
        after = snapshot()
        changed = sorted(k for k in before.keys() | after.keys() if before.get(k) != after.get(k))
        result = {'unchanged': not changed, 'changed': changed, 'files': len(after)}
        print(json.dumps(result, ensure_ascii=True, indent=2))
        raise SystemExit(bool(changed))
    print(json.dumps(result, ensure_ascii=True, indent=2))

if __name__ == '__main__': main()
