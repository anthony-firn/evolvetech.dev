"""Mirror Evolve LLM's browser policy on the Bunny copy: WASM, a module worker and Hugging Face downloads."""
from jobs_csp import make_rule

DESCRIPTION = 'Evolve LLM WebGPU and model download policy'


def llm_policy(headers):
    block = headers.split('/play/evolve-llm/*\n', 1)[1].split('\n\n', 1)[0]
    return next(line.split(':', 1)[1].strip() for line in block.splitlines()
                if line.strip().startswith('Content-Security-Policy:'))


def llm_rule(zone, headers):
    return make_rule(zone, llm_policy(headers), slug='evolve-llm', description=DESCRIPTION)


def preview_rules(zone, headers):
    import copy
    block = headers.split('/play/evolve-llm/preview/*\n', 1)[1].split('\n\n', 1)[0]
    values = dict(line.strip().split(':', 1) for line in block.splitlines() if ':' in line)
    working = copy.deepcopy(zone)
    for header in ['Content-Security-Policy', 'X-Frame-Options']:
        description = 'Evolve LLM isolated HTML preview ' + header
        rule = make_rule(working, values[header].strip(), slug='evolve-llm-preview',
                         scope='/play/evolve-llm/preview/', description=description, header=header)
        yield rule
        if not any(item.get('Description') == description for item in working.get('EdgeRules', [])):
            working.setdefault('EdgeRules', []).append(rule)
