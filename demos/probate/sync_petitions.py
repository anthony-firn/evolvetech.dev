"""Apply the suite's shared chrome and stylesheet to the local petition source checkouts.

Usage: python3 demos/probate/sync_petitions.py --sources /home/anthony/Dev
Rebuild and commit those sources using tools/build_demos.py afterward.
"""
from pathlib import Path
import argparse, re
from layout import header, footer
ROOT=Path(__file__).resolve().parent
parser=argparse.ArgumentParser();parser.add_argument('--sources',type=Path,required=True);args=parser.parse_args()
for slug in ['de111','de221']:
 web=args.sources/slug/'web'
 p=web/'index.html';s=p.read_text()
 s=re.sub(r'<header class="top.*?</header>',lambda _:header(slug),s,flags=re.S)
 s=re.sub(r'<footer class="wrap foot.*?</footer>',lambda _:footer(),s,flags=re.S)
 if '<script src="theme.js"></script>' not in s:s=s.replace('<link rel="stylesheet" href="style.css">','<script src="theme.js"></script>\n<link rel="stylesheet" href="style.css">')
 p.write_text(s)
 for name in ['style.css','theme.js']:(web/name).write_bytes((ROOT/'web'/name).read_bytes())
 print(f'{slug}: shared chrome, theme and styles updated')
