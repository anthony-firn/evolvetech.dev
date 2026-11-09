/** Browser-only workspace persistence; no network requests. */
let database;
async function db(){
  if(!database)database=new Promise((resolve,reject)=>{const r=indexedDB.open('open-case-law',1);r.onupgradeneeded=()=>r.result.createObjectStore('workspace');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.onblocked=()=>reject(Error('Browser storage is blocked. Export your work to keep it.'));});
  return database;
}
export async function loadWorkspace(){const d=await db();return new Promise((resolve,reject)=>{const t=d.transaction('workspace');const r=t.objectStore('workspace').get('current');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
export async function storeWorkspace(value){const d=await db();return new Promise((resolve,reject)=>{const t=d.transaction('workspace','readwrite');t.objectStore('workspace').put(value,'current');t.oncomplete=resolve;t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error||Error('Saving interrupted.'));});}
