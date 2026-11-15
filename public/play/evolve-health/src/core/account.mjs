// Accounts ("signing up"). There is no server account: signing up creates two key pairs on this
// device and seals them, with the list of profiles this person can open, into a keyring.
//
// The keyring key comes from BOTH the passphrase (Argon2id) and a random 128-bit Secret Key
// printed on the Emergency Kit. A storage node only ever receives the sealed keyring, so it cannot
// guess the passphrase offline without also having the Secret Key.
import { b64url, fromB64url, concat, utf8, fromUtf8, randomBytes, base32, fromBase32, groupCode } from '../lib/bytes.mjs';
import { aesKey, seal, open, hkdf, sha256, generateSigning, generateBox, importSigner, importBoxKey, accountIdFor } from '../lib/crypto.mjs';
import { argon2id, ACCOUNT_KDF } from '../lib/kdf.mjs';

export const normalizePassphrase = (p) => p.normalize('NFKC').trim();

async function deriveAccountKey(passphrase, secretKey, kdf, acct) {
  const stretched = await argon2id(utf8(normalizePassphrase(passphrase)), fromB64url(kdf.salt), kdf, 32);
  const raw = await hkdf(concat(stretched, secretKey), `evolve-health/v1/account|${acct}`, 32, fromB64url(kdf.salt));
  stretched.fill(0);
  const key = await aesKey(raw);
  raw.fill(0);
  return key;
}

/** Proves to a storage node that this device holds the Secret Key (for fetching the sealed keyring). */
export async function nodeAuthToken(secretKey, acct) {
  return b64url(await hkdf(secretKey, `evolve-health/v1/node-auth|${acct}`));
}
export const nodeAuthHash = async (token) => b64url(await sha256(fromB64url(token)));

const headerAad = (acct, version) => `evolve-health/v1/keyring|${acct}|${version}`;

async function sealKeyringWith(amk, keyring, version) {
  return { version, c: b64url(await seal(amk, utf8(JSON.stringify(keyring)), headerAad(keyring.acct, version))) };
}

async function sessionFrom(record, keyring, amk) {
  return {
    acct: record.acct,
    record,
    keyring,
    amk,
    signer: await importSigner(fromB64url(keyring.sign)),
    boxKey: await importBoxKey(fromB64url(keyring.box)),
    signPub: keyring.signPub,
    boxPub: keyring.boxPub,
  };
}

export async function createAccount({ passphrase, name = '', kdf = ACCOUNT_KDF, sample = false }) {
  const signing = await generateSigning();
  const box = await generateBox();
  const acct = await accountIdFor(signing.pub);
  const secretKey = randomBytes(16);
  const kdfParams = { ...kdf, salt: b64url(randomBytes(16)) };
  const amk = await deriveAccountKey(passphrase, secretKey, kdfParams, acct);
  const keyring = {
    v: 1, acct, name,
    sign: b64url(signing.pkcs8), box: b64url(box.pkcs8),
    signPub: b64url(signing.pub), boxPub: b64url(box.pub),
    nodes: [], spaces: {}, invites: {}, pending: [],
    prefs: { autoLockMinutes: 10 },
    updatedAt: Date.now(),
  };
  signing.pkcs8.fill(0); box.pkcs8.fill(0);
  const record = {
    acct, signPub: keyring.signPub, boxPub: keyring.boxPub, kdf: kdfParams,
    secretKey: b64url(secretKey), label: name, createdAt: Date.now(), sample,
    header: await sealKeyringWith(amk, keyring, 1),
  };
  return { record, session: await sessionFrom(record, keyring, amk) };
}

/** Throws DecryptError when the passphrase (or Secret Key) is wrong. */
export async function unlock(record, passphrase) {
  const amk = await deriveAccountKey(passphrase, fromB64url(record.secretKey), record.kdf, record.acct);
  const keyring = JSON.parse(fromUtf8(await open(amk, fromB64url(record.header.c), headerAad(record.acct, record.header.version))));
  if (keyring.acct !== record.acct) throw new Error('This keyring belongs to a different account');
  return sessionFrom(record, keyring, amk);
}

/** Decrypt a header fetched from a node with an existing unlocked session's key. */
export async function openHeader(session, header) {
  return JSON.parse(fromUtf8(await open(session.amk, fromB64url(header.c), headerAad(session.acct, header.version))));
}

/** Re-seal after the keyring changed. Returns the updated account record (caller persists it). */
export async function saveKeyring(session) {
  session.keyring.updatedAt = Date.now();
  session.record.header = await sealKeyringWith(session.amk, session.keyring, session.record.header.version + 1);
  return session.record;
}

export async function changePassphrase(session, passphrase) {
  const kdf = { ...session.record.kdf, salt: b64url(randomBytes(16)) };
  const amk = await deriveAccountKey(passphrase, fromB64url(session.record.secretKey), kdf, session.acct);
  session.amk = amk;
  session.record.kdf = kdf;
  return saveKeyring(session);
}

/** Union of two keyrings, used when two devices changed the account at the same time. */
export function mergeKeyrings(a, b) {
  const out = structuredClone(a.updatedAt >= b.updatedAt ? a : b);
  const other = out === a ? b : a;
  for (const [id, entry] of Object.entries(other.spaces || {})) {
    const mine = out.spaces[id];
    if (!mine) { out.spaces[id] = structuredClone(entry); continue; }
    mine.keys = { ...entry.keys, ...mine.keys };
    if (entry.removed && !mine.removed && (entry.removedAt || 0) > (mine.addedAt || 0)) mine.removed = entry.removed;
  }
  out.invites = { ...other.invites, ...out.invites };
  const pending = new Map([...(other.pending || []), ...(out.pending || [])].map((p) => [p.space, p]));
  out.requests = [...new Map([...(other.requests || []), ...(out.requests || [])].map((r) => [r.id, r])).values()];
  out.pending = [...pending.values()].filter((p) => !out.spaces[p.space]);
  out.nodes = [...new Set([...(out.nodes || []), ...(other.nodes || [])])];
  return out;
}

