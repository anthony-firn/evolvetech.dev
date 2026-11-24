"""Check Proof episodes before they go live (python3 tools/check_proof.py [--online] [episode-id ...]).

- Structure: required fields, known scene visuals, quiz answers that point at real choices, exactly one best
  judgment option, https sources.
- The exercise means something: the starter fails at least one test and the reference solution passes them all,
  run through the same harness the browser uses (public/play/proof/harness.py), each in a time-limited process.
- The prose passes tools/voice_check.py --strict.
- --online also fetches every source URL and requires a 2xx/3xx answer.
"""
import json
import subprocess
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GAME = ROOT / "public/play/proof"
EPISODES = GAME / "episodes"
VISUALS = {"title", "statement", "bullets", "code", "compare", "flow"}
errors = []


def need(ok, message):
    if not ok:
        errors.append(message)
    return ok


def run_tests(code, tests, timeout=60):
    """Run code + tests through harness.py in a fresh interpreter; returns the harness result."""
    script = "import sys, json; sys.path.insert(0, sys.argv[1]); import harness; print(harness.run(sys.stdin.read(), sys.argv[2]))"
    proc = subprocess.run([sys.executable, "-I", "-c", script, str(GAME), json.dumps(tests)], input=code,
                          capture_output=True, text=True, timeout=timeout)
    if proc.returncode:
        return {"error": proc.stderr[-2000:], "results": []}
    return json.loads(proc.stdout.strip().splitlines()[-1])


def check_episode(meta, online):
    eid = meta["id"]
    path = EPISODES / f"{eid}.json"
    if not need(path.is_file(), f"{eid}: episode file missing"):
        return
    ep = json.loads(path.read_text())
    where = f"{eid}"
    for key in ("id", "date", "title", "tracks", "minutes", "hook", "scenes", "read", "quiz", "judgment", "build", "explain", "disclosure"):
        need(key in ep, f"{where}: missing {key}")
    if errors:
        return
    need(ep["id"] == eid and ep["date"] == meta["date"] and ep["title"] == meta["title"], f"{where}: index entry doesn't match the episode")
    need(3 <= len(ep["scenes"]) <= 12, f"{where}: use 3–12 scenes")
    for i, s in enumerate(ep["scenes"]):
        need(s.get("visual", {}).get("type") in VISUALS, f"{where}: scene {i + 1} has an unknown visual")
        need(20 <= len(s.get("narration", "").split()) <= 120, f"{where}: scene {i + 1} narration should be 20–120 words")
    need(len(ep["read"]["sections"]) >= 2, f"{where}: reading needs at least two sections")
    sources = ep["read"]["sources"]
    need(len(sources) >= 2, f"{where}: cite at least two sources")
    for s in sources:
        need(s.get("url", "").startswith("https://"), f"{where}: source {s.get('title')} must be https")
    ids = [q["id"] for q in ep["quiz"]]
    need(3 <= len(ids) <= 8 and len(set(ids)) == len(ids), f"{where}: 3–8 quiz questions with unique ids")
    for q in ep["quiz"]:
        need(2 <= len(q["choices"]) <= 6 and 0 <= q["answer"] < len(q["choices"]) and q.get("why"), f"{where}: quiz {q['id']} is malformed")
    verdicts = [o["verdict"] for o in ep["judgment"]["options"]]
    need(verdicts.count("best") == 1 and set(verdicts) <= {"best", "ok", "poor"}, f"{where}: judgment needs exactly one best option")
    b = ep["build"]
    need(b.get("language") == "python" and b.get("tests") and b.get("hints"), f"{where}: build needs python tests and hints")
    solution = EPISODES / f"{eid}.solution.py"
    if need(solution.is_file(), f"{where}: reference solution missing"):
        good = run_tests(solution.read_text(), b["tests"])
        need(not good.get("error") and len(good["results"]) == len(b["tests"]) and all(r["ok"] for r in good["results"]),
             f"{where}: reference solution fails: {good.get('error') or [r for r in good['results'] if not r['ok']]}")
    bad = run_tests(b["starter"], b["tests"])
    need(bad.get("error") or not all(r["ok"] for r in bad["results"]), f"{where}: the starter already passes every test")
    voice = subprocess.run([sys.executable, str(ROOT / "tools/voice_check.py"), "--strict", str(path)], capture_output=True, text=True)
    need(voice.returncode == 0, f"{where}: voice check failed:\n{voice.stdout[-1500:]}{voice.stderr[-500:]}")
    if online:
        for s in sources:
            try:
                req = urllib.request.Request(s["url"], headers={"User-Agent": "evolvetech-proof-check"})
                with urllib.request.urlopen(req, timeout=20) as res:
                    need(200 <= res.status < 400, f"{where}: {s['url']} answered {res.status}")
            except Exception as e:
                errors.append(f"{where}: {s['url']} unreachable ({e})")


def main(argv):
    online = "--online" in argv
    wanted = [a for a in argv if not a.startswith("--")]
    index = json.loads((EPISODES / "index.json").read_text())["episodes"]
    need(len({e["id"] for e in index}) == len(index), "index.json has duplicate episode ids")
    need((ROOT / "public/play/symmetry-forge/pyodide/pyodide.mjs").is_file(), "Pyodide moved; update py-worker.js")
    for meta in index:
        if not wanted or meta["id"] in wanted:
            check_episode(meta, online)
    if errors:
        raise SystemExit("\n".join(errors))
    print(f"Proof episodes passed ({len(index)} checked{', sources online' if online else ''}).")


if __name__ == "__main__":
    main(sys.argv[1:])
