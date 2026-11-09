/** Public CourtListener Atom search relay. No credentials or private documents. MIT. */
export const COURTS = Object.freeze({all:'',california:'cal OR calctapp',scotus:'scotus',federal:'scotus OR ca1 OR ca2 OR ca3 OR ca4 OR ca5 OR ca6 OR ca7 OR ca8 OR ca9 OR ca10 OR ca11 OR cadc OR cafc'});
const ALLOWED = new Set(['https://www.evolvetech.dev','https://evolvetech.dev','https://evolvetech-dev.netlify.app']);
export function searchURL({q='',mode='keywords',court='all'}) {
  q=q.trim();
  if(!q || q.length>500 || /[\u0000-\u001f]/u.test(q)) throw Error('Enter a search between 1 and 500 characters.');
  if(!['keywords','name','citation'].includes(mode)||!Object.hasOwn(COURTS,court))throw Error('Choose a supported search mode and court.');
  // Names/citations are literal phrases; advanced syntax remains available in keyword mode.
  let query=mode==='keywords'?q:`${mode==='name'?'caseName':'citation'}:("${q.replaceAll('"','').replaceAll('\\',' ')}")`;
  if(COURTS[court])query=`(${query}) AND court:(${COURTS[court]})`;
  const url=new URL('https://www.courtlistener.com/feed/search/');url.search=new URLSearchParams({q:query,type:'o'});
  const original=new URL('https://www.courtlistener.com/');original.search=new URLSearchParams({q:query,type:'o',order_by:'score desc'});
  return {url:url.href,original:original.href,query};
}
export function createHandler({fetcher=fetch,timeoutMs=12000}={}) {
  return async request=>{
    const origin=request.headers.get('origin');
    const headers={'Content-Type':'application/json; charset=utf-8','X-Content-Type-Options':'nosniff','Vary':'Origin','Cache-Control':'no-store'};
    if(origin&&!ALLOWED.has(origin))return Response.json({error:'Origin not allowed.'},{status:403,headers});
    if(origin)headers['Access-Control-Allow-Origin']=origin;
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':'GET, OPTIONS'}});
    if(request.method!=='GET')return Response.json({error:'Use GET.'},{status:405,headers:{...headers,Allow:'GET, OPTIONS'}});
    let target;
    try{target=searchURL(Object.fromEntries(new URL(request.url).searchParams));}catch(e){return Response.json({error:e.message},{status:400,headers});}
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeoutMs);
    try{
      const upstream=await fetcher(target.url,{signal:controller.signal,redirect:'error',headers:{Accept:'application/atom+xml','User-Agent':'OpenCaseLaw/2.0 (+https://www.evolvetech.dev/projects/open-case-law/)'}});
      if(!upstream.ok||upstream.status===202)throw Error('Unavailable');
      const reader=upstream.body.getReader();let bytes=0;const decoder=new TextDecoder();let xml='';
      try{while(true){const {value,done}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>2000000)throw Error('Too large');xml+=decoder.decode(value,{stream:true});}xml+=decoder.decode();}
      finally{await reader.cancel().catch(()=>{});}
      if(!/<feed[\s>]/.test(xml)||!xml.includes('http://www.w3.org/2005/Atom'))throw Error('Invalid feed');
      return Response.json({xml,query:target.query,source_url:target.original,provider:'CourtListener public search feed',order:'newest',retrieved_at:new Date().toISOString()},{headers:{...headers,'Cache-Control':'public, max-age=300, s-maxage=300'}});
    }catch(e){return Response.json({error:controller.signal.aborted?'Case search timed out. Please try again.':'CourtListener is temporarily unavailable. Please try again or open the search on CourtListener.',source_url:target.original},{status:502,headers});}
    finally{clearTimeout(timer);}
  };
}
export default createHandler();
