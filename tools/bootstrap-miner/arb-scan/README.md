# Algorand arbitrage scanner (read-only)

The question this answers: could a low-energy arbitrage bot grow the project fund from the few cents mining has
produced, so the miner can be switched off? Arbitrage is the one strategy whose earnings don't scale with the
starting balance: on Algorand a grouped transaction either completes every swap or none, a rejected group pays no
fee, and the trade size can exceed the balance only with a flash loan (not verified here).

`scan.py` measures before anything is built to trade. Once a minute it chains public Folks Router quotes around
ALGO → USDC → ALGO and two loops through USDt, at 10 and 250 ALGO, and records the result after fees:

- **routerNet**: executing through Folks Router as quoted (0.1% router fee per hop, router network fees).
- **directNet**: calling the same pools directly; router fee added back, about 0.003 ALGO network fee per hop.

It also records the ALGO price on Coinbase and Kraken. It reads no keys, signs nothing and places no orders.
It uses about 20 HTTP requests a minute and negligible CPU.

```sh
python3 -m unittest test_scan.py         # fee math
ARB_ONCE=1 python3 -I scan.py            # one sample
python3 -I report.py                     # summary of everything collected
```

Installed copy: `~/.local/share/evolve-bootstrap/arb-scan/`, service `evolve-arb-scan.service`
(`systemctl --user stop evolve-arb-scan.service` to stop). Samples: `samples.jsonl` in the same folder.

**Reading the result.** Gaps that exist only at sampled moments are what existing bots haven't closed yet; a real
bot would have to be first. If after about a week the direct estimates stay negative, arbitrage is not an
alternative to the miner at this scale. If positive gaps recur, the next step is an executor that calls pools
directly with atomic groups, tested in dry-run first, using the operator's own wallet rather than donor funds.
