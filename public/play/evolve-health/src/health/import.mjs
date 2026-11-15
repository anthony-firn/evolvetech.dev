// One entry point for everything people bring in: FHIR files, SMART Health Cards, C-CDA,
// portal ZIP downloads, PDFs and photos.
import { fromUtf8 } from '../lib/bytes.mjs';
import { resourcesFrom, fromResources } from './fhir.mjs';
import { looksLikeShc, jwsList, decodeCard } from './shc.mjs';
import { looksLikeCcda, fromCcda } from './ccda.mjs';
import { isZip, readZip } from './zip.mjs';

const DOC_TYPES = /^(application\/pdf|image\/)/;
const guessType = (name) => ({ pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', heic: 'image/heic', webp: 'image/webp', gif: 'image/gif', txt: 'text/plain', xml: 'text/xml', json: 'application/json' }[name.split('.').pop().toLowerCase()] || 'application/octet-stream');

/**
 * @returns {Promise<{profile: object, records: Array<{kind, data, file?}>, skipped: object, cards: Array, notes: string[]}>}
 */
export async function importFile({ name, type, bytes }) {
  type = type || guessType(name);
  const result = { profile: {}, records: [], skipped: {}, cards: [], notes: [] };
  const merge = (r) => {
    Object.assign(result.profile, Object.fromEntries(Object.entries(r.profile || {}).filter(([, v]) => v)));
    result.records.push(...r.records);
    for (const [k, v] of Object.entries(r.skipped || {})) result.skipped[k] = (result.skipped[k] || 0) + v;
  };
  const source = (extra = {}) => ({ type: extra.type || 'file', name, at: new Date().toISOString().slice(0, 10), ...extra });

  if (isZip(bytes)) {
    for (const entry of await readZip(bytes)) {
      if (/(^|\/)(__MACOSX|\.)/.test(entry.name) || /\.(xsl|css|htm|html)$/i.test(entry.name)) continue;
      const inner = await importFile({ name: entry.name.split('/').pop(), type: guessType(entry.name), bytes: entry.bytes });
      merge(inner);
      result.cards.push(...inner.cards);
      result.notes.push(...inner.notes);
    }
    return result;
  }
  if (DOC_TYPES.test(type)) {
    result.records.push({ kind: 'document', data: { title: name.replace(/\.[^.]+$/, ''), type: type.startsWith('image/') ? 'X-ray or scan image' : 'Other', date: new Date().toISOString().slice(0, 10), source: source() }, file: { bytes, type, name } });
    return result;
  }
  const text = fromUtf8(bytes).replace(/^﻿/, '');
  if (looksLikeShc(text)) {
    for (const jws of jwsList(text)) {
      const card = await decodeCard(jws);
      result.cards.push(card);
      merge(fromResources(card.resources, source({ type: 'smart-health-card', issuer: card.issuer, issuedAt: card.issuedAt, verified: false })));
    }
    return result;
  }
  if (looksLikeCcda(text)) {
    merge(fromCcda(text, source({ type: 'ccda' })));
    result.records.push({ kind: 'document', data: { title: `Original record: ${name}`, type: 'Visit summary', date: new Date().toISOString().slice(0, 10), source: source({ type: 'ccda' }) }, file: { bytes, type: 'text/xml', name } });
    return result;
  }
  if (/^\s*[[{]/.test(text)) {
    merge(fromResources(resourcesFrom(text), source({ type: 'fhir' })));
    return result;
  }
  throw new Error(`${name}: not a format Evolve Health can read (FHIR JSON, SMART Health Card, C-CDA XML, ZIP, PDF or image)`);
}

/** Records already in the profile with the same kind, title and date are skipped. */
export function dedupe(space, records, titleOf, dateOf) {
  const key = (kind, data) => `${kind}|${(titleOf({ kind, data }) || '').toLowerCase()}|${dateOf({ kind, data }) || ''}`;
  const have = new Set(space.list().map((r) => key(r.kind, r.data)));
  const fresh = [];
  let dupes = 0;
  for (const r of records) {
    const k = key(r.kind, r.data);
    if (have.has(k)) { dupes++; continue; }
    have.add(k);
    fresh.push(r);
  }
  return { fresh, dupes };
}
