// Build-time ASSETS maps original WASM URLs to their compressed static assets.
// Stream the decoded bytes: attaching Content-Encoding to already encoded asset bytes
// makes the Pages runtime encode them a second time.
export default {
  async fetch(request, env) {
    const stored = ASSETS[new URL(request.url).pathname];
    if (!stored) return env.ASSETS.fetch(request);
    if (!['GET', 'HEAD'].includes(request.method)) {
      return new Response('Method not allowed', {status: 405, headers: {Allow: 'GET, HEAD'}});
    }
    const headers = {
      'Content-Type': 'application/wasm',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Cache-Control': 'public, max-age=0, must-revalidate',
      'Accept-Ranges': 'none',
    };
    const asset = await env.ASSETS.fetch(new Request(new URL(stored, request.url), {method: 'GET'}));
    if (asset.status !== 200 || !asset.body) {
      return new Response('WASM asset unavailable', {status: 502});
    }
    if (request.method === 'HEAD') {
      await asset.body.cancel();
      return new Response(null, {headers});
    }
    return new Response(asset.body.pipeThrough(new DecompressionStream('gzip')), {headers});
  },
};
