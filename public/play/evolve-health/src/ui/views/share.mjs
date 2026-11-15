// "Share with a professional": choose who it is for, review exactly what goes, choose how.
import { fill, h, icon, button, field, toast, clear, confirmDialog, downloadBlob, copyText, spinner } from '../dom.mjs';
import { app as appState, go } from '../main.mjs';
import { presetsFor, presetById, proposal, GUARDED_NOTICE, USE_NOTICE } from '../../health/presets.mjs';
import { KINDS, ORDER, pluralFor, PROFILE_FIELDS, SENSITIVE, recordTitle, recordSub, fmtDate, fmtSize } from '../../health/model.mjs';
import { sealShare, shareUrl, shareCode, shareFile, cleanRecord, INLINE_LIMIT } from '../../share/package.mjs';
import { b64url, randomId } from '../../lib/bytes.mjs';
import { qrSvg, fitsQr } from '../qr-svg.mjs';
import { nodeLabel, BROWSER_NODE, SAMPLE_NODE } from '../../core/sync.mjs';

const EXPIRY = [[1, '1 day'], [7, '1 week'], [30, '30 days'], [90, '3 months'], [365, '1 year']];

export async function wizard(app, space, query) {
  const pk = space.membership.kind;
  const presets = presetsFor(pk);
  const nodes = (space.membership.nodes || []).filter((n) => n !== BROWSER_NODE && n !== SAMPLE_NODE);
  const state = {
    step: 'who', preset: query.get('for') ? presetById(query.get('for')) : null, recipient: '', purpose: '', ack: false,
    items: [], profileFields: new Set(), expires: 30, pin: false, pinValue: '', method: nodes.length ? 'hosted' : 'link', node: nodes[0] || null,
  };
  const root = h('div.page-inner.share-wizard');
  const draw = () => { fill(root, steps(), body()); root.querySelector('[autofocus]')?.focus(); };
  const stepNames = [['who', 'Who it’s for'], ['review', 'What to include'], ['how', 'How to send'], ['done', 'Done']];
  const steps = () => h('ol.steps', stepNames.map(([id, label], i) => h('li', { class: state.step === id ? 'current' : stepNames.findIndex((s) => s[0] === state.step) > i ? 'done' : '' }, h('span', String(i + 1)), label)));

  const choose = (preset) => {
    state.preset = preset;
    state.items = proposal(space, preset).map((x) => ({ ...x, file: false, audio: false, transcript: x.selected && x.r.kind === 'visit' }));
    state.profileFields = new Set(preset.profile.filter((k) => space.profile[k]));
    state.ack = false;
    draw();
  };

  const body = () => {
    if (state.step === 'who') {
      const recipient = h('input', { type: 'text', value: state.recipient, placeholder: pk === 'pet' ? 'e.g. Happy Tails Boarding' : 'e.g. Dr. Lee, Bright Smile Dental', autofocus: true });
      const purpose = h('input', { type: 'text', value: state.purpose, placeholder: 'e.g. New patient visit on Dec 3' });
      recipient.addEventListener('input', () => { state.recipient = recipient.value; });
      purpose.addEventListener('input', () => { state.purpose = purpose.value; });
      const ack = h('input', { type: 'checkbox', checked: state.ack });
      ack.addEventListener('change', () => { state.ack = ack.checked; nextBtn.disabled = !canNext(); });
      const canNext = () => state.preset && (!state.preset.guarded || state.ack);
      const nextBtn = button('Next: review what to include', () => { state.step = 'review'; draw(); }, { kind: 'primary', iconName: 'chevron', disabled: !canNext() });
      return h('div.stack',
        h('h1', `Share ${space.profile.name ? `${space.profile.name}’s` : ''} records`),
        h('p.muted', 'Pick who you are sharing with. Evolve Health suggests what they usually need, and you check every item before anything is sent.'),
        h('div.preset-grid', presets.map((p) => h('button.preset', { type: 'button', 'aria-pressed': state.preset?.id === p.id ? 'true' : 'false', onClick: () => choose(p) }, icon(p.icon, { size: 24 }), h('span', p.label)))),
        state.preset?.guarded ? h('div.callout.warn', icon('shield'), h('div', h('strong', 'Before you share with an insurer, employer or lawyer'), GUARDED_NOTICE.map((t) => h('p', t)), h('label.check', ack, ' I understand. Nothing will be preselected.'))) : null,
        state.preset ? h('p.why', icon('chat', { size: 16 }), ' ', state.preset.why) : null,
        h('div.form-grid', field({ label: 'Who will receive it (optional)', hint: 'Printed on the share and inside the file, so a copy that turns up elsewhere shows who it was given to.' }, recipient),
          field({ label: 'Reason (optional)' }, purpose)),
        h('div.actions', button('Cancel', () => go(`#/p/${space.id}`)), nextBtn));
    }

    if (state.step === 'review') {
      const count = h('strong');
      const updateCount = () => { const n = state.items.filter((x) => x.selected).length; count.textContent = `${n} ${n === 1 ? 'record' : 'records'} selected`; };
      const groups = ORDER[pk].map((kind) => [kind, state.items.filter((x) => x.r.kind === kind)]).filter(([, list]) => list.length);
      const profileOptions = PROFILE_FIELDS[pk].filter((f) => space.profile[f.k]);
      const view = h('div.stack',
        h('h1', `What ${state.recipient || state.preset.label} will see`),
        h('p.why', icon('chat', { size: 16 }), ' ', state.preset.why),
        h('section.panel', h('h2', pk === 'pet' ? 'About the pet' : 'About the patient'),
          h('div.check-grid', profileOptions.map((f) => {
            const box = h('input', { type: 'checkbox', checked: state.profileFields.has(f.k) });
            box.addEventListener('change', () => { if (box.checked) state.profileFields.add(f.k); else state.profileFields.delete(f.k); });
            return h('label.check', box, ` ${f.label}`);
          }))),
        groups.map(([kind, list]) => {
          const allBox = h('input', { type: 'checkbox', 'aria-label': `Select all ${pluralFor(kind, pk)}` });
          const sync = () => { allBox.checked = list.every((x) => x.selected); allBox.indeterminate = !allBox.checked && list.some((x) => x.selected); };
          const rows = list.map((x) => {
            const box = h('input', { type: 'checkbox', checked: x.selected });
            box.addEventListener('change', () => { x.selected = box.checked; if (!box.checked) for (const key of ['file', 'audio', 'transcript']) { x[key] = false; const sub = x.subs?.[key]; if (sub) sub.checked = false; } sync(); updateCount(); });
            x.box = box;
            const d = x.r.data;
            const extra = [];
            const file = d.file || d.card;
            if (file) extra.push(subToggle(x, 'file', `Include the file (${fmtSize(file.size)})`));
            if (x.r.kind === 'visit' && d.transcript?.length) extra.push(subToggle(x, 'transcript', 'Include the transcript'));
            if (x.r.kind === 'visit' && d.recordings?.length) extra.push(subToggle(x, 'audio', `Include the recording (${fmtSize(d.recordings.reduce((n, r) => n + (r.file?.size || 0), 0))})`));
            return h('li.share-item', { class: x.sensitive ? 'private' : '' },
              h('label.check', box, h('span', h('strong', recordTitle(x.r)), h('span.muted', [recordSub(x.r), fmtDate(KINDS[kind].date?.(d) || '')].filter(Boolean).join(' · ')))),
              x.sensitive ? h('span.badge.private', icon('lock', { size: 12 }), `Private: ${d.sensitive.map((s) => SENSITIVE[s]).join(', ')}`) : null,
              extra.length ? h('div.sub-toggles', extra) : null);
          });
          allBox.addEventListener('change', () => { for (const x of list) { x.selected = allBox.checked; x.box.checked = allBox.checked; } updateCount(); });
          sync();
          return h('section.panel.share-group', h('h2', h('label.check', allBox, ` ${pluralFor(kind, pk)}`)), h('ul.list', rows));
        }),
        !groups.length ? h('p.muted', 'This profile has no records yet. You can still share the details above.') : null,
        h('div.sticky-bar', count, h('div.actions', button('Back', () => { state.step = 'who'; draw(); }), button('Next: how to send', () => { state.step = 'how'; draw(); }, { kind: 'primary', iconName: 'chevron' }))));
      updateCount();
      return view;
    }

    if (state.step === 'how') {
      const expires = h('select', EXPIRY.map(([d, label]) => h('option', { value: d, selected: d === state.expires }, label)));
      expires.addEventListener('change', () => { state.expires = Number(expires.value); });
      const pin = h('input', { type: 'checkbox', checked: state.pin });
      pin.addEventListener('change', () => { state.pin = pin.checked; });
      const methods = [
        nodes.length ? ['hosted', 'Link and QR code', `Stored encrypted on ${nodeLabel(state.node)}. You can withdraw it and see when it was opened.`] : null,
        ['link', nodes.length ? 'Self-contained link' : 'Link and QR code', 'Everything is inside the link itself, so no server is involved. It can’t be withdrawn, only expire. Best for small shares.'],
        ['file', 'File to send', 'Download an encrypted file to email, AirDrop or put on a USB stick, and give them the share code separately.'],
        ['print', 'Print a summary', 'Opens a printable summary. Paper can’t expire, so hand it over in person.'],
      ].filter(Boolean);
      const error = h('p.error', { role: 'alert' });
      return h('div.stack',
        h('h1', 'How should it get there?'),
        h('fieldset.methods', h('legend', 'Delivery'), methods.map(([id, label, hint]) => {
          const radio = h('input', { type: 'radio', name: 'method', value: id, checked: state.method === id });
          radio.addEventListener('change', () => { state.method = id; });
          return h('label.method', radio, h('span', h('strong', label), h('span.muted', hint)));
        })),
        h('div.form-grid',
          field({ label: 'Expires after', hint: 'After this the viewer refuses to open it; hosted copies are deleted from the node.' }, expires),
          h('div.field', h('label.check', pin, ' Also require a 6-digit PIN'), h('p.hint', 'Tell them the PIN in person or by phone. Someone who only gets the link can’t open it.'))),
        h('p.notice', icon('shield', { size: 16 }), ' Every share carries this notice: “', USE_NOTICE, '”'),
        error,
        h('div.actions', button('Back', () => { state.step = 'review'; draw(); }), button('Create share', async () => {
          error.textContent = '';
          root.replaceChildren(spinner('Encrypting the share…'));
          try { await create(app, space, state); state.step = 'done'; } catch (err) { state.step = 'how'; draw(); root.querySelector('.error').textContent = err.message; return; }
          draw();
        }, { kind: 'primary', iconName: 'lock' })));
    }

    return doneView(space, state);
  };

  appState.hold = true;
  if (state.preset) { choose(state.preset); state.step = 'who'; }
  draw();
  return root;
}

