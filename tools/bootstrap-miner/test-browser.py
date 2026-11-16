"""Real WASM and UI with a deliberately easy simulated pool; no real earnings."""
import subprocess, os
from pathlib import Path
from playwright.sync_api import sync_playwright

root=Path(__file__).resolve().parent
process=subprocess.Popen(['node',str(root/'browser-fixture.mjs')],stdin=subprocess.PIPE,stdout=subprocess.PIPE,text=True)
try:
 url=process.stdout.readline().strip()
 with sync_playwright() as p:
  for mode in ([os.environ['BOOTSTRAP_TEST_MODE']] if os.environ.get('BOOTSTRAP_TEST_MODE') else ['light','full']):
   browser=p.chromium.launch(executable_path='/usr/bin/google-chrome');page=browser.new_page();errors=[]
   page.on('pageerror',lambda e:errors.append(str(e)))
   page.goto(url);page.locator('#ready').get_by_text('Waiting',exact=False).wait_for()
   page.wait_for_timeout(1000);assert page.locator('#log').text_content()==''
   page.locator('#start').click();assert 'checkbox' in page.locator('#status').inner_text()
   page.locator('#mode').select_option(mode);page.locator('#threads').select_option('4' if mode=='full' else '1');page.locator('#duty').select_option('1');page.locator('#consent').check();page.locator('#start').click()
   page.wait_for_function('() => Number(document.querySelector("#accepted").textContent)>0 || document.querySelector("#stop").disabled',timeout=180000)
   assert int(page.locator('#accepted').inner_text())>0,page.locator('#status').inner_text()+'\n'+page.locator('#log').text_content()[:5000]
   assert 'Known RandomX test vector passed' in page.locator('#log').text_content(),page.locator('#log').text_content()[:5000]
   page.locator('#stop').click();assert page.locator('#start').is_enabled()
   page.wait_for_timeout(800);assert page.locator('#rate').inner_text()=='0 H/s'
   if mode=='full':
    page.locator('#start').click()
    process.stdin.write('funded\n');process.stdin.flush();page.locator('#refresh').click()
    page.wait_for_function('() => document.querySelector("#stop").disabled')
    assert page.locator('#start').is_disabled()
    assert 'ALGO has arrived' in page.locator('#status').inner_text()
   for width in [390,1280]:
    page.set_viewport_size({'width':width,'height':900});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   assert not errors,errors
   print(mode+': browser RandomX self-test, computed WASM shares, simulated pool ACKs, consent, Stop, layout and funding stop passed.',flush=True)
   browser.close()
finally:
 process.terminate();process.wait(timeout=10)
