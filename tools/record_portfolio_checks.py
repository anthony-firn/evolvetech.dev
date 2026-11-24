"""Record local verification timings, not build improvements or cloud deployment speed."""
import json
import platform
from pathlib import Path
import subprocess
import sys
import time
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[1]
commands = ['tools/test_monitor.py', 'tools/test_delivery.py', 'tools/check_delivery.py', 'examples/campaign-freshness.py']
records = []
for command in commands:
    start = time.perf_counter()
    result = subprocess.run([sys.executable, command], cwd=ROOT, capture_output=True, text=True)
    elapsed = time.perf_counter() - start
    if result.returncode:
        raise SystemExit(f'Check failed: {command}')
    records.append({'command': 'python3 '+command, 'exitCode': result.returncode, 'elapsedSeconds': round(elapsed, 4)})
path = ROOT / 'public/evidence/portfolio-checks.json'
path.write_text(json.dumps({'recordedAt': datetime.now(timezone.utc).isoformat(), 'environment': {
    'system': platform.system(), 'architecture': platform.machine(), 'python': platform.python_version()},
    'scope': 'One local run on the development machine. These are verification durations, not a production benchmark, cloud deployment timing or measured improvement.',
    'checks': records}, indent=2)+'\n')
print('Recorded successful local checks in public/evidence/portfolio-checks.json')
