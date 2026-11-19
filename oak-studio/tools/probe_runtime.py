"""Fresh app-server discovery probe; no model turn, no auth contents printed."""
import json
import os
import queue
import subprocess
import sys
import threading
import tempfile
from pathlib import Path

root = Path(__file__).resolve().parents[2]
exe = Path(sys.argv[1])
env = os.environ.copy()
isolated = '--isolated' in sys.argv
if isolated:
    home = Path(tempfile.gettempdir())/'oak-studio-isolated-probe'
    home.mkdir(parents=True, exist_ok=True)
    env['CODEX_HOME'] = str(home)
proc = subprocess.Popen([str(exe), 'app-server', '--stdio'], cwd=root,
    stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
    text=True, encoding='utf-8', errors='replace', env=env)
messages = queue.Queue()
diagnostics = []
def drain_errors():
    for line in proc.stderr:
        diagnostics.append(line)
threading.Thread(target=drain_errors, daemon=True).start()
def consume():
    for line in proc.stdout:
        try: messages.put(json.loads(line))
        except json.JSONDecodeError: pass
threading.Thread(target=consume, daemon=True).start()
def request(ident, method, params):
    proc.stdin.write(json.dumps({'id': ident, 'method': method, 'params': params})+'\n')
    proc.stdin.flush()
    import time
    end = time.monotonic()+25
    while time.monotonic() < end:
        try: msg = messages.get(timeout=1)
        except queue.Empty:
            if proc.poll() is not None: raise RuntimeError('app-server exited '+str(proc.returncode))
            continue
        if msg.get('id') == ident: return msg
    raise TimeoutError(method)
out = {'isolated_home': isolated}
try:
    out['initialize'] = request(1, 'initialize', {'clientInfo': {'name': 'oak-studio-audit', 'version': '1.0'}, 'capabilities': {'experimentalApi': True}})
    out['skills'] = request(2, 'skills/list', {'cwds': [str(root)], 'forceReload': True})
except Exception as exc: out['failure'] = str(exc)
finally:
    proc.terminate()
    try: proc.wait(timeout=5)
    except subprocess.TimeoutExpired: proc.kill()
    # Keep diagnostics local; do not include authentication material in console output.
    out['stderr'] = ''.join(diagnostics)[-12000:]
path = root/('oak-studio/compat/discovery-isolated.json' if isolated else 'oak-studio/compat/discovery.json')
path.parent.mkdir(parents=True, exist_ok=True)
path.write_text(json.dumps(out, ensure_ascii=True, indent=2), encoding='utf-8')
skills = out.get('skills', {}).get('result', {}).get('data', [])
print(json.dumps({'evidence': str(path.relative_to(root)), 'failure': out.get('failure'),
    'responses': list(out), 'groups': len(skills),
    'cgs_names': [s.get('name') for group in skills for s in group.get('skills', []) if s.get('name','').startswith('cgs-')]}, indent=2))
