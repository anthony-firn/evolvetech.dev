// Settings: account, sync nodes, security, export and backup.
import { h, icon, button, field, toast, confirmDialog, downloadBlob, spinner } from '../dom.mjs';
import { app as appState, go, render, lockNow } from '../main.mjs';
import { passphraseStrength, unlock as unlockRecord } from '../../core/account.mjs';
import { nodeLabel, BROWSER_NODE } from '../../core/sync.mjs';
import { toBundle } from '../../health/fhir.mjs';

export async function view(app, section) {
  const vault = app.vault;
  const kr = vault.keyring;
  const nav = h('nav.tabs', [['account', 'Account'], ['sync', 'Sync and devices'], ['data', 'Export and backup'], ['about', 'About']].map(([id, label]) =>
    h('a', { href: `#/settings/${id}`, 'aria-current': (section || 'account') === id ? 'page' : undefined }, label)));
  let body;
  if (section === 'sync') body = syncSection(vault);
  else if (section === 'data') body = dataSection(vault);
  else if (section === 'about') body = aboutSection();
  else body = accountSection(vault, kr);
  return h('div.page.settings', h('h1', 'Settings'), nav, body);
}

function accountSection(vault, kr) {
  const name = h('input', { type: 'text', value: kr.name || '', maxlength: 60 });
  name.addEventListener('input', () => { appState.hold = true; });
  const autolock = h('select', [[1, '1 minute'], [5, '5 minutes'], [10, '10 minutes'], [30, '30 minutes'], [60, '1 hour'], [0, 'Never (not recommended)']].map(([v, l]) => h('option', { value: v, selected: (kr.prefs?.autoLockMinutes ?? 10) === v }, l)));
  autolock.addEventListener('change', async () => { kr.prefs = { ...kr.prefs, autoLockMinutes: Number(autolock.value) }; await vault.persistKeyring(); toast('Saved'); });
  const current = h('input', { type: 'password', autocomplete: 'current-password' });
  const next = h('input', { type: 'password', autocomplete: 'new-password' });
  const msg = h('p.hint', { 'aria-live': 'polite' });
  next.addEventListener('input', () => { msg.textContent = passphraseStrength(next.value).hint; });
  return h('div.stack',
    h('section.panel', h('h2', 'Your name'), h('p.hint', 'Shown to people you invite and on shares you make. Leave blank to stay anonymous.'),
      h('div.row', name, button('Save', async () => { kr.name = name.value.trim(); vault.session.record.label = kr.name; await vault.persistKeyring(); appState.hold = false; toast('Saved'); }, { kind: 'primary' }))),
    h('section.panel', h('h2', 'Emergency Kit'), h('p', 'Your Account ID and Secret Key. You need them, with your passphrase, to sign in on another device.'),
      h('p.mono.muted', vault.session.acct), button('Open Emergency Kit', () => go('#/kit'), { iconName: 'key' })),
    h('section.panel', h('h2', 'Auto-lock'), field({ label: 'Lock after no activity for' }, autolock)),
    h('section.panel', h('h2', 'Change passphrase'),
      h('div.form-grid', field({ label: 'Current passphrase' }, current), field({ label: 'New passphrase' }, next)), msg,
      button('Change passphrase', async () => {
        const s = passphraseStrength(next.value);
        if (!s.ok) { msg.textContent = s.hint; return; }
        try { await unlockRecord(vault.session.record, current.value); } catch { msg.textContent = 'The current passphrase is wrong'; return; }
        await vault.changePassphrase(next.value);
        current.value = next.value = '';
        toast('Passphrase changed. Other devices will ask for the new one.');
      }, { iconName: 'key' })),
    h('section.panel.danger-zone', h('h2', 'This browser'),
      h('p', 'Removing your vault from this browser erases its local copy. If you use a sync node, you can sign in again with your Emergency Kit.'),
      h('div.row',
        button('Remove my vault from this browser', async () => {
          if (await confirmDialog('Remove your vault from this browser?', [vault.nodesInUse().filter((n) => n !== BROWSER_NODE).length ? 'Your sync nodes keep their encrypted copies.' : 'You have no sync node: unless you have a backup, this deletes your records permanently.'], { ok: 'Remove', danger: true })) {
            await vault.forgetAccount(vault.session?.acct);
            go('#/welcome');
          }
        }, { kind: 'danger', iconName: 'trash' }),
        button('Erase everything in this browser', async () => {
          if (await confirmDialog('Erase every vault in this browser?', 'This deletes all Evolve Health data stored in this browser, for every account.', { ok: 'Erase everything', danger: true })) {
            vault.lock();
            await vault.db.wipe?.();
            location.reload();
          }
        }, { kind: 'danger' }))));
}

