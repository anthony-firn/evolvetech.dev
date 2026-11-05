import copy
from pathlib import Path
import unittest
from hosting_csp import hosting_rules


class HostingRules(unittest.TestCase):
    def test_scoped_headers_preserve_other_projects_and_provider_identities(self):
        template = {'Guid': 'fairground-rule', 'ActionType': 5, 'ActionParameter1': 'Content-Security-Policy',
                    'ActionParameter2': 'existing-policy', 'OrderIndex': 3, 'TriggerMatchingType': 0,
                    'Triggers': [{'Type': 0, 'PatternMatches': ['*/play/fairground/*'], 'PatternMatchingType': 0}]}
        zone = {'EdgeRules': [template]}
        original = copy.deepcopy(zone)
        headers = (Path(__file__).resolve().parents[1] / 'public/_headers').read_text()
        rules = list(hosting_rules(zone, headers))
        self.assertEqual(zone, original)
        self.assertEqual(len(rules), 2)
        self.assertNotEqual(rules[0]['OrderIndex'], rules[1]['OrderIndex'])
        for index, rule in enumerate(rules):
            self.assertEqual(rule['Triggers'][0]['PatternMatches'], ['*/play/evolve-hosting/*'])
            self.assertNotIn('Guid', rule)
            rule['Guid'] = 'new-rule-' + str(index)
        self.assertEqual(rules[1]['ActionParameter1'], 'Access-Control-Allow-Origin')
        self.assertEqual(rules[1]['ActionParameter2'], '*')
        self.assertIn("connect-src 'self' https:", rules[0]['ActionParameter2'])
        updated = list(hosting_rules({'EdgeRules': [template, *rules]}, headers))
        self.assertEqual([r['Guid'] for r in updated], [r['Guid'] for r in rules])


if __name__ == '__main__':
    unittest.main()
