import {TITLES,importShared,estate,recipients,warnings,proofReady,serviceDateError} from './model.js';
import {schemas,guidance} from './schema.js';
import {buildPdf} from './pdf.js';
const id=document.body.dataset.form,key=`${id}-answers-v1`,main=document.querySelector('main');
let answers={},uploads=[];try{const a=JSON.parse(localStorage.getItem(key)||'{}');if(a&&typeof a==='object'&&!Array.isArray(a))answers=a;}catch{}
const el=(tag,attrs={},...children)=>{const n=document.createElement(tag);for(const[k,v]of Object.entries(attrs)){if(k.startsWith('on'))n.addEventListener(k.slice(2),v);else if(v!==false&&v!=null)n.setAttribute(k,v===true?'':v);}n.append(...children.flat().filter(x=>x!==null&&x!==false&&x!==undefined));return n;};
function download(data,name,type){const url=URL.createObjectURL(new Blob([data],{type})),a=el('a',{href:url,download:name});document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
const status=el('p',{role:'status','aria-live':'polite'});
function save(){try{localStorage.setItem(key,JSON.stringify(answers));status.textContent='Answers saved on this device. Uploaded documents are kept in memory only.';}catch{status.textContent='Browser storage is unavailable. Save your answers to a file before leaving.';}}
function setControls(){for(const input of main.querySelectorAll('[data-answer]')){const v=answers[input.dataset.answer];if(input.type==='checkbox')input.checked=!!v;else input.value=typeof v==='string'?v:'';}refresh();}
function acceptImport(a,shared=false){if(!a||typeof a!=='object'||Array.isArray(a))throw Error('Expected a saved answers object.');answers=shared?{...answers,...importShared(a)}:Object.fromEntries(Object.entries(a).filter(([k,v])=>schemas[id].some(s=>s.fields.some(f=>f.id===k))&&['string','boolean'].includes(typeof v)));save();setControls();}
const imports=el('div',{class:'actions'},el('button',{type:'button',onclick:()=>{try{const old=JSON.parse(localStorage.getItem('de221-answers-v1')||'null');if(!old)throw Error('No DE-221 answers are saved in this browser. Open a saved answers file instead, or enter the details below.');acceptImport(old,true);status.textContent='Copied shared details only. Final property lists, witness statements and completed service were not imported.';}catch(e){status.textContent=e.message;}}},'Copy shared details from DE-221'));
const importFile=el('input',{type:'file',accept:'.json,application/json',id:'answers-file'});
const importKind=el('select',{id:'import-kind'},el('option',{value:'shared'},'Shared details from another helper'),el('option',{value:'this'},'Restore answers for this form'));
importFile.addEventListener('change',async()=>{try{const f=importFile.files[0];if(f)acceptImport(JSON.parse(await f.text()),importKind.value==='shared');}catch(e){status.textContent=`Could not open answers: ${e.message}`;}finally{importFile.value='';}});
const sourceLinks=el('p',{},el('a',{href:`https://selfhelp.courts.ca.gov/jcc-form/${id.toUpperCase()}`,target:'_blank',rel:'noopener'},'Official court form'),` · Revision ${guidance[id].revision} · `,el('a',{href:'../probate/#sources'},'Sources and filing sequence'));
const sections=schemas[id].map((section,i)=>el('section',{},el('h2',{},`${i+1}. ${section.title}`),...section.fields.map(q=>{
 const inputId=`q-${q.id}`;let input;
 if(q.type==='select')input=el('select',{id:inputId,'data-answer':q.id},el('option',{value:''},'Choose…'),...q.options.map(([v,label])=>el('option',{value:v},label)));
 else if(q.type==='textarea')input=el('textarea',{id:inputId,rows:q.id==='passing'||q.id==='confirmed'?9:3,'data-answer':q.id});
 else input=el('input',{id:inputId,type:q.type==='check'?'checkbox':q.type,'data-answer':q.id,autocomplete:'off'});
 input.addEventListener(q.type==='select'||q.type==='check'?'change':'input',()=>{answers[q.id]=q.type==='check'?input.checked:input.value;save();refresh();});
 const label=el('label',{for:inputId},q.label);if(q.hint)input.setAttribute('aria-describedby',`${inputId}-hint`);
 return el('div',{class:q.type==='check'?'question check':'question','data-question':q.id},q.type==='check'?el('div',{},input,label):[label,input],q.hint?el('p',{class:'hint',id:`${inputId}-hint`},q.hint):null);
})));
const uploadList=el('ol',{});
const fileInput=el('input',{type:'file',multiple:true,accept:'.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png',id:'instrument-files'});
fileInput.addEventListener('change',async()=>{try{for(const f of fileInput.files){if(f.size>25*1024*1024)throw Error('Each uploaded file must be 25 MB or smaller.');uploads.push({name:f.name,type:f.type,bytes:new Uint8Array(await f.arrayBuffer())});}save();refresh();}catch(e){status.textContent=e.message;}fileInput.value='';});
const uploadsSection=id==='de135'?el('section',{},el('h2',{},'Attach the instrument being authenticated'),el('p',{},'Choose the complete PDF or images in page order. Files stay in browser memory and are appended as Attachment 4. They are not included in saved JSON; select them again after reloading. Do not attach unrelated handwriting samples containing private information.'),el('label',{for:'instrument-files'},'PDF, JPEG or PNG copies'),fileInput,uploadList):null;
const review=el('div',{class:'review',role:'status','aria-live':'polite'});
const preview=el('pre',{class:'preview'});
const result=el('p',{role:'status','aria-live':'polite'});
async function generate(){result.textContent='Building draft…';try{
 if(id==='de120'&&answers.notice_type==='de111')throw Error('Use DE-121 for the opening DE-111 notice.');
 if(id==='de120'&&answers.service_mode==='completed'&&serviceDateError(answers))throw Error(serviceDateError(answers));
 const [r,m]=await Promise.all([fetch(new URL(`./${id}.pdf`,import.meta.url)),fetch(new URL(`./${id}-fields.json`,import.meta.url))]);if(!r.ok||!m.ok)throw Error('The court template could not load. Reload and try again.');
 const built=await buildPdf(window.PDFLib,await r.arrayBuffer(),await m.json(),id,answers,uploads);
 download(built.bytes,`${id.toUpperCase()}-DRAFT.pdf`,'application/pdf');result.textContent=`Downloaded ${built.pages} page(s). ${built.notes.join(' ')} Read every page before signing or filing.`;
}catch(e){result.textContent=`Could not build PDF: ${e.message}`;}}
const guide=guidance[id];
main.replaceChildren();
main.append(el('h1',{},`${id.toUpperCase()} helper`),el('p',{class:'subtitle'},TITLES[id]),el('p',{class:'lede'},guide.intro),sourceLinks,
 el('aside',{class:'note'},'Your answers and documents stay in your browser. This tool prepares drafts, not legal approval. Keep personal data out of shared devices. No family information is prefilled.'),
 el('details',{},el('summary',{},'Reuse details or open saved answers'),imports,el('label',{for:'import-kind'},'What to import'),importKind,el('label',{for:'answers-file'},'Saved answers JSON'),importFile,el('p',{class:'hint'},'A polished PDF may differ from saved helper answers. Enter the final text below; imports never treat an earlier draft as authoritative.')),
 status,...sections,uploadsSection,
 el('section',{},el('h2',{},'Review and download'),review,el('details',{},el('summary',{},'Review what will be filled or attached'),preview),el('div',{class:'actions'},el('button',{type:'button',class:'primary',onclick:generate},'Download draft PDF'),el('button',{type:'button',onclick:()=>download(JSON.stringify(answers,null,2),`${id}-answers.json`,'application/json')},'Save answers to a file'),el('button',{type:'button',onclick:()=>{if(confirm('Erase answers and uploaded copies for this form from this browser?')){localStorage.removeItem(key);answers={};uploads=[];setControls();status.textContent='Answers erased.';}}},'Erase this form’s answers')),result),
 el('section',{},el('h2',{},'What happens next'),el('p',{},guide.after),el('p',{},'County requirements and fees vary. Check the court’s probate instructions and current fee schedule. Do not assume a generated PDF means the packet is complete.')));
function refresh(){
 const w=warnings(id,answers,uploads);review.replaceChildren(el('p',{},w.length?'Check these before using the draft:':'No missing items detected by these limited checks. Review the actual PDF.'),...(w.length?[el('ul',{},...w.map(x=>el('li',{},x)))]:[]));
 if(id==='de120'){
  const visible=answers.service_mode==='completed';for(const k of ['mailer','mailer_address','mailed','mail_place','mail_method','petition_copy','service_confirmed','service_date'])main.querySelector(`[data-question="${k}"]`).hidden=!visible;
  if(answers.notice_type==='spousal'&&!answers.description){answers.description='Spousal or Domestic Partner Property Petition (DE-221), requesting determination of property passing to the surviving spouse or registered domestic partner and/or confirmation of property already belonging to the survivor.';main.querySelector('[data-answer="description"]').value=answers.description;save();}
  preview.textContent=`Estate: ${estate(answers)}\nCase: ${answers.case_number||'(blank)'}\nFiled by: ${answers.filer||'(blank)'}\nPetition: ${answers.description||'(blank)'}\nHearing: ${answers.hearing||'(blank)'} ${answers.hearing_time||''}\nProof of mailing: ${proofReady(answers)?'entered actual service; mailer must review and sign':'blank—notice draft only'}\nRecipient worksheet:\n${recipients(answers).map(r=>r.name+' | '+r.address).join('\n')}`;
 }else if(id==='de226') preview.textContent=`PROPOSED ORDER\nEstate: ${estate(answers)}\nSurvivor: ${answers.s_name||'(blank)'}\n\nAttachment 5a (DE-221 Attachment 7a):\n${answers.passing||'(none)'}\n\nAttachment 7a (DE-221 Attachment 7b):\n${answers.confirmed||'(none)'}\n\nAttachment 8:\n${answers.remaining||'(none)'}\n\nAttachment 9:\n${answers.orders||'(none)'}\n\nJudicial signature and date: blank.`;
 else preview.textContent=`Witness: ${answers.witness||'(blank)'}\nYears acquainted: ${answers.years||'(blank)'}\nRelationship: ${answers.relationship||'(none stated)'}\nInstrument worksheet label: ${answers.instrument||'(blank)'}\nKnowledge: ${['saw_write','saw_document','letters','other'].filter(k=>answers[k]).join(', ')||'(none selected)'}\nItem 3b: ${answers.saw_document?answers.document_details||'':''}\nItem 3d: ${answers.other?answers.other_details||'':''}\nItem 4 is a printed sworn statement. Do not sign unless you can identify the handwriting and signature.\nCopies: ${uploads.map(x=>x.name).join(', ')||'(none selected)'}\nAttorney certification: blank.`;
 uploadList.replaceChildren(...uploads.map((f,i)=>el('li',{},f.name,' ',el('button',{type:'button',onclick:()=>{uploads.splice(i,1);refresh();}},'Remove'))));
}
setControls();
