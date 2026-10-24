// Fairground's gateway: RSS feeds for Apple Podcasts, Spotify and every other podcast app (with host-read ads stitched
// into downloads), starting built-in wallets, and buying and selling USDC through Transak. Bundled from
// github.com/anthony-firn/fairground (gateway/); see ../lib/fairground/BUILD.json.
//
// Optional settings (Netlify environment variables, Functions scope):
//   FAIRGROUND_STARTER_KEY  hex Ed25519 seed of the account that starts new wallets (keep a small float in it)
//   TRANSAK_API_KEY, TRANSAK_API_SECRET, TRANSAK_ENVIRONMENT (staging | production)
import { createGateway, DEFAULT_RELAYS } from '../lib/fairground/fairground-gateway.js';

const env = (name) => globalThis.Netlify?.env.get(name) || undefined;
const starter = env('FAIRGROUND_STARTER_KEY');
const transakKey = env('TRANSAK_API_KEY');
const transakSecret = env('TRANSAK_API_SECRET');

const handle = createGateway({
  relays: DEFAULT_RELAYS,
  base: '/fairground',
  appUrl: 'https://www.evolvetech.dev/play/fairground/',
  // Podcast apps poll feeds often; the CDN answers most of them.
  feedHeaders: { 'Netlify-CDN-Cache-Control': 'public, durable, s-maxage=300, stale-while-revalidate=3600' },
  starter: starter ? { key: starter, dailyCap: 100 } : undefined,
  ramp: transakKey && transakSecret
    ? { apiKey: transakKey, apiSecret: transakSecret, environment: env('TRANSAK_ENVIRONMENT') === 'production' ? 'production' : 'staging', referrerDomain: 'www.evolvetech.dev' }
    : undefined,
});

export default (request, context) => handle(request, { ip: context?.ip });

export const config = { path: '/fairground/*', cache: 'manual' };
