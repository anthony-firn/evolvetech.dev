# Evolve Hosting: distributed static apps supported by donations

Status: original proposal, 2026-11-04; first implementation now lives at https://github.com/anthony-firn/evolve-hosting. See its README and recorded drill for delivered behavior and remaining limits. The website keeps its Netlify/Bunny deployment; this proposal is retained as design context.

## Purpose

Let anyone publish a browser application, run a mirror, or support its development and hosting through Fairground. Aim for a near-zero required operating bill for the publisher at small scale, with transparent costs for the people supplying storage and bandwidth. Hosting participation and donations remain optional.

This can become a reusable open-source project demonstrated with EvolveTech's own website. Its portfolio value comes from working release tooling, safe distribution, measurable recovery and a verified donation path.

## Existing foundations

- EvolveTech deploys the same static files to Netlify and Bunny, with health checks, DNS failover and certificate renewal. Both deployments currently belong to the same operator; they are provider redundancy, not a community hosting network.
- Fairground's app is static, uses independently operated Nostr relays for public data, and signs payments on the donor's device. Its commons code already supports development and relay donations.
- Public project demos already run locally in the browser, including Rust/WASM applications. Private mailbox contents and credentials are outside the static site.

## First architecture

1. **Publish a portable release.** An explicit public-file allowlist produces a static bundle and a versioned manifest containing paths, sizes, SHA-256 hashes, release identifier, project identity and declared backend dependencies. Sign the manifest with the publisher's private key. Private settings, credentials and mailbox data must never enter a bundle.
2. **Let operators mirror it.** A local CLI verifies the manifest against a separately trusted project key, checks the files and serves the verified release. Operators can use an existing machine or their preferred static host. Import rejects unsafe paths, oversized bundles, missing files, unexpected executable tooling and bad signatures. Activation preserves the last known-good release for rollback.
3. **Keep discovery replaceable.** Start with an explicit mirror list shipped with each release. Later, add signed announcements through configurable Nostr relays. An announcement is a claim, not proof of uptime or operator honesty. The system must work with a local list when relays are unavailable.
4. **Recover through independent copies.** Each mirror serves a complete application on its own HTTPS origin. Show alternate mirror links and provide an export for local use. A browser may cache an app after a successful visit. Initial navigation to a failed domain cannot be repaired by JavaScript that never loaded; recovery of the canonical hostname still requires working DNS/control-plane infrastructure.
5. **Support the people running it.** Reuse Fairground's donation flow for project development and verified, explicitly selected hosting operators. Display recipients and the donor-selected split before signing. Transfers go directly to recipients; the hosting project does not pool or custody donations.

### Trust and privacy

The project trust key must be obtained independently of an untrusted mirror. Hashes prove integrity only relative to a trusted manifest. A modified initial HTML page can replace its own verifier; browser-side checks alone do not authenticate arbitrary mirrors. Use the verifying local CLI or a trusted HTTPS bootstrap, and document this boundary.

Public mirrors receive public artifacts only. An app's API, secret storage and private database do not become distributed simply because its frontend has mirrors. The manifest and UI must explain when a feature still needs Netlify or another provider. Never fail over private API traffic to an arbitrary mirror.

Mirror operators need an authenticated binding between operator identity, HTTPS origin and payout address. Fairground's existing NIP-11 relay verification applies to relays; HTTP mirrors require their own reviewed binding. Merely publishing a wallet address or claiming traffic must not qualify a mirror for donations. The first version uses reviewed operator entries and explicit donor choice. Automated traffic-weighted payouts, hosting marketplaces and bandwidth rewards are out of scope.

If the canonical website is unavailable, support should still be accessible from a mirror using the same Fairground code and confirmed recipients. No donor wallet key is held by a host. Card/bank availability depends on configured providers; external-wallet support and receipt verification must be tested separately. Earlier donation audit findings are historical observations, not current proof of readiness.

## What “near zero” means

The publisher can use donated capacity, existing machines and free-tier hosting within their limits. Operators still supply bandwidth, storage, electricity and maintenance. Domain registration, optional provider services and payment/network fees remain real costs. Donations help cover costs but are not guaranteed income or a service-level agreement.

Keep an operating-cost page showing publisher-paid expenses separately from operator-contributed capacity and donations. Record observed usage and actual bills when available; provider list prices are not evidence of this project's monthly spend. Free-tier limits must be visible, with no automatic paid-resource provisioning or spending escalation.

Pricing references checked for this proposal:

- [Netlify credit-based plans](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/): free usage has a finite credit allocation.
- [Bunny Storage](https://bunny.net/pricing/storage/) and [CDN](https://bunny.net/pricing/cdn/): metered paid services with published minimums, not free community capacity.
- [Fairground payment hosting](https://github.com/anthony-firn/fairground/blob/main/docs/payment-hosting-options.md): optional payment services have their own dependencies.

## First reviewable milestone

Build one small public demo release and serve it from two independently configured local mirror processes, with a third deployment on existing hosting infrastructure. Keep the existing production path during the pilot.

Deliver:

- A small Node CLI with `pack`, `verify`, `serve` and `doctor` commands, documented input/output schemas, JSON errors and a working quickstart.
- An explicit trust-key workflow, signed manifests, bounded imports, version activation and rollback.
- A mirror/support screen reusing Fairground's donation UI, with verified recipient configuration and clearly labelled test fixtures. No real transfer is needed for development tests.
- End-to-end evidence: a fresh clone runs the example; corrupted files and wrong signers are rejected; a failed update preserves the prior release; one offline mirror leaves another usable; discovery can be unavailable; secrets are absent from artifacts; backend-dependent features explain their status; payment fixtures reject wrong recipients, notes, assets and duplicate receipt use within the defined payment scope.
- A short recovery report with actual timings, release hashes, test links and the observed cost model. Local drills must be labelled as local drills; they do not prove a community network or worldwide availability.

Only after this works should the project expand to relay discovery, peer-assisted file transfer, IPFS/Blossom adapters, automated operator attribution or broader backend services. The first release should make one static application easy to publish, mirror, recover and support.
