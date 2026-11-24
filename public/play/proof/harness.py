"""Runs a player's code and an exercise's tests. Shared by the browser (Pyodide) and tools/check_proof.py.

The player's code runs once in its own namespace; each test then runs in a copy of that namespace, so one test
cannot leave state behind for the next. Tests are plain Python that use assert.
"""
import contextlib
import io
import json
import traceback


def run(user_code, tests_json):
    tests = json.loads(tests_json)
    out = io.StringIO()
    ns = {"__name__": "solution"}
    try:
        with contextlib.redirect_stdout(out):
            exec(compile(user_code, "solution.py", "exec"), ns)
    except Exception:
        return json.dumps({"error": traceback.format_exc(limit=2), "stdout": out.getvalue()[-4000:], "results": []})
    results = []
    for test in tests:
        buf = io.StringIO()
        try:
            with contextlib.redirect_stdout(buf):
                exec(compile(test["code"], test["name"], "exec"), dict(ns))
            results.append({"name": test["name"], "ok": True})
        except AssertionError as e:
            results.append({"name": test["name"], "ok": False, "error": str(e) or "assertion failed"})
        except Exception as e:
            results.append({"name": test["name"], "ok": False, "error": f"{type(e).__name__}: {e}"})
        results[-1]["stdout"] = buf.getvalue()[-2000:]
    return json.dumps({"results": results, "stdout": out.getvalue()[-4000:]})
