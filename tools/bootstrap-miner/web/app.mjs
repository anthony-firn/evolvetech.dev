import {FUND,VECTOR} from '/protocol.mjs';
const $=id=>document.getElementById(id);
$('address').textContent=FUND;
let running=false,generation=0,workers=[],socket=null,accepted=0,rejected=0,hashes=0,startAt=0,statusBusy=false,fundReady=false;
const log=text=>{$('log').textContent=(new Date().toLocaleTimeString()+' '+text+'\n'+$('log').textContent).slice(0,16000);};
function stop(message='Stopped. No mining workers are running.'){
 running=false;generation++;for(const worker of workers)worker.terminate();workers=[];socket?.close();socket=null;
 $('start').disabled=fundReady;$('stop').disabled=true;for(const id of ['mode','threads','duty','consent'])$(id).disabled=false;
 $('status').textContent=message;$('rate').textContent='0 H/s';log(message);
}
async function refresh(){
 if(statusBusy)return;statusBusy=true;
 try{
  const response=await fetch('/api/status',{cache:'no-store'});if(!response.ok)throw Error('Status server unavailable');const value=await response.json();
  if(value.wallet){
   const w=value.wallet;$('chain').textContent=(w.microAlgo/1e6).toFixed(6)+' ALGO';
   $('ready').textContent=w.ready?'Ready to receive donations':w.funded?'ALGO arrived · USDC opt-in needed':'Waiting for mined ALGO';
   fundReady=w.ready||w.funded;
   if(fundReady){if(running)stop(w.ready?'Donation wallet is ready. Mining stopped.':'ALGO has arrived. Mining stopped; finish the USDC opt-in in the owner wallet.');$('start').disabled=true;}
   else if(!running)$('start').disabled=false;
  }else{$('chain').textContent='Unknown';$('ready').textContent='Could not verify';}
  if(value.pool){
   const p=value.pool;$('balance').textContent=p.balance+' ALGO (payable: '+(p.payable??p.balance)+')';$('threshold').textContent=p.threshold+' ALGO';
   $('payout').textContent=`Pool fee: ${p.feePercent}%. Automatic payouts: ${p.automatic?'on':'off'}. ${p.automatic?'The pool controls payment timing.':'Request a payout or enable automatic payments through unMineable after reaching its threshold.'}`;
   if(Number(p.payable??p.balance)>=Number(p.threshold)){if(running)stop('Pool payout threshold reached. Mining stopped; request the ALGO payout through the pool.');$('start').disabled=true;}
   if(!p.enabled){if(running)stop('ALGO pool payouts are currently disabled.');$('start').disabled=true;}
  }else{$('balance').textContent='Unknown';$('payout').textContent='Pool balance unavailable. Accepted shares are not proof of a payout.';}
 }catch(error){log(error.message);$('ready').textContent='Could not verify';}
 finally{statusBusy=false;}
}
function connect(session){
 if(!running||session!==generation)return;
 $('status').textContent='Self-test passed. Connecting to the ALGO payout pool…';log('Known RandomX test vector passed in this browser.');
 socket=new WebSocket(`ws://${location.host}/mine`);
 socket.onmessage=({data})=>{
  if(!running||session!==generation)return;
  try{
   const m=JSON.parse(data);
   if(m.type==='error'){stop(m.message);return;}
   if(m.type==='job'){
    log('Pool job '+m.job_id+' received.');$('status').textContent='Building RandomX memory / mining. Pool credit must reach its payout minimum.';
    for(const worker of workers)worker.postMessage(m);
   }else if(m.type==='share-result'){
    if(m.accepted){accepted++;$('accepted').textContent=accepted;log('Pool accepted a share.');}
    else{rejected++;$('rejected').textContent=rejected;log('Share rejected: '+(m.error||'unknown reason'));}
   }
  }catch(error){stop('Invalid pool message: '+error.message);}
 };
 socket.onclose=()=>{if(running&&session===generation)stop('Pool connection closed. Start again when ready.');};
 socket.onerror=()=>{if(running&&session===generation)stop('Pool connection failed. Check the local server output.');};
}
function start(){
 if(running||fundReady)return;
 if(!$('consent').checked){$('status').textContent='Enable the checkbox before starting mining.';return;}
 const full=$('mode').value==='full';if(full&&!crossOriginIsolated){$('status').textContent='Full mode needs an isolated localhost page. Choose Light mode or restart the local server.';return;}
 running=true;const session=++generation;hashes=0;accepted=0;rejected=0;startAt=performance.now();$('accepted').textContent='0';$('rejected').textContent='0';
 $('start').disabled=true;$('stop').disabled=false;for(const id of ['mode','threads','duty','consent'])$(id).disabled=true;
 const threads=Number($('threads').value),count=full?1:threads,duty=Number($('duty').value);let tested=0;
 $('status').textContent='Checking the WASM hashing engine before pool login…';
 for(let slot=0;slot<count;slot++){
  const worker=new Worker('/engine/worker.js?build='+(full?'full':'st'));workers.push(worker);
  worker.onerror=e=>{if(running&&session===generation)stop('Mining worker failed: '+e.message);};
  worker.onmessage=({data:m})=>{
   if(!running||session!==generation)return;
   if(m.type==='error'){stop(m.message);return;}
   if(m.type==='ready')worker.postMessage({type:'selftest'});
   else if(m.type==='selftest'){
    if(m.hash!==VECTOR){stop('RandomX correctness check failed. No pool work will be submitted.');return;}
    tested++;if(tested===count)connect(session);
   }else if(m.type==='share'){
    if(socket?.readyState===1)socket.send(JSON.stringify({type:'share',job_id:m.job_id,nonce:m.nonce,result:m.result}));
   }else if(m.type==='hashrate'){
    hashes+=m.hashes||0;$('rate').textContent=(hashes/Math.max(1,(performance.now()-startAt)/1000)).toFixed(2)+' H/s';$('status').textContent='Mining for the donation wallet. Stop whenever you want.';
   }else if(m.type==='dataset_progress'){
    const percent=Math.min(100,Math.floor(100*m.done/Math.max(1,m.total)));$('status').textContent=`Preparing mining memory: ${percent}% (Stop is available).`;
   }else if(m.type==='status')log(m.message);
  };
  worker.postMessage({type:'init',fullMemory:full,enableJit:true,datasetThreads:full?threads:1,datasetInitThreads:full?threads:1,dutyCycle:duty,nonceSlot:slot,nonceSlots:count});
 }
}
$('start').addEventListener('click',start);$('stop').addEventListener('click',()=>stop());$('refresh').addEventListener('click',refresh);
addEventListener('pagehide',()=>{if(running)stop();});
if(!crossOriginIsolated)$('mode').value='light';
$('threads').value=(navigator.hardwareConcurrency>=4?'4':'1');
await refresh();setInterval(refresh,30000);
