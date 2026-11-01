"""Build shared navigation, the guide and three companion form entry pages."""
from pathlib import Path
import shutil, hashlib, json
from layout import header, footer, shell
ROOT=Path(__file__).resolve().parents[2]; SRC=Path(__file__).resolve().parent/'web'; PLAY=ROOT/'public/play'
shutil.copytree(SRC,PLAY/'probate',dirs_exist_ok=True)
guide=(SRC/'index.html').read_text().replace('<!-- SUITE_HEADER -->',header('probate')).replace('<!-- SUITE_FOOTER -->',footer())
(PLAY/'probate/index.html').write_text(guide)
for slug in ['de120','de135','de226']:
 dest=PLAY/slug;dest.mkdir(exist_ok=True)
 title={'de120':'Notice of Hearing','de135':'Proof of Holographic Instrument','de226':'Spousal Property Order'}[slug]
 (dest/'index.html').write_text(f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><title>{slug.upper()} {title} Helper | EvolveTech</title><meta name="description" content="Prepare California form {slug.upper()} privately in your browser, with plain-language questions and an editable official PDF."><link rel="canonical" href="https://www.evolvetech.dev/play/{slug}/"><script src="../probate/theme.js"></script><link rel="stylesheet" href="../probate/style.css"><script src="../probate/vendor/pdf-lib.min.js" defer></script><script type="module" src="../probate/app.js"></script></head>
{shell(slug)}</html>''')
manifest={str(f.relative_to(SRC)):hashlib.sha256(f.read_bytes()).hexdigest() for f in SRC.rglob('*') if f.is_file()}
manifest['../layout.py']=hashlib.sha256((SRC.parent/'layout.py').read_bytes()).hexdigest()
(PLAY/'probate/BUILD.json').write_text(json.dumps({'source':'demos/probate/web','sha256':manifest},indent=2)+'\n')
print('Built probate guide and shared form interface.')
