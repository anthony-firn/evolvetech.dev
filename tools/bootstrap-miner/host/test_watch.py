import unittest
from unittest.mock import patch
import watch

class FundingGuardTests(unittest.TestCase):
    def test_bootstrap_stops_when_initialized(self):
        with patch.object(watch,'ongoing',return_value=False):
            self.assertIsNotNone(watch.reached({'wallet':{'ready':True,'funded':True}}))
    def test_donation_mode_continues_only_while_ready(self):
        with patch.object(watch,'ongoing',return_value=True):
            self.assertIsNone(watch.reached({'wallet':{'ready':True,'funded':True},'pool':{'balance':10,'threshold':10}}))
            self.assertIsNotNone(watch.reached({'wallet':{'ready':False,'funded':True}}))

if __name__=='__main__':unittest.main()
