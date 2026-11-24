"""Exercise daily or weekly Proof v2 in Chromium under production CSP.

python3 tools/test_proof.py [mission-id]
Needs Python Playwright and its Chromium. Local server access is required.
Covers stage order, locked reference answers, scoring, Pyodide timeout/recovery,
ship-note constraints, persistence, mobile overflow and a separate weekly project.
The GPU coach and video synthesis are checked separately.
"""
import functools
import http.server
import json
import re
import sys
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / 'public'


def play_csp():
    text = (PUBLIC / '_headers').read_text()
    block = re.search(r'^/play/\*\n((?:[ \t]+.*\n)+)', text, re.M).group(1)
    return re.search(r'Content-Security-Policy:\s*(.+)', block).group(1).strip()


class Handler(http.server.SimpleHTTPRequestHandler):
    csp = play_csp()
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, '.mjs': 'text/javascript', '.js': 'text/javascript', '.wasm': 'application/wasm'}

    def log_message(self, *_):
        pass

    def end_headers(self):
        if self.path.startswith('/play/'):
            self.send_header('Content-Security-Policy', self.csp)
        super().end_headers()


def daily(page, ep):
    eid = ep['id']
    expect(page.locator('.stage-card')).to_have_count(7)
    expect(page.locator('#stage-problem .stage-body')).to_be_hidden()
    expect(page.locator('#stage-research .stage-body')).to_be_hidden()
    expect(page.locator('#stage-briefing video')).to_have_count(int(bool(ep['briefing'].get('video'))))
    page.get_by_role('button', name='Mark as watched').click()
    expect(page.locator('#stage-problem .stage-body')).to_be_visible()
    best = next(i for i, o in enumerate(ep['problem']['options']) if o['verdict'] == 'best')
    problem = page.locator('#stage-problem')
    problem.locator('.choice').nth(best).click()
    expect(page.locator('#stage-research .stage-body')).to_be_hidden()
    problem.locator('.choice').nth(len(ep['problem']['options']) + ep['problem']['cost']['answer']).click()
    expect(page.locator('#stage-research .stage-body')).to_be_visible()

    research = page.locator('#stage-research')
    expect(research.locator('.reveal')).to_be_hidden()
    research.get_by_role('button', name='Lock in my answers').click()
    expect(research.locator('.reveal')).to_be_hidden()
    for i, q in enumerate(ep['research']['questions']):
        research.locator('textarea').nth(i).fill(q['answer'])
    research.get_by_role('button', name='Lock in my answers').click()
    expect(research.locator('.reveal')).to_be_visible()
    expect(research.locator('textarea').first).to_have_attribute('readonly', '')
    for box in research.locator('input[type=checkbox]').all():
        box.check()
    research.get_by_role('button', name='Score my reading').click()

    design = page.locator('#stage-design')
    ask = design.get_by_role('button', name='Ask the coach')
    expect(ask).to_be_disabled()
    for area in design.locator('textarea').all():
        area.fill('Account for capacity and inspect the reservation before starting work.')
    design.get_by_role('button', name='Submit my design').click()
    expect(ask).to_be_enabled()
    for box in design.locator('input[type=checkbox]').all():
        box.check()
    design.get_by_role('button', name='Score my design').click()

    review = page.locator('#stage-review')
    for i, issue in enumerate(ep['review']['issues']):
        if issue['real']:
            review.locator('input').nth(i).check()
    review.get_by_role('button', name='Submit my review').click()
    expect(review.locator('.score')).to_contain_text('false alarms 0')

    build = page.locator('#stage-build')
    run = build.get_by_role('button', name='Run tests')
    run.click()
    expect(build.locator('.results .fail').first).to_be_visible(timeout=90000)
    expect(build).not_to_have_class(re.compile('done'))
    build.get_by_role('button', name='Show a hint').click()
    page.reload()
    expect(page.locator('#stage-build .hints li')).to_have_count(1)
    build = page.locator('#stage-build')
    run = build.get_by_role('button', name='Run tests')
    build.locator('textarea.code').fill('while True:\n    pass\n')
    run.click()
    expect(build.locator('.results')).to_contain_text('Stopped after', timeout=30000)
    solution = (PUBLIC / f'play/proof/episodes/{eid}.solution.py').read_text()
    build.locator('textarea.code').fill(solution)
    run.click()
    expect(build.locator('.results li.pass')).to_have_count(len(ep['build']['tests']), timeout=90000)
    expect(build).to_have_class(re.compile('done'))
    expect(build.locator('.meta')).to_contain_text('+35 XP')

    ship = page.locator('#stage-ship')
    expect(ship.get_by_role('button', name='Ask the coach')).to_be_disabled()
    ship.locator('textarea').fill('A single line with no evidence.')
    ship.get_by_role('button', name='Ship it').click()
    expect(ship).not_to_have_class(re.compile('done'))
    ship.locator('textarea').fill('Reserve the waiting build while short tasks use the gap.\nTest the five-minute boundary and a six-minute backfill task.')
    ship.get_by_role('button', name='Ship it').click()
    expect(ship).to_have_class(re.compile('done'))
    expect(ship.get_by_role('button', name='Ask the coach')).to_be_enabled()
    xp = page.evaluate("JSON.parse(localStorage.getItem('proof-progress-v2')).xp")
    page.reload()
    expect(page.locator('.stage-card.done')).to_have_count(7)
    expect(page.locator('textarea.code')).to_have_value(solution)
    expect(page.locator('.stats .stat b').first).to_have_text('1')
    assert page.evaluate("JSON.parse(localStorage.getItem('proof-progress-v2')).xp") == xp
    assert len(page.evaluate("JSON.parse(localStorage.getItem('proof-progress-v2')).cards")) == len(ep['recall'])
    page.set_viewport_size({'width': 360, 'height': 780})
    assert page.evaluate('document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1'), 'completed mission overflows mobile'
    page.evaluate('window.scrollTo(0, 0)')
    page.screenshot(path='/tmp/proof-completed-mobile.png')


