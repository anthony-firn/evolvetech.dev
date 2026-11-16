import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {EventEmitter,once} from 'node:events';
import {createBootstrapServer} from './server.mjs';
import WebSocket from './vendor/ws/wrapper.mjs';
import {FUND,POOL,pinned,jobFrom,shareFrom,walletReadiness} from './protocol.mjs';

const job={job_id:'fixture-job',blob:'11'.repeat(76),seed_hash:'22'.repeat(32),target:'ffffffff',algo:'rx/0'};
test('wallet initialization requires real on-chain funds and an unfrozen USDC holding',()=>{
 assert.deepEqual(walletReadiness({amount:0,'min-balance':100000,assets:[]}),{address:FUND,microAlgo:0,minimumMicroAlgo:100000,setupMicroAlgo:201000,ready:false,funded:false,round:undefined});
 assert.equal(walletReadiness({amount:201000,'min-balance':100000,assets:[]}).funded,true);
 assert.equal(walletReadiness({amount:200000,'min-balance':200000,assets:[{'asset-id':31566704,'is-frozen':false}]}).ready,true);
 assert.equal(walletReadiness({amount:200000,'min-balance':200000,assets:[{'asset-id':31566704,'is-frozen':true}]}).ready,false);
});
test('only the pinned pool and complete supported jobs/shares are accepted',()=>{
 assert.doesNotThrow(()=>pinned({fingerprint256:POOL.fingerprint}));assert.throws(()=>pinned({fingerprint256:'wrong'}));
 assert.equal(jobFrom(job).type,'job');assert.throws(()=>jobFrom({...job,algo:'rx/wow'}));assert.throws(()=>jobFrom({...job,blob:'11'.repeat(257)}));
 assert.throws(()=>shareFrom({job_id:'old',nonce:'11111111',result:'22'.repeat(32)},new Map([[job.job_id,job]])));
});
test('bridge restricts origin, fixes the payout address, and counts actual pool submit results',async()=>{
 const sockets=[];
 function connectPool(){
  const socket=new EventEmitter();socket.destroyed=false;socket.getPeerCertificate=()=>({fingerprint256:POOL.fingerprint});
  socket.destroy=()=>{socket.destroyed=true;socket.emit('close');};socket.sent=[];
  socket.write=line=>{const m=JSON.parse(line);socket.sent.push(m);if(m.method==='login')setImmediate(()=>socket.emit('data',Buffer.from(JSON.stringify({id:1,result:{id:'miner',status:'OK',job}})+'\n')));if(m.method==='submit')setImmediate(()=>socket.emit('data',Buffer.from(JSON.stringify({id:m.id,result:{status:'OK'}})+'\n')));};
  sockets.push(socket);setImmediate(()=>socket.emit('secureConnect'));return socket;
 }
 const app=createBootstrapServer({connectPool,statusProvider:async()=>({wallet:{ready:false}})});
 app.server.listen(0,'127.0.0.1');await once(app.server,'listening');const origin='http://127.0.0.1:'+app.server.address().port;
 try{
  assert.equal((await fetch(origin+'/.git/config')).status,404);
  assert.equal(await new Promise(resolve=>{http.get(origin,{headers:{Host:'attacker.example'}},response=>{response.resume();resolve(response.statusCode);});}),403);
  const rejected=new WebSocket(origin.replace('http:','ws:')+'/mine',{origin:'https://attacker.example'});await once(rejected,'error');assert.equal(sockets.length,0);
  const ws=new WebSocket(origin.replace('http:','ws:')+'/mine',{origin});const first=await once(ws,'message');assert.equal(JSON.parse(first[0]).job_id,'fixture-job');
  assert.equal(sockets[0].sent[0].params.login.split('.')[0],'ALGO:'+FUND);
  const response=once(ws,'message');ws.send(JSON.stringify({type:'share',job_id:job.job_id,nonce:'12345678',result:'11'.repeat(32)}));assert.equal(JSON.parse((await response)[0]).accepted,true);
  const duplicate=once(ws,'message');ws.send(JSON.stringify({type:'share',job_id:job.job_id,nonce:'12345678',result:'11'.repeat(32)}));assert.equal(JSON.parse((await duplicate)[0]).accepted,false);
  ws.close();await once(ws,'close');await new Promise(r=>setImmediate(r));assert.equal(sockets[0].destroyed,true);
 }finally{await app.close();}
});