function subToggle(x, key, label) {
  const box = h('input', { type: 'checkbox', checked: x[key] });
  x.subs = { ...x.subs, [key]: box };
  box.addEventListener('change', () => { x[key] = box.checked; if (box.checked && !x.selected) { x.selected = true; x.box.checked = true; } });
  return h('label.check.small', box, ` ${label}`);
}

async function create(app, space, state) {
  const pk = space.membership.kind;
  const chosen = state.items.filter((x) => x.selected);
  const files = {};
  const records = [];
  for (const x of chosen) {
    const rec = cleanRecord(x.r);
    if (!x.transcript) delete rec.data.transcript;
    if (!x.audio) delete rec.data.recordings;
    records.push(rec);
    const ref = x.r.data.file || x.r.data.card;
    if (x.file && ref) files[x.r.rid] = { name: ref.name, type: ref.type, data: b64url(await app.vault.readFile(space, ref)) };
    if (x.audio) for (const [i, rec2] of (x.r.data.recordings || []).entries()) files[`${x.r.rid}#audio${i}`] = { name: `recording-${i + 1}`, type: rec2.type, data: b64url(await app.vault.readFile(space, rec2.file)) };
  }
  const profile = {};
  for (const k of state.profileFields) profile[k] = space.profile[k];
  const now = Date.now();
  const id = randomId(12);
  const pkg = {
    v: 1, kind: 'evolve-health-share', id, createdAt: now, expiresAt: now + state.expires * 86400000,
    recipient: { name: state.recipient || '', type: state.preset.label }, purpose: state.purpose || '', notice: USE_NOTICE,
    from: app.vault.keyring.name || '', subject: { kind: pk }, profile, records, files,
  };
  state.pinValue = state.pin ? String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, '0') : '';
  const { secret, bytes } = await sealShare(pkg, { pin: state.pinValue || undefined });
  state.result = { secret, bytes, pkg };
  let link = null, code = null, nodeId = null;
  if (state.method === 'hosted') {
    nodeId = await app.vault.publishShare(state.node, bytes, pkg.expiresAt);
    link = shareUrl(app.viewerUrl, { secret, node: state.node, id: nodeId });
  } else if (state.method === 'link' || state.method === 'print') {
    link = shareUrl(app.viewerUrl, { secret, bytes });
    if (state.method === 'link' && link.length > INLINE_LIMIT) throw new Error(`This share is too large for a self-contained link (${fmtSize(bytes.length)}). Leave out some files, or send it as a file${(space.membership.nodes || []).length ? ' or hosted link' : ''}.`);
  } else {
    code = shareCode(secret);
    downloadBlob(shareFile(bytes, { name: space.profile.name ? `Health records for ${space.profile.name}` : 'Health records' }), `${(space.profile.name || 'health-records').replace(/[^\w-]+/g, '-').toLowerCase()}.ehshare`);
  }
  if (state.method === 'print') window.open(`${link.replace('#', '?print=1#')}`, '_blank', 'noopener');
  state.result = { ...state.result, link, code };
  const kinds = {};
  for (const r of records) kinds[r.kind] = (kinds[r.kind] || 0) + 1;
  await space.put('share', {
    recipient: state.recipient, preset: state.preset.id, presetLabel: state.preset.label, purpose: state.purpose, createdAt: now, expiresAt: pkg.expiresAt,
    count: records.length, files: Object.keys(files).length, kinds, method: state.method, node: state.method === 'hosted' ? state.node : null, nodeId,
    link: state.method === 'hosted' ? link : null, pin: state.pinValue || null, code, shareId: id,
  });
}

