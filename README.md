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

- **Namecheap** remains the registrar; **Bunny** is authoritative DNS.
- **Netlify** is the primary CDN with its own deployed files, on the Free plan (credit limits apply).
- **Bunny CDN + Bunny Storage** holds an independently uploaded copy.
- `hosting.json` contains resource identifiers and DNS targets, never credentials.
- **Cloudflare Pages** remains an optional provider-address mirror; it is outside the failover path.

Pushes to `main` run `tools/deploy.py`, uploading the same static directory to both providers. No Node dependencies or application build are needed.
GitHub Actions holds encrypted provider credentials. Pull request checks do not receive them. A failed deployment is visible in Actions; uploads to two different providers are not atomic.
The Bunny storage origin is independent of Netlify. Private household applications and retirement APIs are outside this static hosting setup.

### Automatic failover

The hosting workflow schedules `tools/monitor.py --apply` approximately every five minutes. It checks both CDN endpoints directly using the real website hostname for TLS/SNI validation, plus the homepage and an uncached health file. It never follows public DNS to accidentally check only the active provider.

Three primary failures within a run cause a switch to Bunny only if Bunny passes its checks. Both failures preserve the last DNS target and fail the workflow. Recovery requires ten minutes of observed primary health; a failure resets that period. A monitoring gap longer than fifteen minutes also resets recovery. A failed backup permits immediate return to a healthy primary.

Only the `www` CNAME changes; the apex CNAME follows it through Bunny's flattening. TTL is 60 seconds. A compact recovery timestamp is stored in the record comment so the monitor needs no server or database. Unknown/manual DNS targets are preserved.

**Timing limits:** GitHub scheduled jobs can be delayed or dropped, and some resolvers retain DNS answers beyond TTL. GitHub also automatically disables scheduled workflows in public repositories after 60 days without repository activity; this must be checked if the project becomes inactive. Switching is automatic while the workflow is enabled, but has no guaranteed recovery time. This low-cost arrangement can leave visitors affected for minutes. The monitor runs from one GitHub runner location; it is not multi-region consensus monitoring. For unattended operation on an inactive repository or a strict recovery target, replace the schedule with a dedicated independent monitoring service.

Bunny DNS remains a shared dependency. The monitor needs Bunny's API to update DNS. Adding a second authoritative DNS provider is a separate project, requiring synchronized zones and a tested routing policy; adding unrelated nameservers alone does not provide that.

### HTTPS renewal while on standby

Both CDNs receive custom Let's Encrypt certificates issued through **DNS-01**, independently of traffic routing. The daily certificate job uses the pinned Lego ACME client, keeps the account and private keys in a private, encrypted S3 object, renews when due, then installs on both providers. Private keys are never uploaded as GitHub artifacts or caches or placed in website storage.

AWS is used only for this small private certificate-state object. GitHub assumes a role restricted to this repository's `main` branch using OIDC; no long-lived AWS keys are stored in GitHub. CloudFront account verification blocked the original hosting design, so CloudFront and its unused resources were removed.

The private state bucket is not a website origin and is not exposed by either CDN. An AWS or GitHub outage can delay renewal, though an already installed unexpired certificate continues working. Check failed daily jobs and certificate expiration alerts. DNS-01 validation and provider installation have been exercised; future unattended renewal still needs continued observation.

### Checks and operations

```sh
python3 tools/check_site.py
python3 tools/test_monitor.py
# Credentials supplied through environment, not command-line arguments:
python3 tools/monitor.py                       # read-only probe and decision
python3 tools/monitor.py --apply               # persist routing decision
python3 tools/monitor.py --simulate-primary-failure --apply  # controlled drill
```

The controlled drill sends real visitors to the backup and resets recovery. Run only when both copies pass HTTPS checks. Later normal monitor runs restore the primary after the recovery interval. Disable the hosting workflow before a manual DNS override that must remain in place.

Deploy, monitor, and certificate jobs can also be run from **GitHub Actions → Deploy and monitor hosting → Run workflow**. GitHub workflow notifications report failed checks; configure your account's notification preferences to receive them. No independent paging service is configured.

To reproduce this hosting arrangement in another account, create a Netlify site, Bunny Storage/Pull Zone and DNS zone; add both hostnames to both CDNs; issue DNS-validated certificates; configure the equivalent redirect, security header, HTTPS and health-cache rules; update `hosting.json`; set `BUNNY_API_KEY`, `NETLIFY_AUTH_TOKEN`, and `ACME_EMAIL` as GitHub secrets; create a private S3 certificate-state object and repository-restricted OIDC role. Update the role in the certificate workflow. Bootstrap certificates before changing website DNS.

## Browser demos

| Path | Source | Built with |
|---|---|---|
| `/play/evolve-inbox/` | [evolve-inbox](https://github.com/anthony-firn/evolve-inbox) | Shared inbox reader with fictional messages; no live mailbox API |
| `/play/emergence/` | emergence `web/` and Rust model crates | Rust `wasm32-unknown-unknown`, no JS runtime dependencies |
| `/play/retirement/` | retirement-research `results/printer_validate.json` | `demos/retirement/` + extracted `data.json` |
| `/play/emberwake/` | emberwake | Godot 4.7.2 web export, no threads |
| `/play/pulse-pop/` | pulse-pop | Expo web export |
| `/play/symmetry-forge/` | symmetry-forge `src/symforge` | `demos/symmetry-forge/` + Pyodide 314.0.7 |
| `/play/fairground/` | fairground `app/` | Vite build of the React app (same code as its iOS and Android apps) |

`python3 tools/build_demos.py [name ...]` clones each project's current `main`, builds it, and records the commit in
`public/play/<name>/BUILD.json`. It needs git, Node.js and `godot4` with the web export templates.
The Emergence lab additionally needs Rust and `rustup target add wasm32-unknown-unknown`.
Its source UI and model adapters live in the public `emergence` repository; the site builder runs that project's `web/build.py`.
`/play/*` gets its own Content-Security-Policy (WebAssembly and inline styles) in `public/_headers` and in a matching
Bunny edge rule; the rest of the site keeps the strict policy. Change both together.
`/play/fairground/*` overrides it to also allow connections to Nostr relays (`wss:`), the Algorand indexer and model
host (`https:`) and a local Ollama, and images and video from `https:`. It needs a matching Bunny edge rule too.
Bunny Storage serves unknown extensions as `application/octet-stream`, so a further edge rule sets `text/javascript` for
`*.mjs` (Pyodide's modules); browsers refuse to run module scripts with any other type.

## Add a project

Evolve Inbox is the standalone open-source version of this site's mail function. Its public demo and project page use only fictional mail. The `/mail` service remains private, with credentials in Netlify and messages in the site-wide `mail` Blobs store. Rebuild the fictional demonstration with `python3 tools/build_demos.py evolve-inbox`, or pass `--local-source /path/to/evolve-inbox` for a local checkout.

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
