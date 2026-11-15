// The app's model: accounts on this device, the unlocked session, its profiles and their sync.
import { b64url, fromB64url, utf8, fromUtf8, randomBytes, randomId, canonicalJSON, equalBytes } from '../lib/bytes.mjs';
import { hmac, boxFor, unbox, safetyCode, accountIdFor, DecryptError } from '../lib/crypto.mjs';
import { createAccount, unlock, saveKeyring, openHeader, mergeKeyrings, nodeAuthToken, nodeAuthHash, changePassphrase } from './account.mjs';
import { MemoryDB } from './db.mjs';
import { Space, Clock } from './space.mjs';
import {
  newMembership, signMembership, checkMembership, openGrant, grantFor, regrant, certifyManager,
  newEpochKey, sealMeta, openMeta, memberOf, ROLES,
} from './membership.mjs';
import { NodeClient, NodeError, normalizeNodeUrl, onRelayChange } from './sync.mjs';

const INVITE_DAYS = 7;

export class Vault {
  constructor(db) {
    this.db = db;
    this.session = null;
    this.spaces = new Map();
    this.listeners = new Set();
    this.nodeStatus = new Map();
    this.syncing = null;
    this.timer = null;
    this.relayOff = null;
  }

  static async open({ memory = false } = {}) {
    let db;
    if (memory || typeof indexedDB === 'undefined') db = new MemoryDB();
    else { const { IdbDB } = await import('./db.mjs'); db = await IdbDB.open(); }
    const vault = new Vault(db);
    let device = await db.getMeta('device');
    if (!device) { device = randomId(6); await db.setMeta('device', device); }
    vault.clock = new Clock(device);
    return vault;
  }

  on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  emit(what = 'change') { for (const fn of this.listeners) fn(what); }

  listAccounts() { return this.db.listAccounts(); }
  get keyring() { return this.session?.keyring; }

  // ---- signing up, unlocking, locking ----

  async create({ name, passphrase, kdf, sample = false }) {
    const { record, session } = await createAccount({ name, passphrase, kdf, sample });
    await this.db.putAccount(record);
    await this.start(session);
    return session;
  }

  async unlock(acct, passphrase) {
    const record = await this.db.getAccount(acct);
    if (!record) throw new Error('No account with that ID on this device');
    const session = await unlock(record, passphrase);
    await this.start(session);
    return session;
  }

  /** New device: fetch the sealed keyring with the Emergency Kit, then unlock it with the passphrase. */
  async signInWithKit({ acct, secretKey, nodes }, passphrase) {
    if (!nodes.length) throw new Error('Add the address of a node that holds this account');
    const token = await nodeAuthToken(fromB64url(secretKey), acct);
    let lastError;
    for (const url of nodes) {
      try {
        const h = await new NodeClient(normalizeNodeUrl(url)).request('GET', `/v1/accounts/${acct}/header`, { bearer: token });
        if (await accountIdFor(fromB64url(h.signPub)) !== acct) throw new Error('Node returned a different account');
        const record = { acct, signPub: h.signPub, boxPub: h.boxPub, kdf: h.kdf, header: h.header, secretKey, label: '', createdAt: Date.now() };
        const session = await unlock(record, passphrase);
        record.label = session.keyring.name || '';
        await this.db.putAccount(record);
        await this.start(session);
        return session;
      } catch (err) {
        if (err instanceof DecryptError) throw new Error('That passphrase does not open this account');
        lastError = err;
      }
    }
    throw lastError || new Error('Could not sign in');
  }

  async start(session) {
    this.lock(false);
    this.session = session;
    this.spaces = new Map();
    await this.loadSpaces();
    this.relayOff = onRelayChange(() => this.scheduleSync(300));
    this.timer = setInterval(() => this.syncAll().catch(() => {}), 30000);
    this.emit('unlock');
    this.scheduleSync(50);
  }

  lock(notify = true) {
    clearInterval(this.timer);
    clearTimeout(this.syncSoon);
    this.relayOff?.();
    this.relayOff = null;
    this.timer = null;
    this.session = null;
    this.spaces = new Map();
    this.nodeStatus = new Map();
    if (notify) this.emit('lock');
  }

  async persistKeyring() {
    await saveKeyring(this.session);
    await this.db.putAccount(this.session.record);
    this.emit();
  }

