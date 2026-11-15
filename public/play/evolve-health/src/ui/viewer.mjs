// The page a professional opens. No account, no install: the key is in the link's #fragment,
// decryption happens here, and nothing is sent anywhere (hosted shares are fetched once from the
// node named in the link).
import { fill, h, icon, button, field, clear, downloadBlob, toast, spinner, pickFiles } from './dom.mjs';
import { openShare, parseShareUrl, needsPin, readShareFile, parseShareCode, PinRequired } from '../share/package.mjs';
import { fetchShare, nodeLabel } from '../core/sync.mjs';
import { toBundle } from '../health/fhir.mjs';
import { KINDS, ORDER, PROFILE_FIELDS, pluralFor, fmtDate, fmtSize, ageFrom, cap, vitalText, isActive } from '../health/model.mjs';
import { fromB64url } from '../lib/bytes.mjs';
import { fmtClock } from '../health/transcript.mjs';

const root = document.getElementById('view');
const printMode = new URLSearchParams(location.search).get('print') === '1';

function message(title, ...body) {
  fill(root, h('div.page.narrow', h('h1', title), ...body.map((b) => (b instanceof Node ? b : h('p', b)))));
}

async function askPin(bytes, secret, error = '') {
  const pin = h('input', { type: 'text', inputmode: 'numeric', autocomplete: 'one-time-code', maxlength: 8, autofocus: true });
  const err = h('p.error', { role: 'alert' }, error);
  return new Promise((resolve) => {
    fill(root, h('form.page.narrow.stack', { onSubmit: (e) => { e.preventDefault(); resolve(pin.value); } },
      h('div.lock-head', icon('lock', { size: 32 }), h('h1', 'Enter the PIN')),
      h('p', 'The person who shared this gave you a 6-digit PIN separately, in person or by phone.'),
      field({ label: 'PIN' }, pin), err, h('div.actions', button('Open', null, { kind: 'primary', type: 'submit' }))));
    pin.focus();
  });
}

async function unlock(bytes, secret) {
  let pin = null, error = '';
  for (;;) {
    if (needsPin(bytes)) pin = await askPin(bytes, secret, error);
    fill(root, h('div.page.narrow', spinner('Decrypting on this device…')));
    try { return await openShare(bytes, secret, pin); } catch (err) {
      if (err instanceof PinRequired || (needsPin(bytes) && err.name === 'DecryptError')) { error = 'That PIN doesn’t open this share.'; continue; }
      throw err;
    }
  }
}

async function boot() {
  const parsed = parseShareUrl(location.hash);
  if (!parsed) return fileForm();
  try {
    let bytes = parsed.bytes;
    if (parsed.mode === 'node') {
      fill(root, h('div.page.narrow', spinner(`Fetching the encrypted share from ${nodeLabel(parsed.node)}…`)));
      ({ bytes } = await fetchShare(parsed.node, parsed.id));
    }
    show(await unlock(bytes, parsed.secret));
  } catch (err) {
    if (err.name === 'DecryptError') message('This link is damaged', 'Part of the link is missing or changed. Ask for it to be sent again, and copy the whole link.');
    else message('This share can’t be opened', err.message, h('p.muted', 'It may have expired or been withdrawn by the person who shared it.'));
  }
}

function fileForm() {
  const code = h('input', { type: 'text', autocomplete: 'off', spellcheck: 'false', placeholder: 'XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XX' });
  const name = h('span.muted', 'No file chosen');
  let file = null;
  const err = h('p.error', { role: 'alert' });
  fill(root, h('form.page.narrow.stack', {
    onSubmit: async (e) => {
      e.preventDefault();
      err.textContent = '';
      try {
        if (!file) throw new Error('Choose the .ehshare file first');
        const bytes = readShareFile(await file.text());
        show(await unlock(bytes, parseShareCode(code.value)));
      } catch (ex) { err.textContent = ex.name === 'DecryptError' ? 'That code doesn’t open this file.' : ex.message; }
    },
  },
  h('h1', 'Open shared health records'),
  h('p', 'Someone shared health records with you using Evolve Health. If you got a link, open the link itself. If you got a file, choose it here and enter the share code they gave you.'),
  h('div.row', button('Choose .ehshare file', async () => { const [f] = await pickFiles({ multiple: false, accept: '.ehshare,application/json' }); if (f) { file = f; name.textContent = f.name; } }, { iconName: 'upload' }), name),
  field({ label: 'Share code' }, code), err,
  h('div.actions', button('Open', null, { kind: 'primary', type: 'submit' })),
  h('p.hint', 'Everything is decrypted in this browser. Nothing you open here is uploaded.')));
}

const longDate = (t) => new Date(t).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
const fileBlob = (f) => new Blob([fromB64url(f.data)], { type: f.type || 'application/octet-stream' });

function table(headers, rows) {
  return h('div.table-wrap', h('table', h('thead', h('tr', headers.map((x) => h('th', { scope: 'col' }, x)))), h('tbody', rows.map((r) => h('tr', r.map((c) => h('td', c ?? '')))))));
}

