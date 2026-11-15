// A share for a professional is one sealed package: the chosen records (and files), compressed,
// padded and encrypted with a fresh random key. The key travels only in the link's #fragment,
// which browsers never send to any server. An optional PIN, said out loud at the front desk,
// is stretched with Argon2id and mixed into the key, so a forwarded link alone is not enough.
import { b64url, fromB64url, utf8, fromUtf8, randomBytes, concat, base32, fromBase32, groupCode } from '../lib/bytes.mjs';
import { aesKey, seal, open, hkdf, pad, unpad } from '../lib/crypto.mjs';
import { argon2id, PIN_KDF } from '../lib/kdf.mjs';
import { deflateRaw, inflateRaw } from '../health/shc.mjs';

const VERSION = 1;
export const INLINE_LIMIT = 60000; // characters of link a browser and most chat apps accept

async function shareKey(secret, pin, salt) {
  const extra = pin ? await argon2id(utf8(String(pin).replace(/\s/g, '')), salt, PIN_KDF, 32) : new Uint8Array();
  return aesKey(await hkdf(concat(secret, extra), 'evolve-health/v1/share', 32, salt));
}

export async function sealShare(pkg, { pin } = {}) {
  const secret = randomBytes(16);
  const salt = randomBytes(16);
  const header = concat(new Uint8Array([VERSION, pin ? 1 : 0]), salt);
  const body = pad(await deflateRaw(utf8(JSON.stringify(pkg))));
  const sealed = await seal(await shareKey(secret, pin, salt), body, header);
  return { secret, bytes: concat(header, sealed) };
}

export const needsPin = (bytes) => bytes[1] === 1;

export async function openShare(bytes, secret, pin) {
  if (bytes[0] !== VERSION) throw new Error('This share was made by a newer version of Evolve Health');
  const header = bytes.subarray(0, 18);
  if (needsPin(bytes) && !pin) throw new PinRequired();
  const plain = await open(await shareKey(secret, needsPin(bytes) ? pin : null, header.subarray(2)), bytes.subarray(18), header);
  const pkg = JSON.parse(fromUtf8(await inflateRaw(unpad(plain))));
  if (pkg.kind !== 'evolve-health-share') throw new Error('Not an Evolve Health share');
  return pkg;
}

export class PinRequired extends Error { constructor() { super('Enter the PIN you were given'); this.name = 'PinRequired'; } }

/** Links: `#1.<key>.<data>` (self-contained) or `#n.<key>.<id>.<node>` (hosted on a node). */
export function shareUrl(viewer, { secret, bytes, node, id }) {
  return node ? `${viewer}#n.${b64url(secret)}.${id}.${encodeURIComponent(node)}` : `${viewer}#1.${b64url(secret)}.${b64url(bytes)}`;
}

export function parseShareUrl(text) {
  const hash = text.includes('#') ? text.slice(text.indexOf('#') + 1) : text;
  // Node addresses contain dots, so everything after the third separator is the node.
  const [mode, key, a, ...rest] = hash.split('.');
  const b = rest.join('.');
  if (mode === '1' && key && a) return { mode: 'inline', secret: fromB64url(key), bytes: fromB64url(a) };
  if (mode === 'n' && key && a && b) return { mode: 'node', secret: fromB64url(key), id: a, node: decodeURIComponent(b) };
  return null;
}

/** For file shares: the key as a code that can be typed or read over the phone. */
export const shareCode = (secret) => groupCode(base32(secret), 4);
export const parseShareCode = (code) => fromBase32(code, 16);

export function shareFile(bytes, meta) {
  return new Blob([JSON.stringify({ format: 'evolve-health-share', v: 1, ...meta, data: b64url(bytes) })], { type: 'application/json' });
}

export function readShareFile(text) {
  const file = JSON.parse(text);
  if (file.format !== 'evolve-health-share') throw new Error('This is not an Evolve Health share file');
  return fromB64url(file.data);
}

/** Copy only what a recipient should see: no file keys, chunk hashes or private labels. */
export function cleanRecord(r) {
  const data = structuredClone(r.data || {});
  delete data.sensitive;
  if (data.file) data.file = { name: data.file.name, type: data.file.type, size: data.file.size };
  if (data.card) data.card = { name: data.card.name, type: data.card.type, size: data.card.size };
  if (data.recordings) data.recordings = data.recordings.map(({ duration, type, markers, consent, at }) => ({ duration, type, markers, consent, at }));
  return { rid: r.rid, kind: r.kind, data };
}
