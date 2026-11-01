"""Copy reviewed, buildless companion helpers to the existing evolvetech.dev hosting tree."""
from pathlib import Path
import shutil, hashlib, json
ROOT=Path(__file__).resolve().parents[2]; SRC=Path(__file__).resolve().parent/'web'; PLAY=ROOT/'public/play'
shutil.copytree(SRC,PLAY/'probate',dirs_exist_ok=True)
for slug in ['de120','de135','de226']:
 dest=PLAY/slug;dest.mkdir(exist_ok=True)
 title={'de120':'Notice of Hearing','de135':'Proof of Holographic Instrument','de226':'Spousal Property Order'}[slug]
 (dest/'index.html').write_text(f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><title>{slug.upper()} {title} Helper | EvolveTech</title><meta name="description" content="Prepare California form {slug.upper()} privately in your browser, with plain-language questions and an editable official PDF."><link rel="canonical" href="https://www.evolvetech.dev/play/{slug}/"><link rel="stylesheet" href="../probate/style.css"><script src="../probate/vendor/pdf-lib.min.js" defer></script><script type="module" src="../probate/app.js"></script></head>
<body data-form="{slug}"><a class="skip" href="#main">Skip to questions</a><header><nav aria-label="Form helpers"><a href="../probate/">Forms and filing sequence</a><a href="../de221/">DE-221 petition</a><a href="../de226/">DE-226 order</a><a href="../de120/">DE-120 notice</a><a href="../de135/">DE-135 proof</a></nav></header><main id="main"><h1>{slug.upper()} helper</h1><noscript>JavaScript is needed to fill the PDF on this device. Use the official form at courts.ca.gov if JavaScript is unavailable.</noscript></main><footer>Drafting assistance, not legal advice. No account or upload to a server. <a href="https://selfhelp.courts.ca.gov/self-help-centers">Find court self-help</a> · <a href="https://www.evolvetech.dev/">EvolveTech</a></footer></body></html>''')
manifest={str(f.relative_to(SRC)):hashlib.sha256(f.read_bytes()).hexdigest() for f in SRC.rglob('*') if f.is_file()}
(PLAY/'probate/BUILD.json').write_text(json.dumps({'source':'demos/probate/web','sha256':manifest},indent=2)+'\n')
print('Built probate workflow and DE-120, DE-135, DE-226 helpers.')
