// App shell: routing, rendering, auto-lock, service worker.
import { Vault } from '../core/vault.mjs';
import { supportsModernCurves } from '../lib/crypto.mjs';
import { scriptURL } from '../lib/tt.mjs';
import { fill, h, clear, icon, button, toast } from './dom.mjs';
import { nodeLabel } from '../core/sync.mjs';

export const app = {
  vault: null, sample: false, hold: false, pendingInvite: null, pendingKit: null, flash: null,
  appUrl: new URL('./', location.href).href.replace(/index\.html$/, ''),
};
app.viewerUrl = `${app.appUrl}share/`;

let views;
const loadViews = async () => (views ??= {
  start: await import('./views/start.mjs'),
  home: await import('./views/home.mjs'),
  profile: await import('./views/profile.mjs'),
  forms: await import('./views/forms.mjs'),
  share: await import('./views/share.mjs'),
  visit: await import('./views/visit.mjs'),
  access: await import('./views/access.mjs'),
  settings: await import('./views/settings.mjs'),
  importer: await import('./views/import.mjs'),
});

export function go(hash) {
  app.hold = false;
  if (location.hash === hash) render(); else location.hash = hash;
}

/** Parse "#/p/<id>/<section>/<arg>" into parts. */
function route() {
  const hash = location.hash.replace(/^#/, '') || '/';
  const [path, query] = hash.split('?');
  return { parts: path.split('/').filter(Boolean), query: new URLSearchParams(query || '') };
}

let renderToken = 0;
let renderQueued = false;

export function scheduleRender() {
  if (renderQueued || app.hold) return;
  renderQueued = true;
  requestAnimationFrame(() => { renderQueued = false; if (!app.hold) render({ keepScroll: true }); });
}

export async function render({ keepScroll = false } = {}) {
  const token = ++renderToken;
  const v = await loadViews();
  const { parts, query } = route();
  const vault = app.vault;
  let node;
  try {
    if (!vault.session) {
      node = await v.start.view(app, parts, query);
    } else if (parts[0] === 'p' && parts[1]) {
      const space = vault.space(parts[1]);
      if (!space) node = h('div.page', h('h1', 'That profile is not available'), h('p', 'It may have been removed, or your access ended.'), button('Back to profiles', () => go('#/'), { kind: 'primary' }));
      else {
        const [, , section = 'overview', arg, arg2] = parts;
        const framed = (active, content) => v.profile.shell(app, space, active, content, query);
        if (section === 'new') node = framed(arg, await v.forms.recordForm(app, space, arg, null, query));
        else if (section === 'edit' && arg === 'profile') node = framed('about', await v.forms.profileForm(app, { space }));
        else if (section === 'edit') node = framed(space.get(arg)?.kind, await v.forms.recordForm(app, space, null, arg));
        else if (section === 'share') node = framed('share', await v.share.wizard(app, space, query));
        else if (section === 'record') node = framed('visit', await v.visit.recorder(app, space, arg));
        else if (section === 'access') node = framed('access', await v.access.view(app, space));
        else if (section === 'import') node = framed('import', await v.importer.view(app, space));
        else node = await v.profile.view(app, space, section, arg, arg2, query);
      }
    } else if (parts[0] === 'new') node = await v.forms.profileForm(app, { kind: parts[1] || 'person' });
    else if (parts[0] === 'settings') node = await v.settings.view(app, parts[1]);
    else if (parts[0] === 'kit') node = await v.start.kitPage(app, query);
    else if (parts[0] === 'accept') node = await v.access.acceptView(app);
    else node = await v.home.view(app);
  } catch (err) {
    console.error(err);
    node = h('div.page', h('h1', 'Something went wrong'), h('p.error', err.message), button('Back to start', () => go('#/'), { kind: 'primary' }));
  }
  if (token !== renderToken) return;
  const scroll = window.scrollY;
  const main = document.getElementById('view');
  fill(main, node);
  renderChrome();
  if (keepScroll) window.scrollTo(0, scroll); else window.scrollTo(0, 0);
  if (!keepScroll) main.querySelector('[autofocus]')?.focus();
}

function renderChrome() {
  const bar = clear(document.getElementById('bar'));
  const vault = app.vault;
  const brand = h('a.brand', { href: '#/' }, icon('heart', { size: 22 }), h('span', 'Evolve Health'));
  bar.append(brand);
  if (vault.session) {
    const nodes = vault.nodesInUse();
    const states = nodes.map((n) => vault.nodeStatus.get(n));
    const failing = states.some((s) => s && !s.ok);
    const label = !nodes.length ? 'This device only' : failing ? 'Sync problem' : states.every(Boolean) ? 'Synced' : 'Syncing…';
    bar.append(h('nav.bar-actions',
      h('a.sync-pill', { href: '#/settings/sync', class: failing ? 'warn' : '', title: nodes.length ? nodes.map(nodeLabel).join(', ') : 'Records are stored only in this browser' }, icon(nodes.length ? 'sync' : 'lock', { size: 16 }), h('span', label)),
      h('a.icon-btn', { href: '#/settings', title: 'Settings', 'aria-label': 'Settings' }, icon('settings')),
      h('button.icon-btn', { type: 'button', title: 'Lock', 'aria-label': 'Lock', onClick: () => lockNow() }, icon('lock'))));
  }
  const banner = document.getElementById('banner');
  clear(banner);
  banner.hidden = !app.sample;
  if (app.sample) banner.append(h('span', 'Sample data. Nothing you enter here is saved; closing this tab erases it.'), h('a', { href: './', onClick: (e) => { e.preventDefault(); location.href = app.appUrl; } }, 'Leave the sample'));
}

export function lockNow(reason) {
  app.vault.lock();
  if (app.sample) { location.href = app.appUrl; return; }
  if (reason) toast(reason);
  go('#/');
}

// ---- auto-lock after inactivity ----
let lastActive = Date.now();
for (const ev of ['pointerdown', 'keydown', 'scroll', 'touchstart']) addEventListener(ev, () => { lastActive = Date.now(); }, { passive: true });
setInterval(() => {
  const s = app.vault?.session;
  if (!s || app.recording) return;
  const minutes = s.keyring.prefs?.autoLockMinutes ?? 10;
  if (minutes > 0 && Date.now() - lastActive > minutes * 60000) lockNow('Locked after a period of inactivity');
}, 15000);

/** Take one-time secrets (Emergency Kit, invite) out of the address bar right away. */
function captureLinks() {
  const hash = location.hash;
  if (hash.startsWith('#kit?')) { app.pendingKit = hash.slice(1); history.replaceState(null, '', `${location.pathname}#/signin`); }
  else if (hash.startsWith('#invite=')) { app.pendingInvite = hash.slice('#invite='.length); history.replaceState(null, '', `${location.pathname}#/accept`); }
}

async function boot() {
  const main = document.getElementById('view');
  if (!globalThis.crypto?.subtle || !(await supportsModernCurves()) || !globalThis.indexedDB) {
    fill(main, h('div.page.narrow', h('h1', 'This browser can’t run Evolve Health'),
      h('p', 'Evolve Health needs a current browser with modern encryption (Ed25519 and X25519 in Web Crypto) and a secure (https) connection. Recent versions of Chrome, Edge, Firefox and Safari all work.')));
    return;
  }
  captureLinks();
  addEventListener('hashchange', () => { captureLinks(); app.hold = false; render(); });
  app.vault = await Vault.open();
  bindVault();
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register(scriptURL(`${app.appUrl}sw.js`), { scope: app.appUrl }).catch(() => {});
  }
  render();
}

export function bindVault() {
  app.vault.on((what) => {
    if (what === 'request') toast('Someone accepted an invite and is waiting for your approval');
    if (what === 'joined') toast('Access granted: a shared profile was added');
    scheduleRender();
  });
}

/** Swap in a different vault (the in-memory sample). */
export function useVault(vault, { sample = false } = {}) {
  app.vault = vault;
  app.sample = sample;
  bindVault();
}

boot();
