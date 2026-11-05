#!/usr/bin/env python3
"""Lego exec hook: publish or remove a DNS-01 challenge in both authoritative zones, Bunny and Route 53.

Lego runs `acme_dns.py present|cleanup <fqdn> <value>` and then waits until every authoritative nameserver of the
domain serves the value, so a challenge published at only one provider would fail once both are delegated."""
import sys
from hosting import CONFIG as C, bunny, route53_change


def main(action, fqdn, value):
    zone = C["hostname"].split(".", 1)[1]
    name = fqdn.rstrip(".").removesuffix("." + zone)
    if action == "present":
        bunny("PUT", f"/dnszone/{C['dns_zone']}/records", {"Type": 3, "Name": name, "Value": value, "Ttl": 60})
        route53_change("UPSERT", fqdn, "TXT", f'"{value}"')
    elif action == "cleanup":
        for record in bunny("GET", f"/dnszone/{C['dns_zone']}")["Records"]:
            if record["Type"] == 3 and record["Name"] == name and record["Value"] == value:
                bunny("DELETE", f"/dnszone/{C['dns_zone']}/records/{record['Id']}")
        route53_change("DELETE", fqdn, "TXT", f'"{value}"')
    else:
        raise SystemExit(f"Unknown action {action!r}")


if __name__ == "__main__":
    main(*sys.argv[1:4])
