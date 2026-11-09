# evolvetech.dev

Anthony Firn's portfolio and the home of EvolveTech, his open-source studio. Each project page links to its own public
repository; live demos are under `/play/`.

The site itself is buildless HTML, CSS and a little JavaScript: no framework, runtime backend, analytics or external fonts.
Demos are prebuilt static files committed under `public/play/`, so deploys never depend on a project build.

- `public/assets/v2/` holds the design system (`style.css`), the hero hypercube (`hero.js`), page behaviour (`main.js`),
  the light/dark theme switch (`theme.js`, loaded blocking so a saved choice applies before first paint; otherwise the
  device setting decides), and the résumé print layout.
- `public/assets/media/` holds demo videos (WebM + MP4), posters and the social-share image.
- `tools/build_pages.py` generates the project case-study pages; edit it rather than the generated HTML.
- The résumé PDF is printed from `/resume/` in Chrome with print media emulation.
- Fonts are self-hosted (OFL); see `public/assets/fonts/LICENSES.txt`.

## Preview and check

```sh
python3 tools/check_site.py
python3 -m http.server 8080 --directory public
```

Open http://localhost:8080. Public assets are all under `public/`.

## Hosting and recovery

The canonical website is **https://www.evolvetech.dev**. The bare domain redirects to it on both providers, preserving paths and query strings.

- **Namecheap** remains the registrar; **Bunny** and **Route 53** are both authoritative DNS.
- **Netlify** is the primary CDN with its own deployed files, on the Free plan (credit limits apply).
- **Bunny CDN + Bunny Storage** holds an independently uploaded copy.
- `hosting.json` contains resource identifiers and DNS targets, never credentials.
- **Cloudflare Pages** remains an optional provider-address mirror; it is outside the failover path.

Pushes to `main` run `tools/deploy.py`, uploading the same static directory to both providers. No Node dependencies or application build are needed.
GitHub Actions holds encrypted provider credentials. Pull request checks do not receive them. A failed deployment is visible in Actions; uploads to two different providers are not atomic.
The Bunny storage origin is independent of Netlify. Private household applications and retirement APIs are outside this static hosting setup.

### Automatic failover

`tools/monitor.py --apply` runs from two independent schedulers: the hosting workflow, nominally every five minutes, and an AWS Lambda function (`monitor_function` in `hosting.json`) started every minute by EventBridge Scheduler. Both run the same code; the deploy job updates the Lambda package through `tools/deploy_monitor.py`. The monitor checks both CDN endpoints directly using the real website hostname for TLS/SNI and certificate validation, plus the homepage and an uncached health file. It never follows public DNS to accidentally check only the active provider.

Three primary failures within a run cause a switch to Bunny only if Bunny passes its checks. Both failures preserve the last DNS target and fail the workflow. Recovery requires ten minutes of observed primary health; a failure resets that period. A monitoring gap longer than fifteen minutes also resets recovery. A failed backup permits immediate return to a healthy primary.

Only the `www` CNAME changes; the apex CNAME follows it through Bunny's flattening. TTL is 60 seconds. A compact recovery timestamp is stored in the Bunny record comment so the monitor needs no server or database; the Route 53 `www` record is then set to the same CDN. Unknown/manual DNS targets are preserved in both zones. In November 2026 Bunny took over five minutes to serve changed records from its nameservers, which adds to every switch.

**Timing limits:** GitHub scheduled jobs can be delayed or dropped (in practice this one has run every two to three hours), and some resolvers retain DNS answers beyond TTL. GitHub also automatically disables scheduled workflows in public repositories after 60 days without repository activity. The Lambda schedule covers both gaps, but it runs from one AWS region; neither scheduler is multi-region consensus monitoring. Switching has no guaranteed recovery time, and this low-cost arrangement can leave visitors affected for minutes.

