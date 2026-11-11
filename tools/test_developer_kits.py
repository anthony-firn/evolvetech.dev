"""Cross-check public artifact integrity, source provenance and the package boundary."""
import hashlib
import json
from pathlib import Path
import re
import tarfile
import unittest
import zipfile

ROOT=Path(__file__).resolve().parents[1]/'public'


class DeveloperKits(unittest.TestCase):
    def test_downloads_match_manifest(self):
        manifest=json.loads((ROOT/'developers/downloads/manifest.json').read_text())
        self.assertEqual(manifest['schema'],'evolvetech.developer-downloads.v1')
        self.assertEqual(len(manifest['artifacts']),2)
        for item in manifest['artifacts']:
            self.assertEqual(Path(item['file']).name,item['file'])
            content=(ROOT/'developers/downloads'/item['file']).read_bytes()
            self.assertEqual(len(content),item['bytes'])
            self.assertEqual(hashlib.sha256(content).hexdigest(),item['sha256'])
            self.assertRegex(item['commit'],r'^[a-f0-9]{40}$')

    def test_inbox_package_is_only_public_client_code_and_fixtures(self):
        expected={'LICENSE','NOTICE','README.md','demo/messages.mjs','package.json','src/client.d.mts','src/client.mjs',
            'src/demo-client.d.mts','src/demo-client.mjs','tools/inbox.mjs'}
        with tarfile.open(ROOT/'developers/downloads/evolve-inbox-client-0.3.0.tgz') as archive:
            members=archive.getmembers()
            self.assertEqual({m.name.removeprefix('package/') for m in members},expected)
            self.assertTrue(all(m.isfile() for m in members))
            package=json.loads(archive.extractfile('package/package.json').read())
            self.assertNotIn('scripts',package)
            self.assertFalse(package.get('dependencies'))
            self.assertEqual(package['bin']['evolve-inbox'],'./tools/inbox.mjs')
            for filename in ['src/client.mjs','src/demo-client.mjs','demo/messages.mjs']:
                self.assertEqual(archive.extractfile('package/'+filename).read(),(ROOT/'developers/inbox/sdk'/filename).read_bytes())

    def test_llm_runtime_has_exact_file_hashes_and_the_identified_engine(self):
        with zipfile.ZipFile(ROOT/'developers/downloads/evolve-llm-browser-0.4.0.zip') as archive:
            meta=json.loads(archive.read('BUILD.json'))
            self.assertFalse(meta['modified'])
            self.assertRegex(meta['engine_commit'],r'^[a-f0-9]{40}$')
            self.assertEqual(set(archive.namelist()),set(meta['files_sha256'])|{'BUILD.json'})
            for name,digest in meta['files_sha256'].items():
                self.assertFalse(name.startswith('/'))
                self.assertNotIn('..',Path(name).parts)
                self.assertEqual(hashlib.sha256(archive.read(name)).hexdigest(),digest)
            self.assertEqual(hashlib.sha256(archive.read('pkg/evolve_llm_bg.wasm')).hexdigest(),meta['wasm_sha256'])
            live=json.loads((ROOT/'play/evolve-llm/BUILD.json').read_text())
            self.assertEqual(live['commit'],meta['commit'])
            self.assertEqual(live['engine_commit'],meta['engine_commit'])
            self.assertEqual(hashlib.sha256((ROOT/'play/evolve-llm/pkg/evolve_llm_bg.wasm').read_bytes()).hexdigest(),meta['wasm_sha256'])
            for name in ['sdk.mjs','sdk.d.mts','worker.js','chat-development.mjs','tool-transport.mjs','model-readers.mjs','preview-client.mjs','preview/index.html','examples/snake.html','tools.js','network.js','workbench.mjs','shell-worker.mjs','pi-agent.bundle.mjs','shell-pkg/shell_bg.wasm','examples/example.mjs','examples/fixture-worker.mjs']:
                self.assertEqual((ROOT/'play/evolve-llm'/name).read_bytes(),archive.read(name))

    def test_homepage_prioritizes_relevant_work_and_guides_are_discoverable(self):
        home=(ROOT/'index.html').read_text()
        self.assertEqual(re.findall(r'<article class="case[^>]*aria-labelledby="([^"]+)"',home)[:3],
            ['case-evolve-inbox','case-evolve-llm','case-evolve-hosting'])
        for path in ['/developers/inbox/','/developers/llm/']:
            self.assertIn('href="'+path+'"',home)
        llm=(ROOT/'developers/llm/index.html').read_text()
        self.assertIn('largest models have not run end to end',llm)
        self.assertIn('scripted',llm)
        inbox=(ROOT/'developers/inbox/index.html').read_text()
        self.assertIn('not a package published to the npm registry',inbox)
        self.assertIn('cannot access or modify',inbox)


if __name__=='__main__':unittest.main()
