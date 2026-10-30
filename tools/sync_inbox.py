"""Vendor the live inbox and its backend tests from a committed Evolve Inbox checkout.

Only the explicit source/test/license allowlist is copied; local settings and mail
are never included. The static fictional demo is built separately by build_demos.py.
"""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
FILES = (
    "src/inbox.mjs", "src/incoming.mjs", "src/mail-store.mjs",
    "test/inbox.test.mjs", "LICENSE", "NOTICE",
)


def sync(source):
    source = source.resolve()
    commit = subprocess.run(["git", "rev-parse", "HEAD"], cwd=source,
                            check=True, capture_output=True, text=True).stdout.strip()
    target = ROOT / "netlify/lib/evolve-inbox"
    hashes = {}
    for name in FILES:
        content = subprocess.run(["git", "show", f"{commit}:{name}"], cwd=source,
                                 check=True, capture_output=True).stdout
        output = target / name
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_bytes(content)
        hashes[name] = hashlib.sha256(content).hexdigest()
    (target / "SOURCE.json").write_text(json.dumps({
        "source": "https://github.com/anthony-firn/evolve-inbox",
        "commit": commit, "files_sha256": hashes,
    }, indent=2) + "\n")
    print(f"Live inbox: synced {len(FILES)} committed files from {commit[:12]}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True, help="Local Evolve Inbox Git checkout; reads committed files only")
    sync(parser.parse_args().source)
