"""Browser checks and an optional before/after rendering benchmark.

Requires Python Playwright and Chromium (development tools only):
  python3 -m pip install playwright
  python3 -m playwright install chromium
  python3 tools/test_home.py --cpu
  python3 tools/test_home.py --gpu-angle gl --benchmark --baseline-ref HEAD
Use --executable for a system Chromium. GPU flags are opt-in, never used by the site.
"""
import argparse
import functools
import http.server
import json
import math
from pathlib import Path
import subprocess
import threading
from contextlib import contextmanager
from urllib.parse import urlsplit

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
CSP = "default-src 'self'; style-src 'self'; img-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'none'"
PROBE = """(() => {
  const probe = window.__hero = { draws: 0, kind: null, capture: false, geometry: null };
  const getContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function(type, options) {
    const context = getContext.call(this, type, options);
    if (this.id === 'tesseract' && context) probe.kind = type;
    return context;
  };
  const clear = CanvasRenderingContext2D.prototype.clearRect;
  CanvasRenderingContext2D.prototype.clearRect = function(...args) {
    if (this.canvas.id === 'tesseract') probe.draws++;
    return clear.apply(this, args);
  };
  const draw = WebGLRenderingContext.prototype.drawArrays;
  WebGLRenderingContext.prototype.drawArrays = function(...args) {
    if (this.canvas.id === 'tesseract') probe.draws++;
    return draw.apply(this, args);
  };
  const upload = WebGLRenderingContext.prototype.bufferSubData;
  WebGLRenderingContext.prototype.bufferSubData = function(...args) {
    if (this.canvas.id === 'tesseract' && probe.capture) probe.geometry = Array.from(args[2]);
    return upload.apply(this, args);
  };
})();"""


class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def end_headers(self):
        self.send_header("Content-Security-Policy", CSP)
        super().end_headers()


@contextmanager
def local_site():
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Handler, directory=str(ROOT / "public")))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield f"http://127.0.0.1:{server.server_port}/"
    finally:
        server.shutdown()
        server.server_close()
        thread.join()


def frame_count(page):
    return page.evaluate("window.__hero.draws")


def stable(page):
    # Let observer notifications and any in-flight frame settle before asserting inactivity.
    page.wait_for_timeout(120)
    before = frame_count(page)
    page.wait_for_timeout(180)
    assert frame_count(page) == before, "Hero kept rendering while inactive"


def check_projection(page):
    """Compare uploaded vertex centers with the original 4D/3D projection at t=1.2."""
    scene = page.evaluate("""() => ({data: __hero.geometry, w: tesseract.clientWidth, h: tesseract.clientHeight})""")
    assert scene["data"], "GPU did not upload geometry"
    w, h, maximum = scene["w"], scene["h"], 0
    wide = w > 900
    scale = min(w * (0.2 if wide else 0.34), h * 0.3) * 1.25
    for i in range(16):
        p = [1 if (i >> bit) & 1 else -1 for bit in range(4)]
        for a, b, angle in [(0, 3, 1.2 * .31), (1, 3, 1.2 * .23), (2, 3, 1.2 * .17), (0, 2, .5 + 1.2 * .05), (1, 2, -.35)]:
            c, s, x, y = math.cos(angle), math.sin(angle), p[a], p[b]
            p[a], p[b] = x * c - y * s, x * s + y * c
        perspective = 1 / (2.6 - p[3])
        k = 3.2 / (3.2 - p[2] * perspective)
        expected = [w * (.72 if wide else .5) + p[0] * perspective * k * scale,
                    h * (.48 if wide else .42) + p[1] * perspective * k * scale]
        offset = (90 + 32 + i) * 66
        for axis in range(2):
            actual = sum(scene["data"][offset + vertex * 11 + axis] for vertex in range(6)) / 6
            maximum = max(maximum, abs(expected[axis] - actual))
    assert maximum < .001, f"Projection changed by {maximum} CSS pixels"
    print(f"Projection maximum error: {maximum:.6g} CSS pixels", flush=True)


