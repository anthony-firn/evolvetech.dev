"""Publish the same public files to independent Netlify and Bunny storage copies."""
from concurrent.futures import ThreadPoolExecutor
import json
import mimetypes
import os
import subprocess
from urllib.parse import quote
from hosting import CONFIG as C, ROOT, bunny, request


def deploy_bunny():
    zone = bunny("GET", f"/storagezone/{C['bunny_storage_zone']}")
    files = [p for p in (ROOT / "public").rglob("*") if p.is_file() and not p.name.startswith("_")]
    def upload(path):
        relative = path.relative_to(ROOT / "public").as_posix()
        request("PUT", f"https://{C['bunny_storage_region']}.storage.bunnycdn.com/{zone['Name']}/{quote(relative)}",
                path.read_bytes(), {"AccessKey": zone["Password"],
                "Content-Type": mimetypes.guess_type(relative)[0] or "application/octet-stream"})
    with ThreadPoolExecutor(max_workers=4) as pool:
        list(pool.map(upload, files))
    bunny("POST", f"/pullzone/{C['bunny_pull_zone']}/purgeCache")
    print(f"Bunny: published {len(files)} files and purged cache.")


def deploy_netlify():
    """Deploys public/ and the edge functions in netlify/edge-functions with the Netlify CLI, which bundles them."""
    result = subprocess.run(
        ["npx", "--yes", "netlify-cli@27.14.1", "deploy", "--prod", "--dir", "public", "--site", C["netlify_site"],
         "--message", os.environ.get("GITHUB_SHA", "local")[:12], "--json"],
        cwd=ROOT, capture_output=True, text=True, timeout=600)
    if result.returncode != 0:
        raise RuntimeError("Netlify deploy failed:\n" + (result.stderr or result.stdout)[-3000:])
    deploy = json.loads(result.stdout[result.stdout.index("{"):])
    print("Netlify: production deploy ready:", deploy.get("deploy_id"))


if __name__ == "__main__":
    subprocess.run(["python3", str(ROOT / "tools/check_site.py")], check=True)
    with ThreadPoolExecutor(max_workers=2) as pool:
        results = [pool.submit(deploy_bunny), pool.submit(deploy_netlify)]
        for result in results:
            result.result()
