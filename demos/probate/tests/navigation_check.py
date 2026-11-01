"""Exercise the homepage-to-helper flow, shared chrome, themes and immediate cross-form saves."""
import sys,tempfile,json
from pathlib import Path
from playwright.sync_api import sync_playwright
BASE=sys.argv[1].rstrip('/') if len(sys.argv)>1 else 'http://localhost:8250'
OUT=Path(tempfile.gettempdir())/'probate-suite-navigation';OUT.mkdir(exist_ok=True)
errors=[]
with sync_playwright() as p:
 browser=p.chromium.launch()
 page=browser.new_page(viewport={'width':1280,'height':900})
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(BASE+'/')
 page.get_by_role('article',name='California Probate Form Helpers').scroll_into_view_if_needed()
 page.get_by_role('link',name='Open the form guide',exact=True).click()
 page.wait_for_url('**/play/probate/')
 page.get_by_role('button',name='Spousal or partner property',exact=False).click()
 assert page.locator('#spousal-path').is_visible() and page.locator('#formal-path').is_hidden()
 page.get_by_role('button',name='Open probate & appoint someone',exact=False).click()
 assert page.locator('#formal-path').is_visible() and page.locator('#spousal-path').is_hidden()
 assert 'DE-121' in page.locator('#formal-path').inner_text()
 page.get_by_role('button',name='Spousal or partner property',exact=False).click()
 page.screenshot(path=str(OUT/'guide-desktop.png'),full_page=True)
 page.get_by_role('link',name='Start DE-221',exact=True).click()
 page.get_by_role('button',name='Start',exact=True).click()
 page.get_by_label('Their full legal name').fill('SAVED ACROSS FORMS')
 # Navigate immediately, before the old 300 ms autosave delay could have elapsed.
 nav=page.get_by_role('navigation',name='Form helpers',exact=True)
 nav.locator('a[href="../de226/"]').click()
 page.locator('#start-helper').wait_for()
 page.get_by_text('Reuse details or open saved answers',exact=True).click()
 page.get_by_role('button',name='Copy shared details from DE-221',exact=True).click()
 assert page.locator('#q-d_name').input_value()=='SAVED ACROSS FORMS'
 snapshots=[]
 for slug in ['de111','de221','de226','de120','de135']:
  page.goto(BASE+'/play/'+slug+'/')
  nav=page.get_by_role('navigation',name='Form helpers',exact=True)
  assert nav.locator('a').count()==6
  assert nav.locator('a[aria-current="page"]').get_attribute('href')=='../'+slug+'/'
  assert page.locator('h1').count()==1
  if slug in ['de111','de221']:
   page.get_by_role('button',name='Start',exact=True).or_(page.get_by_role('button',name='Continue where I left off',exact=True)).click()
  else:
   page.locator('#start-helper').click()
  initial=page.locator('.card h2:visible').inner_text()
  page.get_by_role('button',name='Next',exact=True).click()
  assert page.locator('.card h2:visible').inner_text()!=initial
  page.get_by_role('button',name='Back',exact=True).click()
  assert page.locator('.card h2:visible').inner_text()==initial
  assert page.locator('.sidebar').is_visible()
  assert page.locator('.card h2:visible').count()==1
  snapshots.append(page.locator('body').evaluate('(n)=>({font:getComputedStyle(n).font,background:getComputedStyle(n).backgroundColor})'))
  page.screenshot(path=str(OUT/(slug+'-desktop.png')),full_page=True)
  # Same saved theme on every helper, and keyboard-accessible form links on phones.
  page.get_by_role('button',name='Switch to dark mode',exact=True).click()
  assert page.evaluate('getComputedStyle(document.documentElement).colorScheme')=='dark'
  page.get_by_role('button',name='Switch to light mode',exact=True).click()
  page.set_viewport_size({'width':390,'height':844})
  assert nav.is_visible()
  assert page.evaluate('document.documentElement.scrollWidth')<=390
  page.get_by_role('button',name='Show all steps',exact=True).click()
  assert page.locator('.steps').is_visible()
  page.screenshot(path=str(OUT/(slug+'-phone.png')),full_page=True)
  page.set_viewport_size({'width':1280,'height':900})
 assert all(x==snapshots[0] for x in snapshots),snapshots
 page.goto(BASE+'/play/probate/')
 page.set_viewport_size({'width':390,'height':844})
 page.screenshot(path=str(OUT/'guide-phone.png'),full_page=True)
 assert page.evaluate('document.documentElement.scrollWidth')<=390
 page.get_by_role('link',name='EvolveTech home',exact=False).first.click()
 page.wait_for_url(BASE+'/')
 page.get_by_role('article',name='California Probate Form Helpers').scroll_into_view_if_needed()
 page.wait_for_function('getComputedStyle(document.querySelector("[aria-labelledby=case-probate]")).opacity === "1"')
 page.screenshot(path=str(OUT/'homepage-phone.png'))
 assert not errors,errors
 browser.close()
print('Homepage, both guide routes, all five helpers, shared styles, themes, phone navigation and immediate autosave passed.')
print('Screenshots:',OUT)
