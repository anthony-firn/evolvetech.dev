"""Mirror Evolve Health's browser policy on the Bunny copy.

The app talks to storage nodes chosen by each person (any https: origin, or a node on their own
computer at localhost) and enforces Trusted Types. The page's own <meta name="referrer"> keeps
no-referrer on both providers.
"""
from jobs_csp import make_rule

DESCRIPTION = 'Evolve Health encrypted records policy'


def health_policy(headers):
    block = headers.split('/play/evolve-health/*\n', 1)[1].split('\n\n', 1)[0]
    return next(line.split(':', 1)[1].strip() for line in block.splitlines()
                if line.strip().startswith('Content-Security-Policy:'))


def health_rule(zone, headers):
    return make_rule(zone, health_policy(headers), slug='evolve-health', description=DESCRIPTION)
