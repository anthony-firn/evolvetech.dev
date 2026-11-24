"""Check the delivery contract without changing routing or uploading files.

Default: local artifacts only. --live also probes each CDN with the real TLS
hostname/SNI, independently of current DNS. No provider credentials are needed.
"""
import argparse
import json
from pathlib import Path
from monitor import C, HOMEPAGE_MARKER, fetch

ROOT = Path(__file__).resolve().parents[1]
MODULE = '/play/symmetry-forge/pyodide/pyodide.mjs'
JS_TYPES = {'text/javascript', 'application/javascript'}


def check_response(path, status, body, content_type=None):
    if status != 200:
        raise ValueError(f'{path}: expected HTTP 200, got {status}')
    if path == '/' and HOMEPAGE_MARKER not in body:
        raise ValueError('Homepage no longer matches the failover monitor; update the contract together')
    if path == '/health.json' and json.loads(body).get('status') != 'ok':
        raise ValueError('Health document is not ok')
    if path.endswith('.mjs') and content_type is not None and content_type.split(';')[0].strip().lower() not in JS_TYPES:
        raise ValueError('Module scripts require a JavaScript content type, not an octet-stream response')


def check_local():
    public = ROOT / 'public'
    check_response('/', 200, (public / 'index.html').read_text())
    check_response('/health.json', 200, (public / 'health.json').read_text())
    if not (public / MODULE.lstrip('/')).is_file():
        raise ValueError('The representative module is missing')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--live', action='store_true')
    args = parser.parse_args()
    check_local()
    print('Local homepage/monitor contract, health document and module artifact passed.')
    if args.live:
        for name in ['netlify_target', 'bunny_target']:
            for path in ['/', '/health.json', MODULE]:
                status, body, headers = fetch(C[name], path, include_headers=True)
                check_response(path, status, body, headers.get('content-type', ''))
            print(f'{name}: HTTPS hostname, homepage, health and module MIME passed.')


if __name__ == '__main__':
    main()
