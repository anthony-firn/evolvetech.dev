# Donation wallet funding: mining, conversion and trading

Checked 2026-11-17 UTC (2026-11-16 local). The objective is the earliest spendable native ALGO in the existing donation wallet, without purchasing ALGO or using Meld. Current wallet setup requires roughly 0.201 ALGO; the utility requires at least 0.3 ALGO quoted swap output to leave a buffer. The existing owner signs the USDC opt-in afterward.

## Recommendation

The best verified direct mining route is native PearlPow on the RTX 3050 plus native RandomX on the CPU. For faster access to a small payout, use the same mining algorithms but receive **Nano**, then make **one quoted Nano-to-ALGO conversion** into the fixed donation fund. This avoids accumulating a 10 ALGO pool minimum. It does not depend on speculative trading profits.

The Nano route was activated on this machine after registering the provider accounts through the owned Evolve Inbox and verifying authenticated API access. Its ordinary target is 0.7 NANO. Credentials and wallet recovery material remain outside the repository. The direct ALGO configuration is preserved as the pre-activation fallback. No ALGO payout had arrived at activation.

## Measured hardware configuration

Machine: i7-13620H, RTX 3050 6GB laptop GPU. Tests below were performed on the charger in the existing Performance power profile. No clock, voltage or power-limit changes were applied. The GPU firmware target is 87°C; its factory protection remains active, with an additional 90°C software pause. CPU software cooling starts at 95°C.

| AC configuration | CPU H/s | GPU TH/s | Estimated ALGO/day |
|---|---:|---:|---:|
| Default GPU kernel + 10 physical CPU cores | 2,687 | 22.66 | 5.504 |
| Default GPU only | 0 | 22.60 | 4.584 |
| New GPU kernel only | 0 | 26.83 | 5.442 |
| New GPU kernel + 6 performance cores | 2,297 | 25.50 | **5.949** |
| New GPU kernel + 10 physical cores | 2,693 | 24.55 | 5.891 |
| New GPU kernel + all 16 CPU threads | 2,750 | 24.10 | 5.819 |

Selected: `BZ_PEARL_DENSE192=1`, CPU logical IDs `0,2,4,6,8,10`. The new GPU-only kernel was about 19% faster than the default GPU-only kernel; the selected combined configuration estimated about 8% more payout value than the initial combined configuration. Its GPU shares were accepted by the actual pool without rejection in the test sample.

These are short comparative samples, not proof of a universal optimum. A roughly 1% difference between the six-core and ten-core cases is within normal variation. Six cores were retained for the observed result and lower CPU contention. Estimates use the pool's contemporaneous public simulator coefficients and deduct 1% XMRig and 2% BzMiner developer time. Pool-fee assumptions are already in the simulator. Live prices, pool luck, thermal conditions and desktop use change earnings. Raw samples remain in `~/.local/share/evolve-bootstrap/tuning-ac.json`.

