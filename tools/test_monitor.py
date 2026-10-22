"""Exercise routing decisions without changing DNS or contacting providers."""
import unittest
from monitor import C, choose


class RoutingTests(unittest.TestCase):
    def test_confirmed_primary_failure_uses_healthy_backup(self):
        self.assertEqual(choose(C['netlify_target'], False, True, {}, 1000, 600)[0], C['bunny_target'])

    def test_both_failed_preserves_last_route(self):
        for current in [C['netlify_target'], C['bunny_target']]:
            self.assertEqual(choose(current, False, False, {}, 1000, 600)[0], current)

    def test_recovery_requires_sustained_health(self):
        current, state = choose(C['bunny_target'], True, True, {}, 1000, 600)
        self.assertEqual(current, C['bunny_target'])
        current, state = choose(current, True, True, state, 1300, 600)
        self.assertEqual(current, C['bunny_target'])
        current, state = choose(current, True, True, state, 1600, 600)
        self.assertEqual((current, state), (C['netlify_target'], {}))

    def test_flapping_resets_recovery(self):
        _, state = choose(C['bunny_target'], True, True, {}, 1000, 600)
        _, state = choose(C['bunny_target'], False, True, state, 1300, 600)
        current, state = choose(C['bunny_target'], True, True, state, 1600, 600)
        self.assertEqual(current, C['bunny_target'])
        self.assertEqual(state['primary_healthy_since'], 1600)

    def test_monitoring_gap_does_not_count_as_healthy(self):
        state = {'primary_healthy_since': 1000, 'last_check': 1000}
        current, state = choose(C['bunny_target'], True, True, state, 3000, 600)
        self.assertEqual(current, C['bunny_target'])
        self.assertEqual(state['primary_healthy_since'], 3000)

    def test_failed_backup_allows_immediate_recovery(self):
        self.assertEqual(choose(C['bunny_target'], True, False, {}, 1000, 600)[0], C['netlify_target'])


if __name__ == '__main__':
    unittest.main()
