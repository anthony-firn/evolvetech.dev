#!/bin/sh
set -e
systemctl --user start evolve-bootstrap-server.service
/home/anthony/miniconda3/bin/python - <<'PY'
import sys,urllib.request,json,time
sys.path.insert(0,'/home/anthony/.local/share/evolve-bootstrap')
from watch import reached, ongoing
for attempt in range(20):
    try:
        with urllib.request.urlopen('http://127.0.0.1:8773/api/status',timeout=15) as r: v=json.load(r)
        break
    except (OSError, ValueError):
        if attempt == 19: raise SystemExit('Funding status unavailable; mining was not started.')
        time.sleep(0.5)
if not v.get('wallet') or (not ongoing() and not v.get('pool')):
    raise SystemExit('Funding status unavailable; check the status server before starting.')
reason=reached(v)
if reason:raise SystemExit(reason)
if not ongoing() and not v['pool'].get('enabled'):raise SystemExit('Pool ALGO payouts are disabled.')
PY
if [ -f /home/anthony/.local/share/evolve-bootstrap/settlement/activation.json ]; then
    systemctl --user start evolve-bootstrap-watch.service evolve-bootstrap-settlement.service
else
    systemctl --user start evolve-bootstrap-watch.service evolve-bootstrap-cpu.service evolve-bootstrap-gpu.service
fi
