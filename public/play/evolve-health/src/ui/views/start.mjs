// Signed-out screens: welcome, sign up, unlock, sign in with an Emergency Kit, the Kit itself.
import { h, icon, button, field, toast, spinner, confirmDialog, downloadBlob, copyText, pickFiles } from '../dom.mjs';
import { app, go, render, useVault } from '../main.mjs';
import { passphraseStrength, suggestPassphrase, formatSecretKey, kitLink, parseKit, parseSecretKey } from '../../core/account.mjs';
import { Vault } from '../../core/vault.mjs';
import { b64url } from '../../lib/bytes.mjs';
import { qrSvg } from '../qr-svg.mjs';
import { nodeLabel } from '../../core/sync.mjs';

export async function view(app, parts) {
  const accounts = await app.vault.listAccounts();
  if (parts[0] === 'create') return createView();
  if (parts[0] === 'signin') return signInView();
  if (parts[0] === 'unlock' && parts[1]) return unlockView(accounts.find((a) => a.acct === parts[1]));
  if (accounts.length === 1 && !app.pendingInvite && parts[0] !== 'welcome') return unlockView(accounts[0], accounts.length);
  return welcome(accounts);
}

function inviteBanner() {
  if (!app.pendingInvite) return null;
  let who = 'someone';
  try { const p = Vault.parseInvite(app.pendingInvite); who = p.f ? `${p.f}` : 'Someone'; return h('div.callout.info', icon('people'), h('div', h('strong', `${who} invited you to help with ${p.l}’s records.`), h('p', 'Create a free vault (or unlock yours) to accept. Your records stay separate; you only get access to what they share.'))); } catch { return h('div.callout.warn', 'That invite link is damaged. Ask for a new one.'); }
}

function welcome(accounts) {
  return h('div.page.welcome',
    inviteBanner(),
    h('section.hero',
      h('h1', 'All your health records in one place, and only you hold the key.'),
      h('p.lead', 'For you, your family and your pets. Keep visits, medicines, test results and documents together, give each doctor, dentist, vet or pharmacy exactly what they need, and let the people who care for you help.'),
      h('div.hero-actions',
        button('Create your free vault', () => go('#/create'), { kind: 'primary big', iconName: 'plus' }),
        button('Explore with sample data', startSample, { kind: 'big', iconName: 'play' })),
      h('p.small-links',
        h('a', { href: '#/signin' }, 'Sign in on this device with an Emergency Kit'), ' · ',
        h('a', { href: app.viewerUrl }, 'Open something a patient shared with you'))),
    accounts.length ? h('section.accounts', h('h2', 'On this device'),
      h('div.cards', accounts.map((a) => h('a.card.account', { href: `#/unlock/${a.acct}` }, icon('lock'), h('div', h('strong', a.label || 'Unnamed vault'), h('span.muted', `Created ${new Date(a.createdAt).toLocaleDateString()}`)))))) : null,
    h('section.features',
      feature('lock', 'Encrypted before it is stored', 'Records are encrypted in your browser with keys made from your passphrase and a Secret Key only you have. Any server that syncs them sees only scrambled data.'),
      feature('share', 'The right records for each visit', 'Choose “Dentist”, “Eye doctor”, “Pharmacy” or “Groomer” and Evolve Health suggests what they need. You review every item, set an expiry and can withdraw a link.'),
      feature('people', 'Caregivers and family', 'Give a parent’s caregiver, your children or a partner their own access: view only, add notes, or help manage. Remove it at any time.'),
      feature('paw', 'Pets too', 'Vaccines, preventatives, weights and vet visits for every pet, with proof of vaccines ready for boarding and groomers.'),
      feature('mic', 'Record the appointment', 'With everyone’s permission, record a visit, mark key moments and keep the transcript, so you don’t have to remember everything that was said.'),
      feature('shield', 'No ads or analytics', 'No ads, analytics or data sales, and no account tied to your name. Records are encrypted locally. Optional nodes hold encrypted copies; device, key or recipient compromise can still expose information.')),
    h('section.open-source', h('p', 'Evolve Health is free and open source (Apache 2.0). Use it here, or run your own copy and your own sync node with one command. ',
      h('a', { href: 'https://github.com/anthony-firn/evolve-health', rel: 'noopener' }, 'Source code and self-hosting guide'), '.')));
}

