import {safeURL,normalize} from './engine.mjs';
export const API=['localhost','127.0.0.1'].includes(globalThis.location?.hostname)?'/api/case-law/search':'https://evolvetech-dev.netlify.app/api/case-law/search';
function plain(value){
  let s=value;
  for(let i=0;i<2;i++)s=s.replace(/&#(x[\da-f]+|\d+);|&(amp|lt|gt|quot|apos|nbsp);/gi,(match,num,name)=>{
    if(num){const n=num[0].toLowerCase()==='x'?parseInt(num.slice(1),16):Number(num);return n>0&&n<=0x10ffff?String.fromCodePoint(n):'';}
    return {amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '}[name.toLowerCase()];
  });
  return s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').replace(/Original document\s*$/,'').trim();
}
export async function parseFeed(data){
  if(typeof data.xml!=='string'||data.xml.length>2000000)throw Error('The search service returned an invalid response.');
  const dom=new DOMParser().parseFromString(data.xml,'application/xml');
  if(dom.querySelector('parsererror')||dom.documentElement.localName!=='feed')throw Error('The search service returned an unreadable feed.');
  const ns='http://www.w3.org/2005/Atom';const records=[];const seen=new Set();
  for(const entry of [...dom.getElementsByTagNameNS(ns,'entry')].slice(0,50)){
    const value=name=>entry.getElementsByTagNameNS(ns,name)[0]?.textContent?.trim()||'';
    const url=safeURL([...entry.getElementsByTagNameNS(ns,'link')].find(n=>n.getAttribute('rel')==='alternate')?.getAttribute('href'));
    if(!url||new URL(url).hostname!=='www.courtlistener.com'||!/^\/opinion\/\d+\//.test(new URL(url).pathname)||seen.has(url))continue;
    seen.add(url);const title=value('title');if(!title)continue;
    records.push({id:'courtlistener:'+new URL(url).pathname.split('/')[2],title,url,court:value('name'),date:value('published').slice(0,10),text:plain(value('summary'))||'No preview supplied. Open the original opinion to read this case.',content_type:'snippet',publication:'unknown',kind:'opinion',retrieved_at:data.retrieved_at,metadata:{discovered_via:'CourtListener public Atom search feed',search_query:data.query,authority:{stage:'unverified'}}});
  }
  return normalize(records);
}
export async function discover(params,{signal,fetcher=fetch}={}){
  const response=await fetcher(API+'?'+new URLSearchParams(params),{signal,credentials:'omit'});
  let data;try{data=await response.json();}catch{throw Error('The search service is unavailable. Please try again.');}
  if(!response.ok)throw Error(data.error||'Case search is temporarily unavailable.');
  return {...data,records:await parseFeed(data)};
}
