# Cloudflare preview repair

The Cloudflare Pages check on PR #7 also fails on the base main commit. The saved Wrangler OAuth session
expired and cannot refresh; the available dashboard browser session is signed out. Provider logs remain unavailable, but repository-driven builds can still be retried through a push.
Do not report the external check as fixed until its actual result is green.

A local deployment blocker is confirmed: `public/play/emberwake/index.wasm` is 39,514,754 bytes, above
[Pages' 25 MiB asset limit](https://developers.cloudflare.com/pages/platform/limits/).
The new build helper creates a separate `.cloudflare/public` tree and compresses that module to
10,054,758 bytes in a gzip static asset. A generated Pages route stream-decodes it and returns
`Content-Type: application/wasm` at the original URL. Directly labeling the stored gzip file with a
Content-Encoding header was rejected after Wrangler showed that it caused double encoding. Unsupported oversized formats fail explicitly.

Pages [combines headers from matching rules](https://developers.cloudflare.com/pages/configuration/headers/).
The existing broad CSP and game-specific CSP would therefore both apply. The helper inserts explicit
header detaches before replacements so the more specific game policy can permit WASM as intended.
The Bunny/Netlify source tree and original asset remain intact.

Validated locally:

- Five Python regression tests and three worker stream tests cover source preservation, exact gzip round trips, managed output replacement,
  refusing unsupported large files without replacing a valid output, header-detach generation and removal of the unsupported Netlify-only host redirect.
- A browser smoke test loads Proof from the generated tree under the effective Pages header rules.
- The browser fetches the original Emberwake URL, receives 39,514,754 decoded bytes,
  matches their SHA-256 against the source, and accepts them through WebAssembly.validate.

The repository-only activation path keeps Pages' existing `public/` output setting. Cloudflare injects
CF_PAGES, CF_PAGES_COMMIT_SHA, CF_PAGES_BRANCH and CF_PAGES_URL into its build environment. A guarded
npm postinstall hook requires all four, builds the separate tree, preserves the source under `.cloudflare/`,
and promotes the prepared tree into `public/` only in that ephemeral provider checkout. Normal installs,
Netlify and GitHub Actions do not alter the source. This avoids requiring a dashboard change to fix the
check, provided the project uses normal npm dependency installation.

The actual Wrangler Pages runtime compiled the generated worker and served Proof correctly. Its WASM
response passed browser decoding, byte count, SHA-256 and WebAssembly validation. The runtime also parses
the resulting header/redirect rules without the unsupported Netlify host redirect warning.

A Git push tests the existing integration. If the check still fails, restored Cloudflare login is needed to
read the build logs and inspect dependency-install/output settings. No credentials are stored in this
repository and no account settings were changed.
