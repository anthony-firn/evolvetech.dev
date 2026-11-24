"""Smoke-test Cloudflare's generated assets, effective headers and encoded WASM in Chromium.

Run after tools/build_cloudflare.py; requires Python Playwright and Chromium.
"""
import fnmatch
import functools
import hashlib
import http.server
import json
import threading
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
from build_cloudflare import ROOT, MARKER

PUBLIC = ROOT / '.cloudflare/public'


def effective_headers(text, path):
    active, headers = False, {}
    for line in text.splitlines():
        if not line.strip() or line.lstrip().startswith('#'):
            continue
        if not line[:1].isspace():
            active = fnmatch.fnmatchcase(path, line.strip())
        elif active:
            entry = line.strip()
            if entry.startswith('! '):
                headers.pop(entry[2:].lower(), None)
            else:
                name, value = entry.split(':', 1)
                name = name.lower()
                headers[name] = ', '.join(v for v in [headers.get(name), value.strip()] if v)
    return headers


def main():
    header_text = (PUBLIC / '_headers').read_text()
    class Handler(http.server.SimpleHTTPRequestHandler):
        extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, '.mjs': 'text/javascript', '.wasm': 'application/wasm'}
        def end_headers(self):
            for name, value in effective_headers(header_text, self.path.split('?', 1)[0]).items():
                # SimpleHTTPRequestHandler already derives MIME from the .wasm path.
                if name != 'content-type':
                    self.send_header(name, value)
            super().end_headers()
        def log_message(self, *_): pass
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Handler, directory=str(PUBLIC)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    errors = []
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_page(viewport={'width': 1200, 'height': 900})
            page.on('pageerror', lambda e: errors.append(str(e)))
            page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
            origin = f'http://127.0.0.1:{server.server_port}'
            page.goto(origin + '/play/proof/')
            expect(page.locator('.stage-card')).to_have_count(7)
            manifest = json.loads((PUBLIC / MARKER).read_text())
            for asset in manifest['encodedAssets']:
                result = page.evaluate('''async path => {
                    const response = await fetch(path);
                    const bytes = new Uint8Array(await response.arrayBuffer());
                    const sha = await crypto.subtle.digest('SHA-256', bytes);
                    return {status: response.status, encoding: response.headers.get('content-encoding'),
                        bytes: bytes.length, validWasm: WebAssembly.validate(bytes),
                        sha: Array.from(new Uint8Array(sha), b => b.toString(16).padStart(2, '0')).join('')};
                }''', asset['path'])
                assert result == dict(status=200, encoding='gzip', bytes=asset['originalBytes'], validWasm=True, sha=asset['decodedSha256']), result
            browser.close()
    finally:
        server.shutdown(); server.server_close()
    assert not errors, errors
    print('Cloudflare browser smoke passed: Proof renders; WASM decodes, matches source and validates under the effective CSP.')


if __name__ == '__main__':
    main()
