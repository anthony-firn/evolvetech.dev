"""Publish the same public files to independent Netlify and Bunny storage copies."""
from concurrent.futures import ThreadPoolExecutor
from io import BytesIO
import mimetypes
import subprocess
import time
from urllib.parse import quote
from hosting import CONFIG as C, ROOT, bunny, netlify, request


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
    import zipfile
    buffer = BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        for path in sorted((ROOT / "public").rglob("*")):
            if path.is_file():
                archive.write(path, path.relative_to(ROOT / "public").as_posix())
    deploy = netlify("POST", f"/sites/{C['netlify_site']}/deploys", buffer.getvalue(),
                     {"Content-Type": "application/zip"})
    for _ in range(60):
        state = netlify("GET", f"/deploys/{deploy['id']}")
        if state["state"] == "ready":
            print("Netlify: production deploy ready:", deploy["id"])
            return
        if state["state"] == "error":
            raise RuntimeError("Netlify rejected the deployment")
        time.sleep(2)
    raise RuntimeError("Netlify deployment did not become ready in two minutes")


if __name__ == "__main__":
    subprocess.run(["python3", str(ROOT / "tools/check_site.py")], check=True)
    with ThreadPoolExecutor(max_workers=2) as pool:
        results = [pool.submit(deploy_bunny), pool.submit(deploy_netlify)]
        for result in results:
            result.result()
