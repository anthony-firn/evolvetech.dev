// Fairground podcast and wallet gateway. Meld's private API calls run here; wallet signing stays on the device.
// Source: github.com/anthony-firn/fairground; see ../lib/fairground/BUILD.json.
import { createGateway, DEFAULT_RELAYS } from '../lib/fairground/fairground-gateway.js';

const env = (name) => globalThis.Netlify?.env.get(name) || undefined;
const names = ['MELD_API_KEY', 'MELD_BUY_PROVIDER', 'MELD_SELL_PROVIDER', 'MELD_ALGO_CURRENCY_CODE', 'MELD_USDC_CURRENCY_CODE', 'MELD_SELL_PAYMENT_METHOD'];
const configured = env('MELD_PAYMENTS_ENABLED') === 'true' && names.every((name) => env(name));
const handle = createGateway({
  relays: DEFAULT_RELAYS,
  base: '/fairground',
  appUrl: 'https://www.evolvetech.dev/play/fairground/',
  walletOrigins: ['https://www.evolvetech.dev', 'capacitor://localhost', 'http://localhost'],
  feedHeaders: { 'Netlify-CDN-Cache-Control': 'public, durable, s-maxage=300, stale-while-revalidate=3600' },
  ramp: configured ? {
    apiKey: env('MELD_API_KEY'), environment: 'production',
    buyProvider: env('MELD_BUY_PROVIDER'), sellProvider: env('MELD_SELL_PROVIDER'),
    algoCurrencyCode: env('MELD_ALGO_CURRENCY_CODE'), usdcCurrencyCode: env('MELD_USDC_CURRENCY_CODE'),
    sellPaymentMethod: env('MELD_SELL_PAYMENT_METHOD'),
    ...(env('MELD_CHECKOUT_ORIGINS') ? { checkoutOrigins: env('MELD_CHECKOUT_ORIGINS').split(',').map((s) => s.trim()) } : {}),
  } : undefined,
});

// Per-isolate protection against accidental repeated checkout creation. Member signatures still authorize calls.
const requests = new Map();
const error = (message, status) => Response.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } });
export default async (request, context) => {
  const path = new URL(request.url).pathname;
  if (/^\/fairground\/(wallet|ramp)\//.test(path)) {
    const pilotIp = env('PAYMENTS_PILOT_IP');
    if (pilotIp && context?.ip !== pilotIp) {
      if (path === '/fairground/wallet/config') return Response.json({ ramp: false }, { headers: { 'Cache-Control': 'no-store' } });
      return error('bank payments are in a private pilot', 403);
    }
    if (path === '/fairground/ramp/session' && request.method === 'POST') {
      if (!context?.ip) return error('client IP unavailable', 503);
      const now = Date.now();
      for (const [ip, entry] of requests) if (now - entry.start >= 60_000) requests.delete(ip);
      if (!requests.has(context.ip) && requests.size >= 10_000) return error('checkout temporarily unavailable', 503);
      const entry = requests.get(context.ip) ?? { start: now, count: 0 };
      requests.set(context.ip, entry);
      if (++entry.count > 20) return error('please wait before starting another checkout', 429);
      const reader = request.body?.getReader();
      const chunks = [];
      let size = 0;
      if (reader) {
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > 16_384) { await reader.cancel(); return error('request too large', 413); }
          chunks.push(value);
        }
      }
      const body = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
      request = new Request(request, { body });
    }
  }
  return handle(request, { ip: context?.ip });
};

export const config = { path: '/fairground/*', cache: 'manual' };
