"""Package tools/monitor.py for the one-minute AWS Lambda monitor and update the function's code."""
import subprocess
import tempfile
import zipfile
from hosting import CONFIG as C, ROOT

# Lambda imports this root module. Adding tools/ to the path lets monitor.py and hosting.py run unchanged, and
# hosting.py finds hosting.json one directory up, as in the repository.
HANDLER = 'import sys\nsys.path.insert(0, __file__.rsplit("/", 1)[0] + "/tools")\nfrom monitor import handler\n'


def add(bundle, name, data):
    info = zipfile.ZipInfo(name)
    info.external_attr = 0o644 << 16  # Lambda's runtime user cannot read the zipfile default of 0600.
    info.compress_type = zipfile.ZIP_DEFLATED
    bundle.writestr(info, data)


def main():
    with tempfile.NamedTemporaryFile(suffix=".zip") as archive:
        with zipfile.ZipFile(archive, "w") as bundle:
            add(bundle, "lambda_function.py", HANDLER)
            add(bundle, "hosting.json", (ROOT / "hosting.json").read_bytes())
            for name in ("monitor.py", "hosting.py"):
                add(bundle, f"tools/{name}", (ROOT / "tools" / name).read_bytes())
        archive.flush()
        subprocess.run(["aws", "lambda", "update-function-code", "--function-name", C["monitor_function"],
                        "--zip-file", f"fileb://{archive.name}", "--query", "LastUpdateStatus", "--output", "text"],
                       check=True)
    print("AWS monitor: code updated.")


if __name__ == "__main__":
    main()