  async changePassphrase(passphrase) {
    await changePassphrase(this.session, passphrase);
    await this.db.putAccount(this.session.record);
    this.scheduleSync();
  }

  async forgetAccount(acct) {
    const record = await this.db.getAccount(acct);
    if (this.session?.acct === acct) {
      for (const id of Object.keys(this.keyring.spaces)) await this.db.deleteSpace(id);
      this.lock();
    }
    if (record) await this.db.deleteAccount(acct);
    this.emit();
  }

  // ---- encrypted backup (for people without a sync node) ----

  async exportBackup() {
    const { secretKey, ...account } = this.session.record;
    const spaces = [];
    for (const [id, entry] of Object.entries(this.keyring.spaces)) {
      if (entry.removed) continue;
      const membership = await this.db.getMeta(`membership:${id}`);
      if (!membership) continue;
      const ops = (await this.db.getOps(id)).map(({ lseq, ...env }) => env);
      const blobs = {};
      for (const hash of await this.db.blobHashes(id)) blobs[hash] = b64url(await this.db.getBlob(id, hash));
      spaces.push({ id, membership, ops, blobs });
    }
    return { format: 'evolve-health-backup', v: 1, createdAt: Date.now(), account, spaces };
  }

  /** Restore needs the Secret Key from the Emergency Kit: backups never contain it. */
  async restoreBackup(backup, secretKey, passphrase) {
    if (backup?.format !== 'evolve-health-backup' || backup.v !== 1) throw new Error('This is not an Evolve Health backup file');
    const record = { ...backup.account, secretKey };
    let session;
    try { session = await unlock(record, passphrase); } catch (err) {
      if (err instanceof DecryptError) throw new Error('The Secret Key or passphrase does not open this backup');
      throw err;
    }
    await this.db.putAccount(record);
    for (const s of backup.spaces) {
      if (await checkMembership(s.membership, null)) continue;
      await this.db.setMeta(`membership:${s.id}`, s.membership);
      await this.db.addOps(s.id, s.ops);
      for (const [hash, data] of Object.entries(s.blobs || {})) await this.db.putBlob(s.id, hash, fromB64url(data));
    }
    await this.start(session);
    return session;
  }

  // ---- profiles ----

  async loadSpaces() {
    for (const [id, entry] of Object.entries(this.keyring.spaces)) {
      if (entry.removed) continue;
      const membership = await this.db.getMeta(`membership:${id}`);
      if (!membership) continue;
      const space = new Space({ id, db: this.db, session: this.session, clock: this.clock, membership, keys: entry.keys });
      space.onChange(() => { this.emit(); this.scheduleSync(); });
      await space.load();
      this.spaces.set(id, space);
    }
  }

  profiles() {
    return [...this.spaces.values()].map((space) => ({
      id: space.id, space, kind: space.membership.kind, role: space.role,
      owner: space.membership.owner, mine: space.membership.owner === this.session.acct,
      name: space.profile.name || 'Unnamed',
    })).sort((a, b) => (a.mine === b.mine ? 0 : a.mine ? -1 : 1) || (a.kind === b.kind ? 0 : a.kind === 'person' ? -1 : 1) || a.name.localeCompare(b.name));
  }

  space(id) { return this.spaces.get(id) || null; }

  async createProfile(profile) {
    const id = randomId(16);
    const keys = { 1: newEpochKey() };
    const membership = await newMembership(this.session, id, profile.kind, [...this.keyring.nodes]);
    membership.meta = await sealMeta(membership, keys, { names: { [this.session.acct]: this.keyring.name || 'Owner' } });
    const signed = await signMembership(this.session, membership);
    await this.db.setMeta(`membership:${id}`, signed);
    this.keyring.spaces[id] = { keys, role: 'owner', owner: this.session.acct, kind: profile.kind, nodes: [...this.keyring.nodes], addedAt: Date.now() };
    await this.persistKeyring();
    const space = new Space({ id, db: this.db, session: this.session, clock: this.clock, membership: signed, keys });
    space.onChange(() => { this.emit(); this.scheduleSync(); });
    this.spaces.set(id, space);
    await space.put('profile', profile, 'profile');
    return space;
  }

