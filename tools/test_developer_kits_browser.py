"""Check the published developer journey, package downloads and offline fixtures."""
import argparse
import hashlib
import json
from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]/'public'
DEFAULT="default-src 'self'; style-src 'self'; img-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'none'"
LLM="default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self' https://huggingface.co https://*.huggingface.co https://*.hf.co; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'"


def check(base, screens=None):
    errors=[];mail=[];outside=[]
    with sync_playwright() as p:
        browser=p.chromium.launch()
        context=browser.new_context(viewport={'width':1440,'height':1000},accept_downloads=True)
        if base.startswith('http://'):
            def policy(route):
                response=route.fetch();headers={**response.headers}
                if route.request.resource_type=='document':headers['content-security-policy']=LLM if '/play/evolve-llm/' in route.request.url else DEFAULT
                route.fulfill(response=response,headers=headers)
            context.route('**/*',policy)
        page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
        page.on('request',lambda r:mail.append(r.url) if '/mail/api/' in r.url else None)
        page.goto(base,wait_until='domcontentloaded')
        order=page.locator('article.case').evaluate_all("as=>as.slice(0,3).map(a=>a.getAttribute('aria-labelledby'))")
        assert order==['case-evolve-inbox','case-evolve-llm','case-evolve-hosting'],order
        page.goto(base+'developers/inbox/',wait_until='networkidle')
        for operation,expected in [('list','demo-welcome-001'),('get','fictional messages'),('status','fixture'),('throttled','throttled')]:
            page.locator('#inbox-operation').select_option(operation);page.locator('#inbox-run').click()
            page.wait_for_function('() => !document.querySelector("#inbox-run").disabled')
            assert expected.lower() in page.locator('#inbox-example-output').inner_text().lower()
        assert not mail,mail
        manifest=json.loads((ROOT/'developers/downloads/manifest.json').read_text())
        for item,route in zip(manifest['artifacts'],['developers/inbox/','developers/llm/']):
            page.goto(base+route,wait_until='networkidle')
            with page.expect_download() as download:page.locator('.page-hero a.primary').click()
            path=Path(download.value.path())
            assert hashlib.sha256(path.read_bytes()).hexdigest()==item['sha256']
        if screens:
            screens.mkdir(parents=True,exist_ok=True)
            page.goto(base+'developers/inbox/');page.screenshot(path=str(screens/'inbox-guide.png'))
        page.goto(base+'play/evolve-llm/examples/',wait_until='networkidle')
        page.on('request',lambda r:outside.append(r.url) if urlsplit(r.url).netloc!=urlsplit(base).netloc else None)
        page.locator('#fixture').click();page.wait_for_function("() => document.querySelector('#status').textContent.startsWith('Fixture complete')")
        assert page.locator('#output').inner_text()=='This is a scripted SDK fixture.'
        assert not outside,outside
        page.locator('#fixture').click();page.locator('#cancel').click()
        page.wait_for_function("() => document.querySelector('#status').textContent.startsWith('aborted:')")
        if screens:page.screenshot(path=str(screens/'llm-example.png'))
        for width in (320,390,1360):
            page.set_viewport_size({'width':width,'height':844})
            for route in ['developers/','developers/inbox/','developers/llm/','play/evolve-llm/examples/']:
                page.goto(base+route,wait_until='domcontentloaded')
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+1'),(width,route)
        assert not errors,errors
        browser.close()
    print('Project order, offline client/error examples, exact downloads, Worker stream/cancel, CSP and mobile widths passed.')


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('url',nargs='?',default='http://127.0.0.1:8876/')
    parser.add_argument('--screens',type=Path)
    args=parser.parse_args();check(args.url,args.screens)