[Official simulator API](https://unmineable.com/api), [XMRig memory/cache optimization guide](https://xmrig.com/docs/miner/randomx-optimization-guide), [BzMiner releases](https://github.com/bzminer/bzminer/releases).

## Pool and payout comparison

| Route | Verified requirement | Consequence for this fund |
|---|---|---|
| unMineable → native ALGO | **10 ALGO** minimum | Simplest route; at the measured spot estimate about 40 hours of continuous mining, plus payout handling. |
| unMineable → Nano → ALGO | **0.001 NANO** pool minimum; current swap minimum around **0.55–0.62 XNO** | The prepared target is **0.7 NANO**, increasing only if a fresh minimum requires it, with a one-Nano swap cap. Potentially around 10–12 mining hours at the observed rates, plus pool payout and swap processing. |
| MoneroOcean → XMR → ALGO | Public configuration: **0.003 XMR** minimum; variable payout fee policy up to **0.0004 XMR** | Requires a Monero wallet and conversion, and the minimum's value was higher than the direct ALGO threshold at research time. Not selected for the smallest bootstrap. |
| P2Pool → XMR → ALGO | Published practical minimum around **0.00027 XMR**, 0% pool fee | Open decentralized pool, but CPU-oriented RandomX, PPLNS variance, node setup and an additional conversion remain. A small minimum does not guarantee an early payout. |
| Mining-Dutch | Payout batches every 15 minutes; optional conversion | Could not verify an ALGO payout currency or PearlPow route in its current published catalog. Not treated as a working replacement. |
| PROHASHING | Official site says the service is shut down | Excluded despite older comparison pages recommending it. |

[ALGO threshold and supported algorithms](https://unmineable.com/coins/ALGO), [Nano threshold](https://unmineable.com/coins/NANO), [MoneroOcean public payout policy](https://api.moneroocean.stream/config), [P2Pool](https://p2pool.io/), [Mining-Dutch catalog](https://www.mining-dutch.nl/), [PROHASHING status](https://prohashing.com/).

## The conversion minimum matters more than the Nano pool minimum

The public Nanswap interface was tested with actual read-only quotes for XNO→ALGO. At one sample:

- The reported minimum was 0.6171 XNO; a later API sample was 0.55233 XNO.
- Quotes for 0.001 and 0.1 XNO were unavailable.
- 1 XNO quoted about 2.496114 ALGO.
- 5 XNO quoted about 16.622239 ALGO.

These differences show why the service must fetch a fresh minimum and output quote. The very small Nano mining threshold alone is insufficient. The service signs no transfer unless the returned order names this exact fund, the exact input amount, the correct assets and a valid deposit account, with at least 0.3 ALGO expected output. Actual ALGO receipt is the completion criterion.

Nanswap's API requires an operator API key for order creation. Its public web quotes were inspected without creating an order. The unMineable API requires authenticated account credentials for automated cashout of the new legacy Nano address. The pipeline requests a manual API payout at the target rather than relying on the once-daily automatic schedule. API acceptance and actual processing time still depend on the providers.

[XNO→ALGO interface](https://nanswap.com/swap/XNO/ALGO), [Nanswap API and authentication](https://nanswap.com/API), [Nanswap API reference](https://documenter.getpostman.com/view/10524662/2s7YYu63Wr), [unMineable API](https://unmineable.com/api).

## Fully open-source trading tools

| Software | Verified license | Best use here |
|---|---|---|
| **CCXT** | MIT | A small deterministic conversion/sweep controller; public exchange data for simulation. The installed sandbox uses it with no exchange credentials or order calls. |
| **Freqtrade** | GPL-3.0 | Strategy development, backtesting and dry-run trading. A useful next step for research with a separate trading balance. |
| **Hummingbot** | Apache-2.0 | Market making, arbitrage and strategies spanning supported centralized/decentralized connectors. Needs inventory and careful fee accounting. |
| **Tinyman Python SDK** | MIT | Algorand-native swaps such as ALGO/USDC after the fund has its initial ALGO and asset opt-in. It cannot pay the initial gas from an empty wallet. |

[CCXT source/license](https://github.com/ccxt/ccxt), [Freqtrade source and dry-run documentation](https://github.com/freqtrade/freqtrade), [Hummingbot source/license](https://github.com/hummingbot/hummingbot), [Tinyman SDK](https://github.com/tinymanorg/tinyman-py-sdk).

Open-source client code does not make a hosted exchange, pool or swap provider self-hosted. Nanswap and unMineable remain external services. The current optimized GPU miner is distributed as a binary; XMRig, the settlement code, Nano toolkit and Nano work server have available source. Do not describe the entire stack as fully open source.

The installed CCXT sandbox starts with $100 of **virtual** cash and a demonstration SMA rule. It is deliberately incapable of placing a real order. Trading profitability is not established by software being open source, and exchange order/withdrawal minimums can dominate a wallet this small. For initialization, the chosen task is one conversion of mined rewards, with no speculative reinvestment of the donation balance.

## Operation and ownership

The [settlement instructions](../tools/bootstrap-miner/settlement/README.md) describe the private local wallet, credentials, block journal, timeout reconciliation and local setup console. The native miners stop when settlement stops. The funding monitor also checks the real donation wallet. Its owner completes the existing Fairground USDC opt-in; this setup does not enable Meld card/bank checkout.
