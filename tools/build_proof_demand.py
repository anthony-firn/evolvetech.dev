"""Publish aggregate skill counts from a local jobs snapshot; no company or applicant data is emitted.

python3 tools/build_proof_demand.py --jobs /path/jobs.json --ranks /path/ranks.jsonl --as-of YYYY-MM-DD
The ranking snapshot must come from Evolve Jobs' user-configured impact/eligibility model.
"""
import argparse
import json
import re
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PATTERNS = {
    'Python': r'\bpython\b', 'TypeScript': r'\btypescript\b', 'SQL': r'\bsql\b|\bpostgres(?:ql)?\b',
    'Distributed systems': r'\bdistributed systems?\b', 'Kubernetes': r'\bkubernetes\b|\bk8s\b',
    'Security': r'\bsecurity\b', 'Observability': r'\bobservability\b|\bmonitoring\b',
    'System design': r'\bsystem(?:s)? design\b|\barchitecture\b',
    'Testing': r'\btesting\b|\btests\b', 'Rust': r'\brust\b',
    'Go': r'\bgolang\b|\bGo programming\b', 'Cloud infrastructure': r'\baws\b|\bgcp\b|\bgoogle cloud\b|\bazure\b',
    'AI engineering': r'\bllms?\b|\blanguage models?\b|\bai agents?\b',
}


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--jobs', type=Path, required=True)
    ap.add_argument('--ranks', type=Path, required=True)
    ap.add_argument('--as-of', type=date.fromisoformat, required=True)
    ap.add_argument('--pay-floor', type=int, default=170000)
    a = ap.parse_args()
    ranks = {r['id']: r for line in a.ranks.read_text().splitlines() if (r := json.loads(line))}
    jobs = {j['id']: j for j in json.loads(a.jobs.read_text())}
    selected = [j for id, j in jobs.items() if (r := ranks.get(id)) and r.get('eligible') is True
                and isinstance(r.get('pay'), (int, float)) and r['pay'] >= a.pay_floor
                and isinstance(r.get('impact'), (int, float)) and r['impact'] >= 0]
    skills = []
    for skill, pattern in PATTERNS.items():
        n = sum(bool(re.search(pattern, j.get('description', ''), re.I)) for j in selected)
        if n >= 3:
            skills.append(dict(skill=skill, count=n, share=round(n / len(selected), 4)))
    skills.sort(key=lambda s: (-s['count'], s['skill']))
    data = dict(version=1, asOf=a.as_of.isoformat(), listings=len(selected), payFloor=a.pay_floor,
                basis=f'A saved, curated sample of {len(selected)} unique postings marked eligible by the configured job-search model, '
                      f'with estimated annual pay of at least ${a.pay_floor:,} and nonnegative impact scores. '
                      'Counts are keyword mentions in descriptions, not required-skill ratings or a labor-market survey. '
                      'Pay and impact estimates may be incomplete. Only skills mentioned in at least three postings are shown.', skills=skills)
    out = ROOT / 'public/play/proof/demand.json'
    out.write_text(json.dumps(data, indent=2) + '\n')
    print(f'Wrote {len(skills)} aggregate skills from {len(selected)} postings to {out}')


if __name__ == '__main__':
    main()
