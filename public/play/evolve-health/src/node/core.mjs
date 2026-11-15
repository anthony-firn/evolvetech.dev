// Evolve Health storage node: the request logic, independent of transport and storage.
//
// A node stores only ciphertext plus the public metadata needed to enforce access: account public
// keys, profile membership documents and opaque, padded operations and file chunks. It never
// receives a passphrase, a Secret Key or a profile key. Anyone can run one; people can use several.
import { b64url, fromB64url, fromUtf8, randomId } from '../lib/bytes.mjs';
import { sha256, verify, accountIdFor } from '../lib/crypto.mjs';
import { checkMembership, ROLES } from './../core/membership.mjs';

export const NODE_VERSION = '0.1.0';
const ID = /^[A-Za-z0-9_-]{16,64}$/;
const DAY = 86400000;

export const DEFAULT_CONFIG = {
  name: 'Evolve Health node',
  registration: 'open', // 'open' or 'code'
  registrationCodes: [],
  maxAccounts: 10000,
  quotaBytes: 2 * 1024 ** 3,
  maxShareBytes: 64 * 1024 ** 2,
  maxShareDays: 366,
  maxOpBytes: 1024 * 1024,
  inboxLimit: 200,
  inboxMessageBytes: 16384,
  clockSkewMs: 5 * 60 * 1000,
};

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

const json = (status, value) => ({ status, json: value });
const pad12 = (n) => String(n).padStart(12, '0');

/** Request-signature string. Clients sign exactly this with their account's Ed25519 key. */
export async function signedString(method, path, t, body) {
  return `EH1\n${method.toUpperCase()}\n${path}\n${t}\n${b64url(await sha256(body || new Uint8Array()))}`;
}

export class StorageNode {
  constructor({ kv, now = () => Date.now(), config = {} }) {
    this.kv = kv;
    this.now = now;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.locks = new Map();
    this.lastSweep = 0;
  }

  /** Serialize work per key (appends and usage counters must not interleave). */
  async locked(key, fn) {
    const prev = this.locks.get(key) || Promise.resolve();
    let release;
    const next = new Promise((r) => (release = r));
    this.locks.set(key, prev.then(() => next));
    await prev;
    try { return await fn(); } finally {
      release();
      if (this.locks.get(key) === next || this.locks.size > 1000) this.locks.delete(key);
    }
  }

  async handle({ method, path, headers = {}, body }) {
    try {
      body = body || new Uint8Array();
      if (this.now() - this.lastSweep > 10 * 60000) { this.lastSweep = this.now(); await this.sweep(); }
      return await this.route(method.toUpperCase(), path, lower(headers), body);
    } catch (err) {
      if (err instanceof HttpError) return json(err.status, { error: err.message });
      this.config.onError?.(err);
      return json(500, { error: 'Internal error' });
    }
  }

  async route(method, path, headers, body) {
    const url = new URL(path, 'http://node');
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts[0] !== 'v1') throw new HttpError(404, 'Not found');
    const [, area, id, sub, item] = parts;
    const ctx = { method, path: url.pathname + url.search, headers, body, url };

