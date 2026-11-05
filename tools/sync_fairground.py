"""Build and copy Fairground's public app and gateway, recording committed or local source provenance.

Only app/dist, dist-gateway JavaScript, and the license are published. Private
settings and account data are never copied. Run upstream tests before syncing.
Use --app-only for UI changes that must preserve the deployed payment gateway.
"""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import subprocess

ROOT = Path(__file__).resolve().parents[1]


def command(source, *args):
    return subprocess.run(args, cwd=source, check=True, capture_output=True).stdout


def sync(source, app_only=False):
    source = source.resolve()
    commit = command(source, "git", "rev-parse", "HEAD").decode().strip()
    names = command(source, "git", "ls-files", "-z", "--cached", "--others", "--exclude-standard").split(b"\0")
    digest = hashlib.sha256()
    for name in sorted(set(names)):
        if not name:
            continue
        path = source / name.decode()
        if path.is_file():
            digest.update(name + b"\0" + path.read_bytes() + b"\0")
    provenance = {"source": "https://github.com/anthony-firn/fairground.git", "commit": commit}
    if command(source, "git", "status", "--porcelain").strip():
        provenance.update(modified=True, working_tree_sha256=digest.hexdigest())
    for task in (("app:build",) if app_only else ("app:build", "gateway:build")):
        subprocess.run(["npm", "run", task], cwd=source, check=True)

    app = ROOT / "public/play/fairground"
    gateway = ROOT / "netlify/lib/fairground"
    # These directories contain generated, tracked outputs only; replace stale hashed chunks together.
    for target in ((app,) if app_only else (app, gateway)):
        if target.exists():
            shutil.rmtree(target)
        target.mkdir(parents=True)
    shutil.copytree(source / "app/dist", app, dirs_exist_ok=True)
    index = app / "index.html"
    index.write_text(index.read_text().replace("</head>", '<link rel="canonical" href="https://www.evolvetech.dev/play/fairground/">\n</head>', 1))
    if not app_only:
        for file in (source / "dist-gateway").glob("*.js"):
            shutil.copy2(file, gateway / file.name)
        shutil.copy2(source / "LICENSE", gateway / "LICENSE")
    targets = ((app, "app:build"),) if app_only else ((app, "app:build"), (gateway, "gateway:build"))
    for target, task in targets:
        files = {str(p.relative_to(target)): hashlib.sha256(p.read_bytes()).hexdigest()
                 for p in sorted(target.rglob("*")) if p.is_file()}
        (target / "BUILD.json").write_text(json.dumps({**provenance, "build": f"npm run {task}", "files_sha256": files}, indent=2) + "\n")
    print(f"Synced Fairground {'app only' if app_only else 'app and gateway'} from {commit[:12]} with source provenance")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--app-only", action="store_true", help="Update the browser app while preserving the live payment gateway")
    args = parser.parse_args()
    sync(args.source, app_only=args.app_only)
