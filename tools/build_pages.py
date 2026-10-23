"""Generate the project case-study pages from one template, so they stay consistent with the homepage design."""
import html
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "public"

HEAD = """<!doctype html>
<html lang="en" class="no-js">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{title} — Anthony Firn</title>
  <meta name="description" content="{description}">
  <link rel="canonical" href="https://www.evolvetech.dev/projects/{slug}/">
  <meta property="og:type" content="article">
  <meta property="og:title" content="{title} — Anthony Firn">
  <meta property="og:description" content="{description}">
  <meta property="og:url" content="https://www.evolvetech.dev/projects/{slug}/">
  <meta property="og:image" content="https://www.evolvetech.dev/assets/media/{poster}">
  <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#06080d">
  <meta name="theme-color" media="(prefers-color-scheme: light)" content="#f5f6fa">
  <link rel="icon" href="/assets/icon.svg" type="image/svg+xml">
  <link rel="preload" href="/assets/fonts/space-grotesk.woff2" as="font" type="font/woff2" crossorigin>
  <script src="/assets/v2/theme.js"></script>
  <link rel="stylesheet" href="/assets/v2/style.css">
  <script type="module" src="/assets/v2/main.js"></script>
</head>
<body>
  <a class="skip" href="#main">Skip to content</a>
  <header class="site-header">
    <div class="shell">
      <a class="brand" href="/" aria-label="Anthony Firn, home"><span class="monogram" aria-hidden="true">AF</span><span><strong>Anthony Firn</strong><small>EvolveTech</small></span></a>
      <nav class="nav" aria-label="Main"><a href="/#work">Work</a><a href="/#engineering">Engineering</a><a href="/#experience">Experience</a><a href="/resume/">Résumé</a><a class="nav-cta" href="/#contact">Contact</a><button class="theme-toggle" type="button" data-theme-toggle aria-label="Switch color theme"><svg class="moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg><svg class="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg></button></nav>
    </div>
  </header>
  <main id="main" class="shell">
    <section class="page-hero">
      <a class="crumb" href="/#work">← All work</a>
      <p class="label">{label}</p>
      <h1>{title}</h1>
      <p class="lede">{lede}</p>
      <div class="btn-row"><a class="btn primary" href="{demo}">{demo_text} <span class="arrow" aria-hidden="true">→</span></a><a class="btn" href="{repo}">Source on GitHub ↗</a></div>
    </section>
    {media}
    <div class="prose">
{sections}
      <dl class="facts"><div><dt>Status</dt><dd>{status}</dd></div><div><dt>License</dt><dd>{license}</dd></div><div><dt>Built with</dt><dd>{stack}</dd></div></dl>
    </div>
  </main>
  <footer class="site-footer"><div class="shell"><span>© 2026 Anthony Firn · EvolveTech</span><nav aria-label="Footer"><a href="/">Home</a><a href="/resume/">Résumé</a><a href="https://github.com/anthony-firn">GitHub</a></nav></div></footer>
</body>
</html>
"""


def video(name, url, alt, phone=False, w=1280, h=800):
    sources = (f'<source src="/assets/media/{name}.webm" type="video/webm"><source src="/assets/media/{name}.mp4" type="video/mp4">')
    tag = (f'<video data-autoplay muted loop playsinline preload="metadata" poster="/assets/media/{name}-poster.webp" '
           f'width="{w}" height="{h}" aria-label="{html.escape(alt)}">{sources}</video>')
    if phone:
        return f'<figure class="case-media phone-stage reveal"><div class="phone">{tag}</div></figure>'
    return (f'<figure class="case-media reveal"><div class="browser"><div class="browser-bar" aria-hidden="true"><i></i><i></i><i></i>'
            f'<span>{url}</span></div>{tag}</div></figure>')