  /** Remove a profile from this account. Owners also delete it from their nodes. */
  async removeProfile(id) {
    const space = this.spaces.get(id);
    const entry = this.keyring.spaces[id];
    if (space?.membership.owner === this.session.acct) {
      for (const url of space.membership.nodes || []) {
        try { await this.client(url).request('DELETE', `/v1/spaces/${id}`, { session: this.session }); } catch { /* best effort */ }
      }
    }
    if (entry) entry.removed = true, entry.removedAt = Date.now();
    this.spaces.delete(id);
    await this.db.deleteSpace(id);
    await this.persistKeyring();
  }

  // ---- storage nodes ----

  client(url) { return new NodeClient(url); }

  async addNode(text) {
    const url = normalizeNodeUrl(text);
    const info = await this.client(url).info();
    if (info.software !== 'evolve-health-node') throw new Error('That address is not an Evolve Health node');
    if (!this.keyring.nodes.includes(url)) this.keyring.nodes.push(url);
    for (const space of this.spaces.values()) {
      if (space.membership.owner !== this.session.acct || space.membership.nodes.includes(url)) continue;
      await this.updateMembership(space, (doc) => ({ ...doc, nodes: [...doc.nodes, url] }));
      this.keyring.spaces[space.id].nodes = [...space.membership.nodes];
    }
    await this.persistKeyring();
    await this.syncAll();
    return info;
  }

  async removeNode(url) {
    this.keyring.nodes = this.keyring.nodes.filter((n) => n !== url);
    for (const space of this.spaces.values()) {
      if (space.membership.owner !== this.session.acct || !space.membership.nodes.includes(url)) continue;
      await this.updateMembership(space, (doc) => ({ ...doc, nodes: doc.nodes.filter((n) => n !== url) }));
    }
    this.nodeStatus.delete(url);
    await this.persistKeyring();
  }

  scheduleSync(delay = 1500) {
    if (!this.session) return;
    clearTimeout(this.syncSoon);
    this.syncSoon = setTimeout(() => this.syncAll().catch(() => {}), delay);
  }

  nodesInUse() {
    const set = new Set(this.keyring.nodes);
    for (const s of this.spaces.values()) for (const n of s.membership.nodes || []) set.add(n);
    for (const p of this.keyring.pending || []) for (const n of p.nodes) set.add(n);
    return [...set];
  }

  async syncAll() {
    if (!this.session) return;
    if (this.syncing) { this.again = true; return this.syncing; }
    const session = this.session;
    this.syncing = (async () => {
      await this.loadNewSpaces(); // profiles in the keyring that are not on this device yet
      for (const url of this.nodesInUse()) {
        if (this.session !== session) return;
        const status = { at: Date.now(), ok: true, error: null };
        try {
          if (this.keyring.nodes.includes(url)) await this.syncAccount(url);
          await this.syncPending(url);
          for (const space of [...this.spaces.values()]) if ((space.membership.nodes || []).includes(url)) await this.syncSpace(space, url);
          if (this.keyring.nodes.includes(url)) await this.processInbox(url);
        } catch (err) {
          Object.assign(status, { ok: false, error: err.message });
        }
        this.nodeStatus.set(url, status);
      }
      this.emit('sync');
    })();
    try { await this.syncing; } finally {
      this.syncing = null;
      if (this.again) { this.again = false; this.scheduleSync(200); }
    }
  }

  async syncAccount(url) {
    const pushed = await this.db.getMeta(`header:${this.session.acct}:${url}`);
    const rec = this.session.record;
    if (pushed === rec.header.version) return;
    const node = this.client(url);
    const body = {
      signPub: rec.signPub, boxPub: rec.boxPub, kdf: rec.kdf, header: rec.header,
      authHash: await nodeAuthHash(await nodeAuthToken(fromB64url(rec.secretKey), rec.acct)),
    };
    try {
      await node.request('PUT', `/v1/accounts/${rec.acct}`, { session: this.session, body });
    } catch (err) {
      if (!(err instanceof NodeError) || err.status !== 409) throw err;
      // Another device saved a newer keyring: merge both and save the union.
      const remote = await node.request('GET', `/v1/accounts/${rec.acct}/header`, { session: this.session });
      let theirs;
      try { theirs = await openHeader(this.session, remote.header); } catch {
        throw new Error('This account’s passphrase was changed on another device. Lock, then unlock with the new passphrase.');
      }
      this.session.keyring = mergeKeyrings(this.session.keyring, theirs);
      rec.header.version = Math.max(rec.header.version, remote.header.version);
      await this.persistKeyring();
      await this.loadNewSpaces();
      return this.syncAccount(url);
    }
    await this.db.setMeta(`header:${this.session.acct}:${url}`, rec.header.version);
  }

