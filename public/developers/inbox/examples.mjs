import { createDemoClient } from './sdk/src/demo-client.mjs';
import { createClient, InboxError } from './sdk/src/client.mjs';
import '../copy.mjs';
const $ = id => document.getElementById(id);
$('inbox-run').addEventListener('click', async () => {
  $('inbox-run').disabled = true;
  const mode = $('inbox-operation').value;
  try {
    const client = mode === 'throttled' ? createClient({ site: 'https://fixture.example', password: 'fictional',
      fetch: async () => new Response('', { status: 429, headers: { 'Retry-After': '60' } }) }) : createDemoClient();
    const data = mode === 'get' ? await client.get('demo-welcome-001') : await client[mode === 'throttled' ? 'list' : mode]();
    $('inbox-example-output').textContent = JSON.stringify(data, null, 2);
    $('inbox-example-status').textContent = 'Fixture complete. No mailbox API was contacted.';
  } catch (error) {
    $('inbox-example-output').textContent = JSON.stringify(error instanceof InboxError ? { code: error.code, status: error.status, retryAfter: error.retryAfter } : { error: 'Fixture failed' }, null, 2);
    $('inbox-example-status').textContent = mode === 'throttled' ? 'Simulated rate limit. The client made no retry.' : 'The example failed.';
  } finally { $('inbox-run').disabled = false; }
});
