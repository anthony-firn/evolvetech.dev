// Who may open a profile. Each profile ("space") has a membership document signed by its owner,
// or by a manager the owner certified. Storage nodes enforce it (only members can read, only
// helpers and above can write) and clients verify it, so a node cannot add itself as a member.
//
// The document also carries each member's copy of the profile keys, wrapped to that member's
// X25519 key: the node stores the wrapped copies but can open none of them.
import { b64url, fromB64url, canonicalJSON, utf8, fromUtf8, randomBytes } from '../lib/bytes.mjs';
import { sign, verify, boxFor, unbox, accountIdFor, aesKey, seal, open } from '../lib/crypto.mjs';

export const ROLES = { viewer: 1, contributor: 2, manager: 3, owner: 4 };
export const ROLE_INFO = {
  owner: { label: 'Owner', blurb: 'Full control' },
  manager: { label: 'Manager', blurb: 'Can view, add, share and invite helpers' },
  contributor: { label: 'Helper', blurb: 'Can view and add records, like notes from an appointment' },
  viewer: { label: 'Viewer', blurb: 'Can view records only' },
};

const unsigned = (doc) => { const { sig, ...rest } = doc; return canonicalJSON(rest); };
const certText = (space, m) => `EHmgr1|${space}|${m.acct}|${m.signPub}`;

export const memberOf = (doc, acct) => doc?.members?.find((m) => m.acct === acct) || null;
export const roleOf = (doc, acct) => memberOf(doc, acct)?.role || null;
export const can = (doc, acct, role) => (ROLES[roleOf(doc, acct)] || 0) >= ROLES[role];

export async function signMembership(session, doc) {
  const out = { ...doc, signer: session.acct, updatedAt: Date.now() };
  delete out.sig;
  out.sig = b64url(await sign(session.signer, `EHmem1|${unsigned(out)}`));
  return out;
}

export async function newMembership(session, space, kind, nodes = []) {
  return signMembership(session, {
    v: 1, space, kind, owner: session.acct, version: 1, epoch: 1, nodes,
    members: [{ acct: session.acct, role: 'owner', signPub: session.signPub, boxPub: session.boxPub, since: Date.now() }],
    former: [], grants: {}, certs: {}, meta: null,
  });
}

async function hasValidCert(doc, member) {
  const owner = memberOf(doc, doc.owner);
  return Boolean(owner && doc.certs?.[member.acct] && await verify(owner.signPub, doc.certs[member.acct], certText(doc.space, member)));
}

/**
 * Returns null when `doc` is acceptable after `previous` (null when this is the first version seen),
 * otherwise a short reason. Used identically by clients and storage nodes.
 */
export async function checkMembership(doc, previous = null) {
  if (!doc || doc.v !== 1 || typeof doc.space !== 'string' || !Array.isArray(doc.members) || typeof doc.version !== 'number') return 'malformed';
  const owner = doc.members.find((m) => m.acct === doc.owner);
  if (!owner || owner.role !== 'owner' || doc.members.filter((m) => m.role === 'owner').length !== 1) return 'owner missing';
  const seen = new Set();
  for (const m of doc.members) {
    if (!ROLES[m.role] || seen.has(m.acct)) return 'invalid member';
    seen.add(m.acct);
    if (await accountIdFor(fromB64url(m.signPub)) !== m.acct) return 'member key mismatch';
  }
  for (const m of doc.members.filter((x) => x.role === 'manager')) if (!await hasValidCert(doc, m)) return 'manager not certified by owner';
  if (previous) {
    if (previous.space !== doc.space || previous.owner !== doc.owner) return 'ownership changed';
    if (doc.version <= previous.version) return 'not newer';
    if (doc.epoch < previous.epoch) return 'epoch went backwards';
  }
  const authority = previous || doc;
  const signer = memberOf(authority, doc.signer);
  if (!signer || (signer.role !== 'owner' && !(signer.role === 'manager' && await hasValidCert(authority, signer)))) return 'signer cannot change members';
  // Seen for the first time (a newcomer): a later version may be signed by a manager, whose
  // authority is the owner's certificate checked above. Version 1 always comes from the owner.
  if (!previous && doc.version === 1 && doc.signer !== doc.owner) return 'first version must come from the owner';
  if (signer.role === 'manager' && previous) {
    // Managers may add or remove helpers and viewers, never change the owner or other managers.
    const managers = (d) => canonicalJSON(d.members.filter((m) => ROLES[m.role] >= ROLES.manager).map((m) => [m.acct, m.role]).sort());
    if (managers(doc) !== managers(previous) || canonicalJSON(doc.certs || {}) !== canonicalJSON(previous.certs || {})) return 'manager changed managers';
  }
  if (!await verify(signer.signPub, doc.sig, `EHmem1|${unsigned(doc)}`)) return 'bad signature';
  return null;
}

/** Owner-only: certify a member as a manager. */
export async function certifyManager(session, doc, member) {
  return b64url(await sign(session.signer, certText(doc.space, member)));
}

const grantContext = (space, acct) => `grant|${space}|${acct}`;

/** Wrap every epoch key of this profile for one member. */
export async function grantFor(space, member, keys) {
  return boxFor(member.boxPub, utf8(JSON.stringify({ space, keys })), grantContext(space, member.acct));
}

export async function openGrant(session, doc) {
  const box = doc.grants?.[session.acct];
  if (!box) return null;
  const grant = JSON.parse(fromUtf8(await unbox(session.boxKey, session.boxPub, box, grantContext(doc.space, session.acct))));
  if (grant.space !== doc.space) throw new Error('Grant is for a different profile');
  return grant.keys;
}

/** Re-wrap keys for every member except the person making the change (who already holds them). */
export async function regrant(doc, keys, actor) {
  const grants = {};
  for (const m of doc.members) if (m.acct !== actor) grants[m.acct] = await grantFor(doc.space, m, keys);
  return grants;
}

export const newEpochKey = () => b64url(randomBytes(32));

/** Display names for members, sealed with the current profile key so nodes never see them. */
export async function sealMeta(doc, keys, meta) {
  const key = await aesKey(fromB64url(keys[doc.epoch]));
  return { epoch: doc.epoch, c: b64url(await seal(key, utf8(JSON.stringify(meta)), `meta|${doc.space}`)) };
}

export async function openMeta(doc, keys) {
  if (!doc.meta || !keys?.[doc.meta.epoch]) return { names: {} };
  try {
    const key = await aesKey(fromB64url(keys[doc.meta.epoch]));
    return JSON.parse(fromUtf8(await open(key, fromB64url(doc.meta.c), `meta|${doc.space}`)));
  } catch {
    return { names: {} };
  }
}
