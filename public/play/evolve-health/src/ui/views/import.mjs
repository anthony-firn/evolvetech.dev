// Import records into a profile: portal downloads, SMART Health Cards, FHIR files, PDFs and photos.
import { fill, h, icon, button, toast, clear, pickFiles, readFileBytes, spinner } from '../dom.mjs';
import { app as appState, go } from '../main.mjs';
import { importFile, dedupe } from '../../health/import.mjs';
import { verifyCard } from '../../health/shc.mjs';
import { KINDS, pluralFor, recordTitle, recordDate, recordSub, fmtDate, suggestSensitive, PROFILE_FIELDS, SENSITIVE } from '../../health/model.mjs';
import { utf8 } from '../../lib/bytes.mjs';

export async function view(app, space) {
  if (!space.canWrite()) return h('div', h('h1', 'View only'), h('p', 'You can’t import into this profile.'));
  const pk = space.membership.kind;
  const root = h('div.stack.importer');
  const paste = h('textarea', { rows: 4, placeholder: 'Or paste a SMART Health Card (shc:/…) or FHIR JSON here' });
  let result = null;

  const process = async (inputs) => {
    fill(root, spinner('Reading…'));
    appState.hold = true;
    const merged = { profile: {}, records: [], skipped: {}, cards: [], notes: [], errors: [] };
    for (const input of inputs) {
      try {
        const r = await importFile(input);
        Object.assign(merged.profile, Object.fromEntries(Object.entries(r.profile).filter(([, v]) => v)));
        merged.records.push(...r.records);
        merged.cards.push(...r.cards);
        for (const [k, v] of Object.entries(r.skipped)) merged.skipped[k] = (merged.skipped[k] || 0) + v;
      } catch (err) { merged.errors.push(err.message); }
    }
    const { fresh, dupes } = dedupe(space, merged.records.filter((r) => KINDS[r.kind]), recordTitle, recordDate);
    result = { ...merged, records: fresh.map((r) => ({ ...r, selected: true })), dupes };
    drawPreview();
  };

  const drawStart = () => {
    const drop = h('div.dropzone', { tabindex: 0 },
      icon('upload', { size: 32 }), h('strong', 'Drop files here'), h('span.muted', 'or'),
      button('Choose files', async () => {
        const files = await pickFiles({ multiple: true });
        if (files.length) process(await Promise.all(files.map(async (f) => ({ name: f.name, type: f.type, bytes: await readFileBytes(f) }))));
      }, { kind: 'primary', iconName: 'upload' }));
    drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('over'));
    drop.addEventListener('drop', async (e) => {
      e.preventDefault(); drop.classList.remove('over');
      const files = [...e.dataTransfer.files];
      process(await Promise.all(files.map(async (f) => ({ name: f.name, type: f.type, bytes: await readFileBytes(f) }))));
    });
    fill(root, 
      h('h1', 'Import records'),
      h('p', 'Everything is read and encrypted on this device. Nothing is uploaded to read it.'),
      drop,
      h('div.formats',
        h('div', h('strong', 'Patient portal downloads'), h('p.muted', 'The “Download my record” ZIP or XML (C-CDA) from MyChart and most US portals.')),
        h('div', h('strong', 'SMART Health Cards'), h('p.muted', 'Vaccine and lab cards from pharmacies and health systems (.smart-health-card files or the shc:/ text from the QR code).')),
        h('div', h('strong', 'FHIR files'), h('p.muted', 'JSON or NDJSON from apps and portals that export FHIR R4, including other Evolve Health exports.')),
        h('div', h('strong', 'PDFs and photos'), h('p.muted', 'Lab reports, X-rays, insurance cards, vaccination certificates, discharge papers.'))),
      paste,
      button('Read pasted text', () => { if (paste.value.trim()) process([{ name: 'Pasted text', type: 'text/plain', bytes: utf8(paste.value) }]); }, { iconName: 'check' }));
  };

  const drawPreview = () => {
    const groups = new Map();
    for (const r of result.records) groups.set(r.kind, [...(groups.get(r.kind) || []), r]);
    const missing = Object.entries(result.profile).filter(([k, v]) => v && !space.profile[k] && PROFILE_FIELDS[pk].some((f) => f.k === k));
    const fillBox = h('input', { type: 'checkbox', checked: true });
    // Catch the easy mistake of importing someone else's file (a parent's, a partner's).
    const words = (n) => new Set(String(n || '').toLowerCase().normalize('NFKD').replace(/[^a-z\s]/g, ' ').split(/\s+/).filter((w) => w.length > 1));
    const theirs = words(result.profile.name), ours = words(space.profile.name);
    const otherPerson = theirs.size && ours.size && ![...theirs].some((w) => ours.has(w));
    fill(root, 
      h('h1', 'Review the import'),
      otherPerson ? h('div.callout.warn', icon('alert'), h('div', h('strong', `This file is about ${result.profile.name}, but this profile is ${space.profile.name}.`),
        h('p', 'Make sure you are importing into the right profile. Missing details will not be filled in from it.'))) : null,
      result.errors.map((e) => h('div.callout.warn', icon('alert'), h('div', e))),
      h('p', `${result.records.length} new records found${result.dupes ? `; ${result.dupes} already in this profile were skipped` : ''}.`),
      Object.keys(result.skipped).length ? h('p.muted', 'Not imported (kept in any original file): ', Object.entries(result.skipped).map(([k, v]) => `${k} (${v})`).join(', ')) : null,
      result.cards.map((card) => {
        const status = h('span.muted', 'Signature not checked');
        return h('div.callout.info', icon('shield'), h('div',
          h('strong', `SMART Health Card from ${card.issuer}`), h('p.muted', card.issuedAt ? `Issued ${fmtDate(card.issuedAt.slice(0, 10))}` : ''), status,
          button('Check signature online', async () => {
            status.textContent = 'Checking…';
            try {
              const ok = await verifyCard(card);
              status.textContent = ok ? 'Signature valid: this card was issued by that organization and has not been changed.' : 'Could not verify the signature. The data may still be correct, but treat it as unverified.';
              if (ok) for (const r of result.records) if (r.data.source?.issuer === card.issuer) r.data.source.verified = true;
            } catch { status.textContent = 'Could not reach the issuer to check.'; }
          }, { small: true }),
          h('p.hint', 'Checking downloads the issuer’s public key, which tells the issuer someone checked a card. Nothing about you is sent.')));
      }),
      missing.length && !otherPerson ? h('section.panel', h('label.check', fillBox, ` Fill in missing ${pk === 'pet' ? 'pet' : 'profile'} details: `, missing.map(([k, v]) => `${PROFILE_FIELDS[pk].find((f) => f.k === k).label}: ${v}`).join(', '))) : null,
      [...groups.entries()].map(([kind, list]) => h('section.panel', h('h2', `${pluralFor(kind, pk)} (${list.length})`),
        h('ul.list', list.map((r) => {
          const box = h('input', { type: 'checkbox', checked: r.selected });
          box.addEventListener('change', () => { r.selected = box.checked; });
          const sens = pk === 'person' ? suggestSensitive(kind, r.data) : [];
          return h('li', h('label.check', box, h('span', h('strong', recordTitle(r)), h('span.muted', [recordSub(r), fmtDate(recordDate(r))].filter(Boolean).join(' · ')))),
            sens.length ? h('span.badge.private', icon('lock', { size: 12 }), `Will be private: ${sens.map((s) => SENSITIVE[s]).join(', ')}`) : null);
        })))),
      h('div.actions', button('Start over', drawStart), button(`Import ${result.records.length} records`, async () => {
        fill(root, spinner('Encrypting and saving…'));
        let n = 0;
        for (const r of result.records.filter((x) => x.selected)) {
          const data = { ...r.data };
          if (r.file) data.file = await space.saveFile(r.file.bytes, { name: r.file.name, type: r.file.type });
          if (pk === 'person') { const s = suggestSensitive(r.kind, data); if (s.length) data.sensitive = s; }
          await space.put(r.kind, data);
          n++;
        }
        if (missing.length && !otherPerson && fillBox.checked) await space.put('profile', { ...space.profile, ...Object.fromEntries(missing) }, 'profile');
        appState.hold = false;
        toast(`Imported ${n} records`);
        go(`#/p/${space.id}/timeline`);
      }, { kind: 'primary', iconName: 'check', disabled: !result.records.length })));
  };

  drawStart();
  return root;
}
