"""Shared static chrome for every probate helper and the guide."""
from html import escape
FORMS = {
    'de111': ('DE-111', 'Formal probate', 'Petition for Probate Helper'),
    'de221': ('DE-221', 'Spousal petition', 'Spousal Property Petition Helper'),
    'de226': ('DE-226', 'Proposed order', 'Spousal Property Order Helper'),
    'de120': ('DE-120', 'Hearing notice', 'Hearing Notice Helper'),
    'de135': ('DE-135', 'Handwriting proof', 'Handwriting Proof Helper'),
}

def header(active):
    def link(slug, number, label):
        current = ' aria-current="page"' if slug == active else ''
        return f'<a href="../{slug}/"{current}><strong>{number}</strong><span>{label}</span></a>'
    nav = link('probate', 'Start here', 'Guide & filing steps') + ''.join(link(k, v[0], v[1]) for k,v in FORMS.items())
    heading = ''
    if active in FORMS:
        number, _, title = FORMS[active]
        heading = f'''<div class="wrap top-row form-heading"><h1 class="brand-title"><a class="brand" href="./"><span class="brand-mark" aria-hidden="true">{number}</span>{title}</a></h1><p id="save-status" class="save-status" role="status" aria-live="polite"></p></div>'''
    return f'''<header class="top suite-header">
<div class="wrap suite-masthead"><a class="suite-brand" href="../probate/"><span class="suite-mark" aria-hidden="true">E</span><span>EvolveTech<small>California probate helpers</small></span></a><div class="suite-actions"><a class="suite-home" href="/">EvolveTech home <span aria-hidden="true">↗</span></a><button type="button" class="link theme-control" data-theme-toggle>Theme</button></div></div>
<div class="wrap"><nav class="form-nav" aria-label="Form helpers">{nav}</nav></div>
{heading}</header>'''

def sidebar():
    return '''<nav class="sidebar" aria-label="Steps"><p id="progress-text" class="progress-text"></p><button type="button" id="steps-toggle" class="steps-toggle secondary" aria-expanded="false" aria-controls="steps">Show all steps</button><ol id="steps" class="steps"></ol></nav>'''

def footer():
    return '''<footer class="wrap foot suite-footer"><p><strong>Private, on your device.</strong> Answers stay in this browser. Save a file to keep a backup, and erase saved answers on shared devices.</p><p>Drafting assistance, not legal advice. These tools are not affiliated with the courts. Read every page before signing or filing.</p><nav aria-label="Helper resources"><a href="../probate/">All forms & filing guide</a><a href="../probate/#sources">Official sources</a><a href="https://selfhelp.courts.ca.gov/self-help-centers" target="_blank" rel="noopener">Court self-help</a><a href="/">EvolveTech home</a></nav></footer>'''

def shell(active):
    return f'''<body class="on-welcome" data-form="{active}"><a class="skip" href="#main">Skip to the questions</a>{header(active)}<div class="wrap layout">{sidebar()}<main id="main" class="card" tabindex="-1"><noscript>This tool needs JavaScript to build the PDF on your device. Use the official form at courts.ca.gov if JavaScript is unavailable.</noscript></main></div>{footer()}</body>'''