    if (area === 'info' && method === 'GET') return json(200, this.info());
    if (area === 'accounts' && id) {
      checkId(id);
      if (!sub && method === 'PUT') return this.putAccount(ctx, id);
      if (!sub && method === 'DELETE') return this.deleteAccount(ctx, id);
      if (sub === 'public' && method === 'GET') return this.accountPublic(id);
      if (sub === 'header' && method === 'GET') return this.accountHeader(ctx, id);
      if (sub === 'inbox' && !item && method === 'POST') return this.inboxPost(ctx, id);
      if (sub === 'inbox' && !item && method === 'GET') return this.inboxList(ctx, id);
      if (sub === 'inbox' && item && method === 'DELETE') return this.inboxDelete(ctx, id, item);
    }
    if (area === 'spaces' && id) {
      checkId(id);
      if (!sub && method === 'PUT') return this.putSpace(ctx, id);
      if (!sub && method === 'GET') return this.getSpace(ctx, id);
      if (!sub && method === 'DELETE') return this.deleteSpace(ctx, id);
      if (sub === 'ops' && method === 'POST') return this.pushOps(ctx, id);
      if (sub === 'ops' && method === 'GET') return this.pullOps(ctx, id);
      if (sub === 'blobs' && item === undefined && method === 'POST') return this.missingBlobs(ctx, id);
      if (sub === 'blobs' && item && method === 'PUT') return this.putBlob(ctx, id, item);
      if (sub === 'blobs' && item && method === 'GET') return this.getBlob(ctx, id, item);
    }
    if (area === 'shares' && id) {
      checkId(id);
      if (!sub && method === 'PUT') return this.putShare(ctx, id);
      if (!sub && method === 'GET') return this.getShare(id);
      if (!sub && method === 'DELETE') return this.deleteShare(ctx, id);
      if (sub === 'log' && method === 'GET') return this.shareLog(ctx, id);
    }
    throw new HttpError(404, 'Not found');
  }

  info() {
    const c = this.config;
    return {
      software: 'evolve-health-node', version: NODE_VERSION, name: c.name, registration: c.registration,
      limits: { quotaBytes: c.quotaBytes, maxShareBytes: c.maxShareBytes, maxShareDays: c.maxShareDays },
    };
  }

  // ---- authentication ----

  async authenticate(ctx, { pub } = {}) {
    const auth = ctx.headers.authorization || '';
    const m = /^EH1 acct=([A-Za-z0-9_-]{22}),t=(\d{10,16}),sig=([A-Za-z0-9_-]{80,90})$/.exec(auth);
    if (!m) throw new HttpError(401, 'Signed request required');
    const [, acct, t, sig] = m;
    if (Math.abs(this.now() - Number(t)) > this.config.clockSkewMs) throw new HttpError(401, 'Request time is too far from the node clock');
    const account = pub ? null : await this.kv.getJSON(`account/${acct}`);
    const key = pub || account?.signPub;
    if (!key) throw new HttpError(401, 'Unknown account on this node');
    if (!await verify(key, sig, await signedString(ctx.method, ctx.path, t, ctx.body))) throw new HttpError(401, 'Bad request signature');
    return { acct, account };
  }

  // ---- accounts ----

  async putAccount(ctx, acct) {
    const req = parseJSON(ctx.body);
    const existing = await this.kv.getJSON(`account/${acct}`);
    const pub = existing?.signPub || req.signPub;
    if (typeof pub !== 'string' || await accountIdFor(fromB64url(pub)) !== acct) throw new HttpError(400, 'Account id does not match its key');
    const auth = await this.authenticate(ctx, { pub });
    if (auth.acct !== acct) throw new HttpError(403, 'Not your account');
    if (!req.header || typeof req.header.c !== 'string' || typeof req.header.version !== 'number') throw new HttpError(400, 'Missing sealed keyring');
    if (req.header.c.length > 2 * 1024 * 1024) throw new HttpError(413, 'Keyring is too large');
    return this.locked(`account/${acct}`, async () => {
      const current = await this.kv.getJSON(`account/${acct}`);
      if (!current) {
        if (this.config.registration === 'code' && !this.config.registrationCodes.includes(ctx.headers['eh-node-code'])) {
          throw new HttpError(403, 'This node needs a registration code from its operator');
        }
        const count = (await this.kv.list('account/')).length;
        if (count >= this.config.maxAccounts) throw new HttpError(403, 'This node is full');
        if (typeof req.boxPub !== 'string' || typeof req.authHash !== 'string') throw new HttpError(400, 'Missing public keys');
        await this.kv.putJSON(`account/${acct}`, {
          acct, signPub: req.signPub, boxPub: req.boxPub, authHash: req.authHash, kdf: req.kdf,
          header: req.header, createdAt: this.now(), usage: 0,
        });
        return json(201, { ok: true, version: req.header.version });
      }
      if (req.header.version <= current.header.version) return json(409, { error: 'Keyring version is not newer', version: current.header.version });
      await this.kv.putJSON(`account/${acct}`, { ...current, header: req.header, kdf: req.kdf || current.kdf, authHash: req.authHash || current.authHash });
      return json(200, { ok: true, version: req.header.version });
    });
  }

  async accountPublic(acct) {
    const a = await this.kv.getJSON(`account/${acct}`);
    if (!a) throw new HttpError(404, 'Unknown account');
    return json(200, { acct, signPub: a.signPub, boxPub: a.boxPub });
  }

  /** The sealed keyring, for signing in on a new device. Requires proof of the Secret Key. */
  async accountHeader(ctx, acct) {
    const a = await this.kv.getJSON(`account/${acct}`);
    const token = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(ctx.headers.authorization || '')?.[1];
    if (a && !token) {
      // Signed requests from the account itself are also fine (for merging between devices).
      await this.authenticate(ctx);
    } else if (!a || b64url(await sha256(fromB64url(token))) !== a.authHash) {
      throw new HttpError(404, 'No account with that Emergency Kit on this node');
    }
    return json(200, { acct, signPub: a.signPub, boxPub: a.boxPub, kdf: a.kdf, header: a.header });
  }

  // ---- inbox: small sealed messages anyone may leave for an account (invite replies) ----

  async inboxPost(ctx, acct) {
    if (!await this.kv.getJSON(`account/${acct}`)) throw new HttpError(404, 'Unknown account');
    if (ctx.body.length > this.config.inboxMessageBytes) throw new HttpError(413, 'Message too large');
    const msg = parseJSON(ctx.body);
    if (typeof msg.e !== 'string' || typeof msg.c !== 'string') throw new HttpError(400, 'Messages must be sealed');
    return this.locked(`inbox/${acct}`, async () => {
      const keys = await this.kv.list(`inbox/${acct}/`);
      if (keys.length >= this.config.inboxLimit) throw new HttpError(429, 'Inbox is full');
      const id = `${pad12(this.now())}-${randomId(9)}`;
      await this.kv.putJSON(`inbox/${acct}/${id}`, { id, at: this.now(), e: msg.e, c: msg.c });
      return json(201, { id });
    });
  }

  async inboxList(ctx, acct) {
    const auth = await this.authenticate(ctx);
    if (auth.acct !== acct) throw new HttpError(403, 'Not your inbox');
    const out = [];
    for (const key of await this.kv.list(`inbox/${acct}/`)) out.push(await this.kv.getJSON(key));
    return json(200, { messages: out.filter(Boolean) });
  }

  async inboxDelete(ctx, acct, id) {
    const auth = await this.authenticate(ctx);
    if (auth.acct !== acct) throw new HttpError(403, 'Not your inbox');
    if (!/^[0-9]{12,16}-[A-Za-z0-9_-]{12}$/.test(id)) throw new HttpError(400, 'Bad message id');
    await this.kv.del(`inbox/${acct}/${id}`);
    return json(200, { ok: true });
  }

  // ---- profiles (spaces) ----

  async member(ctx, space, minRole) {
    const auth = await this.authenticate(ctx);
    const rec = await this.kv.getJSON(`space/${space}`);
    if (!rec) throw new HttpError(404, 'Unknown profile');
    const m = rec.membership.members.find((x) => x.acct === auth.acct);
    if (!m || ROLES[m.role] < ROLES[minRole]) throw new HttpError(403, 'Not a member with that access');
    return { ...auth, rec };
  }

  async putSpace(ctx, space) {
    const auth = await this.authenticate(ctx);
    const doc = parseJSON(ctx.body);
    if (doc.space !== space) throw new HttpError(400, 'Profile id mismatch');
    if (ctx.body.length > 4 * 1024 * 1024) throw new HttpError(413, 'Membership document too large');
    return this.locked(`space/${space}`, async () => {
      const rec = await this.kv.getJSON(`space/${space}`);
      if (!rec && doc.owner !== auth.acct) throw new HttpError(403, 'Only the owner can create a profile here');
      if (doc.signer !== auth.acct) throw new HttpError(403, 'Document must be signed by the uploader');
      const problem = await checkMembership(doc, rec?.membership || null);
      if (problem === 'not newer' && rec?.membership.sig === doc.sig) return json(200, { ok: true, version: doc.version });
      if (problem) throw new HttpError(rec ? 409 : 400, `Membership rejected: ${problem}`);
      await this.kv.putJSON(`space/${space}`, { membership: doc, seq: rec?.seq || 0, bytes: rec?.bytes || 0, createdAt: rec?.createdAt || this.now() });
      return json(rec ? 200 : 201, { ok: true, version: doc.version });
    });
  }

  /** Owner only: erase a profile's membership, operations and file chunks from this node. */
  async deleteSpace(ctx, space) {
    const auth = await this.authenticate(ctx);
    return this.locked(`space/${space}`, async () => {
      const rec = await this.kv.getJSON(`space/${space}`);
      if (!rec) return json(200, { ok: true });
      if (rec.membership.owner !== auth.acct) throw new HttpError(403, 'Only the owner can delete a profile');
      for (const prefix of [`ops/${space}/`, `opid/${space}/`, `blob/${space}/`]) {
        for (const key of await this.kv.list(prefix)) await this.kv.del(key);
      }
      await this.kv.del(`space/${space}`);
      await this.locked(`account/${auth.acct}`, async () => {
        const a = await this.kv.getJSON(`account/${auth.acct}`);
        if (a) { a.usage = Math.max(0, a.usage - rec.bytes); await this.kv.putJSON(`account/${auth.acct}`, a); }
      });
      return json(200, { ok: true });
    });
  }

  /** Erase an account's keyring, inbox and shares. Profiles are deleted separately by their owner. */
  async deleteAccount(ctx, acct) {
    const auth = await this.authenticate(ctx);
    if (auth.acct !== acct) throw new HttpError(403, 'Not your account');
    for (const key of await this.kv.list('share/')) {
      const meta = await this.kv.getJSON(key);
      if (meta?.creator === acct) await this.removeShare(meta);
    }
    for (const key of await this.kv.list(`inbox/${acct}/`)) await this.kv.del(key);
    await this.kv.del(`account/${acct}`);
    return json(200, { ok: true });
  }

  async getSpace(ctx, space) {
    const { rec } = await this.member(ctx, space, 'viewer');
    return json(200, { membership: rec.membership, seq: rec.seq });
  }

  async charge(owner, bytes) {
    return this.locked(`account/${owner}`, async () => {
      const a = await this.kv.getJSON(`account/${owner}`);
      if (!a) throw new HttpError(403, 'Profile owner is not registered on this node');
      if (a.usage + bytes > this.config.quotaBytes) throw new HttpError(507, 'Storage quota reached on this node');
      a.usage += bytes;
      await this.kv.putJSON(`account/${owner}`, a);
    });
  }

  async pushOps(ctx, space) {
    const { rec } = await this.member(ctx, space, 'contributor');
    const { ops } = parseJSON(ctx.body);
    if (!Array.isArray(ops) || ops.length > 500) throw new HttpError(400, 'Send between 1 and 500 operations');
    const doc = rec.membership;
    const keyOf = (acct) => (doc.members.find((m) => m.acct === acct) || doc.former?.find((m) => m.acct === acct))?.signPub;
    const valid = [];
    for (const env of ops) {
      if (!env || env.space !== space || !ID.test(env.id || '') || typeof env.c !== 'string' || typeof env.sig !== 'string') throw new HttpError(400, 'Malformed operation');
      if (env.c.length > this.config.maxOpBytes) throw new HttpError(413, 'Operation too large');
      const pub = keyOf(env.author);
      const signed = `EHop1|${env.space}|${env.id}|${env.epoch}|${env.author}|${env.c}`;
      if (!pub || !await verify(pub, env.sig, signed)) throw new HttpError(403, 'Operation not signed by a member');
      valid.push({ v: env.v, space, id: env.id, epoch: env.epoch, author: env.author, c: env.c, sig: env.sig });
    }
    return this.locked(`space/${space}`, async () => {
      const current = await this.kv.getJSON(`space/${space}`);
      let added = 0, bytes = 0;
      const fresh = [];
      for (const env of valid) {
        if (await this.kv.has(`opid/${space}/${env.id}`)) continue;
        fresh.push(env); bytes += env.c.length;
      }
      if (bytes) await this.charge(current.membership.owner, bytes);
      for (const env of fresh) {
        current.seq += 1;
        await this.kv.putJSON(`ops/${space}/${pad12(current.seq)}`, { ...env, n: current.seq });
        await this.kv.putJSON(`opid/${space}/${env.id}`, { n: current.seq });
        added++;
      }
      current.bytes += bytes;
      await this.kv.putJSON(`space/${space}`, current);
      return json(200, { added, seq: current.seq });
    });
  }

  async pullOps(ctx, space) {
    const { rec } = await this.member(ctx, space, 'viewer');
    const after = Math.max(0, parseInt(ctx.url.searchParams.get('after') || '0', 10) || 0);
    const limit = Math.min(1000, Math.max(1, parseInt(ctx.url.searchParams.get('limit') || '500', 10) || 500));
    const ops = [];
    for (let n = after + 1; n <= rec.seq && ops.length < limit; n++) {
      const env = await this.kv.getJSON(`ops/${space}/${pad12(n)}`);
      if (env) ops.push(env);
    }
    const last = ops.length ? ops[ops.length - 1].n : after;
    return json(200, { ops, next: last, more: last < rec.seq });
  }

  async missingBlobs(ctx, space) {
    await this.member(ctx, space, 'viewer');
    const { hashes } = parseJSON(ctx.body);
    if (!Array.isArray(hashes) || hashes.length > 5000) throw new HttpError(400, 'Send up to 5000 hashes');
    const missing = [];
    for (const h of hashes) if (/^[A-Za-z0-9_-]{43}$/.test(h) && !await this.kv.has(`blob/${space}/${h}`)) missing.push(h);
    return json(200, { missing });
  }

  async putBlob(ctx, space, hash) {
    const { rec } = await this.member(ctx, space, 'contributor');
    if (!/^[A-Za-z0-9_-]{43}$/.test(hash) || b64url(await sha256(ctx.body)) !== hash) throw new HttpError(400, 'Chunk does not match its hash');
    if (await this.kv.has(`blob/${space}/${hash}`)) return json(200, { ok: true });
    await this.charge(rec.membership.owner, ctx.body.length);
    await this.kv.putBytes(`blob/${space}/${hash}`, ctx.body);
    await this.locked(`space/${space}`, async () => {
      const current = await this.kv.getJSON(`space/${space}`);
      if (current) { current.bytes += ctx.body.length; await this.kv.putJSON(`space/${space}`, current); }
    });
    return json(201, { ok: true });
  }

  async getBlob(ctx, space, hash) {
    await this.member(ctx, space, 'viewer');
    if (!/^[A-Za-z0-9_-]{43}$/.test(hash)) throw new HttpError(400, 'Bad hash');
    const bytes = await this.kv.getBytes(`blob/${space}/${hash}`);
    if (!bytes) throw new HttpError(404, 'Not on this node');
    return { status: 200, bytes };
  }

  // ---- shares for professionals: one sealed package, deletable, with an open counter ----

  async putShare(ctx, id) {
    const auth = await this.authenticate(ctx);
    if (ctx.body.length > this.config.maxShareBytes) throw new HttpError(413, 'Share is larger than this node allows');
    const expires = Number(ctx.headers['eh-expires']);
    const maxExpiry = this.now() + this.config.maxShareDays * DAY;
    if (!Number.isFinite(expires) || expires <= this.now() || expires > maxExpiry) throw new HttpError(400, `Shares must expire within ${this.config.maxShareDays} days`);
    if (await this.kv.has(`share/${id}`)) throw new HttpError(409, 'Share id already used');
    await this.charge(auth.acct, ctx.body.length);
    await this.kv.putBytes(`sharedata/${id}`, ctx.body);
    await this.kv.putJSON(`share/${id}`, { id, creator: auth.acct, size: ctx.body.length, createdAt: this.now(), expiresAt: expires, opens: [] });
    return json(201, { id, expiresAt: expires });
  }

  async getShare(id) {
    const meta = await this.kv.getJSON(`share/${id}`);
    if (!meta || meta.expiresAt <= this.now()) {
      if (meta) await this.removeShare(meta);
      throw new HttpError(404, 'This share has expired or was withdrawn');
    }
    const bytes = await this.kv.getBytes(`sharedata/${id}`);
    await this.locked(`share/${id}`, async () => {
      const m = await this.kv.getJSON(`share/${id}`);
      if (!m) return;
      m.opens = [...m.opens, this.now()].slice(-100); // times only; no addresses are recorded
      await this.kv.putJSON(`share/${id}`, m);
    });
    return { status: 200, bytes, headers: { 'eh-expires': String(meta.expiresAt) } };
  }

  async shareMeta(ctx, id) {
    const auth = await this.authenticate(ctx);
    const meta = await this.kv.getJSON(`share/${id}`);
    if (!meta) throw new HttpError(404, 'Share not found');
    if (meta.creator !== auth.acct) throw new HttpError(403, 'Not your share');
    return meta;
  }

  async shareLog(ctx, id) {
    const meta = await this.shareMeta(ctx, id);
    return json(200, { opens: meta.opens, expiresAt: meta.expiresAt, createdAt: meta.createdAt });
  }

  async deleteShare(ctx, id) {
    await this.removeShare(await this.shareMeta(ctx, id));
    return json(200, { ok: true });
  }

  async removeShare(meta) {
    await this.kv.del(`sharedata/${meta.id}`);
    await this.kv.del(`share/${meta.id}`);
    await this.locked(`account/${meta.creator}`, async () => {
      const a = await this.kv.getJSON(`account/${meta.creator}`);
      if (a) { a.usage = Math.max(0, a.usage - meta.size); await this.kv.putJSON(`account/${meta.creator}`, a); }
    });
  }

  async sweep() {
    for (const key of await this.kv.list('share/')) {
      const meta = await this.kv.getJSON(key);
      if (meta && meta.expiresAt <= this.now()) await this.removeShare(meta);
    }
  }
}

function checkId(id) { if (!ID.test(id)) throw new HttpError(400, 'Bad id'); }
function lower(headers) {
  const out = {};
  for (const [k, v] of Object.entries(headers)) out[k.toLowerCase()] = v;
  return out;
}
function parseJSON(body) {
  try { return JSON.parse(fromUtf8(body)); } catch { throw new HttpError(400, 'Body must be JSON'); }
}

// ---- key-value stores ----

/** In-memory store (tests and the sample vault). */
export class MemoryKV {
  constructor() { this.map = new Map(); }
  async getJSON(k) { const v = this.map.get(k); return v === undefined ? null : JSON.parse(v); }
  async putJSON(k, v) { this.map.set(k, JSON.stringify(v)); }
  async getBytes(k) { const v = this.map.get(k); return v instanceof Uint8Array ? v.slice() : null; }
  async putBytes(k, v) { this.map.set(k, v.slice()); }
  async has(k) { return this.map.has(k); }
  async del(k) { this.map.delete(k); }
  async list(prefix) { return [...this.map.keys()].filter((k) => k.startsWith(prefix)).sort(); }
}

