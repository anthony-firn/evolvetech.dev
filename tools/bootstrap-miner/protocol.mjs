export const FUND='WMQHGXHHWQVUN2VIZQJ5OO2GSH5Q33CVABJUCLJHP4UHLTTMS2HE3W6FEM';
export const POOL={host:'rx.unmineable.com',port:443,fingerprint:'79:B1:55:B6:71:CF:F2:F8:27:D5:A9:A8:E4:D6:08:E0:19:4B:64:79:9D:82:67:98:76:75:8F:DB:59:E8:89:97'};
export const VECTOR='8a48e5f9db45ab79d9080574c4d81954fe6ac63842214aff73c244b26330b7c9';
export function pinned(cert){if(cert?.fingerprint256!==POOL.fingerprint)throw Error('Pool certificate changed. Stop and verify its new fingerprint before updating the pin.');}
export function jobFrom(value){
 if(!value||!/^([a-f\d]{2}){43,256}$/i.test(value.blob)||!/^([a-f\d]{64})$/i.test(value.seed_hash)||!/^(?:[a-f\d]{8}|[a-f\d]{16}|[a-f\d]{64})$/i.test(value.target)||typeof value.job_id!=='string'||value.job_id.length>128||!value.job_id.length)throw Error('Pool sent an invalid mining job.');
 if(value.algo&&value.algo!=='rx/0')throw Error('Pool selected an unsupported RandomX variant.');
 return {type:'job',job_id:value.job_id,blob:value.blob,seed_hash:value.seed_hash,target:value.target};
}
export function shareFrom(value,jobs){
 if(!value||!jobs.has(value.job_id)||!/^[a-f\d]{8}$/i.test(value.nonce)||!/^[a-f\d]{64}$/i.test(value.result))throw Error('Invalid or stale share.');
 return {job_id:value.job_id,nonce:value.nonce.toLowerCase(),result:value.result.toLowerCase()};
}
export function walletReadiness(account){
 if(!account||!Number.isSafeInteger(account.amount)||!Number.isSafeInteger(account['min-balance']))throw Error('Invalid public wallet status.');
 const holding=account.assets?.find(a=>a['asset-id']===31566704);
 const ready=Boolean(holding&&holding['is-frozen']===false&&account.amount>=account['min-balance']);
 const required=holding?account['min-balance']:account['min-balance']+101000;
 return {address:FUND,microAlgo:account.amount,minimumMicroAlgo:account['min-balance'],setupMicroAlgo:required,ready,funded:account.amount>=required,round:account.round};
}
