// Read ZIP archives (portal "download my record" packages). Stored and deflated entries only.
import { inflateRaw } from './shc.mjs';
import { fromUtf8 } from '../lib/bytes.mjs';

export const isZip = (bytes) => bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;

export async function readZip(bytes, { maxEntries = 500, maxBytes = 200 * 1024 * 1024 } = {}) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('Not a readable ZIP file');
  const count = view.getUint16(eocd + 10, true);
  let at = view.getUint32(eocd + 16, true);
  if (count > maxEntries) throw new Error('This archive has too many files');
  const out = [];
  let total = 0;
  for (let n = 0; n < count; n++) {
    if (view.getUint32(at, true) !== 0x02014b50) throw new Error('Damaged ZIP directory');
    const method = view.getUint16(at + 10, true);
    const compressed = view.getUint32(at + 20, true);
    const size = view.getUint32(at + 24, true);
    const nameLen = view.getUint16(at + 28, true), extraLen = view.getUint16(at + 30, true), commentLen = view.getUint16(at + 32, true);
    const local = view.getUint32(at + 42, true);
    const name = fromUtf8(bytes.subarray(at + 46, at + 46 + nameLen));
    at += 46 + nameLen + extraLen + commentLen;
    if (name.endsWith('/')) continue;
    total += size;
    if (total > maxBytes) throw new Error('This archive is too large to import');
    const dataStart = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
    const raw = bytes.subarray(dataStart, dataStart + compressed);
    if (method !== 0 && method !== 8) continue;
    out.push({ name, bytes: method === 0 ? raw.slice() : await inflateRaw(raw) });
  }
  return out;
}
