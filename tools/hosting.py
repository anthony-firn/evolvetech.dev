"""Small provider API helpers. Credentials come from the environment, never Git."""
import json
import os
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
CONFIG = json.loads((ROOT / "hosting.json").read_text())


def request(method, url, data=None, headers=None):
    headers = dict(headers or {})
    if isinstance(data, (dict, list)):
        data = json.dumps(data).encode()
        headers["Content-Type"] = "application/json"
    try:
        with urlopen(Request(url, data=data, headers=headers, method=method), timeout=60) as response:
            body = response.read()
            return json.loads(body) if body else None
    except HTTPError as error:
        # Provider error bodies can contain submitted credentials/certificate keys.
        raise RuntimeError(f"{method} {url.split('?')[0]} returned HTTP {error.code}") from None


def bunny(method, path, data=None):
    return request(method, "https://api.bunny.net" + path, data,
                   {"AccessKey": os.environ["BUNNY_API_KEY"]})


def netlify(method, path, data=None, headers=None):
    return request(method, "https://api.netlify.com/api/v1" + path, data,
                   {"Authorization": "Bearer " + os.environ["NETLIFY_AUTH_TOKEN"], **(headers or {})})
