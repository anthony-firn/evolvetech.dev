// Draw a QR matrix as one SVG path (crisp at any size, prints well, no canvas or data URLs).
import { encodeQr } from '../lib/qr.mjs';
import { svg } from './dom.mjs';

export function qrSvg(text, { ecl = 'M', label = 'QR code' } = {}) {
  const { size, modules } = encodeQr(text, { ecl });
  const q = 4;
  let d = '';
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!modules[y][x]) continue;
      let run = 1;
      while (x + run < size && modules[y][x + run]) run++;
      d += `M${x + q} ${y + q}h${run}v1h-${run}z`;
      x += run - 1;
    }
  }
  const total = size + q * 2;
  return svg('svg', { viewBox: `0 0 ${total} ${total}`, class: 'qr', role: 'img', 'aria-label': label, 'shape-rendering': 'crispEdges' },
    svg('rect', { width: total, height: total, fill: '#fff' }), svg('path', { d, fill: '#000' }));
}

export function fitsQr(text) {
  try { encodeQr(text, { ecl: 'L' }); return true; } catch { return false; }
}
