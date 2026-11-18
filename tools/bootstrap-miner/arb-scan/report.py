#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Summarize the scanner's samples: would an Algorand arbitrage bot have made money at the sampled moments?"""
import json
import os
import statistics as st
from collections import defaultdict
from pathlib import Path

DATA = Path(os.environ.get("ARB_DATA", Path.home() / ".local/share/evolve-bootstrap/arb-scan"))
MINER_USD_PER_DAY = 0.17  # measured 2026-11-17: ~1.1 NANO/day, ~47% lost in 0.58-NANO swaps


def main():
    path = DATA / "samples.jsonl"
    rows = [json.loads(l) for l in open(path) if l.strip()] if path.exists() else []
    if not rows:
        raise SystemExit("no samples yet")
    hours = max((rows[-1]["t"] - rows[0]["t"]) / 3600, 1e-9)
    price = st.median(r["dexUsdPerAlgo"] for r in rows if "dexUsdPerAlgo" in r)
    print(f"{len(rows)} samples over {hours:.1f} h; ALGO ≈ ${price:.4f}")
    groups = defaultdict(list)
    for r in rows:
        for c in r["cycles"]:
            groups[(c["path"], c["sizeAlgo"])].append(c)
    print(f"\n{'cycle':24} {'ALGO':>5} {'n':>5} {'direct>0':>9} {'best direct $':>14} {'median direct $':>16} {'router>0':>9}")
    pos_usd = 0.0
    for (cyc, size), cs in sorted(groups.items()):
        d = [c["directNet"] / 1e6 * price for c in cs]
        dpos = [x for x in d if x > 0]
        pos_usd += sum(dpos)
        rpos = sum(c["routerNet"] > 0 for c in cs) / len(cs)
        print(f"{cyc:24} {size:5.0f} {len(cs):5} {len(dpos)/len(cs):9.1%} {max(d):+14.4f} {st.median(d):+16.4f} {rpos:9.1%}")
    gaps = []
    for r in rows:
        ref = [v for k, v in r.get("cex", {}).items() if k in ("coinbase", "kraken")]
        if ref and "dexUsdPerAlgo" in r:
            gaps.append((r["dexUsdPerAlgo"] / st.mean(ref) - 1) * 1e4)
    if gaps:
        print(f"\nAlgorand pool price vs Coinbase/Kraken: median {st.median(gaps):+.0f} bps, "
              f"range {min(gaps):+.0f} to {max(gaps):+.0f} bps (a pool's own fee is ~30 bps)")
    print(f"errors: {sum(len(r['errors']) for r in rows)}")
    per_day = pos_usd / hours * 24
    print(f"\nPositive direct-pool estimates at sampled moments: ${pos_usd:.4f} total, ≈ ${per_day:.4f}/day "
          f"if each were captured once (existing bots compete for these).")
    verdict = "beats" if per_day > MINER_USD_PER_DAY else "does not beat"
    print(f"Switch test: {verdict} the miner's ≈ ${MINER_USD_PER_DAY:.2f}/day delivered to the wallet.")


if __name__ == "__main__":
    main()
