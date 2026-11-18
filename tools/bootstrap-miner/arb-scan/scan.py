#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Read-only Algorand arbitrage scanner. It only requests public quotes and prices: no keys, no signing, no orders.

Every ARB_INTERVAL seconds it chains Folks Router fixed-input quotes around ALGO cycles (ALGO -> USDC -> ALGO and
loops through USDt) at a few trade sizes and records what would come back after fees. Two estimates per cycle:
  routerNet - executing through Folks Router as quoted (its 0.1% fee per hop and its network fees included)
  directNet - calling the same pools directly: router fee added back, network fee assumed DIRECT_FEE per hop
It also records the ALGO price on Coinbase and Kraken, to show how closely Algorand's pools track exchanges.
Samples append to $ARB_DATA/samples.jsonl; status.json holds the latest one.
"""
import base64
import json
import os
import signal
import threading
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROUTER = "https://api.folksrouter.io/v2/fetch/quote"
ALGO, USDC, USDT = 0, 31566704, 312769
NAMES = {ALGO: "ALGO", USDC: "USDC", USDT: "USDt"}
CYCLES = [[ALGO, USDC, ALGO], [ALGO, USDT, ALGO], [ALGO, USDC, USDT, ALGO], [ALGO, USDT, USDC, ALGO]]
SIZES_ALGO = [float(x) for x in os.environ.get("ARB_SIZES", "10,250").split(",")]
INTERVAL = float(os.environ.get("ARB_INTERVAL", "60"))
DIRECT_FEE = 3000  # micro-ALGO per directly called pool swap (app call + transfer + inner txns); an estimate
DATA = Path(os.environ.get("ARB_DATA", Path.home() / ".local/share/evolve-bootstrap/arb-scan"))
UA = {"User-Agent": "arb-scan/0.1"}


def get(url, timeout=15):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout) as r:
        return json.loads(r.read())


def quote(frm, to, amount):
    q = urllib.parse.urlencode(dict(network="mainnet", fromAsset=frm, toAsset=to, amount=int(amount),
                                    type="FIXED_INPUT", maxGroupSize=16, feeBps=10))
    b = get(f"{ROUTER}?{q}")
    if not b.get("success"):
        raise RuntimeError(f"no quote {NAMES[frm]}->{NAMES[to]}: {b.get('errors')}")
    r = b["result"]
    data = json.loads(base64.b64decode(r["txnPayload"])).get("data", {})
    return dict(out=int(r["quoteAmount"]), routerFee=int(data.get("outputAmountFee", 0)),
                netFee=int(r["microalgoTxnsFee"]), impact=float(r["priceImpact"]),
                pools=[s for p in data.get("paths", []) for s in p.get("swaps", [])])


def cycle(path, start, quote_fn=quote):
    """Chain quotes around `path` starting with `start` micro-units of path[0]; net results in micro-ALGO."""
    amt, ratio, hops = start, 1.0, []
    for frm, to in zip(path, path[1:]):
        h = quote_fn(frm, to, amt)
        hops.append(h)
        ratio *= (h["out"] + h["routerFee"]) / h["out"] if h["out"] else 1.0
        amt = h["out"]
    router_net = amt - start - sum(h["netFee"] for h in hops)
    direct_net = amt * ratio - start - DIRECT_FEE * len(hops)
    return dict(path="->".join(NAMES[a] for a in path), sizeAlgo=start / 1e6, back=amt,
                routerNet=router_net, directNet=round(direct_net), pools=[h["pools"] for h in hops])


def cex():
    out = {}
    try:
        t = get("https://api.exchange.coinbase.com/products/ALGO-USD/ticker")
        out["coinbase"] = (float(t["bid"]) + float(t["ask"])) / 2
    except Exception as e:
        out["coinbaseError"] = type(e).__name__
    try:
        r = list(get("https://api.kraken.com/0/public/Ticker?pair=ALGOUSD")["result"].values())[0]
        out["kraken"] = (float(r["b"][0]) + float(r["a"][0])) / 2
    except Exception as e:
        out["krakenError"] = type(e).__name__
    return out


def sample():
    s = dict(t=round(time.time()), cycles=[], errors=[])
    for size in SIZES_ALGO:
        for path in CYCLES:
            try:
                s["cycles"].append(cycle(path, int(size * 1e6)))
            except Exception as e:
                s["errors"].append(f"{'->'.join(NAMES[a] for a in path)}@{size}: {type(e).__name__}: {e}"[:200])
    s["cex"] = cex()
    try:  # pool price at the smallest size, with the router's fee added back
        h = quote(ALGO, USDC, int(SIZES_ALGO[0] * 1e6))
        s["dexUsdPerAlgo"] = (h["out"] + h["routerFee"]) / (SIZES_ALGO[0] * 1e6)
    except Exception as e:
        s["errors"].append(f"dex price: {type(e).__name__}")
    return s


def main():
    os.umask(0o077)
    DATA.mkdir(parents=True, exist_ok=True)
    stop = threading.Event()
    for sig in (signal.SIGINT, signal.SIGTERM):
        signal.signal(sig, lambda *_: stop.set())
    once = os.environ.get("ARB_ONCE") == "1"
    while not stop.is_set():
        s = sample()
        with open(DATA / "samples.jsonl", "a") as f:
            f.write(json.dumps(s) + "\n")
        (DATA / "status.json").write_text(json.dumps(s, indent=1) + "\n")
        best = max(s["cycles"], key=lambda c: c["directNet"], default=None)
        print(json.dumps(dict(t=s["t"], best=best and best["path"], size=best and best["sizeAlgo"],
                              directNetAlgo=best and best["directNet"] / 1e6, errors=len(s["errors"]))), flush=True)
        if once:
            break
        stop.wait(INTERVAL)


if __name__ == "__main__":
    main()
