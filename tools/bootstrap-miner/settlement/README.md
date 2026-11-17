# One-time Nano → ALGO settlement

This operator utility initializes the existing donation fund by converting a small mined Nano balance into native ALGO. Its destination is fixed to the fund address exported by `../protocol.mjs`. It does not accept an alternate ALGO recipient.

The donation account owner still signs the USDC opt-in through Fairground after ALGO arrives. No Algorand signing keys are requested by this utility.

## Installed workflow

1. The existing native GPU/CPU miners remain on their direct ALGO route until activation succeeds.
2. `cli.mjs setup` creates a standard Nano seed and account index 0 in `~/.local/share/evolve-bootstrap/settlement/`. The directory is mode 0700 and its files are mode 0600. The seed is never printed or committed. Back up `wallet.json` privately; it is the recovery material for this transit wallet.
3. `connect.py` collects API credentials in a local terminal with hidden input. Nanswap requires its API key to create an order. unMineable requires a signed-in account, alias and read/write API credentials to request a legacy-address payout. Their authenticated services cannot be set up from public quotes alone.
4. Activation checks the public Nano mainnet RPC, swap limits and authenticated pool access; attaches this new Nano payout identity to the operator's account if necessary; then changes the native miners to this Nano address. Previous miner configurations are preserved locally and restored if the host configuration transaction fails.
5. The settlement service checks the actual ALGO account, Nano receipts, live swap minimum and pool credit. Its target follows the **live swap minimum plus 5%**, rounded up to eight Nano decimals, with a hard limit of **1 NANO per swap**. Every quote must still cover at least 0.3 ALGO. If the minimum rises after a pool payout arrives, mining resumes for the shortfall.
6. At the target, mining stops and the service requests the mined Nano payout. It receives confirmed Nano into the local wallet, obtains fresh quotes, and creates one XNO→ALGO order whose quoted output covers at least **0.3 ALGO**.
7. The returned order must name the fixed ALGO fund, correct assets, exact amount and valid Nano deposit address. The Nano send is signed locally and journaled before broadcast. A timed-out broadcast is reconciled/rebroadcast using the same block hash, without signing another payment.
8. Completion requires actual on-chain ALGO funding. A pool credit, accepted share or completed swap response alone is insufficient.

The native miner services bind to the settlement service after activation. If it stops or fails, both miners stop. The existing funding/thermal guard remains active. The desktop console's **S** key stops the session.

## Commands

```sh
npm ci --ignore-scripts
npm test
node cli.mjs setup
python connect.py
node cli.mjs status
```

The installed desktop services use the repository's absolute paths. The prepared local service is `evolve-bootstrap-settlement.service`; it starts only when the route is activated. None of these mining services are enabled at boot.

Wallet keys, API credentials, swap state, signed-block journal and configuration backups stay outside the repository. API errors do not log raw authenticated response bodies. Pool credentials sign only the documented legacy-address API operations used here. A swap-order creation timeout pauses for reconciliation rather than creating another order automatically.

If an order-creation request times out before an order ID is saved, inspect the provider account. `node cli.mjs retry-order` permits an explicit retry only while no saved order, signed block or payment exists. It never clears a payment journal. Definitive API rejections can be retried after correcting credentials through the local setup console.

## Nano work and RPC

Block signing uses the pinned GPL-3.0 `nanocurrency` toolkit. Public Nano reads and broadcasts use `https://rpc.nano.to`; no seed is imported into a remote wallet. Proof of work is generated locally using a source-built [Nano work server](https://github.com/nanocurrency/nano-work-server), started for one request on an ephemeral loopback port and then stopped. Its result is independently checked by the JavaScript toolkit. The local WASM work generator is a fallback.

The native server was tested at both mainnet receive and send thresholds. It is installed under `~/.local/share/evolve-bootstrap/nano-work-server/`; its source and binary hashes are recorded locally. Mainnet transfers still require mined funds and valid service credentials; the automated tests use simulated ledgers and orders.

## Open-source trading sandbox

`paper.py` uses pinned MIT-licensed CCXT and public Kraken BTC/USD candles. It starts with **$100 of virtual cash**, uses a demonstration SMA5/SMA20 rule on closed five-minute candles, and records virtual trades in `~/.local/share/evolve-bootstrap/trading/paper.sqlite`. Its assumed paper fee is 0.4% per side. This is a demonstration, not a validated strategy or earnings forecast.

The executable reads no exchange keys and contains no real order or withdrawal calls. `evolve-paper-trading.service` runs it separately from donation settlement. Stop it with `systemctl --user stop evolve-paper-trading.service`.

See [the research comparison](../../../docs/donation-funding-research.md) for Freqtrade, Hummingbot, CCXT, and Algorand swap options. The automation source is open; hosted mining pools and swap providers are external services. The current optimized GPU miner is a binary-distributed third-party miner, so the entire mining/service stack is not described as fully open source.