const feature = (ic, title, body) => h('article.feature', icon(ic, { size: 26 }), h('h3', title), h('p', body));

async function startSample() {
  const el = document.getElementById('view');
  el.replaceChildren(h('div.page.narrow', spinner('Building a sample household (Jordan, their mom Rosa, and Biscuit the dog)…')));
  const { buildSample } = await import('../sample.mjs');
  const vault = await buildSample();
  useVault(vault, { sample: true });
  go('#/');
}

function strengthMeter(input) {
  const bar = h('span.bar');
  const text = h('span.meter-text', 'Choose a passphrase');
  const meter = h('div.meter', { 'aria-live': 'polite' }, h('span.track', bar), text);
  const update = () => {
    const s = passphraseStrength(input.value);
    bar.style.setProperty('--pct', `${Math.min(100, (s.bits / 70) * 100)}%`);
    meter.dataset.ok = s.ok ? 'yes' : 'no';
    text.textContent = s.hint;
  };
  input.addEventListener('input', update);
  return { meter, update };
}

function createView() {
  const name = h('input', { type: 'text', autocomplete: 'name', placeholder: 'e.g. Jordan', maxlength: 60 });
  const pass = h('input', { type: 'password', autocomplete: 'new-password', required: true, autofocus: true });
  const again = h('input', { type: 'password', autocomplete: 'new-password', required: true });
  const show = h('input', { type: 'checkbox' });
  const ack = h('input', { type: 'checkbox', required: true });
  const { meter, update } = strengthMeter(pass);
  const error = h('p.error', { role: 'alert' });
  show.addEventListener('change', () => { pass.type = again.type = show.checked ? 'text' : 'password'; });
  const suggest = button('Suggest one', () => { const p = suggestPassphrase(); pass.value = again.value = p; pass.type = again.type = 'text'; show.checked = true; update(); }, { small: true, iconName: 'key' });

  const form = h('form.page.narrow.stack', {
    onSubmit: async (e) => {
      e.preventDefault();
      error.textContent = '';
      const s = passphraseStrength(pass.value);
      if (!s.ok) { error.textContent = s.hint; pass.focus(); return; }
      if (pass.value !== again.value) { error.textContent = 'The two passphrases don’t match'; again.focus(); return; }
      form.replaceChildren(spinner('Creating your keys and stretching your passphrase. This takes a few seconds on purpose…'));
      try {
        await app.vault.create({ name: name.value.trim(), passphrase: pass.value });
        app.flash = 'new';
        go('#/kit?new=1');
      } catch (err) {
        toast(err.message, 'error');
        render();
      }
    },
  },
  h('h1', 'Create your vault'),
  h('p', 'There is no email or phone number to give and no account on a server. Your vault lives in this browser, locked with a passphrase you choose.'),
  inviteBanner(),
  field({ label: 'Your name (optional)', hint: 'Shown only to people you invite to help. You can leave it blank.' }, name),
  field({ label: 'Passphrase', hint: 'A few random words is easiest to remember and hardest to guess.' }, pass),
  h('div.row', meter, suggest),
  field({ label: 'Passphrase again' }, again),
  h('label.check', show, ' Show passphrase'),
  h('label.check.important', ack, h('span', h('strong', 'Nobody can reset this passphrase. '), 'Not EvolveTech, not a server, not support. If you forget it and lose your Emergency Kit, your records cannot be recovered.')),
  error,
  h('div.actions', button('Back', () => go('#/welcome')), button('Create vault', null, { kind: 'primary', type: 'submit', iconName: 'lock' })));
  return form;
}

