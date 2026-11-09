"""Mirror Evolve LLM's browser policy on the Bunny copy: WASM, a module worker and Hugging Face downloads."""
from jobs_csp import make_rule

DESCRIPTION = 'Evolve LLM WebGPU and model download policy'


def llm_policy(headers):
    block = headers.split('/play/evolve-llm/*\n', 1)[1].split('\n\n', 1)[0]
    return next(line.split(':', 1)[1].strip() for line in block.splitlines()
                if line.strip().startswith('Content-Security-Policy:'))


def llm_rule(zone, headers):
    return make_rule(zone, llm_policy(headers), slug='evolve-llm', description=DESCRIPTION)
