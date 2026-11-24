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
         description='How I tracked down a campaign that would not confirm while its records sat in a sync queue, and the repair path I built. Includes a small replay you can run.',
         lede='At True Native Media I build and run the integrations behind our podcast advertising workspace. In October a campaign wouldn’t confirm even though all of its records were in Airtable. This is what was going on and what I changed.',
         demo='#incident', demo_text='Read the incident', repo=REPO+'/blob/main/examples/campaign-freshness.py',
         media=flow('The read path and the separate write path', ['Airtable<br><small>source records</small>', 'Pub/Sub workers<br><small>paginated scans and repair</small>', 'Firestore<br><small>operational mirror</small>', 'BigQuery<br><small>exports and flat views</small>'], 'Edits made in the portal take a different route: they go to Firestore first, then an outbox patches only the Airtable fields it’s allowed to change.'),
         status='In production; written from my October 2026 incident notes', license='Production code private; the replay is in the website repository', stack='TypeScript / Node.js, Google Cloud Functions, Pub/Sub, Firestore, BigQuery',
         sections=[
             section('What I built', 'I lead the integration work and run it in production. Scheduled publishers start workers that save their pagination offsets, so an interrupted scan picks up where it stopped. Rate limits and transient errors are retried with backoff, following the provider’s retry hints. Schema checks compare stable table and field IDs and record any field that was added, removed or changed type.', 'For scale: a diagnostic run on October 5, 2026 scanned 35 tables and 88,163 records, and the main mirror ran every 30 minutes. The mirror is TypeScript. Other parts of the campaign-planning platform are Python.'),
             '<section id="incident"><h2>October 5: the parent was current, the children weren’t</h2><p>A campaign’s confirmation failed even though its source records existed. The new child records were sitting in the sync queue, and because the parent record hadn’t changed, nothing went looking for them.</p><p>The fix checks for missing children whether or not the parent changed, and queues a repair when it finds a gap. Confirmation still refuses an incomplete campaign. I’d rather it fail loudly than confirm a campaign with records missing.</p></section>',
             section('Why repairs get a quarter of the queue', 'Each normal batch of 32 reserves up to eight slots for urgent repairs, and urgent checks also run between webhook pages. A repair gets through quickly without starving the regular backlog.', 'Cursors only move forward after a batch is safely in the queue, so if a later batch fails, the source can be replayed. The worker also tracks whether a scan actually finished or only fetched part of a page. A recent timestamp on its own doesn’t prove nothing is missing.'),
             section('How I confirmed the fix', 'The deploy record checks the source archive’s hash and that the worker configuration came through intact. After the deploy, three batches each completed 32 of 32 items, and all five affected records showed up in the mirror and in the campaign view.', 'That closed this incident. It doesn’t prove the whole base is in sync, and I haven’t load-tested the backlog.'),
             section('Run the replay', '<a href="/evidence/campaign-freshness.py">Download the Python example</a> (standard library only) or <a href="'+REPO+'/blob/main/examples/campaign-freshness.py">read its source</a>, then run <code>python3 campaign-freshness.py</code>. It replays the incident: a missing child blocks confirmation even though the parent is unchanged, the repair is scheduled without crowding out ordinary work, and confirmation goes through once a fake provider response arrives.', 'It’s a short in-memory model written for this page, with made-up IDs. None of the production worker code or customer data is in it.'),
             section('Code you can read', 'The production repositories are private, along with customer records and logs, so this page leaves out account and record IDs. For a write-up where all of the code is public, see <a href="/projects/site-delivery/">shipping this site to two CDNs</a>.'),
         ]),
    dict(slug='site-delivery', title='Shipping the same site to two CDNs', poster='og.png',
         label='Delivery engineering · Python · GitHub Actions · AWS Lambda',
         description='This site runs on two CDNs with DNS failover between them. Two bugs I hit setting it up, and the checks that now catch them.',
         lede='I wanted this site to stay up if a hosting provider went down. GitHub Actions publishes the same static files to Netlify and Bunny, and a separate monitor checks each one and switches DNS if the primary stays unhealthy. Copying the files turned out to be the easy part.',
         demo='#module-failure', demo_text='See the deployment bugs', repo=REPO,
         media=flow('Delivery and recovery are separate operations', ['GitHub Actions<br><small>checks and static artifacts</small>', 'Netlify + Bunny<br><small>independent copies</small>', 'Lambda probes<br><small>real hostname and TLS</small>', 'Bunny DNS + Route 53<br><small>shared routing decision</small>'], 'The monitor runs every minute. It switches after three failed checks, and only to a healthy standby. Switching back waits for ten healthy minutes.'),
         status='Live; failover drill run October 22, 2026', license='Apache 2.0', stack='Python, GitHub Actions, AWS Lambda, Netlify, Bunny CDN, Route 53',
         sections=[
             section('What I’m responsible for', 'All of it is in the public website repository: the deploy scripts, provider settings, the monitor, certificate renewal and the checks. AI coding agents wrote much of the implementation and tests. I set the constraints and review what actually runs.', 'The standby has its own storage, and neither CDN proxies the other. Certificates renew on their own schedule, whichever CDN is serving traffic.'),
             '<section id="module-failure"><h2>Same files, broken modules</h2><p>The browser demos loaded fine from Netlify and failed on the standby. Bunny Storage was serving <code>.mjs</code> files as <code>application/octet-stream</code>, and browsers won’t run a module with that content type.</p><p>I added a Bunny edge rule that serves them as <code>text/javascript</code> and wrote it into the deployment instructions. After every deploy, a read-only check fetches a module from each provider and checks its content type.</p><p><a href="'+REPO+'/commit/bb0dfadedf89c6a7ffc729f5f87a2bb084b2a8ca">Deployment note documenting the MIME rule</a></p></section>',
             section('The redesign that switched off failover', 'The monitor counted a CDN as healthy if the homepage contained the phrase “Useful projects.” Then I redesigned the homepage and the phrase went away. Both copies were fine, the monitor decided both were down, and failover could no longer act. I changed the marker to the page title.', '<a href="'+REPO+'/commit/dec03f3f79ec56f071575ce5009b82e1e66b863b">The fix and write-up</a>. Before each deploy, a test now checks the real homepage against what the monitor expects, so a copy change that would break it fails first. It’s still a coupling: if the title changes, the monitor has to change with it.'),
             section('The failover drill', 'The October 22 drill simulated a primary failure. The monitor moved the real DNS record to Bunny, and the site served from there over HTTPS. Normal monitoring kept traffic on the backup through the recovery period, then moved it back to Netlify. The drill also compared hashes of eight public files on both providers, and they matched.', '<a href="'+REPO+'/blob/main/HOSTING-VERIFICATION.md">Drill record</a> · <a href="'+REPO+'/blob/main/tools/test_monitor.py">Routing tests</a>. It was a simulated failure. A real provider outage hasn’t tested it yet.'),
             section('Run the checks', '<pre><code>git clone https://github.com/anthony-firn/evolvetech.dev\ncd evolvetech.dev\npython3 tools/verify_portfolio.py\n\n# Optional: read-only HTTPS probes, no provider credentials\npython3 tools/check_delivery.py --live</code></pre>', 'The first command runs the local checks: links and metadata, the routing logic, the homepage marker, the module content type and the campaign replay. The second probes both CDNs directly (hostname, certificate, homepage, health file and one module) and never touches DNS.', '<a href="'+REPO+'/blob/main/tools/check_delivery.py">Delivery checks</a> · <a href="'+REPO+'/blob/main/.github/workflows/hosting.yml">Deployment workflow</a>'),
             section('What this doesn’t show', 'I don’t have an uptime number to give you. Failover still depends on resolvers honoring the 60-second TTL, on the schedulers actually running and on Bunny’s API being reachable. The live probe covers a few representative paths, not every file or region. Timings in the <a href="/evidence/portfolio-checks.json">check record</a> are from a local run, not CI.', 'For another backend change you can read, <a href="/projects/evolve-inbox/#postgres">Evolve Inbox now has an optional PostgreSQL backend</a>, tested with concurrent deliveries and an interrupted transaction.'),
         ]),
]


def main():
    for page in PAGES:
        text = HEAD.format(**{**page, 'sections': '\n'.join(page['sections'])})
        if page['slug'] == 'campaign-data':
            text = text.replace('>Source on GitHub ↗<', '>Public replay source ↗<')
            text = text.replace('Built with AI coding agents, which wrote most of the code and tests.', 'The production code is private and the replay uses made-up data. AI coding tools helped write this page and the example.')
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
