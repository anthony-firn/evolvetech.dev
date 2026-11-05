"""Derive scoped Evolve Hosting CSP/CORS rules from its published Netlify headers."""
import copy
from jobs_csp import make_rule


def hosting_rules(zone, headers):
    block = headers.split('/play/evolve-hosting/*\n', 1)[1].split('\n\n', 1)[0]
    values = dict(line.strip().split(':', 1) for line in block.splitlines() if ':' in line)
    working = copy.deepcopy(zone)
    for header, description in [('Content-Security-Policy', 'Evolve Hosting browser policy'),
                                ('Access-Control-Allow-Origin', 'Evolve Hosting public mirror metadata CORS')]:
        value = values.get(header, '').strip()
        if not value:
            raise RuntimeError(f'Missing scoped hosting header: {header}')
        rule = make_rule(working, value, slug='evolve-hosting', description=description, header=header)
        yield rule
        if not any(item.get('Description') == description for item in working.get('EdgeRules', [])):
            working.setdefault('EdgeRules', []).append(rule)


def wallet_setup_rule(zone, headers):
    block = headers.split('/wallet-setup/*\n', 1)[1].split('\n\n', 1)[0]
    policy = next(line.split(':', 1)[1].strip() for line in block.splitlines()
                  if line.strip().startswith('Content-Security-Policy:'))
    return make_rule(zone, policy, slug='wallet-setup', scope='/wallet-setup/',
                     description='Wallet setup public status policy')
