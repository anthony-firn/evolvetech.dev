# Hosting verification — 2026-10-22 UTC

Production: https://www.evolvetech.dev

- Both CDN endpoints passed HTTPS validation using the public hostname and SNI.
- All eight public files matched local SHA-256 hashes on both providers (16 comparisons); Netlify's optional injected badge was disabled.
- Both providers returned a permanent apex-to-www redirect, preserving the retirement page path and query string.
- A controlled primary-failure simulation changed the real Bunny DNS CNAME from Netlify to Bunny. The site was observed serving over HTTPS from Bunny.
- Subsequent real HTTPS checks held the backup route for the configured ten-minute recovery period. The normal monitor then restored the Netlify DNS target, without changing certificates or reactivating a custom domain. The recovery timer was not shortened for the test.
- Six routing tests covered failure, both-host failure, sustained recovery, flapping, monitoring gaps, and an unhealthy backup.
- [Production deployment](https://github.com/anthony-firn/evolvetech.dev/actions/runs/39734668612), [GitHub monitor](https://github.com/anthony-firn/evolvetech.dev/actions/runs/39734920594), and [certificate job](https://github.com/anthony-firn/evolvetech.dev/actions/runs/39735031729) passed.
- The certificate job successfully assumed the repository-restricted AWS role, accessed the private certificate-state object, checked renewal eligibility, and installed certificates on both CDNs. A future date-triggered renewal has not yet occurred; initial DNS-01 issuance was exercised during setup.
- Anonymous access to the certificate-state S3 object returned 403. All four S3 public-access blocks are enabled. The GitHub role grants only GetObject/PutObject for this specific private object and trusts the repository's immutable GitHub identity on `main`.
- CloudFront was blocked by AWS account verification. Its unused S3 website bucket, WAF, certificate, function, and origin access control were removed. AWS retains only the private certificate-state storage and authentication configuration.

This verifies the configured paths and switching behavior, not every outage scenario or geographic region. Scheduling delays, DNS caching, GitHub's 60-day repository-inactivity rule, provider billing limits, and Bunny DNS/API availability remain limitations documented in README.md.

At setup, Bunny had $20 trial credit and $0 paid balance. Funding is needed before the trial ends. No payment method was added or account credit purchased during setup.