function doneView(space, state) {
  const { link, code } = state.result;
  const showQr = link && (state.method === 'hosted' || fitsQr(link));
  return h('div.stack.share-done',
    h('div.callout.ok', icon('check'), h('div', h('strong', state.method === 'file' ? 'Your encrypted file has downloaded.' : state.method === 'print' ? 'The printable summary opened in a new tab.' : 'Your share is ready.'),
      h('p', `Expires ${new Date(state.result.pkg.expiresAt).toLocaleDateString()}. ${state.result.pkg.records.length} records${Object.keys(state.result.pkg.files).length ? ` and ${Object.keys(state.result.pkg.files).length} files` : ''}.`))),
    link && state.method !== 'print' ? h('section.panel',
      h('h2', 'Send this link'),
      h('div.link-box', h('code', link.length > 160 ? `${link.slice(0, 120)}…${link.slice(-20)}` : link), button('Copy link', () => copyText(link, 'Link copied'), { kind: 'primary', iconName: 'copy' })),
      showQr ? h('figure.share-qr', qrSvg(link, { label: 'Share QR code', ecl: 'L' }), h('figcaption', 'Or let them scan this at the desk')) : h('p.muted', 'This link holds the whole share, so it is too long for a QR code. Copy it into a message instead.'),
      h('p.hint', 'Send it the way you would send anything private: a direct message or email to the right person. Anyone with the link', state.pinValue ? ' and the PIN' : '', ' can open it until it expires.')) : null,
    code ? h('section.panel', h('h2', 'Share code'), h('p', 'They open the file at ', h('strong', appState.viewerUrl), ' and enter this code:'), h('p.code-big.mono', code), button('Copy code', () => copyText(code, 'Code copied'), { iconName: 'copy' })) : null,
    state.pinValue ? h('section.panel', h('h2', 'PIN'), h('p.code-big.mono', state.pinValue), h('p.hint', 'Say this out loud or text it separately. It isn’t stored with the share.')) : null,
    h('div.actions',
      link && state.method !== 'print' ? button('Preview as they’ll see it', () => window.open(link, '_blank', 'noopener'), { iconName: 'eye' }) : null,
      button('See all shares', () => go(`#/p/${space.id}/shares`)),
      button('Back to profile', () => go(`#/p/${space.id}`), { kind: 'primary' })));
}

