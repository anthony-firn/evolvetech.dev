// A small, strict XML reader for clinical documents. It ignores DTDs entirely (so no external
// entities can be fetched or expanded), strips namespace prefixes and returns a plain tree.

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const decode = (s) => s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e) => {
  if (e[0] === '#') { const cp = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return Number.isFinite(cp) && cp <= 0x10ffff ? String.fromCodePoint(cp) : m; }
  return ENTITIES[e] ?? m;
});
const local = (name) => name.slice(name.indexOf(':') + 1);

export class XmlNode {
  constructor(name, attrs, parent) { this.name = name; this.attrs = attrs; this.children = []; this.parent = parent; this.text = ''; }
  attr(n) { return this.attrs[n] ?? null; }
  /** Direct children by name, or a path like "a/b/c" (each step: direct children). */
  all(path) {
    let nodes = [this];
    for (const step of path.split('/')) nodes = nodes.flatMap((n) => n.children.filter((c) => step === '*' || c.name === step));
    return nodes;
  }
  one(path) { return this.all(path)[0] || null; }
  /** First descendant (depth-first) with this name. */
  find(name, pred = () => true) {
    for (const c of this.children) {
      if (c.name === name && pred(c)) return c;
      const hit = c.find(name, pred);
      if (hit) return hit;
    }
    return null;
  }
  findAll(name, out = []) {
    for (const c of this.children) { if (c.name === name) out.push(c); c.findAll(name, out); }
    return out;
  }
  get textContent() { return (this.text + this.children.map((c) => c.textContent).join(' ')).replace(/\s+/g, ' ').trim(); }
}

export function parseXml(src) {
  if (src.length > 50 * 1024 * 1024) throw new Error('Document is too large');
  const root = new XmlNode('#document', {}, null);
  let cur = root;
  let i = 0;
  while (i < src.length) {
    const lt = src.indexOf('<', i);
    if (lt < 0) { cur.text += decode(src.slice(i)); break; }
    if (lt > i) cur.text += decode(src.slice(i, lt));
    if (src.startsWith('<!--', lt)) { const end = src.indexOf('-->', lt + 4); if (end < 0) throw new Error('Unclosed comment'); i = end + 3; continue; }
    if (src.startsWith('<![CDATA[', lt)) { const end = src.indexOf(']]>', lt + 9); if (end < 0) throw new Error('Unclosed CDATA'); cur.text += src.slice(lt + 9, end); i = end + 3; continue; }
    if (src.startsWith('<?', lt)) { const end = src.indexOf('?>', lt + 2); if (end < 0) throw new Error('Unclosed instruction'); i = end + 2; continue; }
    if (src.startsWith('<!', lt)) {
      // DOCTYPE and friends: skipped, never interpreted.
      let depth = 0, j = lt + 2;
      for (; j < src.length; j++) { if (src[j] === '[') depth++; else if (src[j] === ']') depth--; else if (src[j] === '>' && depth <= 0) break; }
      i = j + 1; continue;
    }
    const gt = findTagEnd(src, lt);
    const tag = src.slice(lt + 1, gt);
    if (tag[0] === '/') {
      const name = local(tag.slice(1).trim());
      if (cur.name !== name) throw new Error(`Mismatched </${name}>`);
      cur = cur.parent;
    } else {
      const selfClosing = tag.endsWith('/');
      const body = selfClosing ? tag.slice(0, -1) : tag;
      const m = /^([^\s/>]+)/.exec(body);
      if (!m) throw new Error('Bad tag');
      const attrs = {};
      for (const a of body.slice(m[1].length).matchAll(/([^\s=]+)\s*=\s*("([^"]*)"|'([^']*)')/g)) attrs[local(a[1])] = decode(a[3] ?? a[4]);
      const node = new XmlNode(local(m[1]), attrs, cur);
      cur.children.push(node);
      if (!selfClosing) cur = node;
    }
    i = gt + 1;
  }
  if (cur !== root) throw new Error(`Unclosed <${cur.name}>`);
  return root;
}

function findTagEnd(src, from) {
  let quote = null;
  for (let j = from + 1; j < src.length; j++) {
    const ch = src[j];
    if (quote) { if (ch === quote) quote = null; } else if (ch === '"' || ch === "'") quote = ch; else if (ch === '>') return j;
  }
  throw new Error('Unclosed tag');
}
