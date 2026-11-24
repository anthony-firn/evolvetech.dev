// Small DOM helpers and a safe text renderer: paragraphs, **bold**, `code` and [links](https://…).
// Episode text never goes through innerHTML.

export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v == null) continue;
    if (k === 'class') node.className = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) if (c != null && c !== false) node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return node;
}

const INLINE = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\(https:\/\/[^)\s]+\))/g;

export function inline(text) {
  return String(text).split(INLINE).filter(Boolean).map(part => {
    if (part.startsWith('**')) return el('strong', {}, part.slice(2, -2));
    if (part.startsWith('`')) return el('code', {}, part.slice(1, -1));
    const link = /^\[([^\]]+)\]\((https:\/\/[^)\s]+)\)$/.exec(part);
    if (link) return el('a', {href: link[2], target: '_blank', rel: 'noopener noreferrer'}, link[1]);
    return part;
  });
}

export function prose(text) {
  return String(text).split(/\n{2,}/).map(p => p.startsWith('- ')
    ? el('ul', {}, p.split('\n').map(li => el('li', {}, inline(li.replace(/^- /, '')))))
    : el('p', {}, inline(p)));
}