function unlockView(account, count) {
  if (!account) return h('div.page', h('p', 'That vault is not on this device.'), button('Back', () => go('#/welcome')));
  const pass = h('input', { type: 'password', autocomplete: 'current-password', required: true, autofocus: true });
  const error = h('p.error', { role: 'alert' });
  const form = h('form.page.narrow.stack', {
    onSubmit: async (e) => {
      e.preventDefault();
      error.textContent = '';
      const submit = form.querySelector('button[type=submit]');
      submit.disabled = true;
      submit.lastChild.textContent = 'Unlocking…';
      try {
        await app.vault.unlock(account.acct, pass.value);
        go(app.pendingInvite ? '#/accept' : '#/');
      } catch (err) {
        error.textContent = err.name === 'DecryptError' ? 'That passphrase doesn’t open this vault.' : err.message;
        submit.disabled = false;
        submit.lastChild.textContent = 'Unlock';
        pass.select();
      }
    },
  },
  inviteBanner(),
  h('div.lock-head', icon('lock', { size: 32 }), h('h1', account.label ? `Unlock ${account.label}’s vault` : 'Unlock your vault')),
  field({ label: 'Passphrase' }, pass),
  error,
  h('div.actions', button('Unlock', null, { kind: 'primary', type: 'submit', iconName: 'unlock' })),
  h('details.help', h('summary', 'Forgot your passphrase?'),
    h('p', 'It can’t be reset: it is part of the key that encrypts your records, and no one else has a copy. If you wrote it on your Emergency Kit, use that.')),
  h('p.small-links', count === 1 ? h('a', { href: '#/welcome' }, 'Other options') : h('a', { href: '#/welcome' }, 'Choose another vault'), ' · ',
    h('a', { href: '#/create' }, 'Create a new vault'), ' · ',
    h('a', { href: '#', onClick: async (e) => {
      e.preventDefault();
      if (await confirmDialog('Remove this vault from this browser?', ['Everything stored in this browser for it is erased. Copies on your sync nodes and other devices stay, and you can sign in again with your Emergency Kit.', 'Without a sync node or a backup, this permanently deletes your records.'], { ok: 'Remove from this browser', danger: true })) {
        await app.vault.forgetAccount(account.acct);
        go('#/welcome');
      }
    } }, 'Remove from this browser')));
  return form;
}

function signInView() {
  const kit = h('textarea', { rows: 3, placeholder: 'Paste the Emergency Kit link, or fill in the fields below', autofocus: true });
  const acct = h('input', { type: 'text', autocomplete: 'off', spellcheck: 'false' });
  const secret = h('input', { type: 'text', autocomplete: 'off', spellcheck: 'false', placeholder: 'EH1-XXXXX-XXXXX-…' });
  const node = h('input', { type: 'url', placeholder: 'https://node.example.org' });
  const pass = h('input', { type: 'password', autocomplete: 'current-password', required: true });
  const error = h('p.error', { role: 'alert' });
  const fill = (text) => {
    try {
      const k = parseKit(text);
      acct.value = k.acct;
      secret.value = formatSecretKey({ secretKey: k.secretKey });
      node.value = k.nodes[0] || '';
      kit.value = '';
      pass.focus();
    } catch { /* typed manually */ }
  };
  kit.addEventListener('input', () => fill(kit.value));
  let backupFile = null;
  const backupName = h('span.muted', 'No file chosen');
  const backup = h('details.help', h('summary', 'Restore from a backup file instead'),
    h('p', 'Choose the encrypted backup you downloaded from Settings. Enter the Secret Key from your kit and your passphrase above; the account ID and node can stay empty.'),
    h('div.row', button('Choose backup file', async () => {
      const [f] = await pickFiles({ multiple: false, accept: '.json,application/json' });
      if (f) { backupFile = f; backupName.textContent = f.name; acct.required = false; }
    }, { small: true, iconName: 'upload' }), backupName));
  if (app.pendingKit) { fill(app.pendingKit); app.pendingKit = null; }
  const form = h('form.page.narrow.stack', {
    onSubmit: async (e) => {
      e.preventDefault();
      error.textContent = '';
      try {
        const k = { acct: acct.value.trim(), secretKey: b64url(parseSecretKey(secret.value)), nodes: node.value ? [node.value.trim()] : [] };
        form.querySelector('button[type=submit]').disabled = true;
        if (backupFile) {
          await app.vault.restoreBackup(JSON.parse(await backupFile.text()), k.secretKey, pass.value);
          toast('Backup restored');
          go('#/');
          return;
        }
        await app.vault.signInWithKit(k, pass.value);
        toast('Signed in. Your profiles are downloading.');
        go('#/');
      } catch (err) {
        error.textContent = err.message;
        form.querySelector('button[type=submit]').disabled = false;
      }
    },
  },
  h('h1', 'Sign in with your Emergency Kit'),
  h('p', 'Use this on a new phone or computer. Your encrypted keyring is downloaded from your sync node and opened here with your passphrase.'),
  field({ label: 'Emergency Kit link' }, kit),
  field({ label: 'Account ID' }, acct),
  field({ label: 'Secret Key' }, secret),
  field({ label: 'Sync node', hint: 'The node listed on your kit.' }, node),
  field({ label: 'Passphrase' }, pass),
  backup,
  error,
  h('div.actions', button('Back', () => go('#/welcome')), button('Sign in', null, { kind: 'primary', type: 'submit' })));
  return form;
}

