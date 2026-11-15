// Local storage. Only ciphertext and public metadata are written: account headers are sealed with
// the passphrase-derived key, operations and file chunks with per-profile keys.
//
// Two implementations share one interface: IndexedDB for real use and memory for the sample vault
// and tests.

const sortByLseq = (a, b) => a.lseq - b.lseq;

export class MemoryDB {
  constructor() {
    this.accounts = new Map();
    this.ops = new Map(); // space -> Map(id -> env)
    this.blobs = new Map(); // space -> Map(hash -> bytes)
    this.meta = new Map();
    this.persistent = false;
  }
  async listAccounts() { return [...this.accounts.values()].map((a) => structuredClone(a)); }
  async getAccount(acct) { const a = this.accounts.get(acct); return a ? structuredClone(a) : null; }
  async putAccount(rec) { this.accounts.set(rec.acct, structuredClone(rec)); }
  async deleteAccount(acct) { this.accounts.delete(acct); }
  async addOps(space, envs) {
    let ops = this.ops.get(space);
    if (!ops) this.ops.set(space, (ops = new Map()));
    let lseq = this.meta.get(`lseq:${space}`) || 0;
    const added = [];
    for (const env of envs) {
      if (ops.has(env.id)) continue;
      const stored = { ...env, space, lseq: ++lseq };
      ops.set(env.id, stored);
      added.push(stored);
    }
    this.meta.set(`lseq:${space}`, lseq);
    return added;
  }
  async getOps(space) { return [...(this.ops.get(space)?.values() || [])].sort(sortByLseq); }
  async putBlob(space, hash, data) {
    if (!this.blobs.has(space)) this.blobs.set(space, new Map());
    this.blobs.get(space).set(hash, data.slice());
  }
  async getBlob(space, hash) { return this.blobs.get(space)?.get(hash) || null; }
  async blobHashes(space) { return [...(this.blobs.get(space)?.keys() || [])]; }
  async getMeta(k) { const v = this.meta.get(k); return v === undefined ? null : structuredClone(v); }
  async setMeta(k, v) { this.meta.set(k, structuredClone(v)); }
  async delMeta(k) { this.meta.delete(k); }
  async deleteSpace(space) {
    this.ops.delete(space); this.blobs.delete(space);
    for (const k of [...this.meta.keys()]) if (k.includes(`:${space}`)) this.meta.delete(k);
  }
  async wipe() { this.accounts.clear(); this.ops.clear(); this.blobs.clear(); this.meta.clear(); }
}

const req = (r) => new Promise((resolve, reject) => { r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
const done = (tx) => new Promise((resolve, reject) => {
  tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
});

export class IdbDB {
  static async open(name = 'evolve-health') {
    const open = indexedDB.open(name, 1);
    open.onupgradeneeded = () => {
      const db = open.result;
      db.createObjectStore('accounts', { keyPath: 'acct' });
      db.createObjectStore('ops', { keyPath: ['space', 'id'] }).createIndex('space', 'space');
      db.createObjectStore('blobs', { keyPath: ['space', 'hash'] }).createIndex('space', 'space');
      db.createObjectStore('meta', { keyPath: 'k' });
    };
    const inst = new IdbDB(await req(open), name);
    try { inst.persistent = await navigator.storage?.persist?.() || false; } catch { inst.persistent = false; }
    return inst;
  }
  constructor(db, name) { this.db = db; this.name = name; }
  store(name, mode = 'readonly') { return this.db.transaction(name, mode).objectStore(name); }
  async listAccounts() { return req(this.store('accounts').getAll()); }
  async getAccount(acct) { return (await req(this.store('accounts').get(acct))) || null; }
  async putAccount(rec) { await req(this.store('accounts', 'readwrite').put(rec)); }
  async deleteAccount(acct) { await req(this.store('accounts', 'readwrite').delete(acct)); }
  async addOps(space, envs) {
    const tx = this.db.transaction(['ops', 'meta'], 'readwrite');
    const ops = tx.objectStore('ops'), meta = tx.objectStore('meta');
    const added = [];
    const counter = (await req(meta.get(`lseq:${space}`)))?.v || 0;
    let lseq = counter;
    for (const env of envs) {
      if (await req(ops.getKey([space, env.id]))) continue;
      const stored = { ...env, space, lseq: ++lseq };
      ops.put(stored);
      added.push(stored);
    }
    if (lseq !== counter) meta.put({ k: `lseq:${space}`, v: lseq });
    await done(tx);
    return added;
  }
  async getOps(space) {
    return (await req(this.store('ops').index('space').getAll(space))).sort(sortByLseq);
  }
  async putBlob(space, hash, data) { await req(this.store('blobs', 'readwrite').put({ space, hash, data })); }
  async getBlob(space, hash) { return (await req(this.store('blobs').get([space, hash])))?.data || null; }
  async blobHashes(space) {
    return (await req(this.store('blobs').index('space').getAllKeys(space))).map((k) => k[1]);
  }
  async getMeta(k) { const row = await req(this.store('meta').get(k)); return row ? row.v : null; }
  async setMeta(k, v) { await req(this.store('meta', 'readwrite').put({ k, v })); }
  async delMeta(k) { await req(this.store('meta', 'readwrite').delete(k)); }
  async deleteSpace(space) {
    const tx = this.db.transaction(['ops', 'blobs', 'meta'], 'readwrite');
    for (const name of ['ops', 'blobs']) {
      const store = tx.objectStore(name);
      for (const key of await req(store.index('space').getAllKeys(space))) store.delete(key);
    }
    const meta = tx.objectStore('meta');
    for (const key of await req(meta.getAllKeys())) if (String(key).includes(`:${space}`)) meta.delete(key);
    await done(tx);
  }
  async wipe() {
    this.db.close();
    await req(indexedDB.deleteDatabase(this.name));
  }
}
