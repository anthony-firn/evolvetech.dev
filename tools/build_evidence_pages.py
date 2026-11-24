"""Render two engineering case studies using the existing site template."""
from pathlib import Path
from build_pages import HEAD, ROOT, section
from build_legal import NAV, STYLE

REPO = 'https://github.com/anthony-firn/evolvetech.dev'

def flow(title, steps, note):
    return '<figure class="evidence-diagram"><figcaption>'+title+'</figcaption><ol class="evidence-flow">'+''.join('<li>'+s+'</li>' for s in steps)+'</ol><p>'+note+'</p></figure>'

PAGES = [
    dict(slug='campaign-data', title='Keeping campaign data complete', poster='og.png',
         label='Production work · TypeScript · Firestore · BigQuery',
         description='A production campaign-data mirror: resumable scans, missing-record repair and a completeness gate. A dated incident and a synthetic replay explain the decisions.',
         lede='At True Native Media I build and operate the integrations behind a podcast advertising workspace. One difficult failure involved data that existed in Airtable but had not reached the campaign view. Here is how I investigated it and changed the repair path.',
         demo='#incident', demo_text='Read the incident', repo=REPO+'/blob/main/examples/campaign-freshness.py',
         media=flow('The read path and the separate write path', ['Airtable<br><small>source records</small>', 'Pub/Sub workers<br><small>paginated scans and repair</small>', 'Firestore<br><small>operational mirror</small>', 'BigQuery<br><small>exports and flat views</small>'], 'Portal edits follow a separate Firestore-first outbox that patches approved Airtable fields. This is not unrestricted three-way synchronization.'),
         status='Production system; explanation checked against October 2026 engineering records', license='Production implementation private; example in the website repository', stack='TypeScript / Node.js, Google Cloud Functions, Pub/Sub, Firestore, BigQuery',
         sections=[
             section('My contribution', 'I lead the integration work and production operations. The mirror uses scheduled publishers, resumable workers and stored pagination offsets. Retries for rate limits and transient errors use backoff and provider retry guidance. Schema checks compare stable table and field IDs and record additions, removals and type changes.', 'A diagnostic run on October 5, 2026 scanned 35 tables and 88,163 records. The main mirror ran every 30 minutes. Those are dated observations, not a current capacity or throughput benchmark. The mirror is TypeScript; Python is used elsewhere in the campaign-planning platform.'),
             '<section id="incident"><h2>October 5: a current parent, missing children</h2><p>A campaign confirmation could fail even when its source records existed. New child records were waiting in the synchronization queue. An unchanged parent did not guarantee that all of its referenced children had arrived.</p><p>The correction checks for missing children even when the parent content has not changed and queues a repair. The confirmation path continues rejecting incomplete campaigns instead of silently leaving records out.</p></section>',
             section('Why bounded priority', 'The worker reserves up to eight urgent slots in a normal batch of 32, preserving room for ordinary work. Urgent checks also run between webhook pages. Repair gets a chance to run while the ordinary backlog still makes progress.', 'Stored cursors advance only after durable queue batches have been saved. A later-batch failure leaves the source replayable. A completed scan is distinguished from a partially fetched page; it is not safe to treat every recent timestamp as proof of completeness.'),
             section('What I checked', 'The retained deployment record includes a source-archive hash check and checks that the intended worker configuration was preserved. Three observed batches completed 32 of 32 items, and all five affected records were subsequently verified in the operational mirror and campaign projection.', 'That establishes recovery for the observed incident. It does not establish whole-base parity, a cross-table transaction or sustained backlog throughput. Priority queries add bounded reads; I am not claiming a measured cost saving.'),
             section('A small replay you can inspect', '<a href="/evidence/campaign-freshness.py">Download the standard-library Python example</a>, or <a href="'+REPO+'/blob/main/examples/campaign-freshness.py">read its source</a>. Run <code>python3 campaign-freshness.py</code>. It asserts that an unchanged parent with a missing child cannot be confirmed, schedules repair, preserves ordinary queue capacity and allows confirmation after a synthetic provider response.', 'The example is an in-memory explanation written for this case study. It contains invented identifiers, no customer data and none of the private worker implementation. It is not an exported production record or a performance test.'),
             section('What remains private', 'Customer records, internal logs, credentials and the production repositories are not published here. The public explanation intentionally omits account and record identifiers. The separate <a href="/projects/site-delivery/">website delivery case study</a> has public implementation links and regression checks.'),
         ]),
    dict(slug='site-delivery', title='Shipping the same site to two CDNs', poster='og.png',
         label='Delivery engineering · Python · GitHub Actions · AWS Lambda',
         description='Independent CDN copies, HTTPS health probes and DNS failover, with two real deployment failures, source links and regression checks.',
         lede='I wanted this site to stay available when one hosting provider failed. GitHub Actions publishes the same static files to Netlify and Bunny. A separate monitor checks each provider and changes DNS when the primary remains unhealthy. Two failures showed why copying files was only part of the job.',
         demo='#module-failure', demo_text='See the deployment bugs', repo=REPO,
         media=flow('Delivery and recovery are separate operations', ['GitHub Actions<br><small>checks and static artifacts</small>', 'Netlify + Bunny<br><small>independent copies</small>', 'Lambda probes<br><small>real hostname and TLS</small>', 'Bunny DNS + Route 53<br><small>shared routing decision</small>'], 'The monitor runs every minute. Three failed checks are required before switching to a healthy standby; normal recovery waits for ten minutes of healthy checks.'),
         status='Live website; controlled failover recorded October 22, 2026', license='Apache 2.0', stack='Python, GitHub Actions, AWS Lambda, Netlify, Bunny CDN, Route 53',
         sections=[
             section('What I own', 'The deploy scripts, provider configuration, monitor, certificate automation and verification checks live in the public website repository. I use AI coding agents for implementation and tests; I choose the operational constraints and review what is actually exercised.', 'The standby has its own storage origin. DNS routing does not depend on one provider proxying the other. Certificate renewal runs separately from traffic switching.'),
             '<section id="module-failure"><h2>Same files, different module behavior</h2><p>JavaScript modules loaded from Netlify but failed on the standby. Bunny Storage served <code>.mjs</code> files as <code>application/octet-stream</code>; browsers require a JavaScript content type for modules.</p><p>I configured a CDN edge rule for <code>text/javascript</code> and documented it in the deployment instructions. Identical bytes alone had not established equivalent browser behavior. The new read-only delivery check verifies a representative module on both providers after deployment.</p><p><a href="'+REPO+'/commit/bb0dfadedf89c6a7ffc729f5f87a2bb084b2a8ca">Deployment note documenting the MIME rule</a></p></section>',
             section('The redesign that disabled failover', 'The monitor expected the homepage to contain “Useful projects.” A redesign removed that sentence, so both healthy copies were classified as unavailable and failover could not act. I changed the marker to the page title.', '<a href="'+REPO+'/commit/dec03f3f79ec56f071575ce5009b82e1e66b863b">Source diff and failure description</a>. The local checks now compare the real homepage with the monitor contract. A regression also exercises a page without the old marketing sentence. The title marker is still a coupling; a future title change must update the contract.'),
             section('What was exercised', 'On October 22, a controlled primary-failure simulation changed the real DNS target to Bunny, and the site was observed serving there over HTTPS. Normal monitoring held the backup route through the configured recovery period and restored the primary. The record also checked matching hashes for eight public files on each provider.', '<a href="'+REPO+'/blob/main/HOSTING-VERIFICATION.md">Dated verification record</a> · <a href="'+REPO+'/blob/main/tools/test_monitor.py">Routing tests</a>. This was a controlled routing drill, not an independently observed provider outage or a global availability measurement.'),
             section('Run the checks', '<pre><code>git clone https://github.com/anthony-firn/evolvetech.dev\ncd evolvetech.dev\npython3 tools/verify_portfolio.py\n\n# Optional: read-only HTTPS probes, no provider credentials\npython3 tools/check_delivery.py --live</code></pre>', 'The local command checks internal links, sitemap and metadata, routing decisions, the homepage marker, module MIME regression and the synthetic campaign-repair example. The live command checks the hostname, certificate, homepage, health document and one representative module on each provider. It makes no DNS changes.', '<a href="'+REPO+'/blob/main/tools/check_delivery.py">Delivery checks</a> · <a href="'+REPO+'/blob/main/.github/workflows/hosting.yml">Deployment workflow</a>'),
             section('Measurements and limits', 'There is no measured build-time improvement or uptime percentage on this page. The <a href="/evidence/portfolio-checks.json">dated local check record</a> identifies the commands, machine and elapsed times; those times are not cloud deployment timings.', 'DNS caches, scheduler gaps, shared domain configuration and provider control-plane failures remain dependencies. The live probe covers representative paths, not every asset or region. This website demonstrates ownership of a small delivery system, not experience operating a large CI runner fleet.', 'For another inspectable backend change, <a href="/projects/evolve-inbox/#postgres">Evolve Inbox now has an optional PostgreSQL storage path</a>, with concurrency and interrupted-transaction checks.'),
         ]),
]


def main():
    for page in PAGES:
        text = HEAD.format(**{**page, 'sections': '\n'.join(page['sections'])})
        if page['slug'] == 'campaign-data':
            text = text.replace('>Source on GitHub ↗<', '>Public replay source ↗<')
            text = text.replace('Built with AI coding agents, which wrote most of the code and tests.', 'Production code remains private. The public replay is synthetic; AI coding tools helped prepare this explanation and example.')
        text = text.replace('<link rel="stylesheet" href="/assets/v2/style.css">', '<link rel="stylesheet" href="/assets/v2/style.css">\n  <link rel="stylesheet" href="/assets/v2/evidence.css">')
        text = text.replace('<p><pre>', '<pre>').replace('</pre></p>', '</pre>')
        text = text.replace('</head>', STYLE+'\n</head>', 1).replace('</body>', NAV+'\n</body>', 1)
        path = ROOT / 'projects' / page['slug'] / 'index.html'
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text)
    out = ROOT / 'evidence'; out.mkdir(exist_ok=True)
    (out / 'campaign-freshness.py').write_bytes((Path(__file__).resolve().parents[1] / 'examples/campaign-freshness.py').read_bytes())


if __name__ == '__main__':
    main()
