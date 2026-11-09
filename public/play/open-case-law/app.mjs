import {normalize,safeURL,audit,sweep,evidence,concordance,ROLES,FITS,POSITIONS} from './engine.mjs';
import {discover} from './discovery.mjs';
import {loadWorkspace,storeWorkspace} from './storage.mjs';
const $=id=>document.getElementById(id);
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
let docs=[],notes=[],reading=null,activeSearch=null,searchNumber=0;
let saveQueue=Promise.resolve();
function message(text,error=false){$('message').textContent=text;$('message').className=error?'error':'';}
function tab(id){document.querySelectorAll('.panel').forEach(n=>n.hidden=n.id!==id);document.querySelectorAll('[data-tab]').forEach(n=>{n.classList.toggle('active',n.dataset.tab===id);if(n.dataset.tab===id)n.setAttribute('aria-current','page');else n.removeAttribute('aria-current');});}
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>tab(b.dataset.tab));
function link(text,url){const a=el('a',text);a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.referrerPolicy='no-referrer';return a;}
function download(name,contents,type='application/json'){const url=URL.createObjectURL(new Blob([contents],{type}));const a=el('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function workspace(){return {schema:'open-case-law-workspace-v1',sources:docs,notes};}
async function persist(){
  const snapshot=structuredClone(workspace());$('storage-status').textContent='Saving on this device…';
  saveQueue=saveQueue.catch(()=>{}).then(()=>storeWorkspace(snapshot));
  try{await saveQueue;$('storage-status').textContent='Saved automatically in this browser. Download a backup to use another device.';$('storage-status').className='hint';}
  catch{$('storage-status').textContent='Browser storage unavailable or full. Download a backup before closing this tab.';$('storage-status').className='error';message('Your work is in this tab, but could not be saved to browser storage. Download a backup before closing.',true);}
}
function prepare(records){return normalize(records);}
async function mergeSources(records,{preserve=false}={}){
  const incoming=await prepare(records);const merged=new Map(docs.map(d=>[d.id,d]));for(const d of incoming)if(!preserve||!merged.has(d.id))merged.set(d.id,d);
  if(merged.size>2000||[...merged.values()].reduce((n,d)=>n+d.text.length,0)>10000000)throw Error('Library limit reached: 2,000 sources or 10 million text characters. Export and remove sources before adding more.');
  docs=[...merged.values()];render();return incoming;
}
function sourceDetails(doc){const details=el('details',undefined,'source-details');details.append(el('summary','Source details & review checks'),el('p',audit(doc).join(' · ')),el('p','Content: '+doc.content_type+' · Retrieved: '+doc.retrieved_at),el('p','Text SHA-256: '+doc.sha256));return details;}
function sourceCard(doc,{saved=false,excerpt=''}={}){
  const card=el('article',undefined,'card');card.dataset.sourceId=doc.id;card.append(el('h3',doc.title),el('p',[doc.citation,doc.court,doc.date].filter(Boolean).join(' · '),'hint'));
  if(excerpt||doc.content_type==='snippet')card.append(el('p',excerpt||doc.text,'preview'));
  if(doc.content_type==='snippet')card.append(el('p','Search preview · Read the original before relying on this case.','hint'));
  const actions=el('div',undefined,'actions');
  if(safeURL(doc.url)){const a=link('Read original ↗',safeURL(doc.url));a.className='button';actions.append(a);}
  const view=el('button',saved?'Notes & saved text':'Preview & notes');view.onclick=()=>openSource(docs.find(d=>d.id===doc.id)||doc);actions.append(view);
  const save=el('button',docs.some(d=>d.id===doc.id)?'Saved ✓':'Save case');save.dataset.save=doc.id;save.disabled=docs.some(d=>d.id===doc.id);save.onclick=async()=>{try{await ready;await mergeSources([doc],{preserve:true});message('Case saved. Find it in Saved cases.');await persist();}catch(e){message(e.message,true);}};if(!saved)actions.append(save);
  if(saved){const remove=el('button','Remove');remove.onclick=async()=>{if(!confirm('Remove this case and its notes from this browser?'))return;docs=docs.filter(d=>d.id!==doc.id);notes=notes.filter(n=>n.source.id!==doc.id);render();message('Case removed.');await persist();};actions.append(remove);}
  card.append(actions,sourceDetails(doc));return card;
}
function updateSavedButtons(){document.querySelectorAll('[data-save]').forEach(b=>{const saved=docs.some(d=>d.id===b.dataset.save);b.textContent=saved?'Saved ✓':'Save case';b.disabled=saved;});if(reading){$('reader-save').disabled=docs.some(d=>d.id===reading.id);$('reader-save').textContent=$('reader-save').disabled?'Saved ✓':'Save case';}}
function render(){
  $('advanced-results').replaceChildren();
  $('count').textContent=String(docs.length);const q=$('local-query').value.trim();let rows=q?sweep(docs,[q],{mode:'all',sourceOnly:false}).results.map(r=>r.doc):docs;
  $('library').replaceChildren(...rows.map(d=>sourceCard(d,{saved:true})));
  if(!rows.length)$('library').append(el('div',q?'No saved text matches. Try fewer words.':'No saved cases yet. Find a case and click “Save case”, or import an opinion below.','empty'));
  updateSavedButtons();
}
$('local-query').oninput=render;
function renderCaseNotes(){
  $('case-notes').replaceChildren();if(!reading)return;
  for(const n of notes.filter(n=>n.source.id===reading.id)){
    const card=el('article',undefined,'card');card.append(el('h3','Saved note'));if(n.quote)card.append(el('blockquote',n.quote),el('p',n.pinpoint,'hint'));if(n.note)card.append(el('p',n.note));
    if(n.issue!=='Saved cases')card.append(el('p',n.issue,'hint'));
    card.append(el('p',[n.position,n.role,n.fit].join(' · ').replaceAll('_',' '),'hint'));
    const details=el('details',undefined,'source-details');details.append(el('summary','Reviewed source snapshot'),el('p','Saved '+n.added_at),el('p','Text SHA-256: '+n.source.sha256),el('pre',n.source.text));card.append(details);
    const remove=el('button','Delete note');remove.onclick=async()=>{notes=notes.filter(item=>item!==n);renderCaseNotes();await persist();};card.append(remove);$('case-notes').append(card);
  }
}
function refreshReader(){
  $('reader-title').textContent=reading.title;$('reader-meta').textContent=[reading.citation,reading.court,reading.date].filter(Boolean).join(' · ');$('reader-text').textContent=reading.text;
  $('reader-kind').textContent=reading.content_type==='snippet'?'Search preview only. It may contain a dissent or a procedural order. Read the original opinion; this preview cannot be saved as a verified quotation.':reading.content_type==='research_summary'?'Research summary. Add actual source text before quoting.':'Text supplied by you · '+(reading.content_type==='full_text'?'Complete opinion':'Selected passage')+'. Verify against the original and review surrounding context.';
  const url=safeURL(reading.url);$('reader-original').hidden=!url;if(url)$('reader-original').href=url;updateSavedButtons();renderCaseNotes();
}
function openSource(doc){
  reading=doc;$('text-form').hidden=true;$('note-form').hidden=true;$('note-form').reset();$('note-message').textContent='';refreshReader();if(!$('reader').open)$('reader').showModal();
}
$('close-reader').onclick=()=>$('reader').close();
$('reader-save').onclick=async()=>{try{await ready;await mergeSources([reading],{preserve:true});reading=docs.find(d=>d.id===reading.id);refreshReader();message('Case saved.');await persist();}catch(e){message(e.message,true);}};
$('edit-text').onclick=()=>{$('text-form').hidden=!$('text-form').hidden;if(!$('text-form').hidden){$('source-title').value=reading.title;$('source-url').value=reading.url;$('source-citation').value=reading.citation;$('source-text').value=['full_text','source_excerpt'].includes(reading.content_type)?reading.text:'';$('source-content').value=reading.content_type==='full_text'?'full_text':'source_excerpt';$('source-text').focus();}};
$('toggle-note').onclick=()=>{const selected=window.getSelection()?.toString()||'';$('note-form').hidden=!$('note-form').hidden;if(!$('note-form').hidden){if(['full_text','source_excerpt'].includes(reading.content_type)&&selected&&reading.text.includes(selected)){$('quote').value=selected;$('quote').closest('details').open=true;}$('note').focus();}};
$('text-form').onsubmit=async e=>{e.preventDefault();try{await ready;const old=reading;const [doc]=await mergeSources([{...old,title:$('source-title').value,url:$('source-url').value,citation:$('source-citation').value,text:$('source-text').value,content_type:$('source-content').value,retrieved_at:new Date().toISOString()}]);reading=doc;$('text-form').hidden=true;refreshReader();message('Source text saved. Existing notes retain their original source snapshots.');await persist();}catch(err){$('note-message').textContent=err.message;message(err.message,true);}};
$('add-manual').onclick=()=>openSource({id:'',title:'',url:'',citation:'',court:'',date:'',text:'',content_type:'source_excerpt',metadata:{},kind:'opinion',publication:'unknown'});
$('add-manual').addEventListener('click',()=>{$('edit-text').click();$('source-title').focus();});
for(const [id,values]of [['position',POSITIONS],['role',ROLES],['fit',FITS]])$(id).replaceChildren(...values.map(v=>{const o=el('option',v.replaceAll('_',' '));o.value=v;if(id==='position'&&v==='unreviewed')o.defaultSelected=true;return o;}));
$('position').value='unreviewed';
$('note-form').onsubmit=async e=>{
  e.preventDefault();try{
    await ready;if(!$('note').value.trim()&&!$('quote').value.trim())throw Error('Write a note or add a quotation.');if(notes.length>=2000)throw Error('Notebook limit reached (2,000 notes). Export a backup first.');
    let source=reading;if(!source.id)throw Error('Save the opinion text first.');
    if($('final-reviewed').checked)source={...source,metadata:{...source.metadata,authority:{...source.metadata?.authority,stage:'final'}}};
    const entry=evidence(source,{issue:$('issue').value.trim()||'Saved cases',quote:$('quote').value,pinpoint:$('pinpoint').value,position:$('position').value,role:$('role').value,fit:$('fit').value,note:$('note').value});
    await mergeSources([source],{preserve:true});notes.push(entry);reading=docs.find(d=>d.id===source.id);$('note-form').reset();$('position').value='unreviewed';$('note-message').textContent='Note saved.';refreshReader();await persist();
  }catch(err){$('note-message').textContent=err.message;$('note-message').className='error';}
};
function fallbackLink(params){
  let q=params.q;if(params.mode!=='keywords')q=(params.mode==='name'?'caseName':'citation')+':("'+q.replaceAll('"','').replaceAll('\\',' ')+ '")';
  const courts={california:'cal OR calctapp',scotus:'scotus',federal:'scotus OR ca1 OR ca2 OR ca3 OR ca4 OR ca5 OR ca6 OR ca7 OR ca8 OR ca9 OR ca10 OR ca11 OR cadc OR cafc'};
  if(courts[params.court])q='('+q+') AND court:('+courts[params.court]+')';
  return 'https://www.courtlistener.com/?'+new URLSearchParams({q,type:'o',order_by:'score desc'});
}
$('search-form').onsubmit=async e=>{
  e.preventDefault();const params={q:$('query').value.trim(),mode:$('search-mode').value,court:$('jurisdiction').value};if(!params.q)return;
  activeSearch?.abort();const controller=new AbortController();activeSearch=controller;const run=++searchNumber;
  $('search-button').disabled=true;$('search-button').textContent='Searching…';$('cancel-search').hidden=false;$('results').replaceChildren();$('results').setAttribute('aria-busy','true');$('results-title').textContent='Finding cases…';$('coverage').textContent='Searching CourtListener’s public case-law index.';$('more-results').hidden=false;$('more-results').href=fallbackLink(params);message('Searching real cases…');
  try{
    const data=await discover(params,{signal:controller.signal});if(run!==searchNumber)return;
    $('results-title').textContent=data.records.length?data.records.length+' recent matching case'+(data.records.length===1?'':'s'):'No cases returned';
    $('coverage').textContent='CourtListener · Limited public feed · Newest first, up to 20 matches. Use “More on CourtListener” for relevance sorting and more results.';
    $('results').replaceChildren(...data.records.map(d=>sourceCard(d)));if(!data.records.length)$('results').append(el('div','Try fewer keywords, a different search mode, or all courts. No returned matches does not establish that no case law exists.','empty'));
    message(data.records.length?'Cases found. Read the original opinion or save a case for later.':'No matches returned. Try broader wording.');
  }catch(err){if(run!==searchNumber)return;$('results-title').textContent=controller.signal.aborted?'Search cancelled':'Search unavailable';$('coverage').textContent='';$('results').append(el('div',controller.signal.aborted?'You can change your query and search again.':err.message,'empty'));message(controller.signal.aborted?'Search cancelled.':err.message,!controller.signal.aborted);}
  finally{if(run===searchNumber){activeSearch=null;$('search-button').disabled=false;$('search-button').textContent='Find cases';$('cancel-search').hidden=true;$('results').removeAttribute('aria-busy');}}
};
$('cancel-search').onclick=()=>activeSearch?.abort();
document.querySelectorAll('[data-example]').forEach(b=>b.onclick=()=>{$('query').value=b.dataset.example;$('search-mode').value=b.dataset.mode;$('jurisdiction').value='all';$('search-form').requestSubmit();});
$('import').onchange=async()=>{
  try{
    await ready;let bytes=0,records=[],restored=[];
    for(const file of $('import').files){bytes+=file.size;if(bytes>15000000)throw Error('Selected files exceed 15 MB.');const text=await file.text();if(file.name.toLowerCase().endsWith('.json')){
      const parsed=JSON.parse(text);if(parsed.schema==='open-case-law-workspace-v1'){
        if(!Array.isArray(parsed.notes)||parsed.notes.length>2000||!Array.isArray(parsed.sources))throw Error('Invalid or oversized backup.');records.push(...parsed.sources);
        for(const n of parsed.notes){const [source]=await normalize([n.source]);restored.push({...evidence(source,{...n,role:n.role||'unclassified',fit:n.fit||'unassessed'}),added_at:typeof n.added_at==='string'?n.added_at:new Date().toISOString()});}
      }else if(Array.isArray(parsed))records.push(...parsed);else throw Error('Import a document array or an exported workspace.');
    }else if(file.name.toLowerCase().endsWith('.txt'))records.push({title:file.name,text,content_type:'full_text',publication:'unknown'});else throw Error('Choose .txt opinion text or a .json backup.');}
    const unique=new Map(notes.map(n=>[JSON.stringify(n),n]));for(const n of restored)unique.set(JSON.stringify(n),n);if(unique.size>2000)throw Error('Combined notebook exceeds 2,000 notes.');
    const incoming=await mergeSources(records);notes=[...unique.values()];render();message(incoming.length+' sources imported. Files were not uploaded.');await persist();
  }catch(err){message(err.message,true);}finally{$('import').value='';}
};
$('export-notes').onclick=()=>download('legal-research-workspace.json',JSON.stringify(workspace(),null,2));
$('export-markdown').onclick=()=>{
  const text=['# Case research','','Researcher notes; verify complete opinions, citation eligibility, and later treatment.','',...docs.flatMap(d=>['## '+d.title,'',[d.citation,d.court,d.date].filter(Boolean).join(' · '),'',safeURL(d.url)||'Local import','',d.content_type==='snippet'?'Search preview (not a verified quotation): '+d.text:'Text type: '+d.content_type,'',...notes.filter(n=>n.source.id===d.id).flatMap(n=>[...(n.quote?['> '+n.quote.replaceAll('\n','\n> '),'','Pinpoint: '+n.pinpoint,'']:[]),n.note,'',n.position+' | '+n.role+' | '+n.fit,'','Reviewed text SHA-256: '+n.source.sha256,''])])].join('\n');download('case-research.md',text,'text/markdown');
};
$('clear').onclick=async()=>{await ready;if(confirm('Delete all saved cases and notes from this browser? Download a backup first to keep them.')){docs=[];notes=[];$('local-query').value='';render();message('All saved cases and notes deleted.');await persist();}};
$('local-sweep').onclick=()=>{try{const queries=$('advanced-queries').value.split('\n').filter(q=>q.trim());if(!queries.length)throw Error('Enter one or more query lines.');const report=sweep(docs,queries,{sourceOnly:false});$('advanced-results').replaceChildren(el('p',report.results.length+' saved matches'),...report.results.map(h=>sourceCard(h.doc,{saved:true,excerpt:h.excerpt})));}catch(e){message(e.message,true);}};
$('find-together').onclick=()=>{try{const phrases=$('advanced-queries').value.split('\n').map(q=>q.trim().replace(/^"|"$/g,'')).filter(Boolean);const report=concordance(docs,phrases);$('advanced-results').replaceChildren(el('p',report.results.length+' passages'+(report.truncated?' (limit reached)':'')),...report.results.map(h=>sourceCard(h.doc,{saved:true,excerpt:h.excerpt})));}catch(e){message(e.message,true);}};
const ready=(async()=>{try{const saved=await loadWorkspace();if(saved){docs=await normalize(saved.sources);notes=saved.notes||[];}$('storage-status').textContent='Saved automatically in this browser. Download a backup to use another device.';}catch{$('storage-status').textContent='Browser storage unavailable. Download a backup before closing this tab.';$('storage-status').className='error';}render();})();
render();
