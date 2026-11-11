"""Publish the same public files to independent Netlify and Bunny storage copies."""
from concurrent.futures import ThreadPoolExecutor
import json
import mimetypes
import os
import subprocess
from urllib.parse import quote
from hosting import CONFIG as C, ROOT, bunny, request
from jobs_csp import jobs_policy, make_rule
from hosting_csp import hosting_rules, wallet_setup_rule
from llm_csp import llm_rule, preview_rules
from case_law_csp import case_law_rule


def deploy_bunny():
    policy = jobs_policy((ROOT / "public/_headers").read_text())
    zone_config = bunny("GET", f"/pullzone/{C['bunny_pull_zone']}")
    rule = make_rule(zone_config, policy)
    bunny("POST", f"/pullzone/{C['bunny_pull_zone']}/edgerules/addOrUpdate", rule)
    print("Bunny: configured Evolve Jobs' scoped browser/WASM CSP.")
    for hosting_rule in hosting_rules(zone_config, (ROOT / "public/_headers").read_text()):
        bunny("POST", f"/pullzone/{C['bunny_pull_zone']}/edgerules/addOrUpdate", hosting_rule)
    print("Bunny: configured scoped Evolve Hosting CSP and public metadata CORS.")
    bunny("POST", f"/pullzone/{C['bunny_pull_zone']}/edgerules/addOrUpdate",
          wallet_setup_rule(zone_config, (ROOT / "public/_headers").read_text()))
    print("Bunny: configured the wallet setup guide’s scoped read-only status policy.")
    # Re-read the zone so a newly created rule gets an order index after the rules added above.
    zone_config = bunny("GET", f"/pullzone/{C['bunny_pull_zone']}")
    bunny("POST", f"/pullzone/{C['bunny_pull_zone']}/edgerules/addOrUpdate",
          llm_rule(zone_config, (ROOT / "public/_headers").read_text()))
    print("Bunny: configured Evolve LLM's WebGPU and Hugging Face download policy.")
    zone_config = bunny("GET", f"/pullzone/{C['bunny_pull_zone']}")
    for preview_rule in preview_rules(zone_config, (ROOT / "public/_headers").read_text()):
        bunny("POST", f"/pullzone/{C['bunny_pull_zone']}/edgerules/addOrUpdate", preview_rule)

    zone_config = bunny("GET", f"/pullzone/{C['bunny_pull_zone']}")
    bunny("POST", f"/pullzone/{C['bunny_pull_zone']}/edgerules/addOrUpdate",
          case_law_rule(zone_config, (ROOT / "public/_headers").read_text()))
    print("Bunny: configured Open Case Law's scoped public search policy.")
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
