const CACHE='evolve-jobs-v1';
const files=['./','./index.html','./style.css','./app.js','./matcher.wasm','./manifest.webmanifest'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(files))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(x=>x.startsWith('evolve-jobs-')&&x!==CACHE).map(x=>caches.delete(x))))));
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  // Cache this workspace only. Employer requests, relays, donations and other projects bypass it.
  if(url.origin!==self.location.origin||!url.pathname.startsWith(new URL(self.registration.scope).pathname)||event.request.method!=='GET')return;
  if(!files.some(file=>new URL(file,self.registration.scope).pathname===url.pathname))return;
  event.respondWith(fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));}return response;}).catch(()=>caches.match(event.request)));
});
