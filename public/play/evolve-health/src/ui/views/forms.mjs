// Add and edit forms for records and profiles, generated from the field lists in health/model.mjs.
import { h, icon, button, field, toast, pickFiles, readFileBytes } from '../dom.mjs';
import { app as appState, go } from '../main.mjs';
import { KINDS, PROFILE_FIELDS, SENSITIVE, suggestSensitive, fmtSize } from '../../health/model.mjs';

function control(f, value, profileKind, onChange) {
  let el;
  if (f.type === 'textarea') el = h('textarea', { rows: 3, placeholder: f.placeholder });
  else if (f.type === 'select') {
    const options = f.optionsFor ? f.optionsFor(profileKind) : f.options;
    el = h('select', options.map((o) => h('option', { value: o.value }, o.label)));
    if (value !== undefined && value !== '' && !options.some((o) => o.value === value)) el.append(h('option', { value }, value));
  } else el = h('input', { type: f.type || 'text', placeholder: f.placeholder, step: f.type === 'number' ? 'any' : undefined, inputmode: f.type === 'number' ? 'decimal' : undefined });
  if (value !== undefined && value !== null) el.value = String(value);
  else if (f.default !== undefined) el.value = f.default;
  if (f.required) el.required = true;
  el.addEventListener('input', onChange);
  el.addEventListener('change', onChange);
  return el;
}

function readValue(f, el) {
  const v = el.value.trim();
  if (f.type === 'number') return v === '' ? undefined : Number(v);
  return v;
}

export async function recordForm(app, space, kindArg, rid, query = new URLSearchParams()) {
  const existing = rid ? space.get(rid) : null;
  const kind = existing?.kind || kindArg;
  const meta = KINDS[kind];
  if (!meta || !space.canWrite()) return h('div', h('h1', 'You can’t add records here'), h('p', 'Your access to this profile is view only.'));
  const pk = space.membership.kind;
  const data = existing ? structuredClone(existing.data) : {};
  for (const [k, v] of query) if (!(k in data)) data[k] = v;
  if (!existing && !data.date && meta.fields.some((f) => f.k === 'date')) {
    const f = meta.fields.find((x) => x.k === 'date');
    data.date = f.type === 'datetime-local' ? new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 10);
  }

  const rows = [];
  const controls = new Map();
  let newFile = null;
  let fileCleared = false;
  const sensitive = new Set(data.sensitive || []);
  const sensitiveBoxes = new Map();
  const suggestion = h('p.hint.suggest', { 'aria-live': 'polite' });

  const values = () => {
    const out = { ...data };
    for (const [k, { f, el }] of controls) out[k] = readValue(f, el);
    return out;
  };
  const refresh = () => {
    appState.hold = true;
    const v = values();
    for (const row of rows) {
      row.wrap.hidden = row.f.when ? !row.f.when(v) : false;
      if (row.f.labelFor) row.wrap.querySelector('label').textContent = row.f.labelFor(v);
    }
    if (pk === 'person') {
      const found = suggestSensitive(kind, v).filter((s) => !sensitive.has(s));
      suggestion.textContent = found.length ? `This may be about ${found.map((s) => SENSITIVE[s].toLowerCase()).join(' or ')}. ` : '';
      if (found.length) suggestion.append(button('Mark it private', () => { for (const s of found) { sensitive.add(s); sensitiveBoxes.get(s).checked = true; } refresh(); }, { small: true, iconName: 'lock' }));
    }
  };

  for (const f of meta.fields) {
    if (f.pet && pk !== 'pet') continue;
    if (f.type === 'file') {
      const current = h('span.muted', data[f.k] ? `${data[f.k].name} (${fmtSize(data[f.k].size)})` : 'No file attached');
      const wrap = h('div.field', h('label', f.label), h('div.row', current,
        button('Choose file', async () => {
          const [file] = await pickFiles({ multiple: false, accept: f.k === 'card' ? 'image/*,application/pdf' : '' });
          if (!file) return;
          if (file.size > 200 * 1024 * 1024) { toast('Files up to 200 MB are supported', 'error'); return; }
          newFile = file; fileCleared = false;
          current.textContent = `${file.name} (${fmtSize(file.size)}) — will be encrypted when you save`;
          appState.hold = true;
        }, { small: true, iconName: 'upload' }),
        data[f.k] ? button('Remove', () => { fileCleared = true; newFile = null; current.textContent = 'File will be removed'; }, { small: true, kind: 'ghost' }) : null));
      rows.push({ f, wrap });
      continue;
    }
    const el = control(f, data[f.k], pk, refresh);
    controls.set(f.k, { f, el });
    const wrap = field({ label: f.labelFor ? f.labelFor(data) : f.label + (f.required ? '' : '') }, el);
    rows.push({ f, wrap });
  }

  const sensitiveSet = pk === 'person' ? h('fieldset.sensitive',
    h('legend', icon('lock', { size: 16 }), ' Private categories'),
    h('p.hint', 'Private records are never preselected when you share, whoever you share with. Use this for anything you want to keep tightly held.'),
    h('div.check-grid', Object.entries(SENSITIVE).map(([k, label]) => {
      const box = h('input', { type: 'checkbox', checked: sensitive.has(k) });
      box.addEventListener('change', () => { if (box.checked) sensitive.add(k); else sensitive.delete(k); refresh(); });
      sensitiveBoxes.set(k, box);
      return h('label.check', box, ` ${label}`);
    })), suggestion) : null;

  const error = h('p.error', { role: 'alert' });
  const form = h('form.stack.record-form', {
    onSubmit: async (e) => {
      e.preventDefault();
      error.textContent = '';
      const out = values();
      for (const { f } of rows) if (f.required && f.type !== 'file' && (out[f.k] === undefined || out[f.k] === '')) { error.textContent = `${f.label} is required`; controls.get(f.k)?.el.focus(); return; }
      for (const k of Object.keys(out)) if (out[k] === '' || out[k] === undefined) delete out[k];
      if (pk === 'person') {
        // Auto-mark new records that clearly fall in a private category; the person can untick it later.
        if (!existing) for (const s of suggestSensitive(kind, out)) sensitive.add(s);
        out.sensitive = [...sensitive];
        if (!out.sensitive.length) delete out.sensitive;
      }
      const submit = form.querySelector('button[type=submit]');
      submit.disabled = true;
      try {
        const fileField = meta.fields.find((f) => f.type === 'file');
        if (fileField && newFile) out[fileField.k] = await space.saveFile(await readFileBytes(newFile), { name: newFile.name, type: newFile.type || 'application/octet-stream' });
        else if (fileField && fileCleared) delete out[fileField.k];
        const id = await space.put(kind, out, existing?.rid);
        const autoPrivate = !existing && out.sensitive?.length && !(data.sensitive || []).length;
        toast(autoPrivate ? 'Saved and marked private' : 'Saved');
        appState.hold = false;
        go(`#/p/${space.id}/r/${id}`);
      } catch (err) {
        error.textContent = err.message;
        submit.disabled = false;
      }
    },
  },
  h('a.back', { href: existing ? `#/p/${space.id}/r/${existing.rid}` : `#/p/${space.id}/k/${kind}` }, icon('back', { size: 16 }), 'Back'),
  h('h1', existing ? `Edit ${meta.label.toLowerCase()}` : `Add ${meta.label.toLowerCase()}`),
  h('div.form-grid', rows.map((r) => r.wrap)),
  sensitiveSet,
  error,
  h('div.actions', button('Cancel', () => { appState.hold = false; history.back(); }), button('Save', null, { kind: 'primary', type: 'submit', iconName: 'check' })));
  queueMicrotask(refresh);
  appState.hold = false;
  const first = rows.find((r) => !r.wrap.hidden)?.wrap.querySelector('input,select,textarea');
  first?.setAttribute('autofocus', '');
  return h('div.page-inner', form);
}

