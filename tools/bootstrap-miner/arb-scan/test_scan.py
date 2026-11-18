# SPDX-License-Identifier: MIT
import unittest

import scan


def fake(rates, router_fee_bps=10, net_fee=11000):
    """Quote function with fixed rates per hop: out = amount * rate, minus a router fee in output units."""
    def q(frm, to, amount):
        gross = amount * rates[(frm, to)]
        fee = gross * router_fee_bps / 1e4
        return dict(out=int(gross - fee), routerFee=int(fee), netFee=net_fee, impact=0.0, pools=[1])
    return q


class CycleMath(unittest.TestCase):
    def test_aligned_pools_lose_the_fees(self):
        # 1 ALGO = 0.079 USDC each way after a 0.3% pool fee on both hops: a round trip must lose money
        q = fake({(0, scan.USDC): 0.079 * 0.997, (scan.USDC, 0): 0.997 / 0.079})
        c = scan.cycle([0, scan.USDC, 0], 10_000_000, q)
        self.assertLess(c["directNet"], 0)
        self.assertLess(c["routerNet"], c["directNet"])  # the router's 0.1% per hop and its fees cost more

    def test_price_gap_larger_than_fees_shows_up(self):
        # sell ALGO 2% high on one pool, buy it back at the fair price on another
        q = fake({(0, scan.USDC): 0.079 * 1.02 * 0.997, (scan.USDC, 0): 0.997 / 0.079})
        c = scan.cycle([0, scan.USDC, 0], 250_000_000, q)
        self.assertGreater(c["directNet"], 0)
        self.assertEqual(c["path"], "ALGO->USDC->ALGO")

    def test_direct_estimate_adds_back_router_fee_and_uses_direct_network_fee(self):
        q = fake({(0, scan.USDC): 1.0, (scan.USDC, 0): 1.0}, router_fee_bps=10, net_fee=0)
        c = scan.cycle([0, scan.USDC, 0], 1_000_000, q)
        self.assertEqual(c["directNet"], -2 * scan.DIRECT_FEE)  # no pool loss once the router fee is added back


if __name__ == "__main__":
    unittest.main()