export async function shareHistory(app, space) {
  const shares = space.list('share').sort((a, b) => b.data.createdAt - a.data.createdAt);
  const me = app.vault.session.acct;
  const status = (d) => (d.withdrawn ? 'Withdrawn' : d.expiresAt < Date.now() ? 'Expired' : 'Active');
  return h('div.stack',
    h('div.list-head', h('h1', 'Shared with professionals'), button('New share', () => go(`#/p/${space.id}/share`), { kind: 'primary', iconName: 'share' })),
    h('p.muted', 'Every share made from this profile, by you or anyone with access. Hosted links can be withdrawn; the others can only expire.'),
    shares.length ? h('ul.list.card-list', shares.map((s) => {
      const d = s.data;
      const st = status(d);
      const opens = h('span.muted');
      const row = h('li.share-row',
        h('div.row-main', h('strong', d.recipient || d.presetLabel), h('span.muted', `${d.presetLabel} · ${d.count} records · ${{ hosted: 'hosted link', link: 'self-contained link', file: 'file', print: 'printed' }[d.method]} · ${new Date(d.createdAt).toLocaleDateString()}`), d.purpose ? h('span.muted', d.purpose) : null, opens),
        h('span.badge', { class: st === 'Active' ? 'ok' : '' }, st === 'Active' ? `Until ${new Date(d.expiresAt).toLocaleDateString()}` : st),
        h('div.row',
          d.method === 'hosted' && st === 'Active' && s.author === me ? button('Opens', async () => {
            try { const log = await app.vault.shareLog(d.node, d.nodeId); opens.textContent = log.opens.length ? `Opened ${log.opens.length} time${log.opens.length === 1 ? '' : 's'}, last ${new Date(log.opens[log.opens.length - 1]).toLocaleString()}` : 'Not opened yet'; } catch (err) { opens.textContent = err.message; }
          }, { small: true, iconName: 'eye' }) : null,
          d.link && st === 'Active' ? button('Copy link', () => copyText(d.link, 'Link copied'), { small: true, iconName: 'copy' }) : null,
          d.method === 'hosted' && st === 'Active' && s.author === me ? button('Withdraw', async () => {
            if (!await confirmDialog('Withdraw this share?', 'The link stops working right away. Anything they already downloaded or printed stays with them.', { ok: 'Withdraw', danger: true })) return;
            try { await app.vault.withdrawShare(d.node, d.nodeId); } catch (err) { if (!/expired|withdrawn|not found/i.test(err.message)) { toast(err.message, 'error'); return; } }
            await space.put('share', { ...d, withdrawn: true, withdrawnAt: Date.now() }, s.rid);
            toast('Withdrawn');
          }, { small: true, kind: 'danger', iconName: 'x' }) : null));
      return row;
    })) : h('p.muted.empty', 'Nothing shared yet.'));
}

