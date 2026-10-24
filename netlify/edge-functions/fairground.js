// Fairground's podcast gateway: RSS feeds for Apple Podcasts, Spotify and every other podcast app, with host-read ads
// stitched into downloads. Bundled from github.com/anthony-firn/fairground (gateway/); see ../lib/fairground-gateway.json.
import { createGateway, DEFAULT_RELAYS } from '../lib/fairground-gateway.js';

const handle = createGateway({
  relays: DEFAULT_RELAYS,
  base: '/fairground',
  appUrl: 'https://www.evolvetech.dev/play/fairground/',
  // Podcast apps poll feeds often; the CDN answers most of them.
  feedHeaders: { 'Netlify-CDN-Cache-Control': 'public, durable, s-maxage=300, stale-while-revalidate=3600' },
});

export default (request) => handle(request);

export const config = { path: '/fairground/*', cache: 'manual' };
