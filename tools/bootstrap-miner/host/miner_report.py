#!/usr/bin/env python3
"""Read-only miner report: what the miners do and what the pool actually pays.

Run every 15 minutes by evolve-miner-report.timer. It reads XMRig's local read-only API, BzMiner's summary line in
its journal, nvidia-smi, and the pool balance that the settlement runner already records
(settlement/algo-direct-state.json), so it never contacts the pool itself. Appends one sample to
miner/history.jsonl and writes miner/status.json with the measured ALGO per day: the sum of pool balance increases,
counting a drop (a payout) as starting again from zero.
"""
import json, os, re, subprocess, time, urllib.request
from datetime import datetime, timezone
from pathlib import Path

BASE = Path.home() / '.local/share/evolve-bootstrap'
XMRIG = 'http://127.0.0.1:8774/2/summary'
UNITS = {'cpu': 'evolve-bootstrap-cpu.service', 'gpu': 'evolve-bootstrap-gpu.service'}
# BzMiner's summary row: | smry |     |  -- | 1/0/0 | 749.0ghw | 22.98th |  24.45th | connected: yes | diff 9.01P |
SUMMARY = re.compile(r'\|\s*smry\s*\|[^|]*\|[^|]*\|\s*(\d+)/(\d+)/(\d+)\s*\|[^|]*\|\s*([\d.]+)\s*([kmgtp]?)h\s*\|\s*([\d.]+)\s*([kmgtp]?)h\s*\|')
SCALE = {'': 1, 'k': 1e3, 'm': 1e6, 'g': 1e9, 't': 1e12, 'p': 1e15}

def active(unit):
    return subprocess.run(['systemctl', '--user', 'is-active', '--quiet', unit]).returncode == 0

def cpu_miner():
    try:
        with urllib.request.urlopen(XMRIG, timeout=5) as r: d = json.load(r)
    except Exception:
        return None
    rate = d.get('hashrate', {}).get('total') or []
    res = d.get('results', {}); pages = d.get('hugepages') or [0, 0]
    return {'hps10s': rate[0] if rate else None, 'hps60s': rate[1] if len(rate) > 1 else None,
            'accepted': res.get('shares_good'), 'total': res.get('shares_total'),
            'hugePages': f'{pages[0]}/{pages[1]}', 'uptime': d.get('uptime')}

def parse_summary(text):
    """The last BzMiner summary row: shares accepted/rejected/stale and current/average hashes per second."""
    last = None
    for m in SUMMARY.finditer(text.lower()): last = m
    if not last: return None
    a, r, s, cur, cu, avg, au = last.groups()
    return {'accepted': int(a), 'rejected': int(r), 'stale': int(s), 'hps': float(cur) * SCALE[cu], 'avgHps': float(avg) * SCALE[au]}

def gpu_miner():
    out = subprocess.run(['journalctl', '--user', '-u', UNITS['gpu'], '-n', '300', '--no-pager', '-o', 'cat'], capture_output=True, text=True).stdout
    return parse_summary(out)

def gpu_sensors():
    try:
        out = subprocess.run(['nvidia-smi', '--query-gpu=temperature.gpu,power.draw,clocks.sm,utilization.gpu', '--format=csv,noheader,nounits'],
                             capture_output=True, text=True, timeout=10).stdout.strip().split(', ')
        return {'tempC': float(out[0]), 'watts': float(out[1]), 'smMHz': float(out[2]), 'util': float(out[3])}
    except Exception:
        return None

def pool():
    try:
        s = json.loads((BASE / 'settlement/algo-direct-state.json').read_text())
        return {'algo': float(s['poolAlgo']), 'checkedAt': s.get('checkedAt')} if s.get('poolAlgo') is not None else None
    except Exception:
        return None

def earned(samples, since):
    """ALGO credited by the pool between `since` (epoch seconds) and the last sample."""
    pts = [(x['t'], x['pool']['algo']) for x in samples if x.get('pool')]
    total, prev = 0.0, None
    for t, algo in pts:
        if prev is not None and t > since:
            total += algo - prev if algo >= prev else algo
        prev = algo
    return total

def rate(samples, hours, now):
    """Measured ALGO a day over the trailing window, once mining covers at least half of it."""
    window = [x for x in samples if x['t'] >= now - hours * 3600 and x.get('pool')]
    if len(window) < 2 or window[-1]['t'] - window[0]['t'] < hours * 1800: return None
    span = window[-1]['t'] - window[0]['t']
    return earned(window, window[0]['t']) * 86400 / span

def main():
    out = BASE / 'miner'; out.mkdir(mode=0o700, exist_ok=True)
    now = time.time()
    sample = {'t': round(now), 'at': datetime.now(timezone.utc).isoformat(timespec='seconds'),
              'running': {k: active(u) for k, u in UNITS.items()}, 'pool': pool()}
    if sample['running']['cpu']: sample['cpu'] = cpu_miner()
    if sample['running']['gpu']: sample['gpu'] = gpu_miner(); sample['gpuSensors'] = gpu_sensors()
    history = out / 'history.jsonl'
    with open(history, 'a') as f: f.write(json.dumps(sample) + '\n')
    os.chmod(history, 0o600)
    samples = [json.loads(l) for l in history.read_text().splitlines()[-2000:] if l.strip()]
    status = {**sample, 'algoPerDay6h': rate(samples, 6, now), 'algoPerDay24h': rate(samples, 24, now),
              'earned24h': round(earned(samples, now - 86400), 6)}
    tmp = out / 'status.json.tmp'; tmp.write_text(json.dumps(status, indent=1)); os.chmod(tmp, 0o600); tmp.replace(out / 'status.json')

if __name__ == '__main__':
    main()
