import http from 'node:http';
import tls from 'node:tls';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes} from 'node:crypto';
import {WebSocketServer} from './vendor/ws/wrapper.mjs';
import {FUND,POOL,pinned,jobFrom,shareFrom,walletReadiness} from './protocol.mjs';

const assets=new Map([
 ['/', ['web/index.html','text/html']],['/protocol.mjs',['protocol.mjs','text/javascript']],['/app.mjs',['web/app.mjs','text/javascript']],['/style.css',['web/style.css','text/css']],
 ['/engine/worker.js',['web/miner-worker.js','text/javascript']],['/engine/randomx_st.js',['vendor/randomx/randomx_st.js','text/javascript']],['/engine/randomx_st.wasm',['vendor/randomx/randomx_st.wasm','application/wasm']],['/engine/randomx.js',['vendor/randomx/randomx.js','text/javascript']],['/engine/randomx.wasm',['vendor/randomx/randomx.wasm','application/wasm']],
]);
async function json(url){
 const response=await fetch(url,{signal:AbortSignal.timeout(8000),redirect:'error'});
 if(!response.ok)throw Error(`Public status HTTP ${response.status}`);
 const reader=response.body.getReader();let size=0;const chunks=[];
 try{for(;;){const{value,done}=await reader.read();if(done)break;size+=value.length;if(size>131072)throw Error('Status response too large');chunks.push(value);}}
 finally{await reader.cancel().catch(()=>{});}
 return JSON.parse(Buffer.concat(chunks).toString());
}
export async function publicStatus(){
 const [chain,pool]=await Promise.allSettled([
  json(`https://mainnet-api.algonode.cloud/v2/accounts/${FUND}`).then(walletReadiness),
  json(`https://api.unmineable.com/v4/address/${FUND}?coin=ALGO`).then(value=>{
   const p=value.data;if(!value.success||!p||p.address!==FUND||p.network!=='ALGO'||!/^\d{1,18}(?:\.\d{1,8})?$/.test(p.balance)||!/^\d{1,18}(?:\.\d{1,8})?$/.test(p.balance_payable)||!/^\d{1,18}(?:\.\d{1,8})?$/.test(p.payment_threshold)||typeof p.enabled!=='boolean'||typeof p.auto!=='boolean')throw Error('Invalid pool account status');
   return {balance:p.balance,payable:p.balance_payable,threshold:p.payment_threshold,feePercent:p.mining_fee,enabled:p.enabled,automatic:p.auto};
  }),
 ]);
 return {address:FUND,checkedAt:new Date().toISOString(),wallet:chain.status==='fulfilled'?chain.value:null,walletError:chain.status==='rejected'?chain.reason.message:null,pool:pool.status==='fulfilled'?pool.value:null,poolError:pool.status==='rejected'?pool.reason.message:null};
}
function livePool(){
 // This pool uses a self-signed certificate. Pin its observed certificate and
 // check it BEFORE sending application data; never accept arbitrary TLS peers.
 return tls.connect({host:POOL.host,port:POOL.port,servername:POOL.host,rejectUnauthorized:false});
}
export function createBootstrapServer({connectPool=livePool,statusProvider=publicStatus,cacheMs=20000}={}){
 let active=null,statusCache=null,statusAt=0,statusPending=null;
 const wss=new WebSocketServer({noServer:true,maxPayload:2048,perMessageDeflate:false});
 const server=http.createServer(async(req,res)=>{
  const origin=`http://127.0.0.1:${server.address().port}`;
  if(req.headers.host!==new URL(origin).host){res.writeHead(403).end();return;}
  if(req.method!=='GET'){res.writeHead(405).end();return;}
  const path=new URL(req.url,origin).pathname;
  const headers={'Content-Security-Policy':`default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self'; connect-src 'self' ws://127.0.0.1:${server.address().port}; style-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'`,'Cross-Origin-Opener-Policy':'same-origin','Cross-Origin-Embedder-Policy':'require-corp','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
  try{
   if(path==='/api/status'){
    if(!statusCache||Date.now()-statusAt>cacheMs){statusPending||=statusProvider().then(v=>{statusCache=v;statusAt=Date.now();return v;}).finally(()=>statusPending=null);await statusPending;}
    res.writeHead(200,{...headers,'Content-Type':'application/json'}).end(JSON.stringify(statusCache));return;
   }
   const asset=assets.get(path);if(!asset){res.writeHead(404,headers).end();return;}
   const bytes=await readFile(new URL(asset[0],import.meta.url));res.writeHead(200,{...headers,'Content-Type':asset[1]});res.end(bytes);
  }catch{res.writeHead(503,{...headers,'Content-Type':'application/json'}).end('{"error":"Status or asset unavailable"}');}
 });
 server.on('upgrade',(req,socket,head)=>{
  const expected=`http://127.0.0.1:${server.address().port}`;
  if(req.url!=='/mine'||req.headers.host!==new URL(expected).host||req.headers.origin!==expected||active){socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');return;}
  wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws));
 });
 wss.on('connection',ws=>{
  active=ws;let upstream,buffer='',minerId=null,nextId=2,closed=false;
  const jobs=new Map(),pending=new Set(),seen=new Set();
  const send=value=>{if(ws.readyState===1)ws.send(JSON.stringify(value));};
  const finish=()=>{if(closed)return;closed=true;clearInterval(keepalive);clearTimeout(loginTimeout);upstream?.destroy();ws.close();if(active===ws)active=null;};
  const fail=message=>{send({type:'error',message});finish();};
  const loginTimeout=setTimeout(()=>fail('Pool did not send a mining job within 20 seconds.'),20000);
  const keepalive=setInterval(()=>{if(minerId&&!upstream.destroyed)upstream.write(JSON.stringify({id:0,method:'keepalived',params:{id:minerId}})+'\n');},30000);
  try{upstream=connectPool();}catch(error){fail(error.message);return;}
  upstream.on('secureConnect',()=>{
   try{pinned(upstream.getPeerCertificate());}
   catch(error){fail(error.message);return;}
   upstream.write(JSON.stringify({id:1,method:'login',params:{login:`ALGO:${FUND}.evolve-bootstrap-${randomBytes(3).toString('hex')}`,pass:'x',agent:'EvolveTech-WASM-bootstrap/0.1',algo:['rx/0']}})+'\n');
  });
  upstream.on('data',chunk=>{
   buffer+=chunk.toString();if(buffer.length>65536){fail('Pool response exceeded limit.');return;}
   while(buffer.includes('\n')){
    const at=buffer.indexOf('\n'),line=buffer.slice(0,at);buffer=buffer.slice(at+1);if(!line.trim())continue;
    try{
     const m=JSON.parse(line);
     if(m.id===1&&m.error){fail('Pool login failed: '+JSON.stringify(m.error).slice(0,300));return;}
     if(m.id===1&&m.result?.id)minerId=m.result.id;
     const raw=m.result?.job||(m.method==='job'?m.params:null);
     if(raw){const job=jobFrom(raw);clearTimeout(loginTimeout);jobs.set(job.job_id,job);while(jobs.size>4)jobs.delete(jobs.keys().next().value);send(job);}
     if(pending.delete(m.id))send({type:'share-result',accepted:!m.error&&m.result?.status==='OK',error:m.error?JSON.stringify(m.error).slice(0,300):null});
    }catch(error){fail('Invalid pool response: '+error.message);return;}
   }
  });
  upstream.on('error',error=>fail('Pool connection failed: '+error.message));upstream.on('close',()=>{if(!closed)fail('Pool disconnected. Start again when ready.');});
  ws.on('message',data=>{
   try{
    const m=JSON.parse(data.toString());if(m.type!=='share')throw Error('Only mining shares are accepted.');
    if(!minerId||pending.size>=8)throw Error('Pool is not ready for another share.');
    const share=shareFrom(m,jobs),key=share.job_id+':'+share.nonce;if(seen.has(key))throw Error('Duplicate share.');
    seen.add(key);if(seen.size>4096)seen.delete(seen.values().next().value);
    const id=nextId++;pending.add(id);upstream.write(JSON.stringify({id,method:'submit',params:{id:minerId,...share}})+'\n');
   }catch(error){send({type:'share-result',accepted:false,error:error.message});}
  });
  ws.on('close',finish);ws.on('error',finish);
 });
 return {server,close(){active?.close();for(const client of wss.clients)client.terminate();wss.close();return new Promise(resolve=>server.close(resolve));}};
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1])){
 const port=Number(process.env.BOOTSTRAP_MINER_PORT||8773);if(!Number.isInteger(port)||port<1024||port>65535)throw Error('BOOTSTRAP_MINER_PORT must be 1024–65535');
 const app=createBootstrapServer();app.server.listen(port,'127.0.0.1',()=>console.log(`Wallet bootstrap miner: http://127.0.0.1:${port}\nMining starts only when you click Start. Payout address: ${FUND}`));
 for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>app.close().then(()=>process.exit()));
}