export async function profileForm(app, { kind: kindArg, space } = {}) {
  const kind = space?.membership.kind || kindArg;
  const q = new URLSearchParams(location.hash.split('?')[1] || '');
  const data = space ? structuredClone(space.profile) : { ...(q.get('self') ? { name: app.vault.keyring.name || '' } : {}) };
  const controls = new Map();
  const fields = PROFILE_FIELDS[kind].map((f) => {
    const el = control(f, data[f.k], kind, () => { appState.hold = true; });
    controls.set(f.k, { f, el });
    return field({ label: f.label }, el);
  });
  const error = h('p.error', { role: 'alert' });
  const first = q.get('first') === '1';
  const form = h('form.stack', {
    onSubmit: async (e) => {
      e.preventDefault();
      const out = { ...data, kind };
      for (const [k, { f, el }] of controls) { const v = readValue(f, el); if (v === '' || v === undefined) delete out[k]; else out[k] = v; }
      if (!out.name) { error.textContent = 'A name is required'; return; }
      try {
        let target = space;
        if (space) await space.put('profile', out, 'profile');
        else target = await app.vault.createProfile(out);
        appState.hold = false;
        toast(space ? 'Saved' : `${out.name} added`);
        go(`#/p/${target.id}`);
      } catch (err) { error.textContent = err.message; }
    },
  },
  first ? h('div.callout.ok', icon('check'), h('div', h('strong', 'Kit saved. Now add your first profile.'), h('p', 'Most people start with themselves. You can add family members and pets after.'))) : null,
  h('h1', space ? 'Edit details' : kind === 'pet' ? 'Add a pet' : q.get('self') ? 'Add yourself' : 'Add a person'),
  kind === 'person' && !space && !q.get('self') ? h('p.muted', 'For a child, a parent you help care for, or anyone whose records you keep. If they want their own vault, they can create one and invite you instead.') : null,
  h('div.form-grid', fields),
  error,
  h('div.actions', button('Cancel', () => { appState.hold = false; history.back(); }), button(space ? 'Save' : 'Add', null, { kind: 'primary', type: 'submit', iconName: 'check' })));
  fields[0]?.querySelector('input')?.setAttribute('autofocus', '');
  return space ? h('div.page-inner', form) : h('div.page.narrow', form);
}