def checks(browser, url):
    errors = []
    context = browser.new_context(viewport={"width": 1440, "height": 900}, device_scale_factor=2, color_scheme="dark")
    context.add_init_script(PROBE)
    page = context.new_page()
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto(url, wait_until="networkidle")
    page.wait_for_timeout(200)
    kind = page.evaluate("__hero.kind")
    before = frame_count(page)
    page.wait_for_timeout(250)
    assert frame_count(page) > before, "Hero did not animate"

    # Stop offscreen; resume without accumulating duplicate animation loops.
    page.evaluate("document.documentElement.style.scrollBehavior='auto'; scrollTo(0, 2200)")
    stable(page)
    page.evaluate("scrollTo(0, 0)")
    page.wait_for_timeout(200)
    before = frame_count(page)
    page.wait_for_timeout(180)
    assert frame_count(page) > before, "Hero did not resume after scrolling back"

    # Play an actual on-screen demo, then verify hidden tabs stop decoding it.
    video = page.locator("video[data-autoplay]").first
    video.scroll_into_view_if_needed()
    page.wait_for_function("() => !document.querySelector('video[data-autoplay]').paused")
    page.evaluate("""() => {
      window.testHidden = true;
      Object.defineProperty(document, 'hidden', {configurable:true, get:() => window.testHidden});
      document.dispatchEvent(new Event('visibilitychange'));
    }""")
    assert video.evaluate("v => v.paused"), "Hidden video kept playing"
    page.evaluate("testHidden=false; document.dispatchEvent(new Event('visibilitychange'))")
    page.wait_for_function("() => !document.querySelector('video[data-autoplay]').paused")
    page.evaluate("scrollTo(0, 0)")
    page.wait_for_function("() => document.querySelector('video[data-autoplay]').paused")

    # Browser preference changes must take effect without reloading.
    page.emulate_media(reduced_motion="reduce")
    stable(page)
    page.locator("[data-theme-toggle]").click()
    stable(page)
    assert page.locator("video[data-autoplay]").evaluate_all("videos => videos.every(v => v.controls)"), "Reduced-motion videos need controls"
    page.emulate_media(reduced_motion="no-preference")
    page.wait_for_timeout(180)
    before = frame_count(page)
    page.wait_for_timeout(180)
    assert frame_count(page) > before, "Hero did not resume after reduced motion was disabled"

    # Exercise visibility events deterministically, including video pause/resume.
    page.evaluate("""() => {
      window.testHidden = true;
      Object.defineProperty(document, 'hidden', {configurable:true, get:() => window.testHidden});
      document.dispatchEvent(new Event('visibilitychange'));
    }""")
    stable(page)
    assert page.locator("video").evaluate_all("videos => videos.every(v => v.paused)"), "Hidden videos are still playing"
    page.evaluate("testHidden=false; document.dispatchEvent(new Event('visibilitychange'))")
    page.wait_for_timeout(180)
    before = frame_count(page)
    page.wait_for_timeout(180)
    assert frame_count(page) > before, "Hero did not resume when visible: " + str(page.evaluate("""() => ({
      hidden:document.hidden, scroll:scrollY, hero:document.querySelector('.hero').className,
      motion:matchMedia('(prefers-reduced-motion: reduce)').matches, draws:__hero.draws
    })"""))

    for width, height in [(390, 844), (3840, 2160)]:
        page.set_viewport_size({"width": width, "height": height})
        page.wait_for_timeout(150)
        size = page.locator("#tesseract").evaluate("c => ({w:c.width,h:c.height})")
        budget = 3_000_000 if kind == "webgl" else 1_000_000
        assert size["w"] * size["h"] <= budget * 1.003, f"Unbounded canvas allocation: {size}"
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth"), "Horizontal overflow"

    if kind == "webgl":
        # A lost GPU must switch to the CPU renderer without reloading or losing observers.
        page.evaluate("tesseract.getContext('webgl').getExtension('WEBGL_lose_context').loseContext()")
        page.wait_for_function("() => __hero.kind === '2d'")
        before = frame_count(page)
        page.wait_for_timeout(180)
        assert frame_count(page) > before, "CPU fallback did not resume after context loss"
    assert not errors, errors
    context.close()

    # Fresh reduced-motion load: draw a still, preserve the mathematical projection.
    context = browser.new_context(viewport={"width": 1440, "height": 900}, device_scale_factor=2, reduced_motion="reduce")
    context.add_init_script(PROBE + "\nwindow.__hero.capture=true;")
    page = context.new_page()
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto(url, wait_until="networkidle")
    stable(page)
    assert frame_count(page) > 0, "Reduced motion has a blank hero"
    if page.evaluate("__hero.kind") == "webgl":
        check_projection(page)
        page.set_viewport_size({"width": 390, "height": 844})
        page.wait_for_timeout(150)
        check_projection(page)
    context.close()

    # Simulate different display refresh rates with the real animation callback.
    context = browser.new_context(viewport={"width": 390, "height": 844})
    context.add_init_script(PROBE + """
      (() => {
        let id = 0, clock = 1000;
        const pending = new Map();
        window.requestAnimationFrame = cb => { pending.set(++id, cb); return id; };
        window.cancelAnimationFrame = key => pending.delete(key);
        window.stepDisplay = rate => {
          const before = __hero.draws;
          for (let i = 0; i < rate; i++) {
            clock += 1000 / rate;
            const callbacks = Array.from(pending.values()); pending.clear();
            for (const cb of callbacks) cb(clock);
          }
          return __hero.draws - before;
        };
      })();
    """)
    page = context.new_page()
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto(url, wait_until="networkidle")
    for rate in [60, 90, 120, 144, 240]:
        draws = page.evaluate("rate => stepDisplay(rate)", rate)
        assert 59 <= draws <= 61, f"{draws} draws/sec on a {rate} Hz display"
    context.close()

    if kind == "webgl":
        context = browser.new_context()
        context.add_init_script(PROBE + """
          WebGLRenderingContext.prototype.getShaderParameter = () => false;
        """)
        page = context.new_page()
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.goto(url, wait_until="networkidle")
        assert page.evaluate("__hero.kind") == "2d", "Shader failure did not fall back to Canvas"
        assert frame_count(page) > 0, "Shader failure left a blank hero"
        context.close()
    assert not errors, errors
    print(f"Browser checks passed ({kind}): animation, pause/resume, themes, reduced motion, mobile/4K sizing" + (", GPU loss and shader failure" if kind == "webgl" else ""), flush=True)


