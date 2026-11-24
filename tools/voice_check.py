"""Flag writing patterns that readers associate with AI-generated text.

Usage:
    python3 tools/voice_check.py [--strict] PATH ...

PATH may be an HTML page, a text/Markdown file, a JSON file (string values of 40+ characters are checked)
or a directory (its .html/.txt/.md/.json files). With no PATH it checks the pages a recruiter reads first;
verify_portfolio.py runs that with --strict, which fails on stock phrases, model-shaped sentences and heavy hedging.

This is a style lint, not a detector. Nothing here proves who wrote a text; it points at the habits that make
a reviewer suspect a template or a model, so a person can rewrite those sentences in their own words.
Small local models make text more detectable, not less: in November 2026 a Binoculars score from Qwen2.5-0.5B
put its own rewrites at 0.75 against 0.93–1.30 for human writing. Fix the sentences instead of laundering them.
"""
from collections import defaultdict
from html.parser import HTMLParser
from pathlib import Path
import json
import re
import statistics
import sys

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_PAGES = ["public/index.html", "public/resume/index.html", "public/projects/campaign-data/index.html",
                 "public/projects/site-delivery/index.html"]

# Words and phrases that show up far more often in model output than in people's own writing.
STOCK = r"""
delve|tapestry|testament to|game[- ]changer|cutting[- ]edge|state[- ]of[- ]the[- ]art|seamless(?:ly)?|robust|
leverag(?:e|ed|ing)|harness(?:ed|ing)?|elevat(?:e|ed|ing)|foster(?:ed|ing)?|spearhead(?:ed|ing)?|synerg(?:y|ies)|
unlock(?:ed|ing)?|embark(?:ed)?|journey|landscape|realm|pivotal|crucial|meticulous(?:ly)?|showcas(?:e|ed|ing)|
underscor(?:e|es|ed|ing)|resonat(?:e|es|ed)|align(?:s|ed)? (?:with|perfectly)|passionate|thrilled|excited (?:to|about)|
eager to|i(?:'|’)m (?:excited|confident|thrilled)|i am (?:excited|confident|thrilled|writing to)|
caught my (?:attention|eye)|stood out to me|stands out|i(?:'|’)d (?:like|love) to bring|bring (?:that|this|my) [a-z -]{0,30}(?:experience|background|approach) to|
great fit|ideal candidate|unique blend|proven track record|fast[- ]paced|ever[- ]evolving|dynamic team|
navigat(?:e|ing) the complexit|in today(?:'|’)s|at the intersection of|deep dive|hands[- ]on experience|
end[- ]to[- ]end(?![- ]encrypt)|wide range of|diverse range|plays? a (?:key|vital|crucial) role|very concrete|
genuinely|truly|deeply|incredibly|invaluable|holistic|nuanced|empower(?:s|ed|ing)?|streamlin(?:e|ed|ing)
"""
STOCK_RE = re.compile(r"\b(?:" + "|".join(t.strip() for t in STOCK.split("|") if t.strip()) + r")\b", re.I)

# Sentence shapes that models reach for.
SHAPES = {
    "not-just": re.compile(r"\b(?:not (?:just|only|merely)|more than just|isn(?:'|’)t just|wasn(?:'|’)t just)\b[^.]{0,80}\b(?:but|it(?:'|’)s|—)", re.I),
    "not-x-it-is-y": re.compile(r"\b(?:isn(?:'|’)t|wasn(?:'|’)t|is not|was not) (?:about )?[^.;]{2,40}[;.—] (?:it(?:'|’)s|it is|it was)\b", re.I),
    "whether-you": re.compile(r"\bwhether (?:you(?:'|’)re|you are)\b", re.I),
    "here-is-what": re.compile(r"\b(?:here(?:'|’)s|here is) (?:what|who|how|why)\b", re.I),
    "the-result": re.compile(r"(?:^|[.!?]\s+)(?:The result|The outcome|The key|The goal|The catch)(?:\?|:)", re.I),
}

# The cautious register coding agents write in. Fine once; a tell when it is on every line.
HEDGE_RE = re.compile(r"\b(?:verif(?:y|ied|ies|ication)|unverified|observ(?:ed|ation)s?|exercised|documented|"
                      r"documents its|limitations?|limits|remain(?:s|ing)? (?:private|unverified|future)|"
                      r"separates what|current scope|which (?:paths|were|was) (?:exercised|not))\b", re.I)
TRIPLET_RE = re.compile(r"\b[\w’'/-]+(?: [\w’'/-]+){0,4}, [\w’'/-]+(?: [\w’'/-]+){0,4},? (?:and|or) [\w’'/-]+", re.I)
EM_DASH_RE = re.compile(r"\S ?— ?\S")
WORD_RE = re.compile(r"[A-Za-z][A-Za-z’'-]*")


