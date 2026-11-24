"""Validate every indexed v2 mission, exercise and optional video before publication.

python3 tools/check_proof.py [--online] [mission-id ...]
Online checks reject unreadable sources; a 403/429 is not evidence of reviewed content.
"""
import hashlib
import json
import re
import subprocess
import sys
import urllib.request
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GAME = ROOT / 'public/play/proof'
EPISODES = GAME / 'episodes'
VISUALS = {'title', 'statement', 'bullets', 'code', 'compare', 'flow'}
errors = []


def need(ok, message):
    if not ok:
        errors.append(message)
    return bool(ok)


def run_tests(code, tests, timeout=20):
    script = 'import sys,json;sys.path.insert(0,sys.argv[1]);import harness;print(harness.run(sys.stdin.read(),sys.argv[2]))'
    try:
        p = subprocess.run([sys.executable, '-I', '-c', script, str(GAME), json.dumps(tests)], input=code,
                           capture_output=True, text=True, timeout=timeout)
        if p.returncode:
            return {'error': p.stderr[-2000:], 'results': []}
        return json.loads(p.stdout.strip().splitlines()[-1])
    except (subprocess.TimeoutExpired, ValueError, IndexError) as e:
        return {'error': str(e), 'results': []}


def choice(q, where):
    choices = q.get('choices', [])
    need(2 <= len(choices) <= 6 and all(isinstance(c, str) and c for c in choices), f'{where}: 2–6 nonempty choices required')
    need(type(q.get('answer')) is int and 0 <= q['answer'] < len(choices) and q.get('why'), f'{where}: invalid answer or explanation')


def source(s, where, online):
    url = s.get('url', '')
    need(s.get('title') and url.startswith('https://'), f'{where}: titled HTTPS source required')
    if online and url.startswith('https://'):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'Proof-source-check'}), timeout=20) as r:
                need(200 <= r.status < 400, f'{where}: {url} returned {r.status}')
        except Exception as e:
            errors.append(f'{where}: cannot verify source {url}: {e}')


def video(ep, where):
    v = ep['briefing'].get('video')
    if not v:
        return
    paths = {}
    for k in ('src', 'captions', 'poster', 'manifest'):
        path = (GAME / v.get(k, '__missing__')).resolve()
        if need(path.is_relative_to(GAME.resolve()) and path.is_file(), f'{where}: video {k} file missing or outside game'):
            paths[k] = path
    if len(paths) != 4:
        return
    manifest = json.loads(paths['manifest'].read_text())
    sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
    script = '\n'.join(s['narration'] for s in ep['briefing']['scenes'])
    need(manifest['scriptSha256'] == hashlib.sha256(script.encode()).hexdigest(), f'{where}: video script is stale')
    need(manifest['styleSha256'] == sha(GAME / 'video-style.json'), f'{where}: video style is stale')
    need(manifest['videoSha256'] == sha(paths['src']), f'{where}: video checksum mismatch')
    for f in ('scene.js', 'video.js', 'video.css', 'proof.css', 'text.js'):
        need(manifest.get('renderer', {}).get(f) == sha(GAME / f), f'{where}: stale renderer {f}')
    probe = subprocess.run(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(paths['src'])], capture_output=True, text=True, check=True)
    streams = json.loads(probe.stdout)
    vs = next(s for s in streams['streams'] if s['codec_type'] == 'video')
    audio = next(s for s in streams['streams'] if s['codec_type'] == 'audio')
    style = json.loads((GAME / 'video-style.json').read_text())
    need((vs['width'], vs['height'], vs['codec_name'], vs['pix_fmt']) == (style['width'], style['height'], 'h264', 'yuv420p'), f'{where}: unexpected video format')
    need(vs.get('r_frame_rate') == f"{style['fps']}/1" and vs.get('avg_frame_rate') == f"{style['fps']}/1", f'{where}: video must have the shared constant frame rate')
    need(audio['codec_name'] == 'aac', f'{where}: audio must be AAC')
    need(manifest.get('exporterSha256') == sha(ROOT / 'tools/render_proof_video.py'), f'{where}: stale exporter')
    for font in (ROOT / 'public/assets/fonts').glob('*.woff2'):
        need(manifest.get('fonts', {}).get(font.name) == sha(font), f'{where}: stale font {font.name}')
    duration = float(streams['format']['duration'])
    lo, hi = style['rules']['durationSeconds']
    need(lo <= duration <= hi and abs(duration - manifest['seconds']) < 2, f'{where}: video duration differs from manifest/budget')
    vtt = paths['captions'].read_text()
    need(vtt.startswith('WEBVTT\n'), f'{where}: missing WebVTT header')
    cues = re.findall(r'(\d\d:\d\d:\d\d\.\d{3}) --> (\d\d:\d\d:\d\d\.\d{3})\n([^\n]+)', vtt)
    normalize = lambda text: ' '.join(text.split())
    need(normalize(' '.join(c[2] for c in cues)) == normalize(script), f'{where}: captions differ from narration')
    def seconds(t):
        h, m, s = t.split(':')
        return int(h) * 3600 + int(m) * 60 + float(s)
    last = 0
    for start, end, _ in cues:
        a, b = seconds(start), seconds(end)
        need(a >= last - .002 and b > a and b <= duration + .1, f'{where}: caption timing outside video or overlaps')
        last = b
    need(abs(last - manifest['seconds']) < .05, f'{where}: captions stop before narration ends')


