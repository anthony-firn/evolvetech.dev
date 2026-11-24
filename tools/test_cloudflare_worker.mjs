import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';

const template = await readFile(new URL('./cloudflare-wasm-worker.mjs', import.meta.url), 'utf8');
const source = 'const ASSETS = {"/game.wasm":"/game.wasm.gz"};\n' + template;
const {default: worker} = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));

test('streams the exact WASM bytes without applying another Content-Encoding', async () => {
  const wasm = Buffer.concat([Buffer.from([0,97,115,109,1,0,0,0]), Buffer.alloc(100000, 0)]);
  let calls = 0;
  const env = {ASSETS: {fetch: async request => {
    calls++;
    assert.equal(request.url, 'https://preview.example/game.wasm.gz');
    assert.equal(request.method, 'GET');
    assert.equal(request.headers.get('authorization'), null);
    return new Response(gzipSync(wasm));
  }}};
  const out = await worker.fetch(new Request('https://preview.example/game.wasm', {headers: {Authorization: 'do-not-forward'}}), env);
  assert.equal(out.headers.get('content-type'), 'application/wasm');
  assert.equal(out.headers.get('content-encoding'), null);
  assert.equal(out.headers.get('accept-ranges'), 'none');
  assert.deepEqual(Buffer.from(await out.arrayBuffer()), wasm);
  assert.equal(calls, 1);
});

test('HEAD has no body, unsupported methods do not fetch an asset', async () => {
  let calls = 0;
  const env = {ASSETS: {fetch: async () => { calls++; return new Response(gzipSync('wasm')); }}};
  const head = await worker.fetch(new Request('https://preview.example/game.wasm', {method: 'HEAD'}), env);
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
  const post = await worker.fetch(new Request('https://preview.example/game.wasm', {method: 'POST'}), env);
  assert.equal(post.status, 405);
  assert.equal(calls, 1);
});

test('missing stored data returns a failure, other URLs use normal static serving', async () => {
  const unavailable = await worker.fetch(new Request('https://preview.example/game.wasm'), {ASSETS: {fetch: async () => new Response('missing', {status: 404})}});
  assert.equal(unavailable.status, 502);
  const response = new Response('home');
  const request = new Request('https://preview.example/');
  const out = await worker.fetch(request, {ASSETS: {fetch: async r => { assert.equal(r, request); return response; }}});
  assert.equal(out, response);
});
