"""Check actual compressed asset delivery and Cloudflare header override behavior."""
import gzip
import json
import tempfile
import unittest
from pathlib import Path
from build_cloudflare import build, headers_for_cloudflare, MARKER


class PagesBuild(unittest.TestCase):
    def test_wasm_round_trip_and_source_preservation(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            src = root / 'source'
            src.mkdir()
            wasm = b'\x00asm' + b'payload-' * 200
            (src / 'game.wasm').write_bytes(wasm)
            (src / 'index.html').write_text('<h1>Game</h1>')
            (src / '_headers').write_text('/*\n  Content-Security-Policy: default-src \'self\'\n\n/play/*\n  Content-Security-Policy: script-src \'self\' \'wasm-unsafe-eval\'\n')
            assets = build(src, root / 'out', limit=1024)
            self.assertEqual(gzip.decompress((root / 'out/game.wasm').read_bytes()), wasm)
            self.assertEqual((src / 'game.wasm').read_bytes(), wasm)
            self.assertLess((root / 'out/game.wasm').stat().st_size, 1024)
            headers = (root / 'out/_headers').read_text()
            self.assertIn('/game.wasm\n  ! Content-Encoding\n  Content-Encoding: gzip', headers)
            self.assertIn('Content-Type: application/wasm', headers)
            self.assertEqual(headers.count('! Content-Security-Policy'), 2)
            self.assertEqual(json.loads((root / 'out' / MARKER).read_text())['encodedAssets'], assets)
            # Rebuilding replaces only managed output, including removing old assets.
            (src / 'index.html').unlink()
            build(src, root / 'out', limit=1024)
            self.assertFalse((root / 'out/index.html').exists())

    def test_unsupported_large_assets_fail_without_replacing_a_valid_output(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            src = root / 'source'; src.mkdir()
            (src / 'ok.txt').write_text('ok')
            build(src, root / 'out', limit=100)
            (src / 'movie.mp4').write_bytes(b'x' * 101)
            with self.assertRaisesRegex(ValueError, 'move or split'):
                build(src, root / 'out', limit=100)
            self.assertEqual((root / 'out/ok.txt').read_text(), 'ok')

    def test_refuses_source_overwrite_and_unmanaged_output(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d); src = root / 'source'; src.mkdir()
            with self.assertRaises(ValueError): build(src, src)
            with self.assertRaises(ValueError): build(src, src / 'out')
            out = root / 'out'; out.mkdir()
            with self.assertRaisesRegex(ValueError, 'unmanaged'): build(src, out)

    def test_detaches_only_declared_headers_and_keeps_comments(self):
        text = '# rules\n/*\n  X-Frame-Options: DENY\n  ! Cache-Control\n\n/play/*\n  Content-Security-Policy: script-src \'self\'\n'
        output = headers_for_cloudflare(text)
        self.assertIn('# rules', output)
        self.assertIn('  ! X-Frame-Options\n  X-Frame-Options: DENY', output)
        self.assertEqual(output.count('! Cache-Control'), 1)


if __name__ == '__main__':
    unittest.main()
