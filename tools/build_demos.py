"""Build browser demos from pinned project commits into public/play/. Needs git, node and godot4 locally.

Built files are committed, so deploys and the Bunny backup never depend on a project build succeeding later.
"""
import argparse
import hashlib
import json
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PLAY = ROOT / "public" / "play"
DEMOS = {
    "evolve-inbox": {"repo": "https://github.com/anthony-firn/evolve-inbox.git", "build": "node"},
    "pulse-pop": {"repo": "https://github.com/anthony-firn/pulse-pop.git", "build": "expo",
                  "description": "Play Pulse Pop, a quick touch game built with Expo and React Native, in your browser."},
    "emberwake": {"repo": "https://github.com/anthony-firn/emberwake.git", "build": "godot",
                  "description": "Play Emberwake, a 3D action roguelike made with Godot and Blender, in your browser."},
    "symmetry-forge": {"repo": "https://github.com/anthony-firn/symmetry-forge.git", "build": "pyodide"},
    "retirement": {"repo": "https://github.com/anthony-firn/retirement-research.git", "build": "data"},
    "fairground": {"repo": "https://github.com/anthony-firn/fairground.git", "build": "vite"},
    "emergence": {"repo": "https://github.com/anthony-firn/emergence.git", "build": "rust"},
}
PYODIDE = "314.0.7"
PYODIDE_FILES = ["pyodide.mjs", "pyodide.asm.mjs", "pyodide.asm.wasm", "python_stdlib.zip", "pyodide-lock.json"]
GODOT_PRESET = """[preset.0]
name="Web"
platform="Web"
runnable=true
dedicated_server=false
custom_features=""
export_filter="all_resources"
include_filter=""
exclude_filter="blender/*, tests/*, agents/*"
export_path="build/index.html"
encryption_include_filters=""
encryption_exclude_filters=""
encrypt_pck=false
encrypt_directory=false

[preset.0.options]
custom_template/debug=""
custom_template/release=""
variant/extensions_support=false
variant/thread_support=false
vram_texture_compression/for_desktop=true
html/canvas_resize_policy=2
html/focus_canvas_on_start=true
html/experimental_virtual_keyboard=false
html/export_icon=true
html/custom_html_shell=""
html/head_include=""
progressive_web_app/enabled=false
"""


def run(*args, cwd):
    subprocess.run(args, cwd=cwd, check=True)


def build_expo(src, name):
    app = json.loads((src / "app.json").read_text())
    app["expo"].setdefault("experiments", {})["baseUrl"] = f"/play/{name}"
    app["expo"]["web"]["output"] = "single"
    (src / "app.json").write_text(json.dumps(app, indent=2))
    run("npm", "ci", "--no-audit", "--no-fund", cwd=src)
    run("npm", "test", cwd=src)
    run("npx", "expo", "export", "--platform", "web", "--output-dir", "dist", cwd=src)
    return src / "dist"


def build_godot(src, name):
    preset = GODOT_PRESET
    if (src / "web" / "shell.html").exists():
        preset = preset.replace('html/custom_html_shell=""', 'html/custom_html_shell="res://web/shell.html"')
    (src / "export_presets.cfg").write_text(preset)
    (src / "build").mkdir(exist_ok=True)
    run("godot4", "--headless", "--import", "--path", ".", cwd=src)
    run("godot4", "--headless", "--path", ".", "--export-release", "Web", "build/index.html", cwd=src)
    out = src / "build"
    # Move Godot's inline style and start-up script into files so the page runs without 'unsafe-inline' scripts.
    page = (out / "index.html").read_text()
    if "index.png" not in page:
        (out / "index.png").unlink(missing_ok=True)
    style = re.search(r"<style>(.*?)</style>", page, re.S)
    script = re.search(r'<script src="index.js"></script>\s*<script>(.*?)</script>', page, re.S)
    (out / "index.css").write_text(style.group(1).strip() + "\n")
    (out / "index.start.js").write_text(script.group(1).strip() + "\n")
    page = page.replace(style.group(0), '<link rel="stylesheet" href="index.css">')
    page = page.replace(script.group(0), '<script src="index.js"></script>\n\t\t<script src="index.start.js"></script>')
    (out / "index.html").write_text(page)
    return out