def main(argv):
    index = json.loads((PUBLIC / 'play/proof/episodes/index.json').read_text())['episodes']
    eid = argv[0] if argv else next(e['id'] for e in index if e['kind'] == 'daily')
    ep = json.loads((PUBLIC / f'play/proof/episodes/{eid}.json').read_text())
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Handler, directory=str(PUBLIC)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    origin = f'http://127.0.0.1:{server.server_port}'
    url = origin + f'/play/proof/#/{eid}'
    problems = []
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            context = browser.new_context(viewport={'width': 1200, 'height': 900}, timezone_id='UTC')
            context.add_init_script("""{ const RealDate = Date; window.Date = class extends RealDate {
              constructor(...args) { super(...(args.length ? args : ['2026-11-24T15:00:00Z'])); }
              static now() { return new RealDate('2026-11-24T15:00:00Z').getTime(); }
            }; }""")
            page = context.new_page()
            page.on('pageerror', lambda e: problems.append(str(e)))
            page.on('console', lambda m: problems.append(m.text) if m.type == 'error' else None)
            page.goto(url)
            expect(page.locator('.ep-title')).to_have_text(ep['title'])
            if ep['kind'] == 'daily':
                daily(page, ep)
            else:
                expect(page.locator('.stage-card')).to_have_count(1)
                page.locator('input[type=url]').fill('https://github.com/example/repo/commit/123')
                page.get_by_role('button', name='Mark it shipped').click()
                expect(page.locator('#stage-project')).to_have_class(re.compile('done'))
                page.reload()
                expect(page.locator('#stage-project')).to_contain_text('https://github.com/example/repo/commit/123')
            # A new browser chooses the daily mission, not the same-date weekly project.
            phone = browser.new_page(viewport={'width': 360, 'height': 780})
            phone.goto(origin + '/play/proof/')
            daily_meta = next(e for e in index if e['kind'] == 'daily')
            expect(phone.locator('.ep-title')).to_have_text(daily_meta['title'])
            for _ in range(8):
                assert phone.evaluate('document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1'), '360px page overflow'
                if phone.locator('#stage-briefing video').count():
                    phone.get_by_text('Interactive scenes and browser narration', exact=True).click() if not phone.locator('#stage-briefing .player').is_visible() else None
                phone.get_by_role('button', name='Next scene').click()
            browser.close()
    finally:
        server.shutdown()
        server.server_close()
    if problems:
        raise SystemExit('Browser errors:\n' + '\n'.join(problems))
    print(f'Proof v2 browser checks passed for {eid}')


if __name__ == '__main__':
    main(sys.argv[1:])