  async loadNewSpaces() {
    for (const [id, entry] of Object.entries(this.keyring.spaces)) {
      if (entry.removed || this.spaces.has(id)) continue;
      for (const url of new Set([...(entry.nodes || []), ...this.keyring.nodes])) {
        try {
          const { membership } = await this.client(url).request('GET', `/v1/spaces/${id}`, { session: this.session });
          if (await checkMembership(membership, null)) continue;
          await this.adoptSpace(id, membership, entry.keys);
          break;
        } catch { /* try the next node */ }
      }
    }
  }

  async adoptSpace(id, membership, keys) {
    await this.db.setMeta(`membership:${id}`, membership);
    const space = new Space({ id, db: this.db, session: this.session, clock: this.clock, membership, keys });
    space.onChange(() => { this.emit(); this.scheduleSync(); });
    await space.load();
    this.spaces.set(id, space);
    return space;
  }

  async syncSpace(space, url) {
    const node = this.client(url);
    const id = space.id;
    let remote;
    try {
      remote = (await node.request('GET', `/v1/spaces/${id}`, { session: this.session })).membership;
    } catch (err) {
      if (err instanceof NodeError && err.status === 404 && space.canManage()) {
        await node.request('PUT', `/v1/spaces/${id}`, { session: this.session, body: space.membership });
        remote = space.membership;
      } else if (err instanceof NodeError && err.status === 403 && space.membership.owner !== this.session.acct) {
        return this.lostAccess(space);
      } else throw err;
    }
    if (remote.version > space.membership.version) {
      if (await checkMembership(remote, space.membership)) throw new Error('A node sent a membership change that does not verify');
      await this.applyMembership(space, remote);
      if (!this.spaces.has(id)) return;
    } else if (remote.version < space.membership.version) {
      await node.request('PUT', `/v1/spaces/${id}`, { session: this.session, body: space.membership });
    }

    // Push operations this node has not seen from us, then pull what others wrote.
    const ops = await this.db.getOps(id);
    if (space.canWrite()) {
      const pushedKey = `push:${url}:${id}`;
      const pushedUpTo = (await this.db.getMeta(pushedKey)) || 0;
      const toPush = ops.filter((o) => o.lseq > pushedUpTo);
      for (let i = 0; i < toPush.length; i += 200) {
        const batch = toPush.slice(i, i + 200);
        await node.request('POST', `/v1/spaces/${id}/ops`, { session: this.session, body: { ops: batch.map(({ lseq, ...env }) => env) } });
        await this.db.setMeta(pushedKey, batch[batch.length - 1].lseq);
      }
      await this.pushBlobs(space, url);
    }
    const pullKey = `pull:${url}:${id}`;
    let after = (await this.db.getMeta(pullKey)) || 0;
    for (;;) {
      const res = await node.request('GET', `/v1/spaces/${id}/ops?after=${after}`, { session: this.session });
      if (res.ops.length) {
        const added = await this.db.addOps(id, res.ops.map(({ n, ...env }) => env));
        if (added.length) await space.ingest(added);
      }
      after = res.next;
      await this.db.setMeta(pullKey, after);
      if (!res.more) break;
    }
  }

  async pushBlobs(space, url) {
    const key = `blobs:${url}:${space.id}`;
    const done = new Set((await this.db.getMeta(key)) || []);
    const todo = (await this.db.blobHashes(space.id)).filter((h) => !done.has(h));
    if (!todo.length) return;
    const node = this.client(url);
    for (let i = 0; i < todo.length; i += 1000) {
      const { missing } = await node.request('POST', `/v1/spaces/${space.id}/blobs`, { session: this.session, body: { hashes: todo.slice(i, i + 1000) } });
      for (const hash of missing) await node.request('PUT', `/v1/spaces/${space.id}/blobs/${hash}`, { session: this.session, body: await this.db.getBlob(space.id, hash) });
    }
    for (const h of todo) done.add(h);
    await this.db.setMeta(key, [...done]);
  }

