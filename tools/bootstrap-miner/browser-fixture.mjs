// Test-only pool transport. No upstream pool connections or real earnings.
import {createRequire} from 'node:module';
import {EventEmitter} from 'node:events';
import {createBootstrapServer} from './server.mjs';
import {POOL,FUND} from './protocol.mjs';
let funded=false,reference=null;
const require=createRequire(import.meta.url);
async function checkHash(share){
 if(!reference)reference=(async()=>{
  const m=await require('./vendor/randomx/randomx_st.js')();
  const cache=m._randomx_alloc_cache(0),seed=m._malloc(32);m.HEAPU8.set(Buffer.alloc(32,0x22),seed);m._randomx_init_cache(cache,seed,32);
  return {m,vm:m._randomx_create_vm(0,cache,0),input:m._malloc(76),out:m._malloc(32)};
 })();
 const {m,vm,input,out}=await reference,blob=Buffer.alloc(76,0x11);Buffer.from(share.nonce,'hex').copy(blob,39);m.HEAPU8.set(blob,input);m._randomx_calculate_hash(vm,input,76,out);
 if(Buffer.from(m.HEAPU8.subarray(out,out+32)).toString('hex')!==share.result)throw Error('Browser share hash does not match the non-JIT WASM reference');
}

const app=createBootstrapServer({cacheMs:0,statusProvider:async()=>({wallet:{microAlgo:funded?500000:0,minimumMicroAlgo:100000,setupMicroAlgo:201000,ready:false,funded,round:0},pool:{balance:'0',threshold:'10',feePercent:'1',enabled:true,automatic:false}}),connectPool:()=>{
 const socket=new EventEmitter();socket.destroyed=false;socket.getPeerCertificate=()=>({fingerprint256:POOL.fingerprint});socket.destroy=()=>{socket.destroyed=true;socket.emit('close');};
 const queue=[];let checking=false;
 socket.write=line=>{const m=JSON.parse(line);if(m.method==='login')setImmediate(()=>socket.emit('data',Buffer.from(JSON.stringify({id:1,result:{id:'fixture-miner',status:'OK',job:{job_id:'fixture-only',blob:'11'.repeat(76),seed_hash:'22'.repeat(32),target:'ffffffff',algo:'rx/0'}}})+'\n')));
 if(m.method==='submit'){queue.push(m);if(!checking){checking=true;setImmediate(async()=>{try{await checkHash(queue[0].params);for(const item of queue.splice(0))socket.emit('data',Buffer.from(JSON.stringify({id:item.id,result:{status:'OK'}})+'\n'));}catch(error){socket.emit('error',error);}finally{checking=false;}});}}};
 setImmediate(()=>socket.emit('secureConnect'));return socket;
}});
app.server.listen(0,'127.0.0.1',()=>console.log('http://127.0.0.1:'+app.server.address().port));
process.stdin.on('data',()=>{funded=true;});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>app.close().then(()=>process.exit()));
