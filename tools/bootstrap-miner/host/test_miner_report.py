import unittest
import miner_report

ROW = ('|  1:0 |  i0 |  -- | 1/0/0 | 749.0ghw | 22.98th |  24.45th | Mining               | height 146,200 |\n'
       '| smry |     |  -- | 3/1/0 | 749.0ghw | 22.98th |  24.45th | connected: yes       | diff 9.01P     |\n')

class SummaryTests(unittest.TestCase):
    def test_reads_the_last_summary_row(self):
        s = miner_report.parse_summary('| smry | | -- | 1/0/0 | 1ghw | 20.00th | 21.00th | x |\n' + ROW)
        self.assertEqual((s['accepted'], s['rejected'], s['stale']), (3, 1, 0))
        self.assertAlmostEqual(s['hps'], 22.98e12); self.assertAlmostEqual(s['avgHps'], 24.45e12)
    def test_no_summary_yet(self):
        self.assertIsNone(miner_report.parse_summary('starting bzminer\n'))

class EarningsTests(unittest.TestCase):
    def series(self, *algo, step=3600):
        return [{'t': i * step, 'pool': {'algo': a}} for i, a in enumerate(algo)]
    def test_sums_increases_and_counts_a_payout_drop_from_zero(self):
        s = self.series(9.0, 9.5, 10.1, 0.2, 0.6)
        self.assertAlmostEqual(miner_report.earned(s, -1), 0.5 + 0.6 + 0.2 + 0.4)
    def test_rate_needs_half_the_window(self):
        s = self.series(1.0, 1.25, 1.5)  # 2 h of data
        self.assertIsNone(miner_report.rate(s, 6, s[-1]['t']))
        self.assertAlmostEqual(miner_report.rate(s, 4, s[-1]['t']), 0.5 * 12)
    def test_samples_without_pool_data_are_skipped(self):
        s = self.series(1.0, 2.0) + [{'t': 3 * 3600, 'pool': None}]
        self.assertAlmostEqual(miner_report.earned(s, -1), 1.0)

if __name__ == '__main__':
    unittest.main()
