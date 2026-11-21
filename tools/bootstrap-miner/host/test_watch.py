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

class ModeTests(unittest.TestCase):
    def check(self, value):
        import json, os, tempfile, pathlib
        with tempfile.TemporaryDirectory() as d:
            base = pathlib.Path(d); (base/'settlement').mkdir(mode=0o700)
            f = base/'settlement/mode.json'; f.write_text(json.dumps(value)); os.chmod(f, 0o600)
            with patch.object(watch, 'BASE', base):
                return watch.ongoing()
    def test_modes(self):
        self.assertTrue(self.check({'mode':'algo-direct','recipient':watch.FUND}))
        self.assertTrue(self.check({'mode':'donations','recipient':watch.FUND,'maxNano':'6'}))
        with self.assertRaises(ValueError): self.check({'mode':'algo-direct','recipient':'SOMEONE'})
        with self.assertRaises(ValueError): self.check({'mode':'donations','recipient':watch.FUND,'maxNano':'1'})

if __name__=='__main__':unittest.main()
