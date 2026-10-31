import assert from 'node:assert/strict';
import test from 'node:test';

let revision = 0;
const env = {
  MELD_PAYMENTS_ENABLED: 'true', MELD_API_KEY: 'test-private-key', MELD_BUY_PROVIDER: 'TEST_BUY',
  MELD_SELL_PROVIDER: 'TEST_SELL', MELD_ALGO_CURRENCY_CODE: 'ALGO', MELD_USDC_CURRENCY_CODE: 'USDC_ALGORAND',
  MELD_SELL_PAYMENT_METHOD: 'ACH',
};
async function edge(settings) {
  globalThis.Netlify = { env: { get: (name) => settings[name] } };
  return (await import(`../netlify/edge-functions/fairground.js?test=${++revision}`)).default;
}
const request = (path, init) => new Request(`https://www.evolvetech.dev/fairground/${path}`, init);

test('Meld is disabled without complete credentials and never forwards to the retired payment bridge', async () => {
  const handle = await edge({ PAYMENTS_ORIGIN: 'https://retired.invalid', PAYMENTS_PROXY_SECRET: 'old-secret', MELD_PAYMENTS_ENABLED: 'true' });
  const response = await handle(request('wallet/config'), { ip: '203.0.113.10' });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ramp: false });
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
});

test('configured Meld exposes only public availability and rejects anonymous/foreign-origin sessions', async () => {
  const handle = await edge(env);
  assert.deepEqual(await (await handle(request('wallet/config'), { ip: '203.0.113.10' })).json(), { ramp: true, provider: 'meld', environment: 'production' });
  const unsigned = await handle(request('ramp/session', { method: 'POST', body: '{}' }), { ip: '203.0.113.10' });
  assert.equal(unsigned.status, 401);
  assert.ok(!(await unsigned.text()).includes(env.MELD_API_KEY));
  const foreign = await handle(request('ramp/session', { method: 'POST', headers: { Origin: 'https://other.test' }, body: '{}' }), { ip: '203.0.113.10' });
  assert.equal(foreign.status, 403);
  const preflight = await handle(request('ramp/session', { method: 'OPTIONS', headers: { Origin: 'https://www.evolvetech.dev' } }), { ip: '203.0.113.10' });
  assert.equal(preflight.headers.get('Access-Control-Allow-Origin'), 'https://www.evolvetech.dev');
});

test('Meld checkout requires a real platform client IP and bounds bodies and repeated requests', async () => {
  const handle = await edge(env);
  assert.equal((await handle(request('ramp/session', { method: 'POST', body: '{}' }), {})).status, 503);
  assert.equal((await handle(request('ramp/session', { method: 'POST', body: 'x'.repeat(16385) }), { ip: '203.0.113.11' })).status, 413);
  for (let i = 0; i < 20; i++) {
    assert.equal((await handle(request('ramp/session', { method: 'POST', body: '{}' }), { ip: '203.0.113.12' })).status, 401);
  }
  assert.equal((await handle(request('ramp/session', { method: 'POST', body: '{}' }), { ip: '203.0.113.12' })).status, 429);
});
