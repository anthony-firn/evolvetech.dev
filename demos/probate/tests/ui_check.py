"""Browser integration checks. All fixtures are fictional. Start the site on port 8230 first."""
import sys, tempfile
from pathlib import Path
import fitz
from playwright.sync_api import sync_playwright
BASE=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8230/play/'
OUT=Path(tempfile.gettempdir())/'probate-helper-browser';OUT.mkdir(exist_ok=True)
errors=[]
def step(page,name):
 nav=page.get_by_role('navigation',name='Steps',exact=True)
 button=nav.get_by_role('button',name=name,exact=True)
 if not button.is_visible():page.get_by_role('button',name='Show all steps',exact=True).click()
 button.click()
 assert nav.locator('[aria-current="step"]').count()==1

shared=dict(d_name='JANE SAMPLE',d_date='2026-09-01',county='Example',case_number='TEST-123',court_street='1 Court Road',court_cityzip='Example, CA 90000',c_name='Alex Sample',c_street='123 Example Road',c_city='Example',c_state='CA',c_zip='90000',c_phone='555-555-0142',s_name='Alex Sample',will='yes',d_lived='ca',partner='spouse',hearing='2026-10-30',hearing_time='9 AM',dept='2')
with sync_playwright() as p:
 browser=p.chromium.launch()
 for slug in ['de226','de120','de135']:
  page=browser.new_page(viewport={'width':1280,'height':900},accept_downloads=True)
  page.on('pageerror',lambda e:errors.append(str(e)))
  # Enforce the production play policy even on the simple local preview server.
  if BASE.startswith('http://localhost'):
   def csp(route):
    response=route.fetch();headers=dict(response.headers)
    if 'text/html' in headers.get('content-type',''):headers['content-security-policy']="default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'"
    route.fulfill(response=response,headers=headers)
   page.route('**/*',csp)
  page.goto(BASE+slug+'/');page.locator('#start-helper').wait_for()
  page.evaluate('(a)=>localStorage.setItem("de221-answers-v1",JSON.stringify({...a,passing:"STALE PROPERTY",examined:true,service_confirmed:true}))',shared)
  page.get_by_text('Reuse details or open saved answers',exact=True).click()
  page.get_by_role('button',name='Copy shared details from DE-221',exact=True).click()
  page.locator('#start-helper').click()
  assert page.locator('#q-d_name').input_value()=='JANE SAMPLE'
  if slug=='de226':
   step(page,'Property lists—copy from the final petition')
   assert page.locator('#q-passing').input_value()==''
   page.locator('#q-passing').fill('Item A: The decedent’s undivided 50% interest in Lot 1 of Example Map, APN 123-456.\nItem B: 2025 Example Car, VIN EXAMPLE123.')
   page.locator('#q-order_reviewed').check()
  elif slug=='de120':
   step(page,'The petition being heard')
   page.locator('#q-notice_type').select_option('spousal')
   page.locator('#q-filer').fill('Alex Sample')
   step(page,'Recipients and proof of mailing')
   page.locator('#q-service_mode').select_option('notice')
   assert page.locator('#q-mailer').is_hidden()
   page.locator('#q-recipients').fill('Adult Child | 1 Example Street, Example CA 90000')
  else:
   step(page,'The person who knows the handwriting')
   page.locator('#q-witness').fill('Pat Sample')
   page.locator('#q-witness_address').fill('2 Example Road, Example CA 90000')
   page.locator('#q-years').fill('20')
   page.locator('#q-relationship').fill('Child')
   step(page,'Personal knowledge—select only what the witness can truthfully say')
   page.locator('#q-saw_write').check();page.locator('#q-examined').check()
   instrument=OUT/'fictional-instrument.pdf'
   d=fitz.open();d.new_page().insert_text((50,50),'Fictional instrument for browser test');d.save(instrument);d.close()
   step(page,'Attach the instrument')
   page.locator('#instrument-files').set_input_files(str(instrument))
  step(page,'Check and download')
  with page.expect_download() as event:page.get_by_role('button',name='Download draft PDF',exact=True).click()
  dest=OUT/(slug+'.pdf');event.value.save_as(dest)
  assert 'JANE SAMPLE' in fitz.open(dest)[0].get_text()
  assert 'Could not build' not in page.locator('main').inner_text()
  page.screenshot(path=str(OUT/(slug+'-desktop.png')),full_page=True)
  page.reload();page.locator('#start-helper').wait_for();page.locator('#start-helper').click();assert page.locator('#q-d_name').input_value()=='JANE SAMPLE'
  if slug=='de135':
   page.wait_for_function('document.querySelector(".preview").textContent.includes("Copies: (none selected)")')
  page.set_viewport_size({'width':390,'height':844});page.screenshot(path=str(OUT/(slug+'-phone.png')),full_page=True)
  assert page.evaluate('document.documentElement.scrollWidth')<=390
  # Save JSON is a real file download.
  with page.expect_download():page.get_by_role('button',name='Save answers to a file',exact=True).click()
  print(slug,'browser download, import, persistence, privacy and phone width passed')
  page.close()
 browser.close()
assert not errors,errors
print('Browser checks passed; fictional screenshots and PDFs in',OUT)
