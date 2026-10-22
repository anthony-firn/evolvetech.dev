"""Renew DNS-validated certificates and install on both CDNs, including standby."""
import base64
import os
from pathlib import Path
import subprocess
import tarfile
import tempfile
from urllib.parse import urlencode
from hosting import CONFIG as C, bunny, netlify


def main():
    # State (ACME account and private keys) stays in private S3, never Actions caches/artifacts.
    with tempfile.TemporaryDirectory() as directory:
        root = Path(directory)
        archive = root / "state.tar.gz"
        remote = f"s3://{C['certificate_bucket']}/acme-state.tar.gz"
        subprocess.run(["aws", "s3", "cp", remote, str(archive), "--only-show-errors"], check=True)
        with tarfile.open(archive) as bundle:
            bundle.extractall(root / "acme", filter="data")
        acme = root / "acme"
        certdir = acme / "certificates"
        before = (certdir / "www.evolvetech.dev.crt").read_bytes()
        subprocess.run([os.environ.get("LEGO_BINARY", "lego"), "run", "--path", str(acme),
                        "--email", os.environ["ACME_EMAIL"], "--accept-tos", "--dns", "bunny",
                        "--domains", "www.evolvetech.dev", "--domains", "evolvetech.dev"], check=True)
        certificate = (certdir / "www.evolvetech.dev.crt").read_bytes()
        # Save renewed keys before deployment so a failed provider upload is retryable.
        with tarfile.open(archive, "w:gz") as bundle:
            for path in acme.iterdir():
                bundle.add(path, arcname=path.name)
        subprocess.run(["aws", "s3", "cp", str(archive), remote, "--sse", "AES256", "--only-show-errors"], check=True)
        # Installing every run also retries a prior interrupted provider update.
        key = (certdir / "www.evolvetech.dev.key").read_bytes()
        for hostname in ("www.evolvetech.dev", "evolvetech.dev"):
            bunny("POST", f"/pullzone/{C['bunny_pull_zone']}/addCertificate", {
                "Hostname": hostname, "Certificate": base64.b64encode(certificate).decode(),
                "CertificateKey": base64.b64encode(key).decode()})
        # Form body keeps private key out of query strings and access logs.
        netlify("POST", f"/sites/{C['netlify_site']}/ssl", urlencode({
            "certificate": certificate.decode(), "key": key.decode(),
            "ca_certificates": (certdir / "www.evolvetech.dev.issuer.crt").read_text()
        }).encode(), {"Content-Type": "application/x-www-form-urlencoded"})
        print("Certificates installed on both CDNs;", "renewed." if certificate != before else "not yet due for renewal.")


if __name__ == "__main__":
    main()