def section(title, *paragraphs, bullets=()):
    body = "".join(f"<p>{p}</p>" for p in paragraphs)
    if bullets:
        body += "<ul>" + "".join(f"<li>{b}</li>" for b in bullets) + "</ul>"
    return f'      <section><h2>{title}</h2>{body}</section>'


def callout(title, text):
    return f'      <aside class="callout"><h2>{title}</h2><p>{text}</p></aside>'


PAGES = [
    dict(slug="retirement", title="Retirement Research", poster="retirement-poster.webp",
         label="Investing · Python · PyTorch · Open source",
         description="A simulation engine that compares retirement withdrawal strategies by spendable income after tax and by how often they break.",
         lede="How much can savings pay each month, and how often does a plan break? A simulation engine that answers in spendable dollars after tax, with the assumptions and failures in view.",
         demo="/play/retirement/", demo_text="Open the income explorer", repo="https://github.com/anthony-firn/retirement-research",
         media=video("retirement", "evolvetech.dev/play/retirement", "The income explorer: changing savings and market cases re-ranks 15 strategies by income and risk."),
         status="Research release", license="Apache 2.0", stack="Python, PyTorch, FastAPI",
         sections=[
             callout("Research, not advice.", "Results are simulations on partly reconstructed market history, some strategies hold leveraged funds, and the tax model is a simplified US/California retiree. Use it to understand trade-offs, then check a plan with a fee-only fiduciary."),
             section("The problem", "Most retirement calculators show a single return number. Retirees live on monthly cash after tax, and what hurts is a plan that breaks early in a bad decade. I wanted a model that measures those things directly."),
             section("What I built", bullets=[
                 "A GPU simulator (PyTorch) that runs thousands of portfolios at once over reshuffled daily market histories from 1972 to 2026, including taxes by fund type, rebalancing bands, cash buckets and spending guardrails.",
                 "Searches that evolve fund weights and withdrawal rules, then a separate validation pass on 2,000 fresh 40-year histories and seven stress cases: weaker trend-following, a gold bear market, only recent history, and higher taxes.",
                 "A reproducible data pipeline that documents every reconstructed fund history, and keeps failed ideas in the record.",
                 "A local planning app (FastAPI, installable web app with iOS and Android shells), plus the browser explorer on this site."]),
             section("Results worth noting", "Against a 60/40 portfolio and an all-stock portfolio run with the same rules, the best tested strategies paid more in bad histories and broke less often in the base case. The stress cases show where that edge shrinks, which is the point of publishing them."),
             section("Engineering choices", bullets=[
                 "Vectorised simulation on the GPU made full 40-year daily paths affordable across thousands of candidates.",
                 "Validation uses different random seeds from the search, so winners are not just tuned to their own test data.",
                 "Before publishing, the repository history was audited and rewritten to remove a private household's planning data."]),
         ]),
    dict(slug="emberwake", title="Emberwake", poster="emberwake-poster.webp",
         label="Games · Godot 4 · Blender · WebAssembly",
         description="Emberwake is a 3D action roguelike made with Godot and Blender, playable in the browser.",
         lede="A 3D action roguelike. Descend through an endless crypt of seeded rooms, fight guardians, gather soulfire and choose blessings — in a browser tab.",
         demo="/play/emberwake/", demo_text="Play in the browser", repo="https://github.com/anthony-firn/emberwake",
         media=video("emberwake", "evolvetech.dev/play/emberwake", "Emberwake gameplay: the hero fights through procedurally generated crypt rooms."),
         status="Playable prototype", license="MIT", stack="Godot 4, Blender, GDScript",
         sections=[
             section("How to play", bullets=["WASD or arrow keys to move, the mouse to aim, and a left click or J to strike.", "Space to dash, E to use a shrine, Esc to pause, and 1–3 to choose a blessing.", "Needs a keyboard, a mouse and WebGL 2; about 40 MB downloads the first time."]),
             section("What I built", bullets=[
                 "Procedural rooms, lighting, combat particles and synthesized sound effects, all generated at runtime from a seed.",
                 "Low-poly characters and props built by a Python script in Blender, so every asset is reproducible from source.",
                 "An agent bridge: an AI model can observe and play the game over TCP, which doubles as an automated test harness.",
                 "A web export pipeline: single-threaded WebAssembly with its start-up script moved out of the page so it runs under a strict Content-Security-Policy."]),
             section("A bug the web build caught", "Testing the browser build showed the start button never responded: an empty overlay layer was invisible but still took every click, on desktop too. The smoke test called the start function directly, so it had missed it. One line fixed it, and the video above was rendered frame by frame with Godot's movie writer driving that same agent bridge."),
         ]),
    dict(slug="symmetry-forge", title="Symmetry Forge", poster="symmetry-poster.webp",
         label="Research tools · Python · Pyodide",
         description="Symmetry Forge is an experimental Python toolkit for graph automorphisms and combinatorial designs, running live in the browser.",
         lede="An experimental Python toolkit for generating small combinatorial structures, computing their symmetries and comparing how unusual they are.",
         demo="/play/symmetry-forge/", demo_text="Open the symmetry lab", repo="https://github.com/anthony-firn/symmetry-forge",
         media=video("symmetry", "evolvetech.dev/play/symmetry-forge", "The Symmetry Lab computing symmetry groups as graphs are chosen and edited."),
         status="Research prototype", license="MIT", stack="Python, Pyodide, Web Workers",
         sections=[
             section("What it does", bullets=[
                 "Builds graphs, Steiner systems and relational structures, and computes automorphism groups and canonical labels by partition refinement and search.",
                 "Optional nauty and SAT back ends for larger cases, with a pure-Python default that runs anywhere.",
                 "Logged experiments from the Fano plane to a bounded attempt at constructions inspired by codes and the Monster group."]),
             section("Bringing Python to the browser", "The lab loads the unmodified package into Pyodide (CPython compiled to WebAssembly) inside a Web Worker. The page stays responsive, a search that runs too long is cancelled by replacing the worker, and nothing leaves the visitor's machine. The rotating hypercube on the homepage uses the same result: 384 symmetries, which the library computes in milliseconds."),
             section("What it is not", "It is for reproducible exploration and teaching. Computing something is not proving it, and the samples are starting points rather than discoveries."),
         ]),
    dict(slug="pulse-pop", title="Pulse Pop", poster="pulse-pop-poster.webp",
         label="Mobile · Expo · React Native",
         description="Pulse Pop is a quick touch game built with Expo and React Native for iPhone, Android and the web.",
         lede="Tap the shrinking pulses before they vanish. Chain hits into combos, earn coins and unlock skins in a 30-second round — one codebase for iPhone, Android and the web.",
         demo="/play/pulse-pop/", demo_text="Play in the browser", repo="https://github.com/anthony-firn/pulse-pop",
         media=video("pulse-pop", "", "Pulse Pop gameplay on a phone: tapping pulses to build combos.", phone=True, w=430, h=860),
         status="Playable prototype", license="Apache 2.0", stack="Expo, React Native",
         sections=[
             section("What I built", bullets=[
                 "Game rules — scoring, combo caps, coin payouts and safe cosmetic unlocks — kept separate from rendering and covered by unit tests.",
                 "One React Native codebase that runs in Expo Go on phones and exports to the static web build on this site.",
                 "Haptics and local persistence on device, with no accounts, ads, analytics or network services."]),
             section("What's next", "It has not been submitted to the app stores. The repository documents a fair free-to-play model — optional rewarded ads and cosmetic purchases with no paid scoring advantage — but none of it is implemented."),
         ]),
]


def main():
    for page in PAGES:
        out = ROOT / "projects" / page["slug"] / "index.html"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(HEAD.format(**{**page, "sections": "\n".join(page["sections"])}))
        print("wrote", out.relative_to(ROOT))


if __name__ == "__main__":
    main()
