# Cloudflare preview repair

The Cloudflare Pages check on PR #7 also fails on the base main commit. The saved Wrangler OAuth session
expired and cannot refresh; the available dashboard browser session is signed out. Until login is restored,
provider logs, current build settings and a retry cannot be verified. Do not report the external check as fixed.

A local deployment blocker is confirmed: `public/play/emberwake/index.wasm` is 39,514,754 bytes, above
[Pages' 25 MiB asset limit](https://developers.cloudflare.com/pages/platform/limits/).
The new build helper creates a separate `.cloudflare/public` tree and compresses that module to
10,054,758 bytes at the same URL. `Content-Encoding: gzip` makes the browser receive the original module;
`Content-Type: application/wasm` preserves WASM loading. Unsupported oversized formats fail explicitly.

Pages [combines headers from matching rules](https://developers.cloudflare.com/pages/configuration/headers/).
The existing broad CSP and game-specific CSP would therefore both apply. The helper inserts explicit
header detaches before replacements so the more specific game policy can permit WASM as intended.
The Bunny/Netlify source tree and original asset remain intact.

Validated locally:

- Four regression tests cover source preservation, exact gzip round trips, managed output replacement,
  refusing unsupported large files without replacing a valid output, and header-detach generation.
- A browser smoke test loads Proof from the generated tree under the effective Pages header rules.
- The browser fetches the encoded Emberwake module, receives the original 39,514,754 decoded bytes,
  matches their SHA-256 against the source, and accepts them through WebAssembly.validate.

After `npx wrangler@4 login` succeeds:

1. Read project `evolvetech-dev` in account `a0d91b4219b29c6b6f6dec2444a2efa0` and the failed deployment
   logs. Confirm whether the oversized asset was the reported failure; resolve any additional errors.
2. Set its build command to `python3 tools/build_cloudflare.py` and output directory to `.cloudflare/public`.
   Preserve the existing branch, environment, domain and binding settings. The helper must be present on
   every branch that uses these settings, including main, before claiming production builds are repaired.
3. Retry the latest `proof-v2` deployment for the actual PR head. Wait for both the provider deployment and
   its GitHub check to succeed; fetch the preview's WASM and Proof page to verify real response headers.

The authenticated API endpoints are documented in [Cloudflare's Pages API](https://developers.cloudflare.com/api/resources/pages/).
No credentials are stored in this repository. No provider settings have been changed yet.
