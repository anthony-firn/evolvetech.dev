"""Prepare checked official PDFs and record every surviving AcroForm field. Run from any directory."""
from pathlib import Path
import fitz, json, hashlib, re
ROOT=Path(__file__).resolve().parent
for slug in ['de120','de135','de226']:
 src=ROOT/'forms'/f'{slug}-official.pdf'; d=fitz.open(src)
 cat=d.pdf_catalog(); d.xref_set_key(cat,'Perms','null'); d.xref_set_key(cat,'Names','null')
 af=int(d.xref_get_key(cat,'AcroForm')[1].split()[0]); d.xref_set_key(af,'XFA','null')
 for p in d:
  for w in list(p.widgets()):
   if w.field_type_string=='Button' or w.field_name in ['WhiteOut','NoticeHeaderMulti2','NoticeFooter1']:
    if w.field_name.endswith('Button1[0]'): p.insert_text((w.rect.x0,w.rect.y1-1),'form MC-410',fontsize=7)
    p.delete_widget(w)
   else:
    w.field_flags &= ~fitz.PDF_FIELD_IS_READ_ONLY
    w.update()
  props=d.xref_get_key(p.xref,'Resources/Properties')[1]
  for tag,x in re.findall(r'/(\w+)\s+(\d+) 0 R',props):
   if d.xref_get_key(int(x),'Name')[1]=='ViewOnly Layer':
    for c in p.get_contents(): d.update_stream(c,re.sub(rb'/OC /'+tag.encode()+rb' BDC.*?EMC',b'',d.xref_stream(c),flags=re.S))
 def children(x,key):
  kind,v=d.xref_get_key(x,key)
  return [int(n) for n in re.findall(r'(\d+) 0 R',v)] if kind=='array' else []
 def prune(x):
  if d.xref_object(x).strip()=='null' or d.xref_get_key(x,'FT')[1]=='/Btn' and d.xref_get_key(x,'Ff')[1] == '65536' or d.xref_get_key(x,'T')[1] in ['WhiteOut','NoticeHeaderMulti2','NoticeFooter1']: return False
  if d.xref_get_key(x,'T')[1] in ['Button1[0]','Warning[0]','Print[0]','Save[0]','Reset[0]','Print_bt[0]','Save_bt[0]','Reset_bt[0]','Save','Print','ResetForm']: return False
  kids=children(x,'Kids')
  if not kids: return d.xref_get_key(x,'FT')[0]!='null'
  keep=[k for k in kids if prune(k)]
  d.xref_set_key(x,'Kids','['+' '.join(f'{k} 0 R' for k in keep)+']')
  return bool(keep)
 roots=[x for x in children(af,'Fields') if prune(x)]
 d.xref_set_key(af,'Fields','['+' '.join(f'{k} 0 R' for k in roots)+']')
 dst=ROOT/'web'/f'{slug}.pdf'; d.save(dst,garbage=3,deflate=True,encryption=fitz.PDF_ENCRYPT_NONE)
 fields=[{'name':w.field_name,'label':w.field_label,'page':p.number+1,'type':w.field_type_string,'rect':list(w.rect)} for p in fitz.open(dst) for w in p.widgets()]
 (ROOT/'web'/f'{slug}-fields.json').write_text(json.dumps(fields,indent=2))
 print(slug,len(fields),'fields',hashlib.sha256(src.read_bytes()).hexdigest())
