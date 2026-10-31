# Cross-project donation audit — 2026-10-30

The existing project donation links converge on Fairground's About/support flow. There is no separate donation
processor to migrate in the other portfolio projects inspected. Meld is the planned card/bank funding layer for a
donor's own Fairground wallet; the donation itself remains a direct USDC transfer on Algorand. Donors with funded
external Algorand wallets can use the existing wallet-link/QR flow independently of Meld.

## Project inventory

| System | Existing donation entry | Result |
| --- | --- | --- |
| Fairground | You/About, creator/payment prompts | Shared donation sheet and public development fund; Meld changes are local and not deployed. |
| Emergence/CAD | Header and Fund the commons section → `/play/fairground/#/about` | Reuses Fairground. Corrected the stale explorer address in source, documentation and the website's built CAD page. |
| GitHub profile (`anthony-firn`) | Support the projects / Support open-source development → Fairground About | Already uses the shared flow; no processor-specific integration. |
| Emberwake | None found in the local project source or published HTML | No separate donation checkout to migrate. |
| Pulse Pop | None found in the local project source or published HTML | No separate donation checkout to migrate. |
| Symmetry Forge | None found in the local checkouts or published HTML | No separate donation checkout to migrate. |
| Evolve Inbox | None found in the local source or published demo HTML | No separate donation checkout to migrate. |
| Retirement Research | None found in published demo HTML; connected GitHub donation/funding searches returned no matches | No separate checkout identified; this was not a full local source audit of Retirement Research. |

Additional local scans of gov-trader, mobile, smart-sparsity and symmetry-atlas found no project donation integration.
No `.github/FUNDING.yml`, `.github/FUNDING.yaml` or root `FUNDING.yml` was present in the 11 additional project
checkouts checked. Search exclusions omitted dependencies, generated build directories and private environment files.

Older `evolvetech-projects/website-inbox` and `website-emergence` checkouts contain earlier website snapshots with
Transak references. They are not the current portfolio workspace and were left unchanged. The Shattered Pixel Dungeon
reference checkout has its upstream author's support features; those are third-party donation routes, not EvolveTech's.

## Fund consistency

The source of the recipient remains Fairground's `src/defaults.ts`:

```text
WMQHGXHHWQVUN2VIZQJ5OO2GSH5Q33CVABJUCLJHP4UHLTTMS2HE3W6FEM
```

Emergence's explorer link and funding documentation still used `UUUBTF…`; those references now match Fairground's
existing recipient. This changes the displayed explorer link, not Fairground's transfer destination. Emergence has
unrelated in-progress source changes: only the address in `web/cad/index.html` and the funding paragraph in
`analysis/collaborative_cad.md` were edited. The website's existing CAD build was patched only at that explorer link,
with the patch hash recorded in `public/play/emergence/BUILD.json`; no unrelated CAD changes were rebuilt or copied.

## Current shared blockers

Read-only live checks during this audit:

- The public Algorand indexer returned `assets: []` for the current fund's USDC asset (31566704), at round 66498943.
  The fund still needs its own ALGO setup and USDC opt-in before it can accept development donations.
- `/fairground/wallet/config` returned HTTP 503, `payment service temporarily unavailable`. The local Meld migration
  does not change the deployed endpoint until deployment and private configuration are completed.
- The earlier donation-dialog issues have now been fixed locally alongside the direct-crypto instructions.
  Each split recipient gets fresh payment state. External donations and fan support use explicit transaction-ID
  confirmation, checking the confirmed asset, recipient, exact note, amount and time. Another recent transfer no longer
  completes a shared-note dialog automatically. The browser test covers both recipients of a split donation and a
  wrong-note external transfer. These fixes become live when the updated app is deployed.

No credentials, cloud resources or funds were changed by this audit. The recipient-address consistency assertions,
`git diff --check`, and the website's static/link checks passed. Live provider purchases and withdrawals were not tested.
