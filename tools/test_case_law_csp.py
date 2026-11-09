from pathlib import Path
import unittest
from case_law_csp import case_law_rule, DESCRIPTION


class CaseLawPolicy(unittest.TestCase):
    def test_backup_host_can_search_without_opening_other_apps(self):
        template = {'Guid': 'original', 'ActionType': 5, 'ActionParameter1': 'Content-Security-Policy',
                    'OrderIndex': 2, 'Triggers': [{'PatternMatches': ['*/play/fairground/*']}]}
        rule = case_law_rule({'EdgeRules': [template]}, (Path(__file__).resolve().parents[1] / 'public/_headers').read_text())
        self.assertEqual(rule['Triggers'][0]['PatternMatches'], ['*/play/open-case-law/*'])
        self.assertIn("connect-src 'self' https://evolvetech-dev.netlify.app;", rule['ActionParameter2'])
        self.assertIn("script-src 'self';", rule['ActionParameter2'])
        self.assertNotIn('https:', rule['ActionParameter2'].replace('https://evolvetech-dev.netlify.app', ''))
        existing = {**rule, 'Guid': 'keep', 'Description': DESCRIPTION}
        updated = case_law_rule({'EdgeRules':[template,existing]}, (Path(__file__).resolve().parents[1] / 'public/_headers').read_text())
        self.assertEqual(updated['Guid'], 'keep')
        self.assertEqual(updated['OrderIndex'], 3)


if __name__ == '__main__':
    unittest.main()