// ---- Emergency Kit ----

export const formatSecretKey = (record) => `EH1-${groupCode(base32(fromB64url(record.secretKey)))}`;

export function parseSecretKey(text) {
  return fromBase32(text.trim().replace(/^EH1-?/i, ''), 16);
}

/** The kit link opens the app ready to sign in on a new device. It never contains the passphrase. */
export function kitLink(appUrl, record, nodes = []) {
  const params = new URLSearchParams({ a: record.acct, k: base32(fromB64url(record.secretKey)) });
  if (nodes.length) params.set('n', nodes.join(' '));
  return `${appUrl}#kit?${params}`;
}

export function parseKit(text) {
  const raw = text.trim();
  const query = raw.includes('#kit?') ? raw.split('#kit?')[1] : raw.startsWith('kit?') ? raw.slice(4) : null;
  if (!query) throw new Error('That is not an Emergency Kit link');
  const params = new URLSearchParams(query);
  const acct = params.get('a');
  const secretKey = fromBase32(params.get('k') || '', 16);
  if (!/^[A-Za-z0-9_-]{22}$/.test(acct || '')) throw new Error('The kit link is missing its account ID');
  return { acct, secretKey: b64url(secretKey), nodes: (params.get('n') || '').split(' ').filter(Boolean) };
}

// ---- Passphrases ----

const WORDS = ('acorn actor adapt agent alarm album alert alley amber ample angle ankle apple apron arena armor arrow aspen atlas attic '
  + 'audio autumn award bacon badge bagel baker bamboo banjo barn basil basket beach beacon bead bench berry bike birch bison '
  + 'blanket blaze bloom blue board bonus boot border brave bread brick bridge brook brush bubble bucket buddy bugle cabin '
  + 'cactus camel camp canal candle canoe canyon carbon cargo carpet castle cedar cello chalk charm cherry chess chimney cider '
  + 'cinema circus citrus clay cliff clock cloud clover coast cobalt cocoa comet coral cotton cousin coyote crane crater crayon '
  + 'creek cricket crown cupcake curtain daisy dance delta denim desert diary dolphin donkey dragon drift drum eagle easel echo '
  + 'elbow ember engine falcon fable feather fence fern ferry fiddle field flint flute focus forest fossil fountain fox frost '
  + 'galaxy garden garnet gecko ginger glacier glove goose grape gravel guitar hammer harbor harvest hazel heron hiking honey '
  + 'hornet igloo island ivory jacket jasmine jelly jigsaw jungle kayak kettle kitten koala ladder lagoon lantern laptop lemon '
  + 'lilac linen lizard lobster locket lotus lumber magnet mango maple marble meadow melon meteor mint mitten mosaic motel '
  + 'mural napkin nectar needle nickel noodle nutmeg oasis ocean olive onion opera orbit orchid otter oyster paddle panda '
  + 'parade parrot pasta peach pebble pecan pepper piano pickle pillow pilot pine planet plum pocket poppy prairie pretzel '
  + 'puzzle quartz quilt rabbit radar radish raft rainbow raven ribbon river robin rocket saddle salmon sandal satin scarf '
  + 'shadow shell silver sketch sled snail sonnet spark spruce squash stable stamp starling summit sunset swan tango teapot '
  + 'thimble thunder tiger timber toast tomato topaz tractor trail tulip tunnel turtle velvet violet voyage waffle walnut '
  + 'walrus willow window winter wizard yarn yogurt zebra zipper').split(' ');

export function suggestPassphrase(words = 6) {
  const out = [];
  while (out.length < words) {
    const b = randomBytes(2);
    const n = b[0] | (b[1] << 8);
    if (n >= 65536 - (65536 % WORDS.length)) continue; // reject to avoid modulo bias
    out.push(WORDS[n % WORDS.length]);
  }
  return out.join('-');
}

const COMMON = new Set(['password', 'password1', 'password123', 'qwerty', 'letmein', 'iloveyou', '123456789', '1234567890', 'welcome', 'monkey', 'dragon', 'football', 'baseball', 'sunshine', 'princess', 'trustno1']);

/** A rough strength estimate in bits; good enough to stop obviously weak choices. */
export function passphraseStrength(passphrase) {
  const p = normalizePassphrase(passphrase);
  if (!p) return { bits: 0, ok: false, hint: 'Choose a passphrase' };
  if (COMMON.has(p.toLowerCase())) return { bits: 5, ok: false, hint: 'That passphrase is one of the most common ones' };
  const words = p.split(/[\s\-_.]+/).filter(Boolean);
  const wordsAllKnown = words.length >= 4 && words.every((w) => WORDS.includes(w.toLowerCase()));
  let pool = 0;
  if (/[a-z]/.test(p)) pool += 26;
  if (/[A-Z]/.test(p)) pool += 26;
  if (/[0-9]/.test(p)) pool += 10;
  if (/[^a-zA-Z0-9]/.test(p)) pool += 20;
  const repeats = p.length - new Set(p).size;
  let bits = Math.max(0, (p.length - repeats / 2) * Math.log2(Math.max(pool, 1)) * 0.55);
  if (wordsAllKnown) bits = words.length * Math.log2(WORDS.length);
  const ok = bits >= 44 && p.length >= 12;
  const hint = ok ? (bits >= 60 ? 'Strong' : 'Good') : p.length < 12 ? 'Use at least 12 characters — a few random words works well' : 'Add another word or two';
  return { bits: Math.round(bits), ok, hint };
}
