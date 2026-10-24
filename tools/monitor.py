"""Probe real HTTPS/SNI on each CDN, then update one DNS record when needed."""
import argparse
import json
import subprocess
import time
from hosting import CONFIG as C, bunny

PREFIX = "evolvetech-monitor:"


# The homepage marker must survive copy changes: the October 2026 redesign removed the old one, and both CDNs then
# looked down, which silently disabled failover.
HOMEPAGE_MARKER = "<title>Anthony Firn"


def healthy(target):
    for path, expected in [("/health.json", '"status":"ok"'), ("/", HOMEPAGE_MARKER)]:
        result = subprocess.run([
            "curl", "--silent", "--show-error", "--fail", "--max-time", "15",
            "--connect-to", f"{C['hostname']}:443:{target}:443",
            f"https://{C['hostname']}{path}"], capture_output=True, text=True)
        if result.returncode or expected not in result.stdout:
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


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="Persist routing changes; default is read-only")
    parser.add_argument("--simulate-primary-failure", action="store_true", help="Controlled failover drill")
    args = parser.parse_args()
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
    primary = False if args.simulate_primary_failure else healthy(C["netlify_target"])
    backup = healthy(C["bunny_target"])
    if not primary:
        # Confirm failures within the run instead of waiting for three schedules.
        for _ in range(2):
            time.sleep(5)
            if not args.simulate_primary_failure and healthy(C["netlify_target"]):
                primary = True
                break
    target, state = choose(current, primary, backup, state, int(time.time()), C["recovery_seconds"])
    print(json.dumps({"primary_healthy": primary, "backup_healthy": backup, "current": current,
                      "next": target, "state": state, "apply": args.apply}))
    new_comment = PREFIX + json.dumps(state, separators=(",", ":"))
    if args.apply and (target != current or comment != new_comment):
        bunny("POST", f"/dnszone/{C['dns_zone']}/records/{record['Id']}",
              {"Type": 2, "Name": C["dns_name"], "Value": target, "Ttl": 60, "Comment": new_comment})
    if not primary and not backup:
        raise RuntimeError("Both CDNs failed checks; DNS left unchanged")


if __name__ == "__main__":
    main()
