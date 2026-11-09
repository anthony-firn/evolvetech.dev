"""Allow only the public case-search relay from either static hosting provider."""
from jobs_csp import make_rule

DESCRIPTION = 'Open Case Law public search policy'


def case_law_rule(zone, headers):
    block = headers.split('/play/open-case-law/*\n', 1)[1].split('\n\n', 1)[0]
    policy = next(line.split(':', 1)[1].strip() for line in block.splitlines()
                  if line.strip().startswith('Content-Security-Policy:'))
    return make_rule(zone, policy, slug='open-case-law', description=DESCRIPTION)