/** The Emergency Kit: print it or save it somewhere safe. */
export function kitPage(app, query) {
  const rec = app.vault.session.record;
  const nodes = app.vault.keyring.nodes;
  const link = kitLink(app.appUrl, rec, nodes);
  const isNew = query.get('new') === '1';
  return h('div.page.kit',
    isNew ? h('div.callout.ok.no-print', icon('check'), h('div', h('strong', 'Your vault is ready.'), h('p', 'Save your Emergency Kit before you add records. You need it to sign in on another device or to recover if this browser’s data is cleared.'))) : null,
    h('article.kit-sheet',
      h('header', icon('heart', { size: 28 }), h('div', h('h1', 'Evolve Health Emergency Kit'), h('p', `Printed ${new Date().toLocaleDateString(undefined, { dateStyle: 'long' })}${rec.label ? ` for ${rec.label}` : ''}`))),
      h('div.kit-grid',
        h('dl',
          h('dt', 'Account ID'), h('dd.mono', rec.acct),
          h('dt', 'Secret Key'), h('dd.mono.big', formatSecretKey(rec)),
          h('dt', 'Sync nodes'), h('dd', nodes.length ? nodes.map(nodeLabel).join(', ') : 'None yet: this vault is only in this browser. Add a node in Settings to sign in elsewhere.'),
          h('dt', 'Passphrase'), h('dd.write-in', '')),
        h('figure.kit-qr', qrSvg(link, { label: 'Emergency Kit sign-in code' }), h('figcaption', 'Scan to sign in on a new device'))),
      h('ol.kit-steps',
        h('li', 'Keep this somewhere safe and private, like with your passport or in a locked drawer.'),
        h('li', 'The Secret Key and your passphrase together open your records. Anyone with both can read them.'),
        h('li', 'To sign in on a new device, open Evolve Health, choose “Sign in with an Emergency Kit” and scan the code or enter the details.'))),
    h('div.actions.no-print',
      button('Print', () => print(), { kind: 'primary', iconName: 'printer' }),
      button('Copy sign-in link', () => copyText(link, 'Kit link copied. Store it somewhere private.'), { iconName: 'copy' }),
      button('Download', () => downloadBlob(new Blob([`Evolve Health Emergency Kit\n\nAccount ID: ${rec.acct}\nSecret Key: ${formatSecretKey(rec)}\nSync nodes: ${nodes.join(', ') || 'none'}\nSign-in link: ${link}\n\nKeep this private. Your passphrase is not included.\n`], { type: 'text/plain' }), 'evolve-health-emergency-kit.txt'), { iconName: 'download' }),
      button(isNew ? 'I saved it, continue' : 'Done', () => go(!isNew ? '#/settings' : app.pendingInvite ? '#/accept' : '#/new/person?first=1'), { kind: isNew ? 'primary' : '' })));
}