function syncSection(vault) {
  const url = h('input', { type: 'url', placeholder: 'https://health.example.org', autocomplete: 'off' });
  url.addEventListener('input', () => { appState.hold = true; });
  const nodes = vault.keyring.nodes;
  const shared = vault.nodesInUse().filter((n) => !nodes.includes(n));
  const row = (n, removable) => {
    const st = vault.nodeStatus.get(n);
    return h('li', h('span.kind-icon', icon(n === BROWSER_NODE ? 'home' : 'cloud', { size: 18 })),
      h('span.row-main', h('strong', nodeLabel(n)), h('span.muted', !st ? 'Not synced yet' : st.ok ? `Synced ${new Date(st.at).toLocaleTimeString()}` : `Problem: ${st.error}`)),
      removable ? button('Remove', async () => {
        if (!await confirmDialog(`Stop syncing with ${nodeLabel(n)}?`, 'Your profiles stop syncing to it. The encrypted copy already there stays until its operator deletes it.', { ok: 'Remove', danger: true })) return;
        await vault.removeNode(n); toast('Removed'); render();
      }, { small: true, kind: 'ghost' }) : null);
  };
  return h('div.stack',
    h('section.panel', h('h2', 'Sync nodes'),
      h('p', 'A node stores encrypted copies of your profiles so your phone, computer and caregivers stay in sync, and so a lost device doesn’t lose your records. It never sees anything readable. Use one you run or trust; add more than one for extra safety.'),
      nodes.length ? h('ul.list', nodes.map((n) => row(n, true))) : h('p.muted', 'None. Your records are only in this browser.'),
      shared.length ? [h('h3', 'Used by profiles shared with you'), h('ul.list', shared.map((n) => row(n, false)))] : null,
      h('div.row', field({ label: 'Add a node' }, url), button('Add', async (e) => {
        const btn = e.currentTarget; btn.disabled = true;
        try { const info = await vault.addNode(url.value); toast(`Connected to ${info.name}`); appState.hold = false; render(); } catch (err) { toast(err.message, 'error'); btn.disabled = false; }
      }, { kind: 'primary', iconName: 'plus' })),
      !nodes.includes(BROWSER_NODE) ? h('p.hint', 'Sharing this computer with family? ', h('a', { href: '#', onClick: async (e) => { e.preventDefault(); await vault.addNode(BROWSER_NODE); toast('Added'); render(); } }, 'Relay between vaults in this browser'), ' lets each person keep their own vault here and give each other access, with no server.') : null,
      button('Sync now', async () => { await vault.syncAll(); toast('Synced'); render(); }, { iconName: 'sync' })),
    h('section.panel', h('h2', 'Run your own node'),
      h('p', 'A node is one small program with no dependencies. On any computer with Node.js 22 or Docker:'),
      h('pre', 'git clone https://github.com/anthony-firn/evolve-health\ncd evolve-health\ndocker compose up -d     # or: node node/server.mjs'),
      h('p', 'Put it behind HTTPS (the guide covers Caddy, Tailscale and Cloudflare Tunnel), then add its address above. ',
        h('a', { href: 'https://github.com/anthony-firn/evolve-health/blob/main/node/README.md', rel: 'noopener' }, 'Self-hosting guide'))),
    h('section.panel', h('h2', 'Add another device'), h('p', 'On the new phone or computer, open Evolve Health and choose “Sign in with an Emergency Kit”, then scan the code on your kit.'), button('Show Emergency Kit', () => go('#/kit'), { iconName: 'qr' })));
}

