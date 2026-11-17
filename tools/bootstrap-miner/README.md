# Mine the donation wallet's initial ALGO

This is a one-time operator tool for EvolveTech's existing donation wallet. Browser
WebAssembly computes RandomX hashes. A local Node service carries Stratum messages
to unMineable, which converts the rewards and accounts for them in native ALGO for:

`WMQHGXHHWQVUN2VIZQJ5OO2GSH5Q33CVABJUCLJHP4UHLTTMS2HE3W6FEM`

It uses no Meld integration, card purchase, exchange account or private wallet key.
No mining starts on a website visit. The operator checks the consent box and clicks Start.
This is not embedded in the portfolio or run on visitors' devices.

## Run

Requires Node 22+ and a recent 64-bit Chromium browser. Other browsers must pass the built-in self-test before mining. No npm install is
needed: the WASM engine and WebSocket library are pinned and vendored here.

```sh
node tools/bootstrap-miner/server.mjs
# Open http://127.0.0.1:8773
```

The server binds to `127.0.0.1` only. Set `BOOTSTRAP_MINER_PORT` to another local port
if necessary. Keep the terminal and browser tab open while mining. Closing the tab,
stopping the service, or clicking Stop terminates the mining session.

Full mode uses about 2.5 GiB of shared RAM. Light mode uses about 300 MiB per worker
and is much slower. CPU controls set an approximate duty cycle; initial cache and
dataset construction can temporarily use the selected CPU threads continuously.
Every worker must pass the known-answer hash test in the current browser before
the service opens a mining connection. Unsupported or incorrect engines fail closed.

## What has to happen

1. Accumulate actual pool credit to the **pool's payout threshold**. On November 16,
   2026, both the provider page and the live address API reported **10 ALGO** and
   a 1% mining fee. The UI reads the current values instead of treating shares as cash.
2. Request the ALGO payout or enable automatic payments in unMineable's own controls.
   The address API currently reports automatic payments off. This tool reads that
   setting and does not change it. The pool has custody of unpaid rewards.
3. Wait for ALGO to arrive at the public receiving address. The miner stops at the payout-ready threshold or once
   that account has sufficient setup funds, even if USDC opt-in is still pending.
4. Restore the **existing owner account** in Fairground, check that its full address
   matches, and complete the USDC opt-in there. A new account has a different address
   and cannot initialize this receiving fund. The miner never asks for signing keys.
5. Readiness is confirmed only by the unfrozen native USDC holding (asset 31566704)
   and the account's required minimum balance on Algorand mainnet.

For an otherwise empty account, minimum balances plus the usual opt-in fee total
about 0.201 ALGO. That is different from the pool's 10-ALGO withdrawal minimum and
Fairground's suggested operating reserve. Time to payout is unknown until real
hashrate, difficulty and pool credit are observed. Pool-accepted shares are not
proof of payment; verify the on-chain transfer. Wallet initialization enables crypto
donations but does not enable Meld's card/bank checkout.

## Network and source boundaries

Only the fixed pool host and fixed donation address can be used by browser sessions.
The browser has no general TCP access, so this local bridge is required. External
origins, DNS-rebinding hostnames and arbitrary pool/wallet overrides are rejected.
Only one mining session can use the bridge at a time. Submitted shares are validated,
bounded and deduplicated; accepted counts come from actual upstream submit responses.

The pool presents a self-signed TLS certificate. Its observed SHA-256 fingerprint
is pinned in `protocol.mjs`, and checked before application data is sent. This pin
was observed from the documented pool endpoint on November 16, 2026; it was not
independently authenticated out of band. A different certificate fails closed and
requires review, rather than silently accepting any self-signed peer.

`SOURCE.json` identifies the upstream revision, binary hashes and small worker
changes. The engine and glue come from RandomX-bonanza; the upstream reference
RandomX BSD license, project license/CC0 notice, and ws MIT license are retained.
No third-party embed, service worker, referral code, developer-fee worker or external
browser script is loaded. The prebuilt engine is pinned; byte-identical rebuilding
with a different Emscripten toolchain is not claimed.

## Check

```sh
node --test tools/bootstrap-miner/test.mjs
node tools/bootstrap-miner/verify-engine.cjs
python3 tools/bootstrap-miner/test-browser.py
```

The browser test uses real WASM hashes with an explicitly simulated easy pool.
Submitted share hashes are checked against the non-JIT reference execution path.
Its accepted-share counts are test acknowledgments, not real earnings. A live
unMineable login for the configured address was separately accepted and returned
an `rx/0` job. No live payout or wallet initialization is claimed by these checks.

Sources checked November 16, 2026:

- [unMineable ALGO network, algorithms and payout threshold](https://unmineable.com/coins/ALGO)
- [Provider's legacy address/worker configuration](https://unmineable.com/support/article/how-to-setup-xmrig-for-cpu-mining)
- [RandomX-bonanza engine](https://github.com/aa022/RandomX-bonanza/tree/25741e126a687e39d715f3b921192e6125f450f2)
- [Algorand minimum balances and transaction fees](https://dev.algorand.co/concepts/protocol/protocol-parameters/)

## Native mining and one-time Nano settlement

The installed operator session can use native CPU/GPU miners and the optional
[Nano-to-ALGO settlement utility](settlement/README.md). It keeps wallet secrets
outside the repository, stops at the one-time funding goal, and requires the
operator's own pool/swap API credentials before switching payout routes.
See the [pool and open-source trading research](../../docs/donation-funding-research.md)
for measured configurations, payout minimums and the paper-trading sandbox.
