// Fairground's gateway: RSS feeds for Apple Podcasts, Spotify and every other podcast app (with host-read ads stitched
// into downloads), and buying and selling through Transak for the built-in wallet. Bundled from
// github.com/anthony-firn/fairground (gateway/); see ../lib/fairground/BUILD.json.
//
// Optional private settings: PAYMENTS_ORIGIN, PAYMENTS_PROXY_SECRET.
// Transak credentials belong on the fixed-IP payment service, never on this edge.
import { createGateway, DEFAULT_RELAYS } from '../lib/fairground/fairground-gateway.js';

const env = (name) => globalThis.Netlify?.env.get(name) || undefined;

const handle = createGateway({
  relays: DEFAULT_RELAYS,
  base: '/fairground',
  appUrl: 'https://www.evolvetech.dev/play/fairground/',
  // Podcast apps poll feeds often; the CDN answers most of them.
  feedHeaders: { 'Netlify-CDN-Cache-Control': 'public, durable, s-maxage=300, stale-while-revalidate=3600' },
});

export default async (request, context) => {
  const url = new URL(request.url);
  const paymentRoute = /^\/fairground\/(wallet|ramp)\//.test(url.pathname);
  const origin = env('PAYMENTS_ORIGIN');
  const secret = env('PAYMENTS_PROXY_SECRET');
  if (!paymentRoute || !origin || !secret) return handle(request, { ip: context?.ip });
  // The first live trial is private to the operator's current public IP.
  const pilotIp = env('PAYMENTS_PILOT_IP');
  if (pilotIp && context?.ip !== pilotIp) {
    if (url.pathname === '/fairground/wallet/config') return Response.json({ ramp: false }, { headers: { 'Cache-Control': 'no-store' } });
    return Response.json({ error: 'bank payments are in a private pilot' }, { status: 403, headers: { 'Cache-Control': 'no-store' } });
  }
  const browserOrigin = request.headers.get('Origin');
  const allowed = ['https://www.evolvetech.dev', 'capacitor://localhost', 'http://localhost'];
  const headers = {
    'Cache-Control': 'no-store', Vary: 'Origin',
    ...(browserOrigin && allowed.includes(browserOrigin) ? { 'Access-Control-Allow-Origin': browserOrigin } : {}),
  };
  if (browserOrigin && !allowed.includes(browserOrigin)) return Response.json({ error: 'origin not allowed' }, { status: 403, headers });
  if (!context?.ip) return Response.json({ error: 'client IP unavailable' }, { status: 503, headers });
  try {
    const target = new URL(origin);
    if (target.protocol !== 'https:' || target.pathname !== '/' || target.username || target.password || target.search || target.hash) throw new Error('invalid payment service origin');
    const forwarded = new Headers({ 'x-fairground-proxy-secret': secret, 'x-fairground-client-ip': context.ip });
    for (const name of ['authorization', 'origin', 'content-type']) {
      const value = request.headers.get(name);
      if (value) forwarded.set(name, value);
    }
    const body = request.method === 'POST' ? await request.arrayBuffer() : undefined;
    if (body && body.byteLength > 16_384) return Response.json({ error: 'request too large' }, { status: 413, headers });
    const response = await fetch(target.origin + url.pathname + url.search, { method: request.method, headers: forwarded, body, signal: AbortSignal.timeout(25_000), redirect: 'error' });
    // In particular, do not relay cookies or expose the private bridge headers.
    const out = new Headers(headers);
    for (const name of ['content-type', 'access-control-allow-origin', 'access-control-allow-methods', 'access-control-allow-headers']) {
      const value = response.headers.get(name);
      if (value) out.set(name, value);
    }
    return new Response(response.body, { status: response.status, headers: out });
  } catch {
    return Response.json({ error: 'payment service temporarily unavailable' }, { status: 503, headers });
  }
};

export const config = { path: '/fairground/*', cache: 'manual' };
