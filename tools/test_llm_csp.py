from pathlib import Path
import unittest
from llm_csp import llm_rule, preview_rules


class LlmPolicy(unittest.TestCase):
    def test_policy_is_scoped_and_only_reaches_hugging_face(self):
        zone = {'EdgeRules': [{'Guid': 'original', 'ActionType': 5,
                 'ActionParameter1': 'Content-Security-Policy', 'ActionParameter2': 'old',
                 'OrderIndex': 2, 'TriggerMatchingType': 0,
                 'Triggers': [{'PatternMatches': ['*/play/fairground/*']}]}]}
        rule = llm_rule(zone, (Path(__file__).resolve().parents[1] / 'public/_headers').read_text())
        self.assertEqual(rule['Triggers'][0]['PatternMatches'], ['*/play/evolve-llm/*'])
        self.assertNotIn('Guid', rule)
        self.assertEqual(rule['OrderIndex'], 3)
        policy = rule['ActionParameter2']
        self.assertIn("'wasm-unsafe-eval'", policy)
        self.assertIn("worker-src 'self'", policy)
        self.assertIn('https://huggingface.co', policy)
        self.assertIn('https://*.hf.co', policy)
        # Opt-in web access: search and page reading, and nothing broader.
        for host in ('https://*.wikipedia.org', 'https://api.duckduckgo.com', 'https://r.jina.ai', 'https://s.jina.ai'):
            self.assertIn(host, policy)
        connect = next(d for d in policy.split(';') if d.strip().startswith('connect-src')).split()[1:]
        self.assertEqual(len(connect), 8, connect)
        self.assertNotIn('connect-src https:', policy)
        self.assertNotIn("'unsafe-eval'", policy.replace("'wasm-unsafe-eval'", ''))
        self.assertNotIn("'unsafe-inline'", policy)
        self.assertIn("form-action 'none'", policy)

    def test_preview_policy_is_isolated_and_denies_network_and_same_origin(self):
        zone = {'EdgeRules': [{'Description':'Fairground', 'ActionType':5, 'ActionParameter1':'Content-Security-Policy',
                'OrderIndex':2, 'Triggers':[{'PatternMatches':['*/play/fairground/*']}]}]}
        rules = list(preview_rules(zone, (Path(__file__).resolve().parents[1] / 'public/_headers').read_text()))
        policy = rules[0]['ActionParameter2']
        self.assertIn("sandbox allow-scripts",policy)
        self.assertNotIn('allow-same-origin',policy)
        self.assertIn("connect-src 'none'",policy)
        self.assertIn("frame-src 'none'",policy)
        self.assertIn("script-src 'unsafe-inline'",policy)
        self.assertEqual(rules[1]['ActionParameter2'],'SAMEORIGIN')
        self.assertEqual(rules[0]['Triggers'][0]['PatternMatches'],['*/play/evolve-llm/preview/*'])

    def test_existing_rule_keeps_its_identity(self):
        existing = {'Guid': 'kept', 'Description': 'Evolve LLM WebGPU and model download policy', 'ActionType': 5,
                    'ActionParameter1': 'Content-Security-Policy', 'ActionParameter2': 'old', 'OrderIndex': 7,
                    'TriggerMatchingType': 0, 'Triggers': [{'PatternMatches': ['*/play/evolve-llm/*']}]}
        rule = llm_rule({'EdgeRules': [existing]}, (Path(__file__).resolve().parents[1] / 'public/_headers').read_text())
        self.assertEqual(rule['Guid'], 'kept')
        self.assertEqual(rule['OrderIndex'], 7)


if __name__ == '__main__':
    unittest.main()