def build_pyodide(src, name):
    """Static lab page from demos/<name>/, the project's package as a zip, and a pinned Pyodide core."""
    out = src / "site"
    shutil.copytree(ROOT / "demos" / name, out)
    shutil.make_archive(str(out / "symforge"), "zip", src / "src", "symforge")
    run("npm", "pack", f"pyodide@{PYODIDE}", "--silent", cwd=src)
    run("tar", "xzf", f"pyodide-{PYODIDE}.tgz", cwd=src)
    (out / "pyodide").mkdir()
    for file in PYODIDE_FILES:
        shutil.copy2(src / "package" / file, out / "pyodide" / file)
    (out / "pyodide" / "NOTICE.txt").write_text(
        f"Pyodide {PYODIDE} core files, unmodified, from the npm package 'pyodide'.\n"
        "Licensed under the Mozilla Public License 2.0: https://github.com/pyodide/pyodide/blob/main/LICENSE\n")
    return out


def build_data(src, name):
    """Static explorer from demos/<name>/ plus data.json extracted from the project's published results."""
    out = src / "site"
    shutil.copytree(ROOT / "demos" / name, out, ignore=shutil.ignore_patterns("extract.py"))
    run(sys.executable, str(ROOT / "demos" / name / "extract.py"), str(src), str(out / "data.json"), cwd=src)
    return out


def build_vite(src, name):
    """The project's own tests, then its Vite web build. The app shell gets the site's canonical link."""
    run("npm", "ci", "--no-audit", "--no-fund", cwd=src)
    run("npm", "test", cwd=src)
    run("npm", "run", "app:build", cwd=src)
    out = src / "app" / "dist"
    page = out / "index.html"
    page.write_text(page.read_text().replace(
        "</head>", f'  <link rel="canonical" href="https://www.evolvetech.dev/play/{name}/">\n</head>', 1))
    return out


def build_node(src, name):
    """A Node-built static demonstration with its own tests and no production data."""
    run("npm", "ci", "--no-audit", "--no-fund", cwd=src)
    run("npm", "test", cwd=src)
    run("npm", "run", "build", cwd=src)
    return src / "public"


def build_rust(src, name):
    """Compile the project's Rust models to WebAssembly and copy its own lab UI."""
    out = src / "web" / "dist"
    run(sys.executable, str(src / "web" / "build.py"), "--out", str(out), cwd=src)
    return out


def build_demo(src, name):
    demo = DEMOS[name]
    commit = subprocess.run(["git", "rev-parse", "HEAD"], cwd=src, capture_output=True, text=True, check=True).stdout.strip()
    provenance = {"source": demo["repo"], "commit": commit}
    dirty = subprocess.run(["git", "status", "--porcelain"], cwd=src, capture_output=True, text=True, check=True).stdout
    if dirty:
        # A local preview must not claim to be the unmodified published commit.
        digest = hashlib.sha256()
        names = subprocess.run(["git", "ls-files", "--cached", "--others", "--exclude-standard", "-z"],
                               cwd=src, capture_output=True, check=True).stdout.decode().split("\0")
        for filename in sorted(set(names) - {""}):
            path = src / filename
            if path.is_file():
                digest.update(filename.encode() + b"\0" + path.read_bytes() + b"\0")
        provenance.update(modified=True, working_tree_sha256=digest.hexdigest())
    out = {"expo": build_expo, "godot": build_godot, "pyodide": build_pyodide, "data": build_data, "vite": build_vite, "node": build_node, "rust": build_rust}[demo["build"]](src, name)
    if demo["build"] == "rust":
        provenance["wasm_sha256"] = hashlib.sha256((out / "emergence_web.wasm").read_bytes()).hexdigest()
    if "description" in demo:
        page = out / "index.html"
        head = (f'<meta name="description" content="{demo["description"]}">'
                f'<link rel="canonical" href="https://www.evolvetech.dev/play/{name}/"></head>')
        page.write_text(page.read_text().replace("</head>", head, 1))
    target = PLAY / name
    shutil.rmtree(target, ignore_errors=True)
    shutil.copytree(out, target)
    (target / "BUILD.json").write_text(json.dumps(provenance, indent=2) + "\n")
    print(f"{name}: built {commit[:12]}{' + local changes' if dirty else ''} into {target.relative_to(ROOT)}")


def main(names, local_source=None):
    if local_source:
        if len(names) != 1:
            raise SystemExit("--local-source requires exactly one demo name")
        build_demo(local_source.resolve(), names[0])
        return
    for name in names or DEMOS:
        with tempfile.TemporaryDirectory() as temp:
            src = Path(temp) / name
            run("git", "clone", "--quiet", DEMOS[name]["repo"], str(src), cwd=temp)
            build_demo(src, name)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("names", nargs="*", choices=list(DEMOS))
    parser.add_argument("--local-source", type=Path, help="Build one local source checkout, recording uncommitted source provenance")
    args = parser.parse_args()
    main(args.names, args.local_source)