function dataSection(vault) {
  const profiles = vault.profiles();
  const files = h('input', { type: 'checkbox' });
  return h('div.stack',
    h('section.panel', h('h2', 'Download as FHIR'),
      h('p', 'FHIR R4 is the standard health systems use. A FHIR file can be imported into many clinic systems and other personal health apps, so you are never locked in.'),
      h('p.callout.warn', icon('alert'), ' The downloaded file is not encrypted. Keep it somewhere private.'),
      h('label.check', files, ' Include attached files and recordings (larger)'),
      h('ul.list', profiles.map((p) => h('li', h('span.row-main', h('strong', p.name)), button('Download FHIR', async () => {
        const recs = p.space.list().filter((r) => !['profile', 'share'].includes(r.kind));
        const map = new Map();
        if (files.checked) {
          for (const r of recs) {
            const ref = r.data.file || r.data.card;
            if (ref) map.set(r.rid, { bytes: await vault.readFile(p.space, ref), type: ref.type, name: ref.name });
            for (const [i, rec] of (r.data.recordings || []).entries()) if (i === 0) map.set(`${r.rid}#audio`, { bytes: await vault.readFile(p.space, rec.file), type: rec.type, name: 'recording' });
          }
        }
        for (const r of recs) if (r.kind === 'visit' && r.data.transcript?.length) map.set(`${r.rid}#transcript`, { text: r.data.transcript.map((s) => s.text).join('\n') });
        const bundle = toBundle({ profile: p.space.profile, kind: p.kind, records: recs, files: map });
        downloadBlob(new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/fhir+json' }), `${p.name.replace(/[^\w-]+/g, '-').toLowerCase()}-fhir.json`);
      }, { small: true, iconName: 'download' }))))),
    h('section.panel', h('h2', 'Encrypted backup'),
      h('p', 'One file with everything, still encrypted. To restore it you need your Emergency Kit’s Secret Key and your passphrase. Useful if you don’t use a sync node.'),
      button('Download encrypted backup', async (e) => {
        e.currentTarget.replaceWith(spinner('Packing…'));
        const backup = await vault.exportBackup();
        downloadBlob(new Blob([JSON.stringify(backup)], { type: 'application/json' }), `evolve-health-backup-${new Date().toISOString().slice(0, 10)}.json`);
        render();
      }, { kind: 'primary', iconName: 'download' }),
      h('p.hint', 'Restore from the start screen: “Sign in with an Emergency Kit”, then “Restore from a backup file”.')),
    h('section.panel', h('h2', 'Import'), h('p', 'Import records from patient portals, SMART Health Cards and documents from inside each profile.'),
      h('ul.list', profiles.filter((p) => p.space.canWrite()).map((p) => h('li', h('span.row-main', p.name), button('Import', () => go(`#/p/${p.id}/import`), { small: true, iconName: 'upload' }))))));
}

function aboutSection() {
  return h('div.stack',
    h('section.panel', h('h2', 'Evolve Health'),
      h('p', 'Free, open-source personal health records for people and pets. Everything is encrypted on your device; sync nodes, if you use them, hold only ciphertext.'),
      h('ul',
        h('li', h('a', { href: 'https://github.com/anthony-firn/evolve-health', rel: 'noopener' }, 'Source code (Apache 2.0)')),
        h('li', h('a', { href: 'https://github.com/anthony-firn/evolve-health/blob/main/SECURITY.md', rel: 'noopener' }, 'Security model and its limits')),
        h('li', h('a', { href: 'https://www.evolvetech.dev/projects/evolve-health/', rel: 'noopener' }, 'Project page')))),
    h('section.panel', h('h2', 'What this is not'),
      h('ul',
        h('li', 'Not a medical device and not medical advice. Highlights in transcripts come from simple word matching.'),
        h('li', 'Not connected to your doctor’s systems. Records come from what you enter or import.'),
        h('li', 'Not a HIPAA-covered service. No company holds your records, so there is no one to breach, subpoena or sell them; that also means no one can recover them for you.'))));
}

