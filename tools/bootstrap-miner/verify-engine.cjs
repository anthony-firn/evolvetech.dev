// Independent published RandomX known-answer vector, including the NUL bytes.
const createRandomX=require('./vendor/randomx/randomx_st.js');
(async()=>{
 const module=await createRandomX();
 const cache=module._randomx_alloc_cache(0),key=Buffer.from('RandomX example key\0'),input=Buffer.from('RandomX example input\0');
 const keyPtr=module._malloc(key.length),inputPtr=module._malloc(input.length),out=module._malloc(32);
 module.HEAPU8.set(key,keyPtr);module.HEAPU8.set(input,inputPtr);
 module._randomx_init_cache(cache,keyPtr,key.length);
 const vm=module._randomx_create_vm(0,cache,0);if(!cache||!vm)throw Error('RandomX allocation failed');
 module._randomx_calculate_hash(vm,inputPtr,input.length,out);
 const actual=Buffer.from(module.HEAPU8.subarray(out,out+32)).toString('hex');
 const expected='8a48e5f9db45ab79d9080574c4d81954fe6ac63842214aff73c244b26330b7c9';
 module._randomx_destroy_vm(vm);module._randomx_release_cache(cache);module._free(keyPtr);module._free(inputPtr);module._free(out);
 if(actual!==expected)throw Error('RandomX known-answer mismatch: '+actual);
 console.log('WASM RandomX known-answer vector passed:',actual);
})().catch(error=>{console.error(error);process.exitCode=1;});