def check_episode(meta, online, require_video=False):
    where = meta['id']
    if not need(re.fullmatch(r'\d{4}-\d{2}-\d{2}(?:-project)?', where), f'{where}: invalid id'):
        return
    path = EPISODES / f'{where}.json'
    if not need(path.is_file(), f'{where}: mission file missing'):
        return
    ep = json.loads(path.read_text())
    required = ('version', 'id', 'date', 'kind', 'title', 'tracks', 'minutes', 'hook', 'sources', 'disclosure')
    if not all(need(k in ep, f'{where}: missing {k}') for k in required):
        return
    date.fromisoformat(ep['date'])
    need(ep['version'] == 2, f'{where}: schema v2 required')
    for k in ('id', 'date', 'title', 'kind', 'minutes', 'tracks', 'hook'):
        need(meta.get(k) == ep[k], f'{where}: index differs at {k}')
    need(ep['kind'] in ('daily', 'project'), f'{where}: unknown mission kind')
    need(isinstance(ep['tracks'], list) and ep['tracks'], f'{where}: tracks required')
    need(type(ep['minutes']) is int and ep['minutes'] > 0, f'{where}: positive minutes required')
    need(len(ep['sources']) >= 2, f'{where}: at least two sources required')
    for s in ep['sources']:
        source(s, where, online)
    if ep['kind'] == 'project':
        p = ep.get('project', {})
        need(p.get('brief') and p.get('deliverable') and p.get('suggestions'), f'{where}: weekly project needs a brief, deliverable and suggestions')
        need(not any(k in ep for k in ('briefing', 'problem', 'research', 'design', 'review', 'build', 'ship')), f'{where}: keep weekly and daily completion separate')
    else:
        if not all(need(k in ep, f'{where}: missing {k}') for k in ('briefing','problem','research','design','review','build','ship','recall')):
            return
        scenes = ep['briefing']['scenes']
        need(3 <= len(scenes) <= 8, f'{where}: use 3–8 briefing scenes')
        for i, s in enumerate(scenes):
            v = s.get('visual', {})
            need(s.get('title') and v.get('type') in VISUALS, f'{where}: unknown scene {i}')
            need(20 <= len(s.get('narration', '').split()) <= 120, f'{where}: narration should be 20–120 words per scene')
            fields = {'title': ('text',), 'statement': ('text',), 'code': ('code',), 'bullets': ('items',), 'flow': ('steps',), 'compare': ('left','right')}
            need(all(v.get(k) for k in fields.get(v.get('type'), ())), f'{where}: scene {i} missing visual data')
            if v.get('type') == 'compare':
                need(all(v.get(side, {}).get('title') and v.get(side, {}).get('items') for side in ('left','right')), f'{where}: compare sides need titles and items')
        style = json.loads((GAME / 'video-style.json').read_text())
        need(sum(len(s['narration'].split()) for s in scenes) <= style['rules']['maxWords'], f'{where}: briefing exceeds shared video budget')
        opts = ep['problem']['options']
        verdicts = [o['verdict'] for o in opts]
        need(verdicts.count('best') == 1 and set(verdicts) <= {'best','ok','poor'} and all(o.get('text') and o.get('why') for o in opts), f'{where}: problem needs explained options and one best choice')
        choice(ep['problem']['cost'], where + ':cost')
        research = ep['research']
        need(research.get('guide') and len(research['sources']) >= 2 and len(research['questions']) >= 2, f'{where}: source reading and questions required')
        for s in research['sources']:
            source(s, where, online and s not in ep['sources'])
        for q in research['questions']:
            need(q.get('id') and q.get('q') and q.get('answer') and q.get('points'), f'{where}: research answer and rubric required')
        d = ep['design']
        need(30 <= d['wordLimit'] <= 200 and d.get('prompt') and d.get('reference') and d.get('rubric') and d.get('fields'), f'{where}: bounded design and rubric required')
        for f in d['fields']:
            need(f.get('id') and f.get('label'), f'{where}: design field needs id and label')
        for qs, label in ((research['questions'], 'research'), (d['fields'], 'design'), (ep['recall'], 'recall')):
            ids = [q['id'] for q in qs]
            need(len(set(ids)) == len(ids), f'{where}: duplicate {label} id')
        review = ep['review']
        need(review.get('intro') and review['artifact'].get('title') and review['artifact'].get('body') and review['artifact'].get('format') in ('code','prose'), f'{where}: review artifact required')
        need(any(i['real'] for i in review['issues']) and any(not i['real'] for i in review['issues']), f'{where}: review needs real flaws and a defensible choice')
        need(all(type(i['real']) is bool and i.get('text') and i.get('why') for i in review['issues']), f'{where}: explain each review verdict')
        b = ep['build']
        need(b.get('language') == 'python' and b.get('tests') and b.get('hints') and b.get('title') and b.get('brief'), f'{where}: Python build with tests and hints required')
        names = [t['name'] for t in b['tests']]
        need(len(names) == len(set(names)) and len(names) >= 4, f'{where}: at least four uniquely named build tests')
        solution = EPISODES / f'{where}.solution.py'
        if need(solution.is_file(), f'{where}: reference solution missing'):
            good = run_tests(solution.read_text(), b['tests'])
            need(not good.get('error') and len(good['results']) == len(b['tests']) and all(r['ok'] for r in good['results']), f'{where}: reference fails: {good}')
        bad = run_tests(b['starter'], b['tests'])
        need(not bad.get('error') and len(bad['results']) == len(b['tests']) and any(not r['ok'] for r in bad['results']), f'{where}: starter must run but fail a behavioral test')
        ship = ep['ship']
        need(ship.get('prompt') and ship.get('example') and 20 <= ship['wordLimit'] <= 80, f'{where}: concise ship note required')
        need(len(ep['recall']) >= 2, f'{where}: at least two recall questions required')
        for q in ep['recall']:
            choice(q, where + ':recall')
        need(not ep.get('project'), f'{where}: weekly project must be a separate mission')
        need(not require_video or ep['briefing'].get('video'), f'{where}: reviewed rendered MP4 required for publication')
        video(ep, where)
    voice = subprocess.run([sys.executable, str(ROOT / 'tools/voice_check.py'), '--strict', str(path)], capture_output=True, text=True)
    need(voice.returncode == 0, f'{where}: prose check failed:\n{voice.stdout[-2500:]}{voice.stderr[-500:]}')


def main(argv):
    errors.clear()
    online = '--online' in argv
    wanted = {a for a in argv if not a.startswith('--')}
    catalog = json.loads((EPISODES / 'index.json').read_text())
    index = catalog['episodes']
    need(catalog['version'] == 2, 'index schema must be v2')
    need(len({e['id'] for e in index}) == len(index), 'duplicate mission ids')
    unknown = wanted - {e['id'] for e in index}
    need(not unknown, f'Unknown mission IDs: {sorted(unknown)}')
    need((ROOT / 'public/play/symmetry-forge/pyodide/pyodide.mjs').is_file(), 'Pyodide moved; update py-worker.js')
    checked = 0
    for meta in index:
        if not wanted or meta['id'] in wanted:
            try:
                check_episode(meta, online, "--require-video" in argv)
            except (KeyError, TypeError, ValueError, OSError, StopIteration, subprocess.SubprocessError) as e:
                errors.append(f'{meta.get("id")}: malformed mission: {e}')
            checked += 1
    if errors:
        raise SystemExit('\n'.join(errors))
    print(f'Proof v2 passed: {checked} missions' + ('; online sources checked' if online else ''))


if __name__ == '__main__':
    main(sys.argv[1:])
