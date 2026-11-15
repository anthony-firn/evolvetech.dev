// A profile's records (one person or one pet). Every change is an operation: the whole record,
// encrypted with the profile key, padded to a size bucket and signed by its author. The current
// state is the newest operation per record (last-writer-wins on a hybrid logical clock), so
// devices and storage nodes can exchange operations in any order and still agree.
import { b64url, fromB64url, utf8, fromUtf8, randomId, concat } from '../lib/bytes.mjs';
import { aesKey, seal, open, sign, verify, pad, unpad, sha256, DecryptError } from '../lib/crypto.mjs';
import { ROLES } from './membership.mjs';

export class Clock {
  constructor(device) { this.device = device; this.last = 0; this.counter = 0; }
  now() {
    const ms = Date.now();
    if (ms > this.last) { this.last = ms; this.counter = 0; } else this.counter++;
    return `${this.last.toString(36).padStart(9, '0')}.${this.counter.toString(36).padStart(4, '0')}.${this.device}`;
  }
  observe(hlc) {
    const [ms36, c36] = hlc.split('.');
    const ms = parseInt(ms36, 36), c = parseInt(c36, 36);
    if (ms > this.last || (ms === this.last && c > this.counter)) { this.last = ms; this.counter = c; }
  }
}

const opAad = (env) => `EHop1|${env.space}|${env.id}|${env.epoch}|${env.author}`;
const opSigned = (env) => `${opAad(env)}|${env.c}`;
export const CHUNK = 262140; // padded chunks are exactly 256 KiB

export class Space {
  /**
   * @param {object} o
   * @param {string} o.id profile id
   * @param {object} o.db local storage
   * @param {object} o.session unlocked account session
   * @param {Clock} o.clock
   * @param {object} o.membership current membership document
   * @param {Record<string,string>} o.keys epoch -> raw key (base64url)
   */
  constructor({ id, db, session, clock, membership, keys }) {
    Object.assign(this, { id, db, session, clock, membership });
    this.setKeys(keys);
    this.records = new Map();
    this.seen = new Set();
    this.rejected = 0;
    this.listeners = new Set();
  }

  setKeys(keys) { this.rawKeys = { ...keys }; this.keys = new Map(); }

  async key(epoch) {
    if (!this.keys.has(epoch)) {
      const raw = this.rawKeys[epoch];
      if (!raw) return null;
      this.keys.set(epoch, await aesKey(fromB64url(raw)));
    }
    return this.keys.get(epoch);
  }

  get epoch() { return this.membership.epoch; }
  get role() { return this.membership.members.find((m) => m.acct === this.session.acct)?.role || null; }
  canWrite() { return (ROLES[this.role] || 0) >= ROLES.contributor; }
  canManage() { return (ROLES[this.role] || 0) >= ROLES.manager; }

  authorKey(acct) {
    const m = this.membership.members.find((x) => x.acct === acct) || this.membership.former?.find((x) => x.acct === acct);
    return m?.signPub || null;
  }

  onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  emit(rids) { for (const fn of this.listeners) fn(rids); }

  async load() {
    await this.ingest(await this.db.getOps(this.id));
    return this;
  }

  /** Verify, decrypt and fold operations. Unknown authors and bad signatures are dropped. */
  async ingest(envs) {
    const changed = new Set();
    for (const env of envs) {
      if (this.seen.has(env.id) || env.space !== this.id) continue;
      const pub = this.authorKey(env.author);
      const key = await this.key(env.epoch);
      if (!pub || !key || !await verify(pub, env.sig, opSigned(env))) { this.rejected++; continue; }
      let op;
      try {
        op = JSON.parse(fromUtf8(unpad(await open(key, fromB64url(env.c), opAad(env)))));
      } catch (err) {
        if (!(err instanceof DecryptError)) throw err;
        this.rejected++; continue;
      }
      this.seen.add(env.id);
      this.clock.observe(op.hlc);
      const current = this.records.get(op.rid);
      if (!current || current.hlc < op.hlc) {
        this.records.set(op.rid, { rid: op.rid, kind: op.kind, data: op.data, del: Boolean(op.del), hlc: op.hlc, author: env.author, opId: env.id });
        changed.add(op.rid);
      }
    }
    if (changed.size) this.emit(changed);
    return changed;
  }

  async write(kind, data, rid = randomId(12), del = false) {
    if (!this.canWrite()) throw new Error('You can view this profile but not change it');
    const op = { rid, kind, data, del, hlc: this.clock.now() };
    const env = { v: 1, space: this.id, id: randomId(16), epoch: this.epoch, author: this.session.acct };
    env.c = b64url(await seal(await this.key(this.epoch), pad(utf8(JSON.stringify(op))), opAad(env)));
    env.sig = b64url(await sign(this.session.signer, opSigned(env)));
    await this.db.addOps(this.id, [env]);
    await this.ingest([env]);
    return rid;
  }

  put(kind, data, rid) { return this.write(kind, data, rid); }
  remove(rid) { const r = this.records.get(rid); return this.write(r?.kind || 'deleted', null, rid, true); }

  get(rid) { const r = this.records.get(rid); return r && !r.del ? r : null; }
  list(kind) { return [...this.records.values()].filter((r) => !r.del && (!kind || r.kind === kind)); }
  get profile() { return this.get('profile')?.data || {}; }

  // ---- files: chunked, each chunk sealed with a per-file key and stored by its hash ----

  async saveFile(bytes, { name = 'file', type = 'application/octet-stream' } = {}) {
    const fileKeyRaw = crypto.getRandomValues(new Uint8Array(32));
    const fileKey = await aesKey(fileKeyRaw);
    const total = Math.max(1, Math.ceil(bytes.length / CHUNK));
    const hashes = [];
    for (let i = 0; i < total; i++) {
      const sealed = await seal(fileKey, pad(bytes.subarray(i * CHUNK, (i + 1) * CHUNK)), `EHblob1|${i}|${total}`);
      const hash = b64url(await sha256(sealed));
      await this.db.putBlob(this.id, hash, sealed);
      hashes.push(hash);
    }
    return { k: b64url(fileKeyRaw), h: hashes, size: bytes.length, type, name };
  }

  /** `fetchBlob(space, hash)` is called for chunks not on this device (from sync). */
  async readFile(ref, fetchBlob) {
    const key = await aesKey(fromB64url(ref.k));
    const parts = [];
    for (const [i, hash] of ref.h.entries()) {
      let sealed = await this.db.getBlob(this.id, hash);
      if (!sealed && fetchBlob) {
        sealed = await fetchBlob(this.id, hash);
        if (sealed && b64url(await sha256(sealed)) === hash) await this.db.putBlob(this.id, hash, sealed);
        else sealed = null;
      }
      if (!sealed) throw new Error('Part of this file is not on this device yet. Sync and try again.');
      parts.push(unpad(await open(key, sealed, `EHblob1|${i}|${ref.h.length}`)));
    }
    return concat(...parts);
  }
}
