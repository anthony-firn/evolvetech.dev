"""One local command for portfolio links, delivery regressions and the synthetic example."""
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
for command in [
    ['tools/check_site.py'], ['tools/test_monitor.py'], ['tools/test_delivery.py'],
    ['tools/check_delivery.py'], ['examples/campaign-freshness.py'], ['tools/voice_check.py', '--strict'],
    ['tools/check_proof.py'],
]:
    subprocess.run([sys.executable, *command], cwd=ROOT, check=True)
