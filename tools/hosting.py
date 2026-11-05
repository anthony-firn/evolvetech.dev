"""Small provider API helpers. Credentials come from the environment, never Git."""
from datetime import datetime, timezone
import hashlib
import hmac
import json
import os
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import quote
from urllib.request import Request, urlopen
from xml.sax.saxutils import escape
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
CONFIG = json.loads((ROOT / "hosting.json").read_text())
ROUTE53_NS = "https://route53.amazonaws.com/doc/2013-04-01/"


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


def route53(method, path, params=None, body=b""):
    """Route 53's XML API, SigV4-signed with the AWS credentials GitHub's OIDC role or Lambda puts in the environment."""
    now = datetime.now(timezone.utc)
    stamp, day = now.strftime("%Y%m%dT%H%M%SZ"), now.strftime("%Y%m%d")
    query = "&".join(f"{quote(k, safe='-_.~')}={quote(str(v), safe='-_.~')}" for k, v in sorted((params or {}).items()))
    headers = {"host": "route53.amazonaws.com", "x-amz-date": stamp}
    if os.environ.get("AWS_SESSION_TOKEN"):
        headers["x-amz-security-token"] = os.environ["AWS_SESSION_TOKEN"]
    signed = ";".join(sorted(headers))
    canonical = "\n".join([method, path, query, *(f"{k}:{headers[k]}" for k in sorted(headers)), "", signed,
                           hashlib.sha256(body).hexdigest()])
    scope = f"{day}/us-east-1/route53/aws4_request"
    key = ("AWS4" + os.environ["AWS_SECRET_ACCESS_KEY"]).encode()
    for part in scope.split("/"):
        key = hmac.new(key, part.encode(), hashlib.sha256).digest()
    to_sign = "\n".join(["AWS4-HMAC-SHA256", stamp, scope, hashlib.sha256(canonical.encode()).hexdigest()])
    signature = hmac.new(key, to_sign.encode(), hashlib.sha256).hexdigest()
    headers["Authorization"] = (f"AWS4-HMAC-SHA256 Credential={os.environ['AWS_ACCESS_KEY_ID']}/{scope}, "
                                f"SignedHeaders={signed}, Signature={signature}")
    url = "https://route53.amazonaws.com" + path + ("?" + query if query else "")
    try:
        with urlopen(Request(url, data=body or None, headers=headers, method=method), timeout=60) as response:
            return ET.fromstring(response.read())
    except HTTPError as error:
        raise RuntimeError(f"{method} Route 53 {path} returned HTTP {error.code}") from None


def route53_change(action, name, kind, value, ttl=60):
    """Applies one single-value record change to the Route 53 zone. TXT values must already carry their quotes."""
    body = (f'<?xml version="1.0" encoding="UTF-8"?><ChangeResourceRecordSetsRequest xmlns="{ROUTE53_NS}">'
            f"<ChangeBatch><Changes><Change><Action>{action}</Action><ResourceRecordSet><Name>{escape(name)}</Name>"
            f"<Type>{kind}</Type><TTL>{ttl}</TTL><ResourceRecords><ResourceRecord><Value>{escape(value)}</Value>"
            "</ResourceRecord></ResourceRecords></ResourceRecordSet></Change></Changes></ChangeBatch>"
            "</ChangeResourceRecordSetsRequest>")
    return route53("POST", f"/2013-04-01/hostedzone/{CONFIG['route53_zone']}/rrset", body=body.encode())
