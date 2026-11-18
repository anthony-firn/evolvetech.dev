# Public-service security baseline — November 18, 2026

This release makes improvements that require no business registration, account
registration, agent filing or contact with an organization. It does not make
applicable law disappear before the first donation, and it is not a legal or
security certification.

## Changes

- Factual privacy, project-support/use, reporting and security-limit pages,
  linked from public app shells. The generated-page sandbox and signed hosting
  examples are left intact; the surrounding product links provide context.
- Corrected claims that health encryption prevents breaches or legal demands,
  that keyword filters invariably block illegal content, and that the built-in
  wallet is already post-quantum secure.
- Support confirmations identify the development recipient, distinguish project
  support from investment/charitable deductibility, describe independent relay
  splits and disclose that payments remain public even without social receipts.
- Fairground conversion budgets execute in dependency-free Rust/Wasm, including
  range checks, reserve preservation, fee limits and authority/activation gating.
  Existing transaction validation, quotes, fresh-state checks and durable pending
  recovery remain in force.
- Bend model laws are checked by Bend and its separate BendTT kernel. The
  [exact source and limits](https://github.com/anthony-firn/fairground/tree/codex/legal-security-baseline/proofs/fund-policy)
  distinguish model proofs from testing of Rust. A deliberately false conservation
  law was rejected. CI rebuilds the Wasm and rejects generated-byte drift.
- Malformed full account recovery codes are rejected rather than silently
  generating a different post-quantum identity. Unsafe/rounded JSON wallet
  balances are rejected before signing.
- The private inbox login links its privacy notice. No inbox contents or private
  keys are included in the published website.

`tools/build_legal.py` reapplies site navigation after source builds; the build
metadata discloses that overlay and updates affected file hashes. It does not
modify signed hosting examples. Run `python3 tools/test_legal.py` and
`python3 tools/check_site.py` after syncing builds.

## Important remaining limits

1. The existing donation account remains under its original Ed25519 authority.
   `node tools/check-wallet-authority.mjs` in Fairground checks public mainnet
   authority without signing. Native Falcon support is not enough: compatible
   payments, independent secret generation, recovery rehearsal, fees, pending
   recovery and migration must be validated together before a rekey. No rekey,
   new funds transfer or new mining/trading activity was performed for this release.
2. Health's X25519 sharing and Ed25519 identity are classical. A future hybrid
   key agreement needs maintained cryptographic implementations, a versioned
   protocol, downgrade rejection and migration/recovery tests. A new cipher name
   or a hand-written replacement would not establish protection.
3. Fairground stores signing secrets in browser storage. Apps sharing an origin
   share a security boundary. Separate origins and encrypted-at-rest unlock need
   an intentional, tested account migration. Neither the Rust policy nor Bend
   prevents a compromised browser/application from stealing a key.
4. No end-to-end formal proof, independently audited cryptographic implementation,
   verified compiler/ABI, post-quantum TLS guarantee or external-provider security
   guarantee is established. Hardware, runtime, identity-key trust, protocols,
   issuer controls and consensus remain separate dependencies.
5. Publishing reporting contacts is only part of compliance. Actual request
   review, valid-request removal, preservation, retention and incident duties
   still need operational handling. No DMCA agent registration or safe-harbor
   status is claimed. No statutory deadlines or obligations are waived.
6. Business/name/health/payment classification, intended audiences, geographic
   coverage, provider-retention settings, comprehensive IP/license review and
   manual accessibility work remain unresolved where documented in the review.
   No registration, filing, outreach, donation or interview was represented as
   completed or required solely because this release exists.

## Direction for later work

Prefer small, independently testable Rust modules with narrow interfaces over a
whole-system rewrite. Specify invariants first; keep proof assumptions explicit;
use reviewed cryptographic libraries and protocol formats; measure deployment
artifacts and reject drift. Prioritize recovery, origin separation, actual
post-quantum signer interoperability and versioned health sharing before any
marketing claim of complete formal or post-quantum security.