class Text(HTMLParser):
    """Visible text of a page, one block per paragraph-level element."""
    BLOCK = {"p", "li", "h1", "h2", "h3", "h4", "dd", "dt", "td", "th", "figcaption", "blockquote", "div", "section"}
    SKIP = {"script", "style", "svg", "code", "pre", "nav", "footer", "title"}

    def __init__(self):
        super().__init__(); self.blocks = [""]; self.skip = 0

    def handle_starttag(self, tag, attrs):
        if tag in self.SKIP: self.skip += 1
        if tag in self.BLOCK or tag == "br": self.blocks.append("")

    def handle_endtag(self, tag):
        if tag in self.SKIP: self.skip = max(0, self.skip - 1)
        if tag in self.BLOCK: self.blocks.append("")

    def handle_data(self, data):
        if not self.skip: self.blocks[-1] += data


def blocks_of(path):
    if path.suffix == ".html":
        parser = Text(); parser.feed(path.read_text())
        raw = parser.blocks
    elif path.suffix == ".json":
        raw = []
        def walk(x):
            if isinstance(x, dict): [walk(v) for v in x.values()]
            elif isinstance(x, list): [walk(v) for v in x]
            elif isinstance(x, str) and len(x) >= 40 and not x.startswith(("http", "/")): raw.extend(x.split("\n\n"))
        walk(json.loads(path.read_text()))
    else:
        raw = path.read_text().split("\n\n")
    return [b for b in (re.sub(r"\s+", " ", b).strip() for b in raw) if len(WORD_RE.findall(b)) >= 4]


def sentences(text):
    return [s for s in re.split(r"(?<=[.!?])\s+(?=[A-Z0-9“\"(])", text) if len(WORD_RE.findall(s)) >= 3]


def check(path):
    blocks = blocks_of(path)
    text = " ".join(blocks)
    words = WORD_RE.findall(text)
    flags, notes = [], []
    for block in blocks:
        for m in STOCK_RE.finditer(block): flags.append(("stock-phrase", m.group(0), block))
        for name, rx in SHAPES.items():
            for m in rx.finditer(block): flags.append((name, m.group(0)[:60], block))
        if EM_DASH_RE.search(block) and len(WORD_RE.findall(block)) > 8:
            notes.append(("em-dash", "—", block))
        for sent in sentences(block):
            if len(TRIPLET_RE.findall(sent)) >= 2: notes.append(("stacked-lists", "two or more A, B and C lists", sent))
    hedges = HEDGE_RE.findall(text)
    per_k = 1000 * len(hedges) / max(1, len(words))
    lengths = [len(WORD_RE.findall(s)) for b in blocks for s in sentences(b)]
    spread = statistics.pstdev(lengths) / statistics.mean(lengths) if len(lengths) >= 8 else None
    stats = {"words": len(words), "hedge_per_1000": round(per_k, 1), "sentence_length_spread": spread and round(spread, 2),
             "em_dashes": text.count("—")}
    if per_k > 8: flags.append(("hedging", f"{len(hedges)} verification/limits words ({per_k:.0f} per 1,000)", ", ".join(sorted(set(h.lower() for h in hedges)))))
    if spread is not None and spread < 0.35: notes.append(("uniform-sentences", f"sentence lengths barely vary (spread {spread:.2f})", ""))
    return blocks, flags, notes, stats


def shared_phrases(docs, n=7):
    """Runs of n words that appear in more than one document, or twice in one: the mark of a template."""
    seen = defaultdict(set)
    for name, blocks in docs.items():
        tokens = [w.lower() for w in WORD_RE.findall(" ".join(blocks))]
        counts = defaultdict(int)
        for i in range(len(tokens) - n + 1):
            gram = " ".join(tokens[i:i + n]); counts[gram] += 1; seen[gram].add(name)
        for gram, c in counts.items():
            if c > 1: seen[gram].add(name + " (twice)")
    merged = {}
    for gram, names in seen.items():
        if len({x.removesuffix(" (twice)") for x in names}) >= 4: continue  # sitewide boilerplate, by design
        if len(names) > 1 or any(x.endswith("(twice)") for x in names): merged.setdefault(frozenset(names), []).append(gram)
    out = []
    for names, grams in merged.items():
        grams.sort(key=len, reverse=True); out.append((sorted(names), grams[0]))
    return out


def main(argv):
    strict = "--strict" in argv
    targets = [Path(a) for a in argv if a != "--strict"] or [ROOT / p for p in DEFAULT_PAGES]
    files = []
    for t in targets:
        files += sorted(p for p in t.rglob("*") if p.suffix in (".html", ".txt", ".md", ".json")) if t.is_dir() else [t]
    docs, total_flags = {}, 0
    for path in files:
        blocks, flags, notes, stats = check(path)
        name = str(path.relative_to(ROOT)) if path.is_relative_to(ROOT) else str(path)
        docs[name] = blocks
        if not (flags or notes): print(f"ok    {name}  {stats}"); continue
        print(f"\n{'FLAG' if flags else 'note'}  {name}  {stats}")
        for kind, hit, context in flags + notes:
            print(f"  {kind:17} {hit!r:32} {context[:150]}")
        total_flags += len(flags)
    repeats = shared_phrases(docs)
    if repeats:
        print("\nrepeated wording (reads as a template when a reviewer sees both):")
        for names, gram in repeats: print(f"  “{gram}” — {', '.join(names)}")
    if strict and total_flags: raise SystemExit(f"\n{total_flags} stock phrases or model-shaped sentences to rewrite.")


if __name__ == "__main__":
    main(sys.argv[1:])