  /** Fetch a file chunk from whichever node has it. */
  fetchBlob = async (spaceId, hash) => {
    const space = this.spaces.get(spaceId);
    for (const url of space?.membership.nodes || []) {
      try {
        return (await this.client(url).request('GET', `/v1/spaces/${spaceId}/blobs/${hash}`, { session: this.session, raw: true })).bytes;
      } catch { /* next */ }
    }
    return null;
  };

  readFile(space, ref) { return space.readFile(ref, this.fetchBlob); }

  async applyMembership(space, doc) {
    const me = memberOf(doc, this.session.acct);
    if (!me) return this.lostAccess(space, doc);
    const entry = this.keyring.spaces[space.id];
    const keys = await openGrant(this.session, doc);
    if (keys) { entry.keys = { ...entry.keys, ...keys }; space.setKeys(entry.keys); }
    entry.role = me.role;
    space.membership = doc;
    await this.db.setMeta(`membership:${space.id}`, doc);
    await this.persistKeyring();
    // Re-read stored operations: some may only now be readable with a new key.
    await space.ingest(await this.db.getOps(space.id));
    this.emit();
  }

  async lostAccess(space, doc) {
    const entry = this.keyring.spaces[space.id];
    if (entry) Object.assign(entry, { removed: true, removedAt: Date.now(), removedNote: 'Access was removed by the owner' });
    if (doc) await this.db.setMeta(`membership:${space.id}`, doc);
    this.spaces.delete(space.id);
    await this.db.deleteSpace(space.id);
    await this.persistKeyring();
  }

  // ---- caregivers and family: ongoing access to a profile ----

  async updateMembership(space, change) {
    const next = await change(structuredClone(space.membership));
    next.version = space.membership.version + 1;
    const signed = await signMembership(this.session, next);
    const problem = await checkMembership(signed, space.membership);
    if (problem) throw new Error(`That change is not allowed (${problem})`);
    space.membership = signed;
    await this.db.setMeta(`membership:${space.id}`, signed);
    for (const url of signed.nodes || []) {
      try { await this.client(url).request('PUT', `/v1/spaces/${space.id}`, { session: this.session, body: signed }); } catch { /* retried by sync */ }
    }
    this.emit();
    return signed;
  }

  async members(space) {
    const meta = await openMeta(space.membership, space.rawKeys);
    return space.membership.members.map((m) => ({ ...m, name: meta.names?.[m.acct] || (m.acct === this.session.acct ? 'You' : 'Unnamed'), you: m.acct === this.session.acct }));
  }

  async createInvite(space, { role, label }) {
    if (!space.canManage()) throw new Error('Only the owner or a manager can invite people');
    if (role === 'manager' && space.membership.owner !== this.session.acct) throw new Error('Only the owner can add managers');
    const nodes = space.membership.nodes || [];
    if (!nodes.length) throw new Error('Add a sync node first: invites travel through a node you both can reach');
    const invite = { id: randomId(12), space: space.id, secret: b64url(randomBytes(16)), role, label, createdAt: Date.now(), expiresAt: Date.now() + INVITE_DAYS * 86400000 };
    this.keyring.invites[invite.id] = invite;
    await this.persistKeyring();
    const payload = {
      v: 1, n: nodes, o: this.session.acct, os: this.session.signPub, ob: this.session.boxPub, w: space.membership.owner, s: space.id,
      i: invite.id, k: invite.secret, r: role, l: space.profile.name || 'a profile', f: this.keyring.name || '', x: invite.expiresAt,
    };
    return { invite, code: b64url(utf8(JSON.stringify(payload))) };
  }

  async cancelInvite(id) { delete this.keyring.invites[id]; await this.persistKeyring(); }

  static parseInvite(code) {
    const p = JSON.parse(fromUtf8(fromB64url(code)));
    if (p.v !== 1 || !p.o || !p.s || !p.i || !p.k || !Array.isArray(p.n)) throw new Error('That invite link is incomplete');
    return p;
  }

  inviteMac(p, me) {
    return hmac(fromB64url(p.k), canonicalJSON({ invite: p.i, space: p.s, acct: me.acct, signPub: me.signPub, boxPub: me.boxPub, name: me.name }));
  }

