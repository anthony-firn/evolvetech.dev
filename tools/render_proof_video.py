"""Shared Codex/Claude video build: Evolve Voice + the game's scene renderer + FFmpeg.

python3 tools/render_proof_video.py 2026-11-24 --voice-site ~/Dev/evolve-voice/dist
Requires Python Playwright, Google Chrome with WebGPU, ffmpeg/ffprobe, and cached Kokoro files.
No Deno, cloud voice service or credentials. Missing local model files fail instead of downloading silently.
"""
import argparse
import base64
import functools
import hashlib
import http.server
import json
import re
import subprocess
import tempfile
import threading
import wave
from pathlib import Path
from urllib.parse import unquote, urlparse

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
GAME = ROOT / 'public/play/proof'
PUBLIC = ROOT / 'public'
FLAGS = ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-angle=vulkan', '--ignore-gpu-blocklist']


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def stamp(seconds):
    ms = round(seconds * 1000)
    return f'{ms // 3600000:02}:{ms // 60000 % 60:02}:{ms // 1000 % 60:02}.{ms % 1000:03}'


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('mission')
    ap.add_argument('--voice-site', type=Path, default=ROOT.parent / 'evolve-voice/dist')
    ap.add_argument('--model-cache', type=Path, default=Path.home() / '.cache/evolve-voice/kokoro')
    ap.add_argument('--threads', type=int, default=2, help='FFmpeg threads; keep the laptop responsive')
    ap.add_argument('--chrome', default='/usr/bin/google-chrome')
    a = ap.parse_args()
    if not re.fullmatch(r'\d{4}-\d{2}-\d{2}', a.mission):
        ap.error('Use a daily mission ID (YYYY-MM-DD).')
    mission_path = GAME / f'episodes/{a.mission}.json'
    mission = json.loads(mission_path.read_text())
    style = json.loads((GAME / 'video-style.json').read_text())
    scenes = mission['briefing']['scenes']
    script = '\n'.join(s['narration'] for s in scenes)
    if len(script.split()) > style['rules']['maxWords']:
        raise SystemExit('Briefing exceeds the shared word budget.')
    for name in ('config.json', 'kokoro-v1_0.pth', style['voice']['id'] + '.pt'):
        if not (a.model_cache / name).is_file():
            raise SystemExit(f'Missing local voice model: {a.model_cache / name}')
    if not (a.voice_site / 'client.mjs').is_file():
        raise SystemExit(f'Missing Evolve Voice build: {a.voice_site}')

    class Handler(http.server.SimpleHTTPRequestHandler):
        extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, '.mjs': 'text/javascript', '.wasm': 'application/wasm'}

        def translate_path(self, path):
            clean = unquote(urlparse(path).path)
            if clean.startswith('/__voice/'):
                base = a.voice_site.resolve()
                target = (base / clean[len('/__voice/'):]).resolve()
                return str(target if target.is_relative_to(base) else base / '__missing__')
            if clean.startswith('/__models/'):
                return str(a.model_cache / Path(clean).name)
            return super().translate_path(path)

        def do_GET(self):
            if self.path == '/__voice/models.js':
                text = (a.voice_site / 'models.js').read_text()
                # Workers fetch locally too; no cross-origin request or model upload.
                text = re.sub(r"https://huggingface.co", '/__models', text)
                data = text.encode()
                self.send_response(200)
                self.send_header('Content-Type', 'text/javascript')
                self.send_header('Content-Length', str(len(data)))
                self.end_headers()
                self.wfile.write(data)
            else:
                super().do_GET()

        def log_message(self, *_):
            pass

    media = GAME / 'media'
    media.mkdir(exist_ok=True)
    cache = ROOT / '.cache/proof-video'
    cache.mkdir(parents=True, exist_ok=True)
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Handler, directory=str(PUBLIC)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    origin = f'http://127.0.0.1:{server.server_port}'
    entries, elapsed, captions = [], 0.0, ['WEBVTT\n']
    voice_hashes = {str(f.relative_to(a.voice_site)): digest(f) for f in sorted(a.voice_site.rglob('*')) if f.is_file()}
    model_hashes = {name: digest(a.model_cache / name) for name in ('config.json', 'kokoro-v1_0.pth', style['voice']['id'] + '.pt')}
    try:
        with tempfile.TemporaryDirectory(prefix='proof-video-') as scratch, sync_playwright() as p:
            scratch = Path(scratch)
            browser = p.chromium.launch(executable_path=a.chrome, args=FLAGS)
            page = browser.new_page(viewport={'width': style['width'], 'height': style['height']}, device_scale_factor=1, color_scheme='dark')
            page.goto(origin + '/play/proof/video.html')
            page.wait_for_function('typeof window.renderProofFrame === "function"')
            page.evaluate('''async voice => {
                const {createVoice, wav} = await import('/__voice/client.mjs');
                window.proofVoice = createVoice(); window.proofWav = wav;
                await window.proofVoice.loadTTS({voice});
            }''', style['voice']['id'])
            for i, scene in enumerate(scenes):
                # Use the engine's sentence splitter so captions and audio share the same boundaries.
                parts = page.evaluate('(text) => window.proofVoice.sentences(text)', scene['narration'])
                for j, sentence in enumerate(parts):
                    spoken = sentence
                    for name, phonemes in style.get('pronunciations', {}).items():
                        spoken = re.sub(r'\b' + re.escape(name) + r'\b', lambda m: f'[{m.group()}](/{phonemes}/)', spoken)
                    identity = json.dumps([spoken, style['voice'], voice_hashes, model_hashes], sort_keys=True)
                    key = hashlib.sha256(identity.encode()).hexdigest()
                    audio = cache / f'{key}.wav'
                    if not audio.exists():
                        print(f'Narrating scene {i + 1}, sentence {j + 1}', flush=True)
                        result = page.evaluate('''async ({text, opts}) => {
                            const r = await window.proofVoice.speak(text, opts);
                            const b = new Uint8Array(window.proofWav(r.audio, r.sampleRate));
                            let s = ''; for (const x of b) s += String.fromCharCode(x);
                            return btoa(s);
                        }''', {'text': spoken, 'opts': dict(voice=style['voice']['id'], speed=style['voice']['speed'], seed=style['voice']['seed'])})
                        audio.write_bytes(base64.b64decode(result))
                    with wave.open(str(audio)) as wav:
                        duration = wav.getnframes() / wav.getframerate()
                    page.evaluate('(data) => window.renderProofFrame(data)', dict(scene=scene, caption=sentence, date=mission['date'], number=i + 1, total=len(scenes)))
                    frame = scratch / f'{i}-{j}.png'
                    page.screenshot(path=str(frame))
                    if i == 0 and j == 0:
                        (media / f'{a.mission}.poster.png').write_bytes(frame.read_bytes())
                    segment = scratch / f'{i}-{j}.mp4'
                    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-loop', '1', '-i', str(frame), '-i', str(audio),
                                    '-t', str(duration), '-r', str(style['fps']), '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
                                    '-threads', str(a.threads), '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-ar', str(style['audio']['sampleRate']), '-ac', '1', '-shortest', str(segment)], check=True)
                    entries.append(f"file '{segment}'")
                    captions.append(f'{stamp(elapsed)} --> {stamp(elapsed + duration)}\n{sentence}\n')
                    elapsed += duration
            browser.close()
            low, high = style['rules']['durationSeconds']
            if not low <= elapsed <= high:
                raise SystemExit(f'Video duration {elapsed:.1f}s is outside the {low}–{high}s style budget.')
            concat = scratch / 'concat.txt'
            concat.write_text('\n'.join(entries) + '\n')
            output = media / f'{a.mission}.mp4'
            audio = style['audio']
            subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', str(concat),
                            '-c:v', 'libx264', '-preset', 'fast', '-crf', '23', '-r', str(style['fps']), '-fps_mode', 'cfr', '-threads', str(a.threads), '-pix_fmt', 'yuv420p', '-af', f"loudnorm=I={audio['loudnessLUFS']}:TP={audio['truePeakDB']}:LRA=11", '-c:a', 'aac', '-ar', str(audio['sampleRate']),
                            '-movflags', '+faststart', str(output)], check=True)
            (media / f'{a.mission}.vtt').write_text('\n'.join(captions))
            provenance = dict(styleVersion=style['version'], scriptSha256=hashlib.sha256(script.encode()).hexdigest(), styleSha256=digest(GAME / 'video-style.json'),
                              renderer={f: digest(GAME / f) for f in ('scene.js', 'video.js', 'video.css', 'proof.css', 'text.js')},
                              exporterSha256=digest(Path(__file__)), fonts={f.name: digest(f) for f in sorted((PUBLIC / 'assets/fonts').glob('*.woff2'))},
                              voiceEngine=voice_hashes, voiceModels=model_hashes, seconds=round(elapsed, 3), videoSha256=digest(output))
            (media / f'{a.mission}.manifest.json').write_text(json.dumps(provenance, indent=2) + '\n')
            mission['briefing']['video'] = dict(src=f'./media/{a.mission}.mp4', captions=f'./media/{a.mission}.vtt', poster=f'./media/{a.mission}.poster.png', manifest=f'./media/{a.mission}.manifest.json')
            mission_path.write_text(json.dumps(mission, indent=2, ensure_ascii=False) + '\n')
            print(f'Built {output}: {elapsed:.1f}s, style v{style["version"]}', flush=True)
    finally:
        server.shutdown()
        server.server_close()


if __name__ == '__main__':
    main()
