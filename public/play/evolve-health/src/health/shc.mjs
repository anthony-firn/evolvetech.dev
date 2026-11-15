// SMART Health Cards: the signed QR vaccination and lab cards issued by US pharmacies, states and
// health systems. Decoding is offline; checking the issuer's signature needs one request to the
// issuer's public key file, so it only happens when the person asks for it.
import { fromB64url, utf8, fromUtf8 } from '../lib/bytes.mjs';
import { resourcesFrom } from './fhir.mjs';

export const looksLikeShc = (text) => /^\s*shc:\//.test(text) || /"verifiableCredential"/.test(text.slice(0, 2000));

export async function inflateRaw(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function deflateRaw(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** `shc:/5676...` numeric QR content to the compact JWS it encodes. */
export function numericToJws(text) {
  const body = text.trim().replace(/^shc:\//, '');
  const digits = body.includes('/') ? body.split('/').pop() : body; // legacy chunked form keeps data last
  if (!/^\d+$/.test(digits) || digits.length % 2) throw new Error('Not a SMART Health Card QR code');
  let out = '';
  for (let i = 0; i < digits.length; i += 2) out += String.fromCharCode(Number(digits.slice(i, i + 2)) + 45);
  return out;
}

export function jwsList(text) {
  const t = text.trim();
  if (t.startsWith('shc:/')) return t.split(/\s+/).filter((x) => x.startsWith('shc:/')).map(numericToJws);
  if (t.startsWith('{')) return JSON.parse(t).verifiableCredential || [];
  return [t];
}

export async function decodeCard(jws) {
  const [h, p, s] = jws.split('.');
  if (!h || !p || !s) throw new Error('This card is not a signed SMART Health Card');
  const header = JSON.parse(fromUtf8(fromB64url(h)));
  const raw = fromB64url(p);
  const payload = JSON.parse(fromUtf8(header.zip === 'DEF' ? await inflateRaw(raw) : raw));
  const bundle = payload.vc?.credentialSubject?.fhirBundle;
  if (!bundle) throw new Error('The card does not contain health data');
  return { header, payload, issuer: payload.iss, issuedAt: payload.nbf ? new Date(payload.nbf * 1000).toISOString() : null, resources: resourcesFrom(JSON.stringify(bundle)), jws };
}

/** Check the ES256 signature against the issuer's published keys. Returns true/false. */
export async function verifyCard(card, fetchImpl = fetch) {
  if (!/^https:\/\//.test(card.issuer || '')) return false;
  const res = await fetchImpl(`${card.issuer.replace(/\/$/, '')}/.well-known/jwks.json`, { credentials: 'omit', referrerPolicy: 'no-referrer' });
  if (!res.ok) return false;
  const jwk = (await res.json()).keys?.find((k) => k.kid === card.header.kid);
  if (!jwk || jwk.kty !== 'EC' || jwk.crv !== 'P-256') return false;
  const key = await crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x: jwk.x, y: jwk.y }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
  const [h, p, s] = card.jws.split('.');
  return crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, fromB64url(s), utf8(`${h}.${p}`));
}
