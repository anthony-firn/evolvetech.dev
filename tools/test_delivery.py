"""Regressions for two observed delivery failures, without contacting providers."""
import unittest
from check_delivery import ROOT, check_local, check_response
from monitor import healthy
from unittest.mock import patch


class DeliveryTests(unittest.TestCase):
    def test_current_artifacts_still_match_monitor(self):
        check_local()

    def test_copy_redesign_without_old_marketing_phrase_is_healthy(self):
        page = (ROOT / 'public/index.html').read_text().replace('Useful projects.', '')
        with patch('monitor.fetch', side_effect=[(200, '{"status":"ok"}'), (200, page)]):
            self.assertTrue(healthy('fixture.invalid'))

    def test_actual_module_response_must_not_be_octet_stream(self):
        with self.assertRaises(ValueError):
            check_response('/engine.mjs', 200, 'export {}', 'application/octet-stream')
        check_response('/engine.mjs', 200, 'export {}', 'text/javascript; charset=utf-8')

    def test_error_status_and_wrong_page_cannot_look_healthy(self):
        with self.assertRaises(ValueError):
            check_response('/', 200, '<title>Unrelated site</title>')
        with self.assertRaises(ValueError):
            check_response('/health.json', 503, '{"status":"ok"}')


if __name__ == '__main__':
    unittest.main()
