import test from 'node:test';
import assert from 'node:assert/strict';
import {createHandler,searchURL} from './search.mjs';
const atom='<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"></feed>';
const request=(qs='',init={})=>new Request('https://evolvetech-dev.netlify.app/api/case-law/search?'+qs,init);
test('a search is fixed to the public opinion feed; court/name/citation modes preserve scope',()=>{
  const name=searchURL({q:'Miranda v. Arizona',mode:'name',court:'scotus'});
  assert.equal(new URL(name.url).hostname,'www.courtlistener.com');assert.equal(new URL(name.url).pathname,'/feed/search/');
  assert.equal(new URL(name.url).searchParams.get('type'),'o');assert.match(name.query,/caseName:\("Miranda v\. Arizona"\)/);assert.match(name.query,/court:\(scotus\)/);
  assert.match(searchURL({q:'384 U.S. 436',mode:'citation'}).query,/citation:/);
  assert.throws(()=>searchURL({q:'a',court:'https://evil.example'}));assert.throws(()=>searchURL({q:'x'.repeat(501)}));
});
test('normal search returns the actual upstream feed and exact query provenance',async()=>{
  let called;const handler=createHandler({fetcher:async u=>{called=u;return new Response(atom);}});
  const response=await handler(request('q=vehicle+warrant',{headers:{Origin:'https://www.evolvetech.dev'}}));
  assert.equal(response.status,200);assert.equal(response.headers.get('access-control-allow-origin'),'https://www.evolvetech.dev');
  const data=await response.json();assert.equal(data.xml,atom);assert.equal(data.query,'vehicle warrant');assert.match(called,/courtlistener\.com\/feed\/search/);assert.equal(data.order,'newest');assert.ok(data.retrieved_at);
});
test('validation and CORS reject requests before contacting upstream',async()=>{
  let calls=0;const handler=createHandler({fetcher:async()=>{calls++;return new Response(atom);}});
  assert.equal((await handler(request('q=x',{headers:{Origin:'https://evil.example'}}))).status,403);
  assert.equal((await handler(request('q=x',{method:'POST'}))).status,405);
  assert.equal((await handler(request('q='))).status,400);
  assert.equal((await handler(request('q=x',{method:'OPTIONS',headers:{Origin:'https://www.evolvetech.dev'}}))).status,204);
  assert.equal(calls,0);
});
test('provider blocking, HTML, oversized responses, and timeouts are actionable errors, never empty searches',async()=>{
  for(const response of [new Response('',{status:202}),new Response('blocked',{status:403}),new Response('<html>blocked</html>'),new Response('x'.repeat(2000001))]){
    const r=await createHandler({fetcher:async()=>response})(request('q=test'));assert.equal(r.status,502);const data=await r.json();assert.match(data.error,/unavailable/);assert.match(data.source_url,/courtlistener\.com/);
  }
  const r=await createHandler({timeoutMs:5,fetcher:async(_,options)=>new Promise((_,reject)=>options.signal.addEventListener('abort',()=>reject(Error('aborted'))))})(request('q=test'));
  assert.equal(r.status,502);assert.match((await r.json()).error,/timed out/);
});
