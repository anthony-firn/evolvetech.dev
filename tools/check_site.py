"""Check static-site links and basic search metadata, with only the Python standard library."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1] / "public"
# Full-screen engine canvases and app shells render their headings at runtime.
GAME_PAGES = {"play/emberwake/index.html", "play/pulse-pop/index.html", "play/fairground/index.html", "play/evolve-inbox/index.html"}
errors = []

class Page(HTMLParser):
    def __init__(self, path):
        super().__init__(); self.path = path; self.title = False; self.description = False; self.canonical = False; self.h1 = 0
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        self.title |= tag == "title"
        self.description |= tag == "meta" and a.get("name") == "description" and bool(a.get("content"))
        self.canonical |= tag == "link" and a.get("rel") == "canonical" and a.get("href", "").startswith("https://www.evolvetech.dev/")
        self.h1 += tag == "h1"
        for key in ("href", "src"):
            href = a.get(key, ""); url = urlsplit(href)
            if not href or url.scheme or href.startswith("#"): continue
            path = ROOT / url.path.lstrip("/") if url.path.startswith("/") else self.path.parent / url.path
            if not path.is_file() and not (path / "index.html").is_file(): errors.append(f"{self.path}: broken {href}")

for path in ROOT.rglob("*.html"):
    page = Page(path); page.feed(path.read_text())
    if not page.title or (page.h1 != 1 and path.relative_to(ROOT).as_posix() not in GAME_PAGES): errors.append(f"{path}: needs a title and exactly one h1")
    if path.name != "404.html" and not (page.description and page.canonical): errors.append(f"{path}: missing search metadata")
for loc in ET.parse(ROOT / "sitemap.xml").findall(".//{*}loc"):
    path = ROOT / urlsplit(loc.text).path.lstrip("/")
    if not path.is_file() and not (path / "index.html").is_file(): errors.append(f"Sitemap target missing: {loc.text}")
if errors: raise SystemExit("\n".join(errors))
print("Static pages, local links, sitemap and search metadata passed.")
