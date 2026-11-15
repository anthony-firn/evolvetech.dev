// Offline support. Network first, so updates (including security fixes) arrive immediately; the
// cache is only used when there is no connection. Only the app's own files are cached; nothing
// from sync nodes or shares is.
const CACHE = 'evolve-health-v1';
const scope = new URL(self.registration.scope).pathname;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil((async () => {
  for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
  await self.clients.claim();
})()));

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== location.origin || !url.pathname.startsWith(scope) || url.pathname.includes('/v1/')) return;
  event.respondWith((async () => {
    try {
      const res = await fetch(event.request, { cache: 'no-cache' });
      if (res.ok && res.type === 'basic') {
        const key = new URL(url); key.search = '';
        (await caches.open(CACHE)).put(key.href, res.clone());
      }
      return res;
    } catch (err) {
      const hit = await caches.match(event.request, { ignoreSearch: true });
      if (hit) return hit;
      throw err;
    }
  })());
});
