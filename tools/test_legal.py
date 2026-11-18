"""Check publication coverage and claims without touching real data or payment flows."""
import hashlib
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]/'public'

class Notices(unittest.TestCase):
    def test_notice_routes_and_no_false_security_claims(self):
        for route in ('legal','privacy','terms','report','security'):
            page = (ROOT/route/'index.html').read_text()
            self.assertIn('<h1>', page)
            self.assertIn('anthony@evolvetech.dev' if route in ('privacy','terms','report') else 'EvolveTech', page)
        for path in ('projects/evolve-health/index.html','projects/fairground/index.html'):
            page=(ROOT/path).read_text()
            self.assertNotIn("the creator's account are",page)
            self.assertNotIn('nothing for them to buy, subpoena or mine',page)

    def test_navigation_on_public_entrypoints_preserves_signed_examples_and_sandbox(self):
        for page in ROOT.rglob('index.html'):
            rel=page.relative_to(ROOT).as_posix()
            if rel.startswith(('play/evolve-hosting/example/','play/evolve-llm/preview/')):
                self.assertNotIn('class="evolve-legal-nav"',page.read_text())
                continue
            self.assertIn('class="evolve-legal-nav"',page.read_text(),rel)
        build=json.loads((ROOT/'play/fairground/BUILD.json').read_text())
        self.assertEqual(build['files_sha256']['index.html'],hashlib.sha256((ROOT/'play/fairground/index.html').read_bytes()).hexdigest())

if __name__=='__main__': unittest.main()
