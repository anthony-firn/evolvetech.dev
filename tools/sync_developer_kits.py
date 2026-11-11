"""Build public developer artifacts from clean source checkouts; copy no credentials."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import tarfile
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / 'public'


def clean_commit(source):
    if subprocess.check_output(['git', 'status', '--porcelain'], cwd=source):
        raise ValueError(f'Source checkout must be clean: {source}')
    return subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=source, text=True).strip()


def sync(inbox, llm):
    inbox_commit, llm_commit = clean_commit(inbox), clean_commit(llm)
    downloads = PUBLIC / 'developers/downloads'; downloads.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='evolve-developer-artifacts-') as name:
        out = Path(name)
        packed = json.loads(subprocess.check_output(['node', str(inbox / 'tools/pack-sdk.mjs'), str(out)], cwd=inbox, text=True))
        inbox_file = Path(packed['file'])
        subprocess.run(['python3', str(llm / 'tools/package_sdk.py'), '--runtime', str(PUBLIC / 'play/evolve-llm/pkg'), '--out', str(out)], cwd=llm, check=True)
        llm_file = out / 'evolve-llm-browser-0.4.0.zip'
        # This exact allowlist is sufficient for browser fixtures. No server code is copied.
        names = ['src/client.mjs', 'src/client.d.mts', 'src/demo-client.mjs', 'src/demo-client.d.mts', 'demo/messages.mjs']
        with tarfile.open(inbox_file) as archive:
            for filename in names:
                member = archive.getmember('package/' + filename)
                if not member.isfile(): raise ValueError('SDK entry is not a regular file')
                dest = PUBLIC / 'developers/inbox/sdk' / filename
                dest.parent.mkdir(parents=True, exist_ok=True); dest.write_bytes(archive.extractfile(member).read())
        with zipfile.ZipFile(llm_file) as archive:
            provenance = json.loads(archive.read('BUILD.json'))
            if provenance['modified'] or provenance['commit'] != llm_commit: raise ValueError('SDK source provenance does not match')
            names = [name for name in provenance['files_sha256'] if name not in ['LICENSE', 'NOTICE', 'README.md', 'WORKBENCH.md'] and not name.startswith('pkg/')]
            for filename in names:
                dest = PUBLIC / 'play/evolve-llm' / filename
                dest.parent.mkdir(parents=True, exist_ok=True); dest.write_bytes(archive.read(filename))
            index = subprocess.check_output(['git', 'show', f'{llm_commit}:web/index.html'], cwd=llm)
            (PUBLIC / 'play/evolve-llm/index.html').write_bytes(index)
            (PUBLIC / 'play/evolve-llm/BUILD.json').write_text(json.dumps({
                'source': provenance['source'], 'commit': llm_commit, 'engine_commit': provenance['engine_commit'],
                'wasm_sha256': provenance['wasm_sha256'],
            }, indent=2) + '\n')
        artifacts = []
        for filename, commit, source in [(inbox_file, inbox_commit, 'evolve-inbox'), (llm_file, llm_commit, 'evolve-llm')]:
            shutil.copy2(filename, downloads / filename.name)
            artifacts.append({'file': filename.name, 'bytes': filename.stat().st_size,
                'sha256': hashlib.sha256(filename.read_bytes()).hexdigest(), 'source': 'https://github.com/anthony-firn/' + source, 'commit': commit})
        (downloads / 'manifest.json').write_text(json.dumps({'schema': 'evolvetech.developer-downloads.v1', 'artifacts': artifacts}, indent=2) + '\n')
        print('Published two reproducible developer downloads and their source checksums.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--inbox-source', type=Path, required=True)
    parser.add_argument('--llm-source', type=Path, required=True)
    args = parser.parse_args(); sync(args.inbox_source.resolve(), args.llm_source.resolve())