  /** The invited person accepts: their public keys go to the owner's inbox, sealed to the owner. */
  async acceptInvite(code, { name } = {}) {
    const p = Vault.parseInvite(code);
    if (p.x < Date.now()) throw new Error('This invite has expired. Ask for a new one.');
    if (p.o === this.session.acct || (p.w || p.o) === this.session.acct) throw new Error('This invite is for someone else: you made it');
    if (this.spaces.has(p.s)) throw new Error('You already have access to this profile');
    if (await accountIdFor(fromB64url(p.os)) !== p.o) throw new Error('The invite’s owner key does not match');
    const nodes = p.n.map(normalizeNodeUrl);
    for (const url of nodes) if (!this.keyring.nodes.includes(url)) this.keyring.nodes.push(url);
    const me = { acct: this.session.acct, signPub: this.session.signPub, boxPub: this.session.boxPub, name: name || this.keyring.name || '' };
    const mac = b64url(await this.inviteMac(p, me));
    const message = { type: 'invite-accept', invite: p.i, space: p.s, ...me, mac };
    const safety = await safetyCode({ acct: p.o, signPub: p.os, boxPub: p.ob }, me);
    this.keyring.pending = [...(this.keyring.pending || []).filter((x) => x.space !== p.s),
      { space: p.s, owner: p.w || p.o, inviter: p.o, inviterSign: p.os, inviterBox: p.ob, nodes, inviteId: p.i, label: p.l, from: p.f, role: p.r, at: Date.now(), code: safety }];
    await this.persistKeyring();
    let sent = false, lastError;
    for (const url of nodes) {
      try {
        await this.syncAccount(url);
        const sealed = await boxFor(p.ob, utf8(JSON.stringify(message)), `inbox|${p.o}`);
        await this.client(url).request('POST', `/v1/accounts/${p.o}/inbox`, { body: sealed });
        sent = true;
        break;
      } catch (err) { lastError = err; }
    }
    if (!sent) throw lastError || new Error('Could not reach the invite’s node');
    return { code: safety };
  }

  async processInbox(url) {
    const node = this.client(url);
    const { messages } = await node.request('GET', `/v1/accounts/${this.session.acct}/inbox`, { session: this.session });
    let changed = false;
    for (const msg of messages) {
      try {
        const body = JSON.parse(fromUtf8(await unbox(this.session.boxKey, this.session.boxPub, msg, `inbox|${this.session.acct}`)));
        const invite = this.keyring.invites[body.invite];
        if (body.type === 'invite-accept' && invite && invite.space === body.space && invite.expiresAt > Date.now()) {
          const expected = await this.inviteMac({ i: invite.id, s: invite.space, k: invite.secret }, body);
          if (equalBytes(expected, fromB64url(body.mac)) && await accountIdFor(fromB64url(body.signPub)) === body.acct) {
            this.keyring.requests = [...(this.keyring.requests || []).filter((r) => r.acct !== body.acct || r.space !== body.space), {
              id: randomId(8), invite: invite.id, space: invite.space, role: invite.role, label: invite.label,
              acct: body.acct, signPub: body.signPub, boxPub: body.boxPub, name: body.name, at: msg.at,
              code: await safetyCode({ acct: this.session.acct, signPub: this.session.signPub, boxPub: this.session.boxPub }, body),
            }];
            changed = true;
          }
        }
      } catch { /* unreadable or forged messages are dropped */ }
      await node.request('DELETE', `/v1/accounts/${this.session.acct}/inbox/${msg.id}`, { session: this.session });
    }
    if (changed) { await this.persistKeyring(); this.emit('request'); }
  }

  requests() { return (this.keyring?.requests || []).filter((r) => this.spaces.has(r.space)); }

  async declineRequest(id) {
    this.keyring.requests = (this.keyring.requests || []).filter((r) => r.id !== id);
    await this.persistKeyring();
  }

  async approveRequest(id) {
    const req = (this.keyring.requests || []).find((r) => r.id === id);
    const space = req && this.spaces.get(req.space);
    if (!space) throw new Error('That request is no longer valid');
    const member = { acct: req.acct, role: req.role, signPub: req.signPub, boxPub: req.boxPub, since: Date.now() };
    const names = (await openMeta(space.membership, space.rawKeys)).names || {};
    await this.updateMembership(space, async (doc) => {
      doc.members = [...doc.members.filter((m) => m.acct !== member.acct), member];
      doc.former = (doc.former || []).filter((m) => m.acct !== member.acct);
      if (member.role === 'manager') doc.certs = { ...doc.certs, [member.acct]: await certifyManager(this.session, doc, member) };
      doc.grants = { ...doc.grants, [member.acct]: await grantFor(doc.space, member, space.rawKeys) };
      doc.meta = await sealMeta(doc, space.rawKeys, { names: { ...names, [member.acct]: req.name || req.label || 'Caregiver' } });
      return doc;
    });
    delete this.keyring.invites[req.invite];
    this.keyring.requests = this.keyring.requests.filter((r) => r.id !== id);
    await this.persistKeyring();
  }

