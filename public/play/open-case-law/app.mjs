import {normalize,digest,safeURL,audit,sweep,evidence,concordance,ROLES,FITS,POSITIONS} from './engine.mjs';
const $=id=>document.getElementById(id);
let docs=[],notes=[],reading=null;
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
function message(text,error=false){$('message').textContent=text;$('message').className=error?'error':'';}
function tab(id){document.querySelectorAll('.panel').forEach(n=>n.hidden=n.id!==id);document.querySelectorAll('[data-tab]').forEach(n=>n.classList.toggle('active',n.dataset.tab===id));}
document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>tab(b.dataset.tab)));
function download(name,contents,type='application/json'){
  const url=URL.createObjectURL(new Blob([contents],{type}));const a=el('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function link(text,url){const a=el('a',text);a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.referrerPolicy='no-referrer';return a;}
function badges(doc){const box=el('div',undefined,'badges');[doc.kind,doc.publication,doc.content_type,...audit(doc)].forEach(t=>box.append(el('span',t,'badge'+(audit(doc).includes(t)?' warning':''))));return box;}
function openSource(doc){reading=doc;$('reader-title').textContent=doc.title;$('reader-meta').textContent=[doc.citation,doc.court,'SHA-256 '+doc.sha256].filter(Boolean).join(' · ');$('reader-text').textContent=doc.text;$('reader').showModal();}
$('close-reader').onclick=()=>$('reader').close();
$('use-source').onclick=()=>{const selected=window.getSelection()?.toString()||'';tab('notebook');$('evidence-source').value=reading.id;if(selected&&reading.text.includes(selected))$('quote').value=selected;$('reader').close();$('issue').focus();};
function sourceCard(doc,hit){
  const card=el('article',undefined,'card');card.append(badges(doc),el('h3',doc.title),el('p',[doc.citation,doc.court,doc.date].filter(Boolean).join(' · '),'muted'));
  if(hit){card.append(el('blockquote',hit.excerpt));if(hit.queries)card.append(el('p',hit.queries.map(q=>q.query+' (rank '+q.rank+')').join(' · '),'muted'));if(hit.start!==undefined)card.append(el('p','Source text offsets '+hit.start+'–'+hit.end+' · SHA-256 '+doc.sha256.slice(0,16)+'…','muted'));}
  const actions=el('div',undefined,'actions');const read=el('button','Read source');read.onclick=()=>openSource(doc);actions.append(read);
  if(safeURL(doc.url))actions.append(link('Original source ↗',safeURL(doc.url)));
  const cite=el('button','Use in notebook');cite.onclick=()=>{tab('notebook');$('evidence-source').value=doc.id;$('quote').value='';$('issue').focus();};actions.append(cite);card.append(actions);return card;
}
function render(){
  $('count').textContent=String(docs.length);$('note-count').textContent=String(notes.length);$('library').replaceChildren(...docs.map(d=>sourceCard(d)));
  $('evidence-source').replaceChildren(...docs.map(d=>{const o=el('option',d.title);o.value=d.id;return o;}));renderNotes();
}
function renderNotes(){
  const question=$('issue').value.trim(),visible=notes.filter(n=>!question||n.issue===question);
  $('matrix').replaceChildren(...POSITIONS.map(p=>el('span',p+': '+visible.filter(n=>n.position===p).length,'matrix-cell')));
  if(visible.length&&!visible.some(n=>n.position==='contrary'))$('matrix').append(el('span','No contrary evidence recorded','badge warning'));
  $('notes').replaceChildren(...visible.map(n=>{
    const card=el('article',undefined,'card');card.append(el('p',n.issue,'eyebrow'),el('h3',n.source.title),el('p',[n.position,n.role,n.fit,n.pinpoint].filter(Boolean).join(' · ')));
    if(n.quote)card.append(el('blockquote',n.quote));card.append(el('p',n.note));
    const current=docs.find(d=>d.id===n.source.id);if(!current||current.sha256!==n.source.sha256||JSON.stringify(current.metadata)!==JSON.stringify(n.source.metadata)||current.publication!==n.source.publication)card.append(el('p','Current source or authority metadata differs; this note preserves the reviewed snapshot.','badge warning'));
    card.append(badges(n.source),el('p','Reviewed source SHA-256: '+n.source.sha256,'muted'));return card;
  }));
}
$('issue').addEventListener('input',renderNotes);
for(const [id,values]of [['position',POSITIONS],['role',ROLES],['fit',FITS]])$(id).replaceChildren(...values.map(v=>{const o=el('option',v.replaceAll('_',' '));o.value=v;return o;}));
function queries(){return $('query').value.split('\n').map(s=>s.trim()).filter(Boolean);}
function external(){const q=queries()[0]||'';const box=$('external-links');box.replaceChildren();if(!q){box.append(el('p','Enter a query to prepare external searches.','muted'));return;}box.append(link('CourtListener →','https://www.courtlistener.com/?type=o&q='+encodeURIComponent(q)),link('Google Scholar case law →','https://scholar.google.com/scholar?as_sdt=2006&q='+encodeURIComponent(q)));}
$('query').addEventListener('input',external);external();
function options(){return {mode:$('mode').value,sourceOnly:$('source-only').checked,court:$('court').value.trim(),publication:$('publication').value,kind:$('kind').value,limit:100};}
function results(rows,description){$('results-title').textContent=rows.length+' matching source'+(rows.length===1?'':'s');$('coverage').textContent=description;$('results').replaceChildren(...rows.map(h=>sourceCard(h.doc,h)));if(!rows.length)$('results').append(el('div','No matching imported passages. Try broader wording, check filters, or import additional source text. This does not establish that no authority exists.','empty'));}
$('search-form').onsubmit=e=>{e.preventDefault();try{if(!queries().length)throw Error('Enter at least one query.');const report=sweep(docs,queries(),options());results(report.results,report.coverage.length+' queries · top 100 per query'+(report.coverage.some(q=>q.capReached)?' · candidate cap reached':''));message('Local search complete. Publication and later treatment still require review.');}catch(err){message(err.message,true);}};
$('find-together').onclick=()=>{try{const o=options();const filtered=docs.filter(d=>(!o.court||d.court.toLowerCase().includes(o.court.toLowerCase()))&&(!o.publication||d.publication.toLowerCase()===o.publication)&&(!o.kind||d.kind===o.kind));const report=concordance(filtered,queries().map(q=>q.replace(/^"|"$/g,'')));results(report.results,'1,200-character window · source text only'+(report.truncated?' · result cap reached':''));message('Phrase proximity is a discovery aid, not proof of a holding.');}catch(err){message(err.message,true);}};
async function mergeSources(records){const incoming=await normalize(records);const merged=new Map(docs.map(d=>[d.id,d]));for(const d of incoming)merged.set(d.id,d);if(merged.size>2000||[...merged.values()].reduce((n,d)=>n+d.text.length,0)>10000000)throw Error('Combined library exceeds 2,000 sources or 10 million text characters.');docs=[...merged.values()];render();return incoming.length;}
$('source-form').onsubmit=async e=>{e.preventDefault();try{await mergeSources([{title:$('source-title').value,citation:$('source-citation').value,url:$('source-url').value,court:$('source-court').value,kind:$('source-kind').value,publication:$('source-publication').value,content_type:$('source-content').value,text:$('source-text').value,metadata:{authority:{stage:$('source-stage').value}}}]);$('source-form').reset();message('Source added in this tab. Export your work before closing.');}catch(err){message(err.message,true);}};
$('import').onchange=async()=>{
  try{
    let bytes=0,records=[],restored=[],restoredIssue='';
    for(const file of $('import').files){bytes+=file.size;if(bytes>15000000)throw Error('Selected files exceed 15 MB.');const text=await file.text();if(file.name.toLowerCase().endsWith('.json')){
      const parsed=JSON.parse(text);if(parsed.schema==='open-case-law-workspace-v1'){
        if(!Array.isArray(parsed.notes)||parsed.notes.length>2000)throw Error('Invalid or oversized notebook.');records.push(...parsed.sources);
        for(const n of parsed.notes){const [source]=await normalize([n.source]);restored.push(evidence(source,{...n,role:n.role||'unclassified',fit:n.fit||'unassessed'}));}restoredIssue=String(parsed.issue||'');
      }else if(Array.isArray(parsed))records.push(...parsed);else throw Error('Import a document array or an exported workspace.');
    }else records.push({title:file.name,text,content_type:'full_text',publication:'unknown'});}
    const count=await mergeSources(records);notes.push(...restored);if(restoredIssue)$('issue').value=restoredIssue;render();message(count+' source records imported. Nothing was uploaded.');
  }catch(err){message(err.message,true);}finally{$('import').value='';}
};
$('evidence-form').onsubmit=e=>{e.preventDefault();try{const source=docs.find(d=>d.id===$('evidence-source').value);if(!source)throw Error('Import or select a source first.');notes.push(evidence(source,{issue:$('issue').value,quote:$('quote').value,pinpoint:$('pinpoint').value,position:$('position').value,role:$('role').value,fit:$('fit').value,note:$('note').value}));renderNotes();$('note-count').textContent=String(notes.length);message('Evidence saved with an immutable source snapshot. Export to keep it.');}catch(err){message(err.message,true);}};
$('export-sources').onclick=()=>download('legal-sources.json',JSON.stringify(docs,null,2));
$('export-notes').onclick=()=>download('legal-research-workspace.json',JSON.stringify({schema:'open-case-law-workspace-v1',issue:$('issue').value,sources:docs,notes},null,2));
$('export-markdown').onclick=()=>{
  const text=['# Evidence notebook','','Researcher assessments; source authenticity, citation eligibility and later treatment require independent review.','',...notes.flatMap(n=>['## '+n.issue,'','### '+n.source.title,'',n.position+' | '+n.role+' | '+n.fit,'',n.source.citation,'Source: '+(safeURL(n.source.url)||'local import'),'',...(n.quote?['> '+n.quote.replaceAll('\n','\n> '),'','Pinpoint: '+n.pinpoint,'']:[]),n.note,'','SHA-256: '+n.source.sha256,''])].join('\n');download('evidence-notebook.md',text,'text/markdown');
};
$('clear').onclick=()=>{if(confirm('Clear imported sources and notes from this tab? Export first if you want to keep them.')){docs=[];notes=[];$('issue').value='';render();$('results').replaceChildren();$('coverage').textContent='';message('Workspace cleared.');}};
$('demo').onclick=async()=>{
  await mergeSources([{id:'fiction:notice',title:'Fictional Example A — Notice',citation:'SYNTHETIC EXAMPLE — NOT A REAL CASE',text:'This fictional example discusses notice before a public hearing. The imaginary court describes the opportunity to be heard as an important procedural safeguard. It also explains an exception for a genuine emergency. This text is only a software demonstration.',publication:'unknown',content_type:'source_excerpt',metadata:{synthetic:true,authority:{stage:'unverified'}}},
  {id:'fiction:emergency',title:'Fictional Example B — Emergency',citation:'SYNTHETIC EXAMPLE — NOT A REAL CASE',text:'In this fictional example, a party requests an emergency hearing. An allegation in a filing is not automatically a judicial finding. The imaginary court asks for specific facts and adequate notice. This example has no legal authority.',publication:'unknown',content_type:'source_excerpt',metadata:{synthetic:true,authority:{stage:'unverified'}}}]);$('query').value='notice hearing\n"opportunity to be heard"';external();$('search-form').requestSubmit();message('Fictional examples loaded. These are not cases and cannot support a legal argument.');
};
render();