function show(pkg) {
  const expired = pkg.expiresAt && pkg.expiresAt < Date.now();
  if (expired) return message('This share has expired', `It expired on ${new Date(pkg.expiresAt).toLocaleString()}. Ask the patient to share again if you still need it.`);
  const kind = pkg.subject?.kind || 'person';
  const p = pkg.profile || {};
  const by = (k) => pkg.records.filter((r) => r.kind === k);
  const files = pkg.files || {};
  const fileButton = (rid, label = 'Download') => (files[rid] ? button(label, () => downloadBlob(fileBlob(files[rid]), files[rid].name || 'file'), { small: true, iconName: 'download' }) : null);
  const age = ageFrom(p.birthDate);
  document.title = `${p.name || 'Health records'} · Shared health records`;

  const sections = [];
  const add = (k, content) => { if (by(k).length) sections.push(h('section.vsection', h('h2', icon(KINDS[k].icon, { size: 18 }), ` ${pluralFor(k, kind)}`), content)); };
  add('allergy', table(['Allergic to', 'Reaction', 'Severity', 'Kind'], by('allergy').map((r) => [h('strong', r.data.substance), r.data.reaction, cap(r.data.severity), cap(r.data.category)])));
  add('medication', table(['Medicine', 'Dose', 'How often', 'Status', 'For', 'Prescriber'], by('medication').sort((a, b) => isActive(b) - isActive(a)).map((r) => [h('strong', r.data.name), r.data.dose, r.data.frequency, cap(r.data.status), r.data.reason, r.data.prescriber])));
  add('condition', table(['Condition', 'Status', 'Since'], by('condition').map((r) => [h('strong', r.data.name), cap(r.data.status), fmtDate(r.data.onset)])));
  add('procedure', table(['Procedure', 'Type', 'Date', 'By'], by('procedure').map((r) => [h('strong', r.data.name), cap(r.data.type), fmtDate(r.data.date), r.data.provider])));
  add('immunization', table(['Vaccine', 'Given', 'Next due', 'Lot', kind === 'pet' ? 'Tag' : 'Given by'], by('immunization').sort((a, b) => (a.data.date < b.data.date ? 1 : -1)).map((r) => [h('strong', r.data.vaccine), fmtDate(r.data.date), fmtDate(r.data.due), r.data.lot, kind === 'pet' ? r.data.tag : r.data.givenBy])));
  add('result', table(['Test', 'Result', 'Normal range', 'Flag', 'Date'], by('result').sort((a, b) => (a.data.date < b.data.date ? 1 : -1)).map((r) => [h('strong', r.data.test), [r.data.value, r.data.unit].filter(Boolean).join(' '), r.data.range, r.data.flag && r.data.flag !== 'normal' ? h('span.flag', cap(r.data.flag)) : '', fmtDate(r.data.date)])));
  add('vital', table(['Measurement', 'Value', 'Date'], by('vital').sort((a, b) => (a.data.date < b.data.date ? 1 : -1)).map((r) => [KINDS.vital.title(r.data), vitalText(r.data), fmtDate(r.data.date)])));
  add('vision', table(['Date', 'For', 'Eye', 'Sphere', 'Cylinder', 'Axis', 'Add', 'PD'], by('vision').flatMap((r) => [
    [fmtDate(r.data.date), cap(r.data.type), 'Right (OD)', r.data.odSph, r.data.odCyl, r.data.odAxis, r.data.odAdd, r.data.pd],
    ['', '', 'Left (OS)', r.data.osSph, r.data.osCyl, r.data.osAxis, r.data.osAdd, ''],
  ])));
  add('visit', h('ul.vlist', by('visit').sort((a, b) => (a.data.date < b.data.date ? 1 : -1)).map((r) => {
    const d = r.data;
    const audio = Object.entries(files).filter(([k]) => k.startsWith(`${r.rid}#audio`));
    return h('li.vvisit', h('div.vvisit-head', h('strong', d.type || 'Appointment'), h('span.muted', [fmtDate(d.date, true), d.provider, d.status === 'planned' ? 'Upcoming' : ''].filter(Boolean).join(' · '))),
      d.reason ? h('p', h('span.label', 'Reason: '), d.reason) : null,
      d.summary ? h('p.pre', h('span.label', 'Patient’s notes: '), d.summary) : null,
      d.instructions ? h('p.pre', h('span.label', 'Instructions as understood: '), d.instructions) : null,
      d.followUp ? h('p', h('span.label', 'Follow up by: '), fmtDate(d.followUp)) : null,
      audio.map(([, f]) => h('audio', { controls: true, preload: 'none', src: URL.createObjectURL(fileBlob(f)) })),
      d.transcript?.length ? h('details', h('summary', `Transcript recorded by the patient (${d.transcript.length} lines, not reviewed by the provider)`),
        h('ol.segments', d.transcript.map((s) => h('li', s.t !== null && s.t !== undefined ? h('span.t', fmtClock(s.t)) : null, ' ', s.speaker ? h('strong', `${s.speaker}: `) : null, s.text)))) : null);
  })));
  add('document', table(['Document', 'Type', 'Date', 'File'], by('document').map((r) => [h('strong', r.data.title), r.data.type, fmtDate(r.data.date), files[r.rid] ? fileButton(r.rid) : r.data.file ? h('span.muted', `Not included (${fmtSize(r.data.file.size)})`) : ''])));
  add('provider', table(['Name', 'Role', 'Practice', 'Phone'], by('provider').map((r) => [h('strong', r.data.name), r.data.role, r.data.organization, r.data.phone])));
  add('insurance', table(['Insurer', 'Covers', 'Member ID', 'Group', 'Phone', 'Card'], by('insurance').map((r) => [h('strong', r.data.carrier), cap(r.data.type), r.data.member, r.data.group, r.data.phone, fileButton(r.rid, 'Card')])));
  add('family', table(['Relative', 'Condition', 'Age at diagnosis'], by('family').map((r) => [r.data.relation, r.data.condition, r.data.age ?? ''])));
  add('contact', table(['Name', 'Relationship', 'Phone', 'Email'], by('contact').map((r) => [h('strong', r.data.name), r.data.relation, r.data.phone, r.data.email])));
  add('note', h('ul.vlist', by('note').map((r) => h('li', h('strong', r.data.title), ' ', h('span.muted', fmtDate(r.data.date)), h('p.pre', r.data.body || '')))));

  const facts = PROFILE_FIELDS[kind].filter((f) => p[f.k] && !['name', 'notes', 'diet', 'behavior'].includes(f.k));
  const downloadFhir = () => {
    const map = new Map();
    for (const [k, f] of Object.entries(files)) {
      if (k.includes('#audio')) { if (k.endsWith('#audio0')) map.set(k.replace(/#audio0$/, '#audio'), { bytes: fromB64url(f.data), type: f.type, name: f.name }); }
      else map.set(k, { bytes: fromB64url(f.data), type: f.type, name: f.name });
    }
    for (const r of pkg.records) if (r.kind === 'visit' && r.data.transcript?.length) map.set(`${r.rid}#transcript`, { text: r.data.transcript.map((s) => s.text).join('\n') });
    const bundle = toBundle({ profile: p, kind, records: pkg.records, files: map, share: { id: pkg.id, recipient: pkg.recipient?.name || pkg.recipient?.type, purpose: pkg.purpose } });
    downloadBlob(new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/fhir+json' }), `${(p.name || 'patient').replace(/[^\w-]+/g, '-').toLowerCase()}-fhir.json`);
  };

  fill(root, h('article.viewer',
    h('header.vhead',
      h('p.eyebrow', kind === 'pet' ? 'Pet health records provided by the owner' : 'Health records provided by the patient'),
      h('h1', p.name || 'Unnamed'),
      h('p.vfacts', [age && (kind === 'pet' ? `${age}${/\d$/.test(age) ? ' years' : ''} old` : /\d$/.test(age) ? `${age} years old` : age), ...facts.map((f) => `${f.label}: ${f.type === 'date' ? fmtDate(p[f.k]) : p[f.k]}`)].filter(Boolean).join(' · ')),
      p.notes ? h('p.important-note', icon('flag', { size: 16 }), ' ', p.notes) : null,
      p.diet ? h('p.important-note', h('strong', 'Feeding: '), p.diet) : null,
      p.behavior ? h('p.important-note', h('strong', 'Handling: '), p.behavior) : null,
      h('p.vmeta', `Shared ${pkg.from ? `by ${pkg.from} ` : ''}for ${pkg.recipient?.name || pkg.recipient?.type || 'you'}${pkg.purpose ? ` (${pkg.purpose})` : ''} on ${longDate(pkg.createdAt)}. Expires ${longDate(pkg.expiresAt)}.`),
      h('div.actions.no-print',
        button('Print', () => print(), { iconName: 'printer' }),
        button('Download FHIR (R4 JSON)', downloadFhir, { iconName: 'download', title: 'For importing into an EHR or other health app' }),
        Object.keys(files).length ? button(`Download ${Object.keys(files).length} file${Object.keys(files).length === 1 ? '' : 's'}`, () => { for (const f of Object.values(files)) downloadBlob(fileBlob(f), f.name || 'file'); }, { iconName: 'download' }) : null)),
    h('p.vnotice', icon('shield', { size: 16 }), ' ', pkg.notice),
    h('p.vnotice.muted', 'Entered or imported by the patient or their caregiver, not by a clinician. Confirm anything clinically important.'),
    sections.length ? sections : h('p.muted', 'No records were included, only the details above.'),
    h('footer.vfoot', `Share ${pkg.id} · prepared for ${pkg.recipient?.name || pkg.recipient?.type || 'the recipient'} · Evolve Health (open source) · decrypted in this browser`)));
  if (printMode) setTimeout(() => print(), 300);
}

addEventListener('hashchange', () => location.reload());
boot().catch((err) => { console.error(err); toast(err.message, 'error'); });
