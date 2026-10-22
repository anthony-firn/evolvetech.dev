# evolvetech.dev

The public EvolveTech project hub. Different projects share a front door, not a codebase or a deployment.
Retirement Research is the first project overview; its private household tooling and research datasets are not in this repository.

Buildless HTML and CSS. No package installation, framework, runtime backend, analytics or external fonts.
Original website code and copy use Apache-2.0. Individual projects document their own licenses.

## Preview and check

```sh
python3 tools/check_site.py
python3 -m http.server 8080 --directory public
```

Open http://localhost:8080. Public assets are all under `public/`.

## Cloudflare Pages

In **Workers & Pages → Create application → Continue to Pages → Import an existing Git repository**, select this repository.

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Framework preset | None |
| Build command | Leave blank |
| Build output directory | `public` |
| Root directory | Leave blank |

Deploy and test the `.pages.dev` URL before connecting the custom domain.
The canonical hostname is **evolvetech.dev**, without `www`. Keep the domain registered at Namecheap and authoritative DNS at Bunny.
Cloudflare Pages requires Cloudflare nameservers for an apex custom domain, so use the existing `.pages.dev` address as an independent mirror.
Do not move nameservers to Cloudflare to activate the bare domain. Use Netlify as the primary apex host, as described below.
This is not automatic same-domain failover: an apex-capable fallback or additional routing still needs separate design and validation.

## Netlify

Import this repository. `netlify.toml` selects `public/`; no build command is needed.
Deploy the identical commit to both providers. Add `evolvetech.dev` under Netlify Domain management and follow its external-DNS verification instructions in Bunny.
Netlify supports apex domains with external DNS; use the DNS record target shown for the actual site and verify TLS before calling it live.
Health-based routing is not configured by this repository. A working provider-address mirror does not guarantee automatic failover on the bare domain.
Cloudflare Pages also documents domain-reactivation behavior after DNS is switched away and back.

No hosting credentials or DNS automation keys belong in Git. A public source repository does not by itself mean the site is live.

## Add a project

Create `public/projects/<slug>/index.html`, add a directory entry on the homepage and update `public/sitemap.xml`.
Give the project a truthful status and link to its own repository or live service when available.
Do not add invented projects as placeholders. Keep personal data, market-data caches and signed application packages out of this website repo.

## References

- [Cloudflare Pages Git integration](https://developers.cloudflare.com/pages/get-started/git-integration/)
- [Pages custom domains and reactivation limitations](https://developers.cloudflare.com/pages/configuration/custom-domains/)
- [Netlify external DNS and apex domains](https://docs.netlify.com/manage/domains/configure-domains/configure-external-dns/)
- [Namecheap nameservers](https://www.namecheap.com/support/knowledgebase/article.aspx/767/10/how-to-change-dns-for-a-domain/)
