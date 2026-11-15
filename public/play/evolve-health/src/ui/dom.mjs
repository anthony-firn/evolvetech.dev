// DOM helpers. Everything is built with createElement/textContent: no HTML strings, so imported
// records cannot inject markup, and the page can enforce Trusted Types.

export function h(tag, props = {}, ...children) {
  if (props === null || typeof props !== 'object' || props instanceof Node || Array.isArray(props)) { children.unshift(props); props = {}; }
  const [name, ...classes] = tag.split('.');
  const el = document.createElement(name || 'div');
  if (classes.length) el.className = classes.join(' ');
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = [el.className, v].filter(Boolean).join(' ');
    else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k === 'value' && 'value' in el) el.value = v;
    else if (k === 'checked' || k === 'selected' || k === 'disabled' || k === 'required' || k === 'multiple' || k === 'open' || k === 'hidden') el[k] = Boolean(v);
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  append(el, children);
  return el;
}

export function append(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false || c === '') continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

export const clear = (el) => { while (el.firstChild) el.firstChild.remove(); return el; };
/** Replace an element's children, skipping null/false (native append would print "null"). */
export const fill = (el, ...children) => append(clear(el), children);

const SVG = 'http://www.w3.org/2000/svg';
export function svg(tag, attrs = {}, ...children) {
  const el = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) if (v !== undefined) el.setAttribute(k, String(v));
  for (const c of children.flat()) if (c) el.append(c);
  return el;
}

// 24×24 stroke icons, drawn for this app.
const ICONS = {
  pulse: 'M3 12h4l2-6 4 12 2-6h6',
  pill: 'M8.5 15.5l7-7a3.54 3.54 0 0 0-5-5l-7 7a3.54 3.54 0 0 0 5 5zM7 9l8 8',
  alert: 'M12 3l9.5 17h-19zM12 10v4M12 17.5v.5',
  shield: 'M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z',
  flask: 'M9 3h6M10 3v6L4.5 19a1.5 1.5 0 0 0 1.3 2h12.4a1.5 1.5 0 0 0 1.3-2L14 9V3M7 15h10',
  gauge: 'M4 18a8 8 0 1 1 16 0M12 18l4-6',
  calendar: 'M4 6h16v15H4zM4 10h16M8 3v5M16 3v5',
  scalpel: 'M4 20l9-9 3 3-6 6zM13 11l6-8 2 2-5 9',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  file: 'M6 3h8l4 4v14H6zM14 3v4h4M9 12h6M9 16h6',
  people: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21c0-4 3-6 7-6s7 2 7 6M16 3.5a4 4 0 0 1 0 7.5M18 15c2.5.5 4 2.5 4 6',
  card: 'M3 6h18v12H3zM3 10h18M7 15h4',
  tree: 'M12 21v-6M12 15l-5-4h10zM12 11L8 7h8zM12 3v4',
  phone: 'M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z',
  note: 'M5 3h14v18H5zM9 8h6M9 12h6M9 16h3',
  share: 'M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8.6 13.5l6.8 4M15.4 6.5l-6.8 4',
  lock: 'M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4',
  unlock: 'M6 11h12v10H6zM8 11V7a4 4 0 0 1 7.5-2',
  plus: 'M12 5v14M5 12h14',
  mic: 'M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zM19 11a7 7 0 0 1-14 0M12 18v3',
  paw: 'M12 20c-3 0-5-1.5-5-3.5S9.5 12 12 12s5 2.5 5 4.5-2 3.5-5 3.5zM6 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM18 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM9.5 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM14.5 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  person: 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4.4 3.6-7 8-7s8 2.6 8 7',
  home: 'M3 11l9-8 9 8M5 9.5V21h14V9.5',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 13a7.5 7.5 0 0 0 0-2l2-1.6-2-3.4-2.4 1a7.5 7.5 0 0 0-1.7-1L15 3.5h-4l-.4 2.5a7.5 7.5 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.6a7.5 7.5 0 0 0 0 2l-2 1.6 2 3.4 2.4-1a7.5 7.5 0 0 0 1.7 1l.4 2.5h4l.4-2.5a7.5 7.5 0 0 0 1.7-1l2.4 1 2-3.4z',
  sync: 'M20 12a8 8 0 0 1-14 5.3M4 12a8 8 0 0 1 14-5.3M18 3v4h-4M6 21v-4h4',
  tooth: 'M7 3c-2.5 0-4 2-4 4.5 0 3 1.5 4.5 2 7 .5 3 1 6.5 3 6.5s2-4 4-4 2 4 4 4 2.5-3.5 3-6.5c.5-2.5 2-4 2-7C21 5 19.5 3 17 3c-2 0-3 1-5 1S9 3 7 3z',
  stethoscope: 'M6 3v6a5 5 0 0 0 10 0V3M11 14v2a5 5 0 0 0 10 0v-2M21 12a2 2 0 1 0-4 0 2 2 0 0 0 4 0z',
  chat: 'M4 5h16v11H9l-5 4z',
  walk: 'M13 5a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM10 22l2-7-3-3 1-5 4 3h4M9 7l-4 3v4M12 15l3 7',
  scissors: 'M6 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8.5 7.5L20 19M8.5 16.5L20 5',
  check: 'M4 12l5 5L20 6',
  x: 'M6 6l12 12M18 6L6 18',
  chevron: 'M9 5l7 7-7 7',
  back: 'M15 5l-7 7 7 7',
  download: 'M12 3v12M7 10l5 5 5-5M4 21h16',
  upload: 'M12 21V9M7 14l5-5 5 5M4 3h16',
  qr: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h3v3h-3zM18 18h3v3h-3zM18 14h3M14 18v3',
  copy: 'M8 8h12v13H8zM16 8V3H4v13h4',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V4h6v3',
  edit: 'M4 20h4L20 8l-4-4L4 16zM14 6l4 4',
  play: 'M7 4l13 8-13 8z',
  pause: 'M7 4h4v16H7zM13 4h4v16h-4z',
  stop: 'M6 6h12v12H6z',
  flag: 'M5 21V4M5 4h11l-2 4 2 4H5',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 3',
  key: 'M8 14a5 5 0 1 1 3.5-1.5L21 22M17 18l2-2M15 16l2-2',
  printer: 'M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z',
  link: 'M10 14a4 4 0 0 0 5.7 0l3.6-3.6a4 4 0 0 0-5.7-5.7L12 6.3M14 10a4 4 0 0 0-5.7 0l-3.6 3.6a4 4 0 0 0 5.7 5.7l1.6-1.6',
  cloud: 'M7 19a5 5 0 0 1-.5-10A6 6 0 0 1 18 8a4.5 4.5 0 0 1-.5 11z',
  timeline: 'M4 6h2M4 12h2M4 18h2M10 6h10M10 12h10M10 18h10',
  heart: 'M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z',
  menu: 'M4 6h16M4 12h16M4 18h16',
};

