export const ROLES = ['unclassified','holding','judicial_reasoning','party_argument','factual_background','statutory_text','agency_instruction','commentary'];
export const FITS = ['unassessed','direct','analogical','background'];
export const POSITIONS = ['supports','contrary','distinguishes','background','unreviewed'];
export const SOURCE_TYPES = ['full_text','source_excerpt','snippet','research_summary'];
export function safeURL(value) {
  try { const url=new URL(value); return ['https:','http:'].includes(url.protocol) ? url.href : ''; } catch { return ''; }
}
export async function digest(text) {
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
  return [...new Uint8Array(bytes)].map(v=>v.toString(16).padStart(2,'0')).join('');
}
export async function normalize(records) {
  if(!Array.isArray(records)||records.length>2000)throw Error('Import a JSON array with at most 2,000 sources.');
  let total=0;
  const output=[];
  for(const r of records){
    if(!r||typeof r!=='object'||typeof r.title!=='string'||typeof r.text!=='string'||!r.title.trim()||!r.text.trim())throw Error('Every source needs a nonempty title and text.');
    total+=r.text.length;if(total>10000000||r.text.length>1000000)throw Error('Source text exceeds the 10 million character corpus or 1 million character document limit.');
    const content_type=r.content_type||'full_text';if(!SOURCE_TYPES.includes(content_type))throw Error('Unknown source content type.');
    const metadata=typeof r.metadata==='string'?JSON.parse(r.metadata):(r.metadata||{});
    if(typeof metadata!=='object'||metadata===null||Array.isArray(metadata))throw Error('Metadata must be an object.');
    const text=r.text.trim(); const sha256=await digest(text);
    const doc={metadata,content_type,text,sha256};
    for(const key of ['title','citation','court','jurisdiction','date','kind','publication','url','id','retrieved_at'])doc[key]=String(r[key]||'');
    doc.kind||='opinion';doc.publication||='unknown';doc.id||='local:'+sha256.slice(0,20);doc.retrieved_at||=new Date().toISOString();
    output.push(doc);
  }
  return output;
}
export function audit(doc){
  const a=doc.metadata?.authority||{},flags=[];
  if(!['full_text','source_excerpt'].includes(doc.content_type))flags.push('Discovery/summary only');
  if(doc.content_type==='source_excerpt')flags.push('Selected excerpt');
  if(doc.kind==='opinion'){
    if(a.stage!=='final')flags.push('Final disposition unverified');
    if(!['published','precedential'].includes(doc.publication.toLowerCase()))flags.push('Citation eligibility needs review');
    if(!a.treatment_checked_on)flags.push('Later treatment unchecked');
  }else if(!a.current_version_verified_on)flags.push('Current version unchecked');
  if(!safeURL(doc.url))flags.push('No usable source link');
  return flags;
}
const words=text=>text.toLowerCase().match(/[\p{L}\p{N}]+/gu)||[];
const terms=query=>[...query.matchAll(/"([^"]+)"|([\p{L}\p{N}]+)/gu)].map(m=>(m[1]||m[2]).toLowerCase());
function includesTerm(text,term){
  if(term.includes(' '))return text.toLowerCase().replace(/\s+/g,' ').includes(term.replace(/\s+/g,' '));
  return words(text).includes(term);
}
export function search(docs,query,{mode='all',sourceOnly=true,court='',publication='',kind='',limit=100}={}){
  const ts=[...new Set(terms(query))];if(!ts.length)return [];
  const corpus=docs.filter(d=>(!sourceOnly||['full_text','source_excerpt'].includes(d.content_type))&&(!court||d.court.toLowerCase().includes(court.toLowerCase()))&&(!publication||d.publication.toLowerCase()===publication.toLowerCase())&&(!kind||d.kind===kind));
  const avg=corpus.reduce((n,d)=>n+words(d.text).length,0)/Math.max(1,corpus.length);
  const frequencies=ts.map(t=>corpus.filter(d=>includesTerm(d.title+' '+d.citation+' '+d.text,t)).length);
  return corpus.flatMap(doc=>{
    const whole=doc.title+' '+doc.citation+' '+doc.text;
    const matches=ts.map(t=>includesTerm(whole,t));if(mode==='all'?!matches.every(Boolean):!matches.some(Boolean))return [];
    const tokens=words(doc.text),length=tokens.length;
    const score=ts.reduce((sum,t,i)=>{
      if(!matches[i])return sum;
      const tf=t.includes(' ')?doc.text.toLowerCase().split(t).length-1:tokens.filter(w=>w===t).length;
      const idf=Math.log(1+(corpus.length-frequencies[i]+0.5)/(frequencies[i]+0.5));
      return sum+idf*((tf*2.2)/(tf+1.2*(0.25+0.75*length/Math.max(avg,1)))+3*Number(includesTerm(doc.title,t))+4*Number(includesTerm(doc.citation,t)));
    },0);
    const index=doc.text.toLowerCase().indexOf(ts.find(t=>doc.text.toLowerCase().includes(t))||'');
    const start=Math.max(0,index-100),end=Math.min(doc.text.length,start+460);
    return [{doc,score,start,end,excerpt:doc.text.slice(start,end)}];
  }).sort((a,b)=>b.score-a.score||a.doc.id.localeCompare(b.doc.id)).slice(0,limit);
}
export function sweep(docs,queries,options={}){
  const unique=[...new Set(queries.map(q=>q.trim()).filter(Boolean))];if(unique.length>30)throw Error('Use at most 30 distinct query lines.');
  const merged=new Map();const coverage=[];
  for(const query of unique){
    const hits=search(docs,query,options);coverage.push({query,returned:hits.length,capReached:hits.length===(options.limit||100)});
    hits.forEach((hit,index)=>{
      const item=merged.get(hit.doc.id)||{...hit,rrf:0,queries:[]};item.rrf+=1/(61+index);item.queries.push({query,rank:index+1});merged.set(hit.doc.id,item);
    });
  }
  return {coverage,results:[...merged.values()].sort((a,b)=>b.rrf-a.rrf||a.doc.id.localeCompare(b.doc.id))};
}
export function evidence(doc,{issue,quote='',pinpoint='',position='unreviewed',role='unclassified',fit='unassessed',note=''}){
  if(!issue?.trim())throw Error('Enter a research question.');
  if(!POSITIONS.includes(position)||!ROLES.includes(role)||!FITS.includes(fit))throw Error('Unknown evidence classification.');
  if((role!=='unclassified'||fit!=='unassessed')&&!quote)throw Error('Classified evidence needs an exact quotation.');
  if(quote&&(!['full_text','source_excerpt'].includes(doc.content_type)||!doc.text.includes(quote)||!pinpoint.trim()))throw Error('Use an exact source quotation and a page/paragraph pinpoint; discovery snippets cannot be quoted.');
  if(['holding','judicial_reasoning'].includes(role)&&doc.kind!=='opinion')throw Error('Judicial roles require an opinion.');
  if(role==='holding'&&(doc.metadata?.authority?.stage!=='final'||/dissent|concurrence/i.test(doc.metadata?.opinion_type||'')||['030concurrence','040dissent'].includes(doc.metadata?.opinion_type)))throw Error('A holding label needs a reviewed final disposition and cannot label a known separate dissent/concurrence.');
  return {issue:issue.trim(),quote,pinpoint,position,role,fit,note,added_at:new Date().toISOString(),source:structuredClone(doc)};
}
export function concordance(docs,phrases,window=1200){
  if(phrases.length<2||phrases.length>6||phrases.some(p=>!p.trim())||window<1||window>10000)throw Error('Use 2–6 phrases and a window of 1–10,000 characters.');
  const results=[];
  for(const doc of docs.filter(d=>['full_text','source_excerpt'].includes(d.content_type))){
    const occurrences=[];
    phrases.forEach((phrase,group)=>{
      const escaped=phrase.trim().split(/\s+/).map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('\\s+');
      for(const match of doc.text.matchAll(new RegExp(escaped,'giu'))){occurrences.push({group,start:match.index,end:match.index+match[0].length});if(occurrences.length>=10000)break;}
    });
    occurrences.sort((a,b)=>a.start-b.start);
    for(let i=0;i<occurrences.length;i++){
      const seen=new Set();let end=occurrences[i].end;
      for(let j=i;j<occurrences.length;j++){
        end=Math.max(end,occurrences[j].end);if(end-occurrences[i].start>window)break;seen.add(occurrences[j].group);
        if(seen.size===phrases.length){const start=occurrences[i].start;results.push({doc,start,end,excerpt:doc.text.slice(start,end)});break;}
      }
      if(results.length>=100)return {results,truncated:true};
    }
  }
  return {results,truncated:false};
}
