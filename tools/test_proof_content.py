"""Behavior and publication checks for Proof content, without a browser or network."""
import copy
import importlib.util
import json
import random
import tempfile
from unittest.mock import patch
import unittest
from pathlib import Path

import check_proof as gate

EP = gate.EPISODES
spec = importlib.util.spec_from_file_location('scheduler', EP / '2026-11-24.solution.py')
scheduler = importlib.util.module_from_spec(spec)
spec.loader.exec_module(scheduler)


def j(id, cpu=1, ram=1, duration=2, priority=0, submitted=0):
    return dict(id=id, cpu=cpu, ram=ram, duration=duration, priority=priority, submitted=submitted)


class SchedulerProperties(unittest.TestCase):
    def test_generated_plans_never_overcommit_or_delay_the_reservation(self):
        rng = random.Random(20261124)
        for case in range(150):
            now, cap = 30, {'cpu': 4, 'ram': 8}
            running = [{'cpu': rng.randint(1, 3), 'ram': rng.randint(1, 6), 'end': rng.randint(31, 40)}]
            pending = [j(str(i), rng.randint(1, 5), rng.randint(1, 9), rng.randint(1, 8), rng.randint(0, 5), rng.randint(0, 35)) for i in range(12)]
            original = copy.deepcopy([cap, running, pending])
            plan = scheduler.select_jobs(now, cap, running, pending)
            jobs = {q['id']: q for q in pending}
            self.assertEqual(len(plan['start']), len(set(plan['start'])), case)
            self.assertEqual([cap, running, pending], original, case)
            self.assertEqual(plan, scheduler.select_jobs(now, cap, running, list(reversed(pending))), case)
            started = [jobs[id] for id in plan['start']]
            for resource in cap:
                self.assertLessEqual(sum(r[resource] for r in running) + sum(q[resource] for q in started), cap[resource], case)
            self.assertTrue(all(q['submitted'] <= now for q in started), case)
            self.assertEqual(plan['rejected'], sorted(q['id'] for q in pending if q['cpu'] > cap['cpu'] or q['ram'] > cap['ram']), case)
            if plan['reserved']:
                head = jobs[plan['reserved']['id']]
                at = plan['reserved']['at']
                allocations = running + [dict(cpu=q['cpu'], ram=q['ram'], end=now + q['duration']) for q in started]
                for resource in cap:
                    self.assertLessEqual(head[resource] + sum(r[resource] for r in allocations if r['end'] > at), cap[resource], case)
            snapshot = json.loads(scheduler.visualize(now, cap, running, pending))
            self.assertEqual(snapshot['plan'], plan, case)

    def test_a_long_stream_of_small_jobs_does_not_move_the_head_reservation(self):
        cap = {'cpu': 4, 'ram': 8}
        running = [{'cpu': 2, 'ram': 2, 'end': 10}]
        head = j('build', cpu=4, duration=5, priority=100)
        agents = [j(f'agent-{i}', duration=2, submitted=i) for i in range(10)]
        queue = [head, *agents]
        for now in range(11):
            plan = scheduler.select_jobs(now, cap, running, queue)
            if now < 10:
                self.assertEqual(plan['reserved'], {'id': 'build', 'at': 10})
            else:
                self.assertIn('build', plan['start'])
            lookup = {q['id']: q for q in queue}
            running += [dict(cpu=lookup[id]['cpu'], ram=lookup[id]['ram'], end=now + lookup[id]['duration']) for id in plan['start']]
            running = [r for r in running if r['end'] > now]
            queue = [q for q in queue if q['id'] not in plan['start']]


class PublicationGate(unittest.TestCase):
    def tearDown(self):
        gate.errors.clear()

    def test_unknown_id_cannot_report_success(self):
        with self.assertRaises(SystemExit):
            gate.main(['2099-01-01'])

    def test_missing_video_blocks_publication(self):
        ep = json.loads((EP / '2026-11-24.json').read_text())
        ep['briefing'].pop('video', None)
        index = json.loads((EP / 'index.json').read_text())
        index['episodes'] = [m for m in index['episodes'] if m['id'] == ep['id']]
        with tempfile.TemporaryDirectory() as scratch:
            temp = Path(scratch)
            (temp / 'index.json').write_text(json.dumps(index))
            (temp / '2026-11-24.json').write_text(json.dumps(ep))
            (temp / '2026-11-24.solution.py').write_text((EP / '2026-11-24.solution.py').read_text())
            with patch.object(gate, 'EPISODES', temp), self.assertRaises(SystemExit) as failure:
                gate.main(['--require-video', '2026-11-24'])
            self.assertIn('MP4 required', str(failure.exception))

    def test_both_missions_and_all_behavioral_tests_pass(self):
        gate.main([])

    def test_checker_executes_timeout_and_behavioral_failures(self):
        out = gate.run_tests('while True: pass', [], timeout=.2)
        self.assertTrue(out.get('error'))
        out = gate.run_tests('def f(): return 1', [{'name': 'not 2', 'code': 'assert f() == 2'}])
        self.assertFalse(out['results'][0]['ok'])


if __name__ == '__main__':
    unittest.main()
