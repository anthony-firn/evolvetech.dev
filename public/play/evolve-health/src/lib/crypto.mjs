// WebCrypto wrappers. Everything encrypted by Evolve Health goes through seal()/open() (AES-256-GCM)
// and every write that leaves the device is signed with Ed25519. Keys for other people are
// wrapped with an ephemeral X25519 exchange (an ECIES construction with HKDF-SHA-256).
import { b64url, fromB64url, concat, utf8, randomBytes } from './bytes.mjs';

const subtle = globalThis.crypto.subtle;
const asBytes = (data) => (typeof data === 'string' ? utf8(data) : data);

export async function sha256(data) {
  return new Uint8Array(await subtle.digest('SHA-256', asBytes(data)));
}

export async function hkdf(ikm, info, length = 32, salt = new Uint8Array(32)) {
  const key = await subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  const bits = await subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: asBytes(salt), info: asBytes(info) }, key, length * 8);
  return new Uint8Array(bits);
}

export async function hmac(keyBytes, data) {
  const key = await subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await subtle.sign('HMAC', key, asBytes(data)));
}

/** Import 32 raw bytes as a non-extractable AES-GCM key. */
export const aesKey = (raw) => subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);

export async function seal(key, plaintext, aad = '') {
  const iv = randomBytes(12);
  const ct = await subtle.encrypt({ name: 'AES-GCM', iv, additionalData: asBytes(aad), tagLength: 128 }, key, asBytes(plaintext));
  return concat(iv, new Uint8Array(ct));
}

export async function open(key, sealed, aad = '') {
  if (sealed.length < 28) throw new Error('Encrypted data is truncated');
  try {
    const pt = await subtle.decrypt({ name: 'AES-GCM', iv: sealed.subarray(0, 12), additionalData: asBytes(aad), tagLength: 128 },
      key, sealed.subarray(12));
    return new Uint8Array(pt);
  } catch {
    throw new DecryptError();
  }
}

export class DecryptError extends Error {
  constructor() { super('Could not decrypt: wrong key or the data was changed'); this.name = 'DecryptError'; }
}

// Size buckets hide what kind of record an encrypted operation holds from storage nodes.
export function pad(data) {
  const need = data.length + 4;
  let size = 256;
  while (size < need && size < 65536) size *= 2;
  if (size < need) size = Math.ceil(need / 65536) * 65536;
  const out = new Uint8Array(size);
  new DataView(out.buffer).setUint32(0, data.length);
  out.set(data, 4);
  return out;
}

export function unpad(padded) {
  const len = new DataView(padded.buffer, padded.byteOffset, padded.byteLength).getUint32(0);
  if (len > padded.length - 4) throw new Error('Invalid padding');
  return padded.slice(4, 4 + len);
}

// ---- Ed25519 signatures ----

export async function supportsModernCurves() {
  try {
    await subtle.generateKey({ name: 'Ed25519' }, false, ['sign', 'verify']);
    await subtle.generateKey({ name: 'X25519' }, false, ['deriveBits']);
    return true;
  } catch {
    return false;
  }
}

export async function generateSigning() {
  const pair = await subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  return {
    pkcs8: new Uint8Array(await subtle.exportKey('pkcs8', pair.privateKey)),
    pub: new Uint8Array(await subtle.exportKey('raw', pair.publicKey)),
  };
}

export const importSigner = (pkcs8) => subtle.importKey('pkcs8', pkcs8, { name: 'Ed25519' }, false, ['sign']);

export async function sign(privateKey, data) {
  return new Uint8Array(await subtle.sign({ name: 'Ed25519' }, privateKey, asBytes(data)));
}

const verifyKeys = new Map();
export async function verify(pubRaw, signature, data) {
  const id = typeof pubRaw === 'string' ? pubRaw : b64url(pubRaw);
  let key = verifyKeys.get(id);
  if (!key) {
    key = await subtle.importKey('raw', typeof pubRaw === 'string' ? fromB64url(pubRaw) : pubRaw, { name: 'Ed25519' }, false, ['verify']);
    if (verifyKeys.size > 512) verifyKeys.clear();
    verifyKeys.set(id, key);
  }
  try {
    return await subtle.verify({ name: 'Ed25519' }, key, typeof signature === 'string' ? fromB64url(signature) : signature, asBytes(data));
  } catch {
    return false;
  }
}

// ---- X25519 key wrapping ----

export async function generateBox() {
  const pair = await subtle.generateKey({ name: 'X25519' }, true, ['deriveBits']);
  return {
    pkcs8: new Uint8Array(await subtle.exportKey('pkcs8', pair.privateKey)),
    pub: new Uint8Array(await subtle.exportKey('raw', pair.publicKey)),
  };
}

export const importBoxKey = (pkcs8) => subtle.importKey('pkcs8', pkcs8, { name: 'X25519' }, false, ['deriveBits']);

async function boxKey(privateKey, peerPub, epk, rpub, context) {
  const peer = await subtle.importKey('raw', peerPub, { name: 'X25519' }, false, []);
  const shared = new Uint8Array(await subtle.deriveBits({ name: 'X25519', public: peer }, privateKey, 256));
  return aesKey(await hkdf(shared, `evolve-health/v1/box|${context}`, 32, concat(epk, rpub)));
}

/** Encrypt bytes so only the holder of `recipientPub`'s private key can read them. */
export async function boxFor(recipientPub, plaintext, context) {
  const rpub = typeof recipientPub === 'string' ? fromB64url(recipientPub) : recipientPub;
  const eph = await subtle.generateKey({ name: 'X25519' }, true, ['deriveBits']);
  const epk = new Uint8Array(await subtle.exportKey('raw', eph.publicKey));
  const key = await boxKey(eph.privateKey, rpub, epk, rpub, context);
  return { e: b64url(epk), c: b64url(await seal(key, plaintext, context)) };
}

export async function unbox(privateKey, myPub, box, context) {
  const epk = fromB64url(box.e);
  const rpub = typeof myPub === 'string' ? fromB64url(myPub) : myPub;
  const key = await boxKey(privateKey, epk, epk, rpub, context);
  return open(key, fromB64url(box.c), context);
}

/** Account ids are the first 128 bits of SHA-256 over the Ed25519 public key. */
export async function accountIdFor(signPub) {
  return b64url((await sha256(signPub)).subarray(0, 16));
}

/** A 12-digit code two people can read to each other to confirm no one swapped their keys. */
export async function safetyCode(a, b) {
  const parts = [a, b].map((p) => `${p.acct}:${p.signPub}:${p.boxPub}`).sort();
  const digest = await sha256(parts.join('|'));
  let n = 0n;
  for (const byte of digest.subarray(0, 8)) n = (n << 8n) | BigInt(byte);
  const digits = (n % 10n ** 12n).toString().padStart(12, '0');
  return digits.match(/.{4}/g).join(' ');
}
