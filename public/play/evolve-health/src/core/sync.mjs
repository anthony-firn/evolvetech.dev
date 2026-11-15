// Talking to storage nodes. Every request except public share downloads is signed with the
// account's Ed25519 key; nodes keep no sessions or cookies.
import { b64url, utf8, fromUtf8 } from '../lib/bytes.mjs';
import { sign } from '../lib/crypto.mjs';
import { signedString, StorageNode, MemoryKV } from '../node/core.mjs';

export class NodeError extends Error {
  constructor(status, message) { super(message || `Node returned ${status}`); this.status = status; }
}

/** Pseudo-URLs for nodes that live inside the page rather than on a server. */
export const BROWSER_NODE = 'browser';
export const SAMPLE_NODE = 'sample';

let browserRelay = null;
let sampleRelay = null;
let channel;
function relayChannel() {
  if (channel === undefined) {
    channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('evolve-health-relay') : null;
    channel?.unref?.(); // Node: do not keep the process alive
  }
  return channel;
}

async function relayFor(url) {
  if (url === SAMPLE_NODE) return (sampleRelay ??= new StorageNode({ kv: new MemoryKV(), config: { name: 'Sample data (this tab only)' } }));
  if (url === BROWSER_NODE) {
    if (!browserRelay) {
      const { IdbKV } = await import('../node/idb-kv.mjs');
      browserRelay = new StorageNode({ kv: await IdbKV.open(), config: { name: 'This browser' } });
    }
    return browserRelay;
  }
  return null;
}

/** Other tabs wrote to the in-browser relay. Returns an unsubscribe function. */
export function onRelayChange(fn) {
  const ch = relayChannel();
  ch?.addEventListener('message', fn);
  return () => ch?.removeEventListener('message', fn);
}

export function normalizeNodeUrl(text) {
  const raw = text.trim();
  if (raw === BROWSER_NODE || raw === SAMPLE_NODE) return raw;
  const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.protocol !== 'https:' && !local) throw new Error('Nodes must use https:// (or run on this computer at localhost)');
  return url.origin;
}

export const nodeLabel = (url) => (url === BROWSER_NODE ? 'This browser only' : url === SAMPLE_NODE ? 'Sample relay' : url.replace(/^https?:\/\//, ''));

export class NodeClient {
  constructor(url) { this.url = url; }

  async request(method, path, { session, body, bearer, headers = {}, raw = false } = {}) {
    const bytes = body === undefined ? new Uint8Array() : body instanceof Uint8Array ? body : utf8(JSON.stringify(body));
    const h = { ...headers };
    if (body !== undefined && !(body instanceof Uint8Array)) h['content-type'] = 'application/json';
    if (body instanceof Uint8Array) h['content-type'] = 'application/octet-stream';
    if (session) {
      const t = Date.now();
      const sig = await sign(session.signer, await signedString(method, path, t, bytes));
      h.authorization = `EH1 acct=${session.acct},t=${t},sig=${b64url(sig)}`;
    }
    if (bearer) h.authorization = `Bearer ${bearer}`;

    let status, out, outHeaders = {};
    const relay = await relayFor(this.url);
    if (relay) {
      const res = await relay.handle({ method, path, headers: h, body: bytes });
      status = res.status;
      out = res.bytes || res.json;
      outHeaders = res.headers || {};
      if (method !== 'GET' && status < 400 && this.url === BROWSER_NODE) relayChannel()?.postMessage({ path: path.split('?')[0] });
    } else {
      let res;
      try {
        res = await fetch(this.url + path, {
          method, headers: h, body: method === 'GET' || method === 'DELETE' ? undefined : bytes,
          cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer', mode: 'cors',
        });
      } catch {
        const local = /^http:\/\/(localhost|127\.0\.0\.1)(:|$)/.test(this.url);
        throw new NodeError(0, local && globalThis.location?.protocol === 'https:'
          ? `Could not reach ${nodeLabel(this.url)}. Browsers ask before a website may talk to apps on your computer: allow access to “apps and services on this device” when asked, or open Evolve Health from the node itself at ${this.url}/.`
          : `Could not reach ${nodeLabel(this.url)}`);
      }
      status = res.status;
      outHeaders = { 'eh-expires': res.headers.get('eh-expires') };
      const buf = new Uint8Array(await res.arrayBuffer());
      const isJson = (res.headers.get('content-type') || '').includes('json');
      out = isJson ? JSON.parse(fromUtf8(buf) || 'null') : buf;
    }
    if (status >= 400) throw new NodeError(status, out?.error);
    if (raw) return { bytes: out, headers: outHeaders };
    return out;
  }

  info() { return this.request('GET', '/v1/info'); }
}

/** Fetch a share package without any account (used by the professional's viewer). */
export async function fetchShare(nodeUrl, id) {
  const { bytes, headers } = await new NodeClient(nodeUrl).request('GET', `/v1/shares/${id}`, { raw: true });
  return { bytes, expiresAt: Number(headers['eh-expires']) || null };
}