export function icon(name, { size = 20, label } = {}) {
  const el = svg('svg', { viewBox: '0 0 24 24', width: size, height: size, class: 'icon', 'aria-hidden': label ? undefined : 'true', role: label ? 'img' : undefined, 'aria-label': label });
  el.append(svg('path', { d: ICONS[name] || ICONS.note }));
  return el;
}

export function button(label, onClick, { kind = '', iconName, type = 'button', title, disabled, small } = {}) {
  return h(`button.btn${kind ? `.${kind}` : ''}${small ? '.small' : ''}`, { type, onClick, title, disabled }, iconName && icon(iconName, { size: small ? 16 : 18 }), label && h('span', label));
}

let toastTimer;
export function toast(message, kind = '') {
  let el = document.getElementById('toast');
  if (!el) { el = h('div', { id: 'toast', role: 'status', 'aria-live': 'polite' }); document.body.append(el); }
  el.className = `toast show ${kind}`;
  el.textContent = message;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = 'toast'; }, kind === 'error' ? 6000 : 3200);
}

/** A modal <dialog>. `build(close)` returns its content. Resolves with the value passed to close(). */
export function modal(build, { label = 'Dialog', wide = false } = {}) {
  return new Promise((resolve) => {
    const dlg = h(`dialog.modal${wide ? '.wide' : ''}`, { 'aria-label': label });
    const close = (value) => { dlg.close(); dlg.remove(); resolve(value); };
    dlg.addEventListener('cancel', (e) => { e.preventDefault(); close(undefined); });
    append(dlg, [build(close)]);
    document.body.append(dlg);
    dlg.showModal();
  });
}

export function confirmDialog(title, body, { ok = 'Continue', danger = false } = {}) {
  return modal((close) => h('div.dialog-body',
    h('h2', title), ...(Array.isArray(body) ? body : [body]).map((p) => (p instanceof Node ? p : h('p', p))),
    h('div.actions', button('Cancel', () => close(false)), button(ok, () => close(true), { kind: danger ? 'danger' : 'primary' }))));
}

export function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export async function copyText(text, what = 'Copied') {
  try { await navigator.clipboard.writeText(text); toast(what); } catch { toast('Copy failed: select the text and copy it yourself', 'error'); }
}

export function field({ label, hint, error, id }, control) {
  const fid = id || `f-${Math.random().toString(36).slice(2, 9)}`;
  control.id = fid;
  if (hint) control.setAttribute('aria-describedby', `${fid}-hint`);
  return h('div.field', h('label', { for: fid }, label), control, hint && h('p.hint', { id: `${fid}-hint` }, hint), error && h('p.error', error));
}

export function readFileBytes(file) { return file.arrayBuffer().then((b) => new Uint8Array(b)); }

export function pickFiles({ accept = '', multiple = true } = {}) {
  return new Promise((resolve) => {
    const input = h('input', { type: 'file', accept, multiple, hidden: true });
    input.addEventListener('change', () => { resolve([...input.files]); input.remove(); });
    input.addEventListener('cancel', () => { resolve([]); input.remove(); });
    document.body.append(input);
    input.click();
  });
}

export function spinner(label = 'Working…') { return h('div.spinner', { role: 'status' }, h('span.dot'), h('span', label)); }
