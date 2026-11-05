"""Probe real HTTPS/SNI on each CDN, then point the www record at Bunny DNS and Route 53 to the same CDN when needed."""
import argparse
import http.client
import json
import socket
import ssl
import time
from hosting import CONFIG as C, ROUTE53_NS, bunny, route53, route53_change

PREFIX = "evolvetech-monitor:"
NS = {"r": ROUTE53_NS}


# The homepage marker must survive copy changes: the October 2026 redesign removed the old one, and both CDNs then
# looked down, which silently disabled failover.
HOMEPAGE_MARKER = "<title>Anthony Firn"


def fetch(target, path):
    """GET https://<hostname><path> from one CDN, validating that hostname's certificate (like curl --connect-to)."""
    with socket.create_connection((target, 443), timeout=15) as raw:
        with ssl.create_default_context().wrap_socket(raw, server_hostname=C["hostname"]) as tls:
            tls.sendall(f"GET {path} HTTP/1.1\r\nHost: {C['hostname']}\r\nUser-Agent: evolvetech-monitor\r\n"
                        "Connection: close\r\n\r\n".encode())
            response = http.client.HTTPResponse(tls)
            response.begin()
            return response.status, response.read().decode(errors="replace")


def healthy(target):
    for path, expected in [("/health.json", '"status":"ok"'), ("/", HOMEPAGE_MARKER)]:
        try:
            status, body = fetch(target, path)
        except (OSError, http.client.HTTPException):
            return False
        if status != 200 or expected not in body:
            return False
    return True


def choose(current, primary_ok, backup_ok, state, now, recovery_seconds):
    """Keep a healthy fallback until the primary has been consistently healthy."""
    state = dict(state)
    if not primary_ok:
        state.pop("primary_healthy_since", None)
        return (C["bunny_target"] if backup_ok else current), state
    if current == C["netlify_target"]:
        return current, {}
    # Recovery cannot be confirmed from one successful run, even after a gap.
    if now - state.get("last_check", 0) > 900:
        state.pop("primary_healthy_since", None)
    state.setdefault("primary_healthy_since", now)
    state["last_check"] = now
    if not backup_ok or now - state["primary_healthy_since"] >= recovery_seconds:
        return C["netlify_target"], {}
    return current, state


def sync_route53(target, apply):
    """Route 53 follows Bunny's decision; only the Bunny record keeps the recovery state."""
    path = f"/2013-04-01/hostedzone/{C['route53_zone']}/rrset"
    name = C["hostname"] + "."
    found = route53("GET", path, {"name": name, "type": "CNAME", "maxitems": 1})
    record = found.find("r:ResourceRecordSets/r:ResourceRecordSet", NS)
    if record is None or record.findtext("r:Name", namespaces=NS) != name:
        raise RuntimeError("Expected the www CNAME in Route 53; refusing to change ambiguous routing")
    current = record.findtext("r:ResourceRecords/r:ResourceRecord/r:Value", namespaces=NS).rstrip(".")
    if current not in (C["netlify_target"], C["bunny_target"]):
        raise RuntimeError("Route 53 DNS target was manually changed; refusing to overwrite it")
    print(json.dumps({"route53_current": current, "next": target, "apply": apply}))
    if apply and current != target:
        route53_change("UPSERT", name, "CNAME", target)


def run(apply=False, simulate_primary_failure=False):
    zone = bunny("GET", f"/dnszone/{C['dns_zone']}")
    records = [r for r in zone["Records"] if r["Name"] == C["dns_name"] and r["Type"] == 2]
    if len(records) != 1:
        raise RuntimeError("Expected exactly one www CNAME; refusing to change ambiguous routing")
    record = records[0]
    current = record["Value"].rstrip(".")
    if current not in (C["netlify_target"], C["bunny_target"]):
        raise RuntimeError("DNS target was manually changed; refusing to overwrite it")
    comment = record.get("Comment") or ""
    state = json.loads(comment[len(PREFIX):]) if comment.startswith(PREFIX) else {}
    primary = False if simulate_primary_failure else healthy(C["netlify_target"])
    backup = healthy(C["bunny_target"])
    if not primary:
        # Confirm failures within the run instead of waiting for three schedules.
        for _ in range(2):
            time.sleep(5)
            if not simulate_primary_failure and healthy(C["netlify_target"]):
                primary = True
                break
    target, state = choose(current, primary, backup, state, int(time.time()), C["recovery_seconds"])
    print(json.dumps({"primary_healthy": primary, "backup_healthy": backup, "current": current,
                      "next": target, "state": state, "apply": apply}))
    new_comment = PREFIX + json.dumps(state, separators=(",", ":"))
    if apply and (target != current or comment != new_comment):
        bunny("POST", f"/dnszone/{C['dns_zone']}/records/{record['Id']}",
              {"Type": 2, "Name": C["dns_name"], "Value": target, "Ttl": 60, "Comment": new_comment})
    # After the Bunny update, so an AWS problem cannot block failover on the provider visitors use today.
    sync_route53(target, apply)
    if not primary and not backup:
        raise RuntimeError("Both CDNs failed checks; DNS left unchanged")


def handler(event, context):
    """AWS Lambda entry point (see tools/deploy_monitor.py): the same run as --apply, every minute."""
    run(apply=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="Persist routing changes; default is read-only")
    parser.add_argument("--simulate-primary-failure", action="store_true", help="Controlled failover drill")
    args = parser.parse_args()
    run(args.apply, args.simulate_primary_failure)


if __name__ == "__main__":
    main()
