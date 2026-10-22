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
The planned canonical hostname is **www.evolvetech.dev**, because Pages supports external DNS on a subdomain.
Keep the domain registered at Namecheap and authoritative DNS at Bunny. Do not move nameservers to Cloudflare.
Add `www.evolvetech.dev` in the Pages custom-domain settings before adding the DNS CNAME pointing to the actual project address.
The bare domain needs its own HTTPS-capable redirect to `www`; DNS alone cannot perform an HTTP redirect.

## Netlify

Import this repository. `netlify.toml` selects `public/`; no build command is needed.
Deploy the identical commit to both providers. Configure and validate hostname ownership and TLS on both providers before failover.
Health-based routing is not configured by this repository. Test failure and recovery before relying on it.
Cloudflare Pages documents domain-reactivation behavior after DNS is switched away and back; verify it for the intended setup.

No hosting credentials or DNS automation keys belong in Git. A public source repository does not by itself mean the site is live.

## Add a project

Create `public/projects/<slug>/index.html`, add a directory entry on the homepage and update `public/sitemap.xml`.
Give the project a truthful status and link to its own repository or live service when available.
Do not add invented projects as placeholders. Keep personal data, market-data caches and signed application packages out of this website repo.

## References

- [Cloudflare Pages Git integration](https://developers.cloudflare.com/pages/get-started/git-integration/)
- [Pages custom domains and reactivation limitations](https://developers.cloudflare.com/pages/configuration/custom-domains/)
- [Namecheap nameservers](https://www.namecheap.com/support/knowledgebase/article.aspx/767/10/how-to-change-dns-for-a-domain/)