def benchmark(browser, url, label, baseline=None):
    context = browser.new_context(viewport={"width": 1440, "height": 900}, device_scale_factor=2, color_scheme="dark")
    context.add_init_script(PROBE)
    page = context.new_page()
    if baseline:
        def override(route):
            name = Path(urlsplit(route.request.url).path).name
            route.fulfill(body=baseline[name], content_type="text/css" if name.endswith("css") else "text/javascript")
        page.route("**/assets/v2/*", lambda route: override(route) if Path(urlsplit(route.request.url).path).name in baseline else route.continue_())
    page.goto(url, wait_until="networkidle")
    page.wait_for_timeout(1200)
    cdp = context.new_cdp_session(page)
    cdp.send("Performance.enable")
    start = {x["name"]: x["value"] for x in cdp.send("Performance.getMetrics")["metrics"]}
    before = frame_count(page)
    page.wait_for_timeout(4000)
    after = frame_count(page)
    end = {x["name"]: x["value"] for x in cdp.send("Performance.getMetrics")["metrics"]}
    seconds = end["Timestamp"] - start["Timestamp"]
    result = {"version": label, "renderer": page.evaluate("__hero.kind"), "fps": round((after - before) / seconds, 1),
              "main_thread_ms_per_second": round(1000 * (end["TaskDuration"] - start["TaskDuration"]) / seconds, 1)}
    print(json.dumps(result), flush=True)
    context.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--executable")
    parser.add_argument("--cpu", action="store_true", help="Disable GPU and software WebGL")
    parser.add_argument("--gpu-angle", choices=["gl", "vulkan"], help="Explicit headless ANGLE hardware backend")
    parser.add_argument("--benchmark", action="store_true")
    parser.add_argument("--baseline-ref", help="Git ref supplying original hero.js/main.js/style.css")
    args = parser.parse_args()
    if args.cpu and args.gpu_angle:
        parser.error("Choose CPU or a GPU backend")
    flags = ["--disable-gpu", "--disable-software-rasterizer"] if args.cpu else []
    if args.gpu_angle:
        flags = ["--enable-gpu", "--ignore-gpu-blocklist", f"--use-angle={args.gpu_angle}"]
    baseline = None
    if args.baseline_ref:
        baseline = {name: subprocess.check_output(["git", "show", f"{args.baseline_ref}:public/assets/v2/{name}"], cwd=ROOT)
                    for name in ["hero.js", "main.js", "style.css"]}
    with local_site() as url, sync_playwright() as playwright:
        with playwright.chromium.launch(executable_path=args.executable, args=flags) as browser:
            checks(browser, url)
            if args.benchmark:
                gpu = browser.new_browser_cdp_session().send("SystemInfo.getInfo")["gpu"]
                print(json.dumps({"gpu_devices": gpu["devices"], "features": gpu["featureStatus"]}), flush=True)
                if baseline:
                    benchmark(browser, url, args.baseline_ref, baseline)
                benchmark(browser, url, "working tree")


if __name__ == "__main__":
    main()
