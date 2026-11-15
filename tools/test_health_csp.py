from pathlib import Path
import unittest
from health_csp import health_rule

HEADERS = (Path(__file__).resolve().parents[1] / 'public/_headers').read_text()


class HealthPolicy(unittest.TestCase):
    def test_policy_is_scoped_and_strict(self):
        zone = {'EdgeRules': [{'Guid': 'original', 'ActionType': 5, 'ActionParameter1': 'Content-Security-Policy',
                 'ActionParameter2': 'old', 'OrderIndex': 4, 'TriggerMatchingType': 0,
                 'Triggers': [{'PatternMatches': ['*/play/fairground/*']}]}]}
        rule = health_rule(zone, HEADERS)
        self.assertEqual(rule['Triggers'][0]['PatternMatches'], ['*/play/evolve-health/*'])
        self.assertNotIn('Guid', rule)
        self.assertEqual(rule['OrderIndex'], 5)
        policy = rule['ActionParameter2']
        directives = {d.split()[0]: d.split()[1:] for d in (x.strip() for x in policy.split(';')) if d}
        self.assertEqual(directives['default-src'], ["'none'"])
        self.assertEqual(directives['script-src'], ["'self'", "'wasm-unsafe-eval'"])
        self.assertEqual(directives['style-src'], ["'self'"])
        self.assertEqual(directives['require-trusted-types-for'], ["'script'"])
        self.assertEqual(directives['trusted-types'], ['evolve-health'])
        # Storage nodes are chosen by each person: any https origin, or one on their own computer.
        self.assertEqual(directives['connect-src'], ["'self'", 'https:', 'http://localhost:*', 'http://127.0.0.1:*'])
        self.assertEqual(directives['frame-ancestors'], ["'none'"])
        self.assertNotIn("'unsafe-inline'", policy)
        self.assertNotIn("'unsafe-eval'", policy.replace("'wasm-unsafe-eval'", ''))

    def test_existing_rule_keeps_its_identity(self):
        existing = {'Guid': 'kept', 'Description': 'Evolve Health encrypted records policy', 'ActionType': 5,
                    'ActionParameter1': 'Content-Security-Policy', 'ActionParameter2': 'old', 'OrderIndex': 9,
                    'TriggerMatchingType': 0, 'Triggers': [{'PatternMatches': ['*/play/evolve-health/*']}]}
        rule = health_rule({'EdgeRules': [existing]}, HEADERS)
        self.assertEqual(rule['Guid'], 'kept')
        self.assertEqual(rule['OrderIndex'], 9)


if __name__ == '__main__':
    unittest.main()
