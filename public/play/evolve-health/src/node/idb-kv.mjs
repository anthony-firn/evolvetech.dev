// IndexedDB key-value store for the in-browser relay ("This browser only"), which lets several
// accounts on one shared computer use caregiver access without any server.
const req = (r) => new Promise((resolve, reject) => { r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });

export class IdbKV {
  static async open(name = 'evolve-health-relay') {
    const open = indexedDB.open(name, 1);
    open.onupgradeneeded = () => open.result.createObjectStore('kv');
    return new IdbKV(await req(open));
  }
  constructor(db) { this.db = db; }
  store(mode = 'readonly') { return this.db.transaction('kv', mode).objectStore('kv'); }
  async getJSON(k) { const v = await req(this.store().get(k)); return typeof v === 'string' ? JSON.parse(v) : null; }
  async putJSON(k, v) { await req(this.store('readwrite').put(JSON.stringify(v), k)); }
  async getBytes(k) { const v = await req(this.store().get(k)); return v instanceof Uint8Array ? v : null; }
  async putBytes(k, v) { await req(this.store('readwrite').put(v, k)); }
  async has(k) { return (await req(this.store().count(k))) > 0; }
  async del(k) { await req(this.store('readwrite').delete(k)); }
  async list(prefix) {
    return (await req(this.store().getAllKeys(IDBKeyRange.bound(prefix, `${prefix}￿`)))).map(String);
  }
}
