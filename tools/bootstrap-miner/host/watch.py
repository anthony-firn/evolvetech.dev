"""Monitor bootstrap/donation mining and retain the CPU thermal interlock."""
import json, time, subprocess, urllib.request, os, stat
from pathlib import Path
BASE = Path(__file__).resolve().parent
UNITS = ['evolve-bootstrap-cpu.service', 'evolve-bootstrap-gpu.service']
FUND = 'WMQHGXHHWQVUN2VIZQJ5OO2GSH5Q33CVABJUCLJHP4UHLTTMS2HE3W6FEM'

def ongoing():
    path = BASE/'settlement/mode.json'
    try:
        info = path.lstat()
    except FileNotFoundError:
        return False
    if not stat.S_ISREG(info.st_mode) or info.st_uid != os.getuid() or info.st_mode & 0o077:
        raise ValueError('Mining mode must be a private file owned by this user')
    value = json.loads(path.read_text())
    if value.get('mode') != 'donations' or value.get('recipient') != FUND or value.get('maxNano') != '6':
        raise ValueError('Invalid ongoing donation mode')
    return True

def command(action, units=UNITS):
    subprocess.run(['systemctl', '--user', action, *units], check=False, capture_output=True)

def reached(value):
    wallet = value.get('wallet') or {}
    pool = value.get('pool') or {}
    if ongoing():
        return None if wallet.get('ready') else 'Donation recipient is no longer USDC-ready; mining stopped.'
    if wallet.get('ready'):
        return 'Donation wallet is initialized and ready for USDC.'
    if wallet.get('funded') or wallet.get('ready'):
        return 'ALGO has arrived. Finish USDC opt-in in the existing owner wallet.'
    try:
        if float(pool.get('threshold', 0)) > 0 and float(pool.get('payable', pool.get('balance', 0))) >= float(pool['threshold']):
            return 'Pool payout threshold reached. Request ALGO payout in unMineable.'
    except (ValueError, TypeError):
        pass
    return None

def cpu_temp():
    for p in Path('/sys/class/thermal').glob('thermal_zone*'):
        try:
            if (p/'type').read_text().strip() == 'x86_pkg_temp':
                return int((p/'temp').read_text()) / 1000
        except (OSError, ValueError):
            pass
    return None

def main():
    cooling = False
    while True:
        out = {'checkedAt':time.time(), 'cpuTemperature':cpu_temp(), 'cooling':cooling}
        try:
            with urllib.request.urlopen('http://127.0.0.1:8773/api/status', timeout=12) as response:
                value = json.load(response)
            out['funding'] = value
            reason = reached(value)
            if reason:
                command('stop'); out['stoppedReason'] = reason
                (BASE/'watch-status.json').write_text(json.dumps(out, indent=2))
                print(reason, flush=True)
                subprocess.run(['notify-send', 'Donation mining stopped', reason], check=False)
                return
        except Exception as e:
            out['fundingError'] = str(e)
            try: ongoing()
            except Exception:
                command('stop'); print('Invalid mining mode; stopping.', flush=True); return
        temp = out['cpuTemperature']
        try: cpu_enabled = json.loads((BASE/'cpu-policy.json').read_text()).get('enabled', True)
        except (OSError, ValueError): cpu_enabled = True
        if not cpu_enabled: cooling = False
        if cpu_enabled and temp is not None and temp >= 95 and not cooling:
            command('stop', UNITS[:1]); cooling = True
            print('CPU reached 95C; cooling before restart.', flush=True)
        elif cpu_enabled and temp is not None and temp <= 82 and cooling:
            command('start', UNITS[:1]); cooling = False
            print('CPU cooled below 82C; mining resumed.', flush=True)
        out['cooling'] = cooling
        (BASE/'watch-status.json').write_text(json.dumps(out, indent=2))
        time.sleep(15)

if __name__ == '__main__':
    main()