**Route 53** (`route53_zone` in `hosting.json`, $0.50 a month) has been the second authoritative provider since November 2026; Namecheap delegates to Bunny's two nameservers and Route 53's four. Its zone mirrors the Bunny records, and the monitor keeps its `www` record on the same CDN as Bunny's. Any other record change must be made in both zones. Route 53 health checks were removed as too costly for this site (about $4.75 a month with HTTPS and text matching). Route 53 cannot flatten the apex to a non-AWS host, so its apex is an A record for Netlify's load balancer (75.2.60.5) and does not fail over.

Switching still depends on Bunny's API: the monitor reads the recovery state there and does not change Route 53 when it cannot. Bunny does not allow NS records at a zone's root, so Bunny's own NS answer lists only its two nameservers (Route 53's and the `.dev` delegation list all six); a resolver that caches Bunny's answer uses only Bunny for up to its two-day TTL.

### HTTPS renewal while on standby

Both CDNs receive custom Let's Encrypt certificates issued through **DNS-01**, independently of traffic routing; `tools/acme_dns.py` publishes each challenge in both authoritative zones. The daily certificate job uses the pinned Lego ACME client, keeps the account and private keys in a private, encrypted S3 object, renews when due, then installs on both providers. Private keys are never uploaded as GitHub artifacts or caches or placed in website storage.

AWS holds this small private certificate-state object, the Route 53 zone and the Lambda monitor. GitHub assumes a role restricted to this repository's `main` branch using OIDC; no long-lived AWS keys are stored in GitHub. CloudFront account verification blocked the original hosting design, so CloudFront and its unused resources were removed. In November 2026 the certificate state moved to a new AWS account with a freshly issued certificate and ACME account.

The private state bucket is not a website origin and is not exposed by either CDN. An AWS or GitHub outage can delay renewal, though an already installed unexpired certificate continues working. Check failed daily jobs and certificate expiration alerts. DNS-01 validation and provider installation have been exercised; future unattended renewal still needs continued observation.

### Checks and operations

```sh
python3 tools/check_site.py
python3 tools/test_monitor.py
# Credentials supplied through environment, not command-line arguments (BUNNY_API_KEY plus AWS credentials,
# e.g. eval "$(aws configure export-credentials --profile evolvetech --format env)"):
python3 tools/monitor.py                       # read-only probe and decision
python3 tools/monitor.py --apply               # persist routing decision
python3 tools/monitor.py --simulate-primary-failure --apply  # controlled drill
```

The controlled drill sends real visitors to the backup and resets recovery. Run only when both copies pass HTTPS checks. Later normal monitor runs restore the primary after the recovery interval. Disable the hosting workflow and the `evolvetech-monitor` EventBridge schedule before a manual DNS override that must remain in place.

Deploy, monitor, and certificate jobs can also be run from **GitHub Actions → Deploy and monitor hosting → Run workflow**. GitHub workflow notifications report failed checks; configure your account's notification preferences to receive them. No independent paging service is configured.

To reproduce this hosting arrangement in another account, create a Netlify site, Bunny Storage/Pull Zone and DNS zone; add both hostnames to both CDNs; issue DNS-validated certificates; configure the equivalent redirect, security header, HTTPS and health-cache rules; update `hosting.json`; set `BUNNY_API_KEY`, `NETLIFY_AUTH_TOKEN`, and `ACME_EMAIL` as GitHub secrets; create a private S3 certificate-state object and repository-restricted OIDC role. Update the role in the certificate workflow. Bootstrap certificates before changing website DNS.

## Browser demos

