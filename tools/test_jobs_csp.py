"""Check that deployment changes only the scoped Jobs header rule."""
import copy
import unittest
from jobs_csp import make_rule, DESCRIPTION


class Rules(unittest.TestCase):
    def test_scoped_rule_and_idempotent_identity(self):
        source = {"ActionType": 5, "ActionParameter1": "Content-Security-Policy", "ActionParameter2": "old",
                  "TriggerMatchingType": 0, "OrderIndex": 3,
                  "Triggers": [{"Type": 0, "PatternMatches": ["*/play/fairground/*"], "PatternMatchingType": 0}]}
        zone = {"EdgeRules": [source]}
        original = copy.deepcopy(zone)
        rule = make_rule(zone, "jobs-policy")
        self.assertEqual(zone, original)
        self.assertEqual(rule["Triggers"][0]["PatternMatches"], ["*/play/evolve-jobs/*"])
        self.assertEqual(rule["ActionParameter2"], "jobs-policy")
        self.assertEqual(rule["Description"], DESCRIPTION)
        self.assertNotIn("Guid", rule)
        rule["Guid"] = "provider-created-rule-id"
        updated = make_rule({"EdgeRules": [source, rule]}, "new-policy")
        self.assertEqual(updated["Guid"], rule["Guid"])
        self.assertEqual(updated["OrderIndex"], rule["OrderIndex"])
        self.assertEqual(updated["ActionParameter2"], "new-policy")

    def test_missing_template_stops_deployment(self):
        with self.assertRaises(RuntimeError):
            make_rule({"EdgeRules": []}, "policy")


if __name__ == "__main__":
    unittest.main()
