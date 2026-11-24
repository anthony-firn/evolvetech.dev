"""Plays a whole Proof episode in Chromium under the production /play/* Content-Security-Policy.

    python3 tools/test_proof.py [episode-id]

Needs Python Playwright and Chromium (python3 -m pip install playwright; python3 -m playwright install chromium).
Covers: rendering, the scene player, quiz and judgment scoring, Python tests through Pyodide (starter fails,
reference passes, an endless loop is stopped), explanation saving, persistence and the streak after a reload.
The optional coach is not exercised here: it needs WebGPU and a model download.
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
PUBLIC = ROOT / "public"


def play_csp():
    text = (PUBLIC / "_headers").read_text()
    block = re.search(r"^/play/\*\n((?:[ \t]+.*\n)+)", text, re.M).group(1)
    return re.search(r"Content-Security-Policy:\s*(.+)", block).group(1).strip()


class Handler(http.server.SimpleHTTPRequestHandler):
    csp = play_csp()
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, ".mjs": "text/javascript", ".js": "text/javascript", ".wasm": "application/wasm"}

    def log_message(self, *_):
        pass

    def end_headers(self):
        if self.path.startswith("/play/"):
            self.send_header("Content-Security-Policy", self.csp)
        super().end_headers()


def main(argv):
    eid = argv[0] if argv else json.loads((PUBLIC / "play/proof/episodes/index.json").read_text())["episodes"][-1]["id"]
    ep = json.loads((PUBLIC / f"play/proof/episodes/{eid}.json").read_text())
    solution = (PUBLIC / f"play/proof/episodes/{eid}.solution.py").read_text()
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Handler, directory=str(PUBLIC)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    url = f"http://127.0.0.1:{server.server_port}/play/proof/#/{eid}"
    problems = []
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1200, "height": 900})
        page.on("console", lambda m: problems.append(m.text) if m.type == "error" else None)
        page.on("pageerror", lambda e: problems.append(str(e)))
        page.goto(url)
        expect(page.locator(".ep-title")).to_have_text(ep["title"])
        expect(page.locator(".stage-card")).to_have_count(6)

        # Watch: step through every scene with the next button.
        page.locator("#stage-watch .controls button", has_text="Sound").click()
        for _ in range(len(ep["scenes"])):
            page.get_by_role("button", name="Next scene").click()
        expect(page.locator("#stage-watch")).to_have_class(re.compile("done"))

        page.get_by_role("button", name="Done reading").click()
        expect(page.locator("#stage-read")).to_have_class(re.compile("done"))

        # Prove: right answers, then check the score and the explanations.
        for q in ep["quiz"]:
            page.locator(f'input[name="{q["id"]}"][value="{q["answer"]}"]').check()
        page.get_by_role("button", name="Check my answers").click()
        expect(page.locator("#stage-prove")).to_have_class(re.compile("done"))
        expect(page.locator("#stage-prove .why.right")).to_have_count(len(ep["quiz"]))

        best = next(i for i, o in enumerate(ep["judgment"]["options"]) if o["verdict"] == "best")
        page.locator("#stage-judge .choice").nth(best).click()
        expect(page.locator("#stage-judge .choice.best.picked")).to_have_count(1)

        # Build: the starter fails, an endless loop is stopped, the reference passes.
        run = page.get_by_role("button", name="Run tests")
        run.click()
        expect(page.locator("#stage-build .results li.fail").first).to_be_visible(timeout=90000)
        expect(page.locator("#stage-build")).not_to_have_class(re.compile("done"))
        page.locator("textarea.code").fill("while True:\n    pass\n")
        run.click()
        expect(page.locator("#stage-build .results")).to_contain_text("Stopped after", timeout=30000)
        page.locator("textarea.code").fill(solution)
        run.click()
        expect(page.locator("#stage-build .results li.pass")).to_have_count(len(ep["build"]["tests"]), timeout=90000)
        expect(page.locator("#stage-build")).to_have_class(re.compile("done"))
        expect(page.locator("#stage-build details.solution")).to_be_visible()

        # Explain: the coach stays locked until a 40-word answer is saved.
        ask = page.get_by_role("button", name="Ask the coach")
        expect(ask).to_be_disabled()
        page.locator("textarea.prose-input").fill(" ".join(["I split the change, write properties for the risky part and run them."] * 4))
        page.get_by_role("button", name="Save my answer").click()
        expect(page.locator("#stage-explain")).to_have_class(re.compile("done"))
        expect(ask).to_be_enabled()

        # Everything persists, and finishing today's episode starts a streak.
        page.reload()
        expect(page.locator(".stage-card.done")).to_have_count(6)
        expect(page.locator(".stats .stat b").first).to_have_text("1")
        expect(page.locator("textarea.code")).to_have_value(solution)
        # On a phone, no scene may push the page sideways.
        phone = browser.new_page(viewport={"width": 360, "height": 780})
        phone.goto(url)
        expect(phone.locator(".ep-title")).to_have_text(ep["title"])
        for i in range(len(ep["scenes"])):
            wide = phone.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
            if wide > 1:
                problems.append(f"scene {i + 1} overflows a 360px screen by {wide}px")
            phone.get_by_role("button", name="Next scene").click()
        browser.close()
    server.shutdown()
    csp = [m for m in problems if "Content Security Policy" in m or "Refused" in m]
    if csp or problems:
        raise SystemExit("Browser errors:\n" + "\n".join(problems))
    print(f"Proof browser check passed for {eid}: all six stages, Pyodide tests under the /play CSP, persistence and streak.")


if __name__ == "__main__":
    main(sys.argv[1:])