  async changeRole(space, acct, role) {
    const names = (await openMeta(space.membership, space.rawKeys)).names || {};
    await this.updateMembership(space, async (doc) => {
      const m = doc.members.find((x) => x.acct === acct);
      if (!m || m.role === 'owner') throw new Error('That person’s access cannot be changed');
      m.role = role;
      const certs = { ...doc.certs };
      if (role === 'manager') certs[acct] = await certifyManager(this.session, doc, m); else delete certs[acct];
      doc.certs = certs;
      doc.meta = await sealMeta(doc, space.rawKeys, { names });
      return doc;
    });
  }

  /** Remove someone and rotate the profile key, so nothing written afterwards is readable to them. */
  async removeMember(space, acct) {
    const names = (await openMeta(space.membership, space.rawKeys)).names || {};
    const keys = { ...space.rawKeys };
    await this.updateMembership(space, async (doc) => {
      const m = doc.members.find((x) => x.acct === acct);
      if (!m || m.role === 'owner') throw new Error('The owner cannot be removed');
      doc.members = doc.members.filter((x) => x.acct !== acct);
      doc.former = [...(doc.former || []), { acct: m.acct, signPub: m.signPub, removed: Date.now() }];
      const certs = { ...doc.certs }; delete certs[acct]; doc.certs = certs;
      doc.epoch += 1;
      keys[doc.epoch] = newEpochKey();
      doc.grants = await regrant(doc, keys, this.session.acct);
      delete names[acct];
      doc.meta = await sealMeta(doc, keys, { names });
      return doc;
    });
    const entry = this.keyring.spaces[space.id];
    entry.keys = keys;
    space.setKeys(keys);
    await this.persistKeyring();
  }

  /** Invited person: check whether the owner has approved, then load the profile. */
  async syncPending(url) {
    for (const p of [...(this.keyring.pending || [])]) {
      if (!p.nodes.includes(url) || this.spaces.has(p.space)) continue;
      let membership;
      try {
        ({ membership } = await this.client(url).request('GET', `/v1/spaces/${p.space}`, { session: this.session }));
      } catch (err) {
        if (err instanceof NodeError && (err.status === 403 || err.status === 404)) continue;
        throw err;
      }
      // The person who invited us must hold the keys named in the invite and be allowed to add people.
      const inviter = memberOf(membership, p.inviter);
      if (await checkMembership(membership, null) || membership.owner !== p.owner || !inviter
        || inviter.signPub !== p.inviterSign || inviter.boxPub !== p.inviterBox || ROLES[inviter.role] < ROLES.manager) {
        throw new Error('The shared profile does not match the invite');
      }
      const keys = await openGrant(this.session, membership);
      const me = memberOf(membership, this.session.acct);
      if (!keys || !me) continue;
      this.keyring.spaces[p.space] = { keys, role: me.role, owner: p.owner, kind: membership.kind, nodes: membership.nodes, addedAt: Date.now() };
      this.keyring.pending = this.keyring.pending.filter((x) => x.space !== p.space);
      await this.persistKeyring();
      await this.adoptSpace(p.space, membership, keys);
      this.emit('joined');
    }
  }

  // ---- shares for professionals, hosted on a node ----

  async publishShare(url, bytes, expiresAt) {
    const id = randomId(16);
    await this.client(url).request('PUT', `/v1/shares/${id}`, { session: this.session, body: bytes, headers: { 'eh-expires': String(expiresAt) } });
    return id;
  }
  withdrawShare(url, id) { return this.client(url).request('DELETE', `/v1/shares/${id}`, { session: this.session }); }
  shareLog(url, id) { return this.client(url).request('GET', `/v1/shares/${id}/log`, { session: this.session }); }
}

export { ROLES };