| Path | Source | Built with |
|---|---|---|
| `/play/evolve-hosting/` | [evolve-hosting](https://github.com/anthony-firn/evolve-hosting) | Signed release workspace, static example mirror and Fairground support rail |
| `/play/evolve-llm/` | [evolve-llm](https://github.com/anthony-firn/evolve-llm) | Rust engine compiled to WebAssembly, WGSL kernels on WebGPU; models download from Hugging Face |
| `/play/evolve-inbox/` | [evolve-inbox](https://github.com/anthony-firn/evolve-inbox) | Shared inbox reader with fictional messages; no live mailbox API |
| `/play/emergence/` | emergence `web/` and Rust model crates | Rust `wasm32-unknown-unknown`, no JS runtime dependencies |
| `/play/emergence/cad/` | emergence `web/cad/` + native engineering graph and CAD kernel | Local revisions, WebRTC peer sync, Rust checks and STL export |
| `/play/retirement/` | retirement-research `results/printer_validate.json` | `demos/retirement/` + extracted `data.json` |
| `/play/emberwake/` | emberwake | Godot 4.7.2 web export, no threads |
| `/play/pulse-pop/` | pulse-pop | Expo web export |
| `/play/symmetry-forge/` | symmetry-forge `src/symforge` | `demos/symmetry-forge/` + Pyodide 314.0.7 |
| `/play/fairground/` | fairground `app/` | Vite build of the React app (same code as its iOS and Android apps) |

`python3 tools/build_demos.py [name ...]` clones each project's current `main`, builds it, and records the commit in
`public/play/<name>/BUILD.json`. It needs git, Node.js and `godot4` with the web export templates.
The Emergence lab additionally needs Rust and `rustup target add wasm32-unknown-unknown`.
Its source UI and model adapters live in the public `emergence` repository; the site builder runs that project's `web/build.py`.
The CAD prototype is packaged by that same build. Its branches, merge conflicts and reviews work locally,
across browser tabs, or over manually paired WebRTC data channels. Cloudflare STUN is configured for network discovery; some networks still need a user-supplied TURN relay.
Geometry and prescribed optical heat feed the electrothermal graph, while Mie scattering stays independent.
The workspace also supports primitive parts, revisioned A3 shop drawings, SVG/PDF, analytic DXF profiles and mechanical
parts CSV. General constraints, STEP editing, GD&T and PCB fabrication outputs remain future work. Donations link to
Fairground's existing About/support flow and the same public development fund. See the source repository's
`analysis/collaborative_cad.md` for scope, protocol and validation.
The CAD page also exposes separate PCB and silicon editors. PCB supports illustrative
through-hole footprints, pad nets, explicit top/bottom copper connections, geometric
clearance checks and BOM CSV. Silicon supports rectangular block floorplans, placement
locks, core keepout, spacing halos, requested block-area checks and concept SVG export.
Both save locally with undo/redo and validated JSON files. They do not yet use the
mechanical revision graph or peer connection, and do not produce qualified PCB
fabrication packages or PDK-backed IC sign-off. The homepage and project page link
directly to each workspace and show retained browser screenshots.

For a local game checkout, use `python3 tools/build_demos.py emberwake --local-source /path/to/emberwake`.
Local builds record the base commit, a modified flag and a source-tree hash in `BUILD.json`; a clean clone keeps the usual commit-only provenance.
Emberwake's source contains its branded web shell and icon; the builder selects that shell, extracts its CSS/JS for the site's CSP, and omits unused splash images and editor import metadata.
`/play/*` gets its own Content-Security-Policy (WebAssembly and inline styles) in `public/_headers` and in a matching
Bunny edge rule; the rest of the site keeps the strict policy. Change both together.
`/play/fairground/*` overrides it to also allow connections to Nostr relays (`wss:`), the Algorand indexer and model
host (`https:`) and a local Ollama, and images and video from `https:`. It needs a matching Bunny edge rule too.
Bunny Storage serves unknown extensions as `application/octet-stream`, so a further edge rule sets `text/javascript` for
`*.mjs` (Pyodide's modules); browsers refuse to run module scripts with any other type.

## Evolve LLM

Evolve LLM runs GGUF language models on the visitor's GPU at `/play/evolve-llm/`, with its own
[public repository](https://github.com/anthony-firn/evolve-llm) and `/projects/evolve-llm/` case study.
A Rust engine compiled to WebAssembly drives WebGPU from a module worker. Models download directly from
Hugging Face into the browser's origin-private file system; no model files are hosted here. Models larger
than the visitor's GPU memory read the rest of their weights from that storage while they run.

Rebuild with `python3 tools/build_demos.py evolve-llm --local-source ~/Dev/evolve-llm`. This needs Rust
with `wasm32-unknown-unknown`, `wasm-bindgen-cli` matching the project's `Cargo.lock`, Node.js and Python 3;
`wasm-opt` makes the engine smaller when installed. The build runs the project's tests first; its GPU and
model tests run only when the machine has a GPU and GGUF files in `$EVOLVE_LLM_MODELS`. `BUILD.json`
records the commit and WebAssembly hash.

`public/_headers` gives the app a scoped CSP: `'wasm-unsafe-eval'`, `worker-src 'self'`, and connections
only to `huggingface.co` and its `*.hf.co` download hosts plus, for the opt-in web search, Wikipedia,
`api.duckduckgo.com` and Jina (`r.jina.ai`, `s.jina.ai`). `tools/deploy.py` mirrors it as a Bunny edge rule
through `tools/llm_csp.py`; change both together. On Linux, Chrome exposes WebGPU only with its WebGPU and
Vulkan flags, which the page explains.

## Evolve Jobs

Evolve Jobs is the client-first job-search project at `/play/evolve-jobs/`, with its own
[public repository](https://github.com/anthony-firn/evolve-jobs) and `/projects/evolve-jobs/` overview.
The static browser app performs role, qualification-keyword and annual-pay comparisons with a Rust/WASM
engine, fetches public Lever employer listings directly and can exchange signed public listings over Nostr.
It caches its own assets for offline use; live discovery and applications still need network access.

The downloadable Chromium companion extension stores a private profile and résumé locally and submits
supported Lever forms for explicitly enabled employers. It refreshes jobs from the employer, caps attempts,
keeps duplicate protection and stops on unknown questions, consent controls and CAPTCHA. An optional Node
worker is also available. Neither requires an EvolveTech application backend. Qualification keywords do not
establish eligibility; the project is an early prototype tested on intercepted form fixtures, with no real
applications submitted during development. Donations link to Fairground’s existing shared support flow.

Rebuild with `python3 tools/build_demos.py evolve-jobs --local-source /path/to/evolve-jobs`.
This requires Rust with `wasm32-unknown-unknown`, Node.js 22.13+, Python 3 and Playwright Chromium.
The generated `BUILD.json` pins the source commit. Keep résumés, local profiles and application histories out of
this website repository; only the public site build and extension ZIP belong here.

`public/_headers` adds an app-specific CSP permitting the WASM engine, direct connections to
`https://api.lever.co` and user-selected `wss:` relays. `tools/deploy.py` applies the same policy to a scoped Bunny edge rule before uploading files. It derives
the URL-trigger shape from the existing Fairground policy and updates only the Evolve Jobs rule.
Bunny does not interpret Netlify’s `_headers`.

## Add a project

Evolve Inbox is the standalone open-source version of this site's mail function. Its public demo and project page use only fictional mail. The `/mail` service remains private, with credentials in Netlify and messages in the site-wide `mail` Blobs store. Rebuild the fictional demonstration with `python3 tools/build_demos.py evolve-inbox`, or pass `--local-source /path/to/evolve-inbox` for a local checkout.

The live handler is pinned under `netlify/lib/evolve-inbox/`, including its upstream commit, file hashes, license and backend tests. Update it from a committed checkout with `python3 tools/sync_inbox.py --source /path/to/evolve-inbox`, then run `npm ci` and `node --test netlify/lib/evolve-inbox/test/inbox.test.mjs`. The sync command copies only an explicit allowlist of committed code, tests and license files. The function keeps the existing `mail` store and credentials, with EvolveTech branding and domain defaults. Production deployment and public-site checks run the backend tests before publishing.

Create `public/projects/<slug>/index.html`, add a directory entry on the homepage and update `public/sitemap.xml`.
Give the project a truthful status and link to its own repository or live service when available.
Do not add invented projects as placeholders. Keep personal data, market-data caches and signed application packages out of this website repo.

## References

- [Bunny DNS records and apex flattening](https://bunny.net/docs/dns/records)
- [Bunny custom certificates](https://bunny.net/docs/cdn/ssl-setup)
- [Netlify HTTPS and custom certificates](https://docs.netlify.com/manage/domains/secure-domains-with-https/https-ssl/)
- [Lego Bunny DNS validation](https://go-acme.github.io/lego/dns/bunny/)
- [GitHub scheduled-workflow limitations](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)
- [Cloudflare Pages custom-domain reactivation limitations](https://developers.cloudflare.com/pages/configuration/custom-domains/)

## Fairground banking integration

Fairground now uses Meld for server-created card/bank checkout sessions. Its wallet still signs Algorand transfers
on the device. The Netlify edge function calls Meld directly; old `PAYMENTS_ORIGIN` and `PAYMENTS_PROXY_SECRET`
settings are no longer used for this website. Buying/selling stays disabled until the private Meld credentials,
approved suppliers and exact Algorand currency IDs are configured. The app's first purchase requests ALGO for setup;
subsequent purchases request native Algorand USDC. No account backup or private wallet key is part of checkout.

Server settings: `MELD_PAYMENTS_ENABLED`, `MELD_API_KEY`, `MELD_BUY_PROVIDER`, `MELD_SELL_PROVIDER`,
`MELD_ALGO_CURRENCY_CODE`, `MELD_USDC_CURRENCY_CODE`, `MELD_SELL_PAYMENT_METHOD`, and optional
`MELD_CHECKOUT_ORIGINS`. Keep the API key in private Netlify environment settings. The public wallet reports only
availability and environment. Optional `PAYMENTS_PILOT_IP` still limits banking to one client IP during a private pilot. Missing configuration disables checkout. Supplier eligibility and working sandbox/
production credentials still need confirmation with Meld. No live provider calls or infrastructure teardown are
performed by the build.

After changing Fairground source, run its tests, then synchronize both generated outputs together:

```sh
python3 tools/sync_fairground.py --source /path/to/fairground
node --test tools/test_fairground_edge.mjs
python3 tools/check_site.py
```

The sync copies only public build outputs and the license and records file hashes and local source provenance.
See the source repository's `docs/meld-integration.md` for the API flow, sandbox setup and deployment requirements.

The wallet and donation dialogs also provide **Transfer crypto I already own**, with Coinbase/Kraken instructions,
copyable receiving addresses and Algorand QR links. New wallets receive ALGO first and show USDC readiness after opt-in;
active wallets accept native Algorand USDC. External wallets can pay a filled payment request directly. Shared-note
payments require their exact transaction ID rather than automatically crediting another donor's recent transfer.
The source guide is `fairground/docs/crypto-transfers.md`; these paths do not require Meld credentials.

## Probate form helpers

`/play/probate/` explains the two petition routes and links to DE-111, DE-221, DE-226, DE-120 and DE-135.
The companion helpers are maintained in [`demos/probate/`](demos/probate/README.md). Build them with
`python3 demos/probate/build.py` and run `node --test demos/probate/tests/*.test.mjs` before publishing.
They use official PDF templates and browser-only answer storage; no personal case information is bundled.
The separate petition sources remain in `~/Dev/de111` and `~/Dev/de221` and are rebuilt using `tools/build_demos.py`
with `--local-source`. Do not edit only the copies in `public/play/`; those are generated outputs.


## Developer kits

The public quickstarts live at `/developers/`, with executable fictional inbox
examples and a same-origin LLM runtime example. SDK downloads are npm-compatible
tarballs or static runtime ZIPs; no package-registry publication is claimed.
`public/developers/downloads/manifest.json` records file sizes, SHA-256 checksums
and source commits. The LLM artifact separately records its reused engine commit.

Regenerate from clean, committed checkouts:

```sh
python3 tools/sync_developer_kits.py --inbox-source /path/to/evolve-inbox --llm-source /path/to/evolve-llm
python3 tools/build_developer_pages.py
python3 tools/build_pages.py
python3 tools/check_site.py
```

The sync copies only an explicit SDK allowlist and identified runtime files. It
never reads mailbox settings or private messages. The live inbox handler remains
pinned independently under `netlify/lib/evolve-inbox/`.
