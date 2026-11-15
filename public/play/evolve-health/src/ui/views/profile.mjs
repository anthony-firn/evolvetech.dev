// A profile: overview with the emergency card, the timeline, lists by kind and record details.
import { h, icon, button, toast, confirmDialog, downloadBlob } from '../dom.mjs';
import { go } from '../main.mjs';
import {
  KINDS, ORDER, pluralFor, PROFILE_FIELDS, SENSITIVE, fmtDate, fmtSize, recordTitle, recordSub, recordDate,
  isSensitive, isActive, timeline, searchRecords, cap, vitalText,
} from '../../health/model.mjs';
import { ROLE_INFO } from '../../core/membership.mjs';
import { avatar, profileLine } from './home.mjs';
import { visitDetail } from './visit.mjs';
import { shareHistory } from './share.mjs';
import { openMeta } from '../../core/membership.mjs';

const today = () => new Date().toISOString().slice(0, 10);

export async function view(app, space, section, arg, arg2, query) {
  const kind = space.membership.kind;
  const p = space.profile;
  const base = `#/p/${space.id}`;
  let content;
  if (section === 'overview') content = overview(app, space);
  else if (section === 'timeline') content = timelineView(space);
  else if (section === 'k' && KINDS[arg]) content = kindList(space, arg);
  else if (section === 'r' && arg) content = await recordDetail(app, space, arg);
  else if (section === 'shares') content = await shareHistory(app, space);
  else if (section === 'search') content = searchView(space, query.get('q') || '');
  else if (section === 'about') content = aboutView(app, space);
  else content = overview(app, space);

  const active = section === 'k' ? arg : section === 'r' ? space.get(arg)?.kind : section;
  return shell(app, space, active, content, query);
}

/** The profile frame (side navigation) around any profile page. */
export function shell(app, space, active, content, query = new URLSearchParams()) {
  const kind = space.membership.kind;
  const p = space.profile;
  const base = `#/p/${space.id}`;
  const counts = Object.fromEntries(ORDER[kind].map((k) => [k, space.list(k).length]));
  const searchBox = h('input', { type: 'search', placeholder: 'Search this profile', 'aria-label': 'Search this profile', value: active === 'search' ? query.get('q') || '' : '' });
  searchBox.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(`${base}/search?q=${encodeURIComponent(searchBox.value)}`); });

  return h('div.profile-layout',
    h('aside.side-nav', { 'aria-label': 'Profile sections' },
      h('a.side-profile', { href: base }, avatar(p, kind), h('div', h('strong', p.name || 'Unnamed'), h('span.muted', space.role === 'owner' ? (kind === 'pet' ? 'Pet' : 'Your profile') : `Shared · ${ROLE_INFO[space.role]?.label}`))),
      h('div.side-search', icon('search', { size: 16 }), searchBox),
      h('nav',
        navLink(`${base}`, 'Overview', 'home', active === 'overview'),
        navLink(`${base}/timeline`, 'Timeline', 'timeline', active === 'timeline'),
        h('hr'),
        ORDER[kind].map((k) => navLink(`${base}/k/${k}`, pluralFor(k, kind), KINDS[k].icon, active === k, counts[k])),
        h('hr'),
        navLink(`${base}/shares`, 'Shared with professionals', 'share', active === 'shares' || active === 'share'),
        space.canManage() || space.role === 'owner' ? navLink(`${base}/access`, 'People with access', 'people', active === 'access') : null,
        space.canWrite() ? navLink(`${base}/import`, 'Import records', 'upload', active === 'import') : null,
        navLink(`${base}/about`, kind === 'pet' ? 'Pet details' : 'Profile details', 'person', active === 'about'))),
    h('div.profile-main', content));
}

function navLink(href, label, ic, current, count) {
  return h('a.nav-link', { href, 'aria-current': current ? 'page' : undefined }, icon(ic, { size: 18 }), h('span', label), count ? h('span.count', String(count)) : null);
}

function actions(space) {
  const base = `#/p/${space.id}`;
  return h('div.quick-actions',
    button('Share with a professional', () => go(`${base}/share`), { kind: 'primary', iconName: 'share' }),
    space.canWrite() ? button('Record an appointment', () => go(`${base}/record`), { iconName: 'mic' }) : null,
    space.canWrite() ? addMenu(space) : null);
}

function addMenu(space) {
  const kind = space.membership.kind;
  const select = h('select.add-select', { 'aria-label': 'Add a record' },
    h('option', { value: '' }, '+ Add a record…'),
    ORDER[kind].map((k) => h('option', { value: k }, KINDS[k].label)));
  select.addEventListener('change', () => { if (select.value) go(`#/p/${space.id}/new/${select.value}`); });
  return select;
}

function overview(app, space) {
  const kind = space.membership.kind;
  const p = space.profile;
  const base = `#/p/${space.id}`;
  const allergies = space.list('allergy');
  const meds = space.list('medication').filter(isActive);
  const conditions = space.list('condition').filter(isActive);
  const contacts = space.list('contact');
  const vets = space.list('provider').filter((r) => isActive(r) && (kind === 'pet' ? /vet/i.test(r.data.role || '') : /primary/i.test(r.data.role || '')));
  const upcoming = space.list('visit').filter((v) => v.data.status === 'planned' && (v.data.date || '') >= today()).sort((a, b) => (a.data.date > b.data.date ? 1 : -1));
  const followUps = space.list('visit').filter((v) => v.data.followUp && v.data.followUp >= today()).sort((a, b) => (a.data.followUp > b.data.followUp ? 1 : -1));
  const dueSoon = space.list('immunization').filter((r) => r.data.due && r.data.due <= new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10)).sort((a, b) => (a.data.due > b.data.due ? 1 : -1));
  const recent = timeline(space).slice(0, 6);

  const chipList = (items, cls, text, sub) => (items.length ? h('ul.chip-list', items.map((r) => h('li', h('a', { class: cls, href: `${base}/r/${r.rid}` },
    h('strong', text(r), isSensitive(r) ? h('span.badge.private', { title: 'Private: never preselected when sharing' }, icon('lock', { size: 12 }), 'Private') : null), sub?.(r) ? h('span', sub(r)) : null)))) : h('p.muted', 'None recorded'));

  return h('div.stack',
    h('header.profile-head', avatar(p, kind, 'big'),
      h('div', h('h1', p.name || 'Unnamed'), h('p.muted', profileLine(p, kind) || (kind === 'pet' ? 'Pet' : '')),
        space.role !== 'owner' ? h('span.chip.shared', `Shared with you · ${ROLE_INFO[space.role]?.label}`) : null)),
    actions(space),
    h('section.panel.emergency', { 'aria-label': 'Emergency card' },
      h('h2', icon('alert'), kind === 'pet' ? ' At a glance' : ' Emergency card'),
      h('div.emergency-grid',
        h('div', h('h3', 'Allergies'), chipList(allergies, 'chip-link danger', (r) => r.data.substance, (r) => [cap(r.data.severity), r.data.reaction].filter(Boolean).join(': '))),
        h('div', h('h3', kind === 'pet' ? 'Medicines and preventatives' : 'Current medicines'), chipList(meds, 'chip-link', (r) => r.data.name, (r) => [r.data.dose, r.data.frequency].filter(Boolean).join(', '))),
        h('div', h('h3', 'Conditions'), chipList(conditions, 'chip-link', (r) => r.data.name)),
        h('div', h('h3', kind === 'pet' ? 'Identification' : 'Key facts'),
          kind === 'pet'
            ? h('dl.facts', p.microchip ? [h('dt', 'Microchip'), h('dd.mono', p.microchip)] : null, p.license ? [h('dt', 'Tag'), h('dd', p.license)] : null, vets[0] ? [h('dt', 'Vet'), h('dd', vets[0].data.name, vets[0].data.phone ? ` · ${vets[0].data.phone}` : '')] : null, !p.microchip && !vets[0] ? h('dd.muted', 'Add the microchip number and vet in details') : null)
            : h('dl.facts', p.bloodType ? [h('dt', 'Blood type'), h('dd', p.bloodType)] : null,
              contacts.slice(0, 2).map((c) => [h('dt', c.data.relation || 'Contact'), h('dd', c.data.name, c.data.phone ? ` · ${c.data.phone}` : '')]),
              vets[0] ? [h('dt', 'Doctor'), h('dd', vets[0].data.name, vets[0].data.phone ? ` · ${vets[0].data.phone}` : '')] : null,
              !p.bloodType && !contacts.length ? h('dd.muted', 'Add a blood type and emergency contacts') : null))),
      p.notes ? h('p.important-note', icon('flag', { size: 16 }), ' ', p.notes) : null,
      kind === 'pet' && p.behavior ? h('p.important-note', icon('flag', { size: 16 }), ' ', p.behavior) : null),
    h('div.two-col',
      h('section.panel', h('h2', icon('calendar'), ' Coming up'),
        upcoming.length || followUps.length || dueSoon.length ? h('ul.list',
          upcoming.map((v) => listItem(space, v, `${fmtDate(v.data.date, true)}`)),
          followUps.map((v) => listItem(space, v, `Follow up by ${fmtDate(v.data.followUp)}`, `Follow-up: ${v.data.type || 'appointment'}`)),
          dueSoon.map((r) => listItem(space, r, `Due ${fmtDate(r.data.due)}`, `${r.data.vaccine} vaccine`))) : h('p.muted', 'Nothing scheduled. Add upcoming appointments, follow-ups and vaccine due dates and they appear here.')),
      h('section.panel', h('h2', icon('clock'), ' Recent'),
        recent.length ? h('ul.list', recent.map(({ r, date }) => listItem(space, r, fmtDate(date)))) : h('p.muted', 'No records yet.'),
        recent.length ? h('a.more', { href: `${base}/timeline` }, 'See the full timeline') : null)),
    !space.list().filter((r) => r.kind !== 'profile').length && space.canWrite() ? h('section.panel.getting-started',
      h('h2', 'Getting started'),
      h('ol',
        h('li', h('a', { href: `${base}/new/allergy` }, 'Add allergies'), ' and ', h('a', { href: `${base}/new/medication` }, 'current medicines'), ': they matter most in an emergency.'),
        h('li', h('a', { href: `${base}/import` }, 'Import records'), ' you downloaded from a patient portal, a vaccine QR card, or photos of paperwork.'),
        h('li', h('a', { href: `${base}/new/provider` }, kind === 'pet' ? 'Add your vet' : 'Add your doctors, dentist and pharmacy'), '.'))) : null);
}

function listItem(space, r, date, title) {
  return h('li', h('a.row-link', { href: `#/p/${space.id}/r/${r.rid}` },
    h('span.kind-icon', icon(KINDS[r.kind]?.icon || 'note', { size: 18 })),
    h('span.row-main', h('strong', title || recordTitle(r)), recordSub(r) ? h('span.muted', recordSub(r)) : null),
    date ? h('span.row-date', date) : null,
    isSensitive(r) ? h('span.badge.private', { title: 'Private: never preselected when sharing' }, icon('lock', { size: 12 }), 'Private') : null));
}

function kindList(space, kind) {
  const meta = KINDS[kind];
  const pk = space.membership.kind;
  let items = space.list(kind);
  const dated = (r) => recordDate(r) || '';
  items.sort((a, b) => (isActive(b) - isActive(a)) || (dated(a) < dated(b) ? 1 : dated(a) > dated(b) ? -1 : recordTitle(a).localeCompare(recordTitle(b))));
  const current = items.filter(isActive), past = items.filter((r) => !isActive(r));
  return h('div.stack',
    h('div.list-head', h('h1', pluralFor(kind, pk)), space.canWrite() ? button(`Add ${meta.label.toLowerCase()}`, () => go(`#/p/${space.id}/new/${kind}`), { kind: 'primary', iconName: 'plus' }) : null),
    kind === 'vital' && items.length ? vitalsSummary(space) : null,
    items.length ? h('ul.list.card-list', current.map((r) => listItem(space, r, fmtDate(dated(r), kind === 'visit')))) : h('p.muted.empty', `No ${pluralFor(kind, pk).toLowerCase()} yet.`),
    past.length ? h('details.past', h('summary', `Past (${past.length})`), h('ul.list.card-list', past.map((r) => listItem(space, r, fmtDate(dated(r)))))) : null);
}

function vitalsSummary(space) {
  const byType = new Map();
  for (const r of space.list('vital')) { const list = byType.get(r.data.type) || []; list.push(r); byType.set(r.data.type, list); }
  return h('div.vital-cards', [...byType.entries()].map(([type, list]) => {
    list.sort((a, b) => (a.data.date > b.data.date ? 1 : -1));
    const latest = list[list.length - 1];
    return h('div.vital-card', h('span.muted', KINDS.vital.title(latest.data)), h('strong', vitalText(latest.data)), h('span.muted', fmtDate(latest.data.date)), sparkline(list.map((r) => Number(r.data.value)).filter(Number.isFinite)));
  }));
}

function sparkline(values) {
  if (values.length < 2) return null;
  const min = Math.min(...values), max = Math.max(...values), span = max - min || 1;
  const pts = values.slice(-12).map((v, i, a) => `${(i / (a.length - 1)) * 100},${28 - ((v - min) / span) * 24}`).join(' ');
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 100 30'); s.setAttribute('class', 'spark'); s.setAttribute('aria-hidden', 'true'); s.setAttribute('preserveAspectRatio', 'none');
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
  line.setAttribute('points', pts);
  s.append(line);
  return s;
}

function timelineView(space) {
  const items = timeline(space);
  const groups = new Map();
  for (const it of items) { const key = it.date.slice(0, 4); groups.set(key, [...(groups.get(key) || []), it]); }
  return h('div.stack', h('h1', 'Timeline'),
    items.length ? [...groups.entries()].map(([year, list]) => h('section.timeline-year', h('h2', year), h('ul.list.timeline', list.map(({ r, date }) => listItem(space, r, fmtDate(date)))))) : h('p.muted', 'Dated records appear here, newest first.'));
}

function searchView(space, q) {
  const results = searchRecords(space, q);
  return h('div.stack', h('h1', `Search: “${q}”`), results.length ? h('ul.list.card-list', results.map((r) => listItem(space, r, fmtDate(recordDate(r))))) : h('p.muted', 'Nothing matches.'));
}

function aboutView(appState, space) {
  const kind = space.membership.kind;
  const p = space.profile;
  return h('div.stack',
    h('div.list-head', h('h1', kind === 'pet' ? 'Pet details' : 'Profile details'), space.canWrite() ? button('Edit', () => go(`#/p/${space.id}/edit/profile`), { iconName: 'edit' }) : null),
    h('dl.details', PROFILE_FIELDS[kind].filter((f) => p[f.k]).map((f) => [h('dt', f.label), h('dd', f.type === 'date' ? fmtDate(p[f.k]) : f.options ? (f.options.find((o) => o.value === p[f.k])?.label || p[f.k]) : p[f.k])])),
    space.role === 'owner' ? h('section.panel.danger-zone', h('h2', 'Delete this profile'),
      h('p', 'Deletes every record, file and recording in this profile from this device and from your sync nodes, and ends everyone’s access. People you gave access to may still have copies on their devices.'),
      button('Delete profile', async () => {
        if (await confirmDialog(`Delete ${p.name || 'this profile'}?`, 'This cannot be undone.', { ok: 'Delete everything', danger: true })) {
          await appState.vault.removeProfile(space.id);
          toast('Profile deleted');
          go('#/');
        }
      }, { kind: 'danger', iconName: 'trash' })) : null);
}

async function recordDetail(appState, space, rid) {
  const r = space.get(rid);
  if (!r) return h('div', h('h1', 'Record not found'), h('p', 'It may have been deleted.'));
  const meta = KINDS[r.kind];
  if (!meta) return h('div', h('h1', 'Unknown record'));
  const pk = space.membership.kind;
  const d = r.data;
  const names = (await openMeta(space.membership, space.rawKeys)).names || {};
  const by = r.author === appState.vault.session.acct ? 'you' : names[r.author] || 'someone with access';
  const when = new Date(parseInt(r.hlc.split('.')[0], 36)).toLocaleString();
  const fields = meta.fields.filter((f) => f.type !== 'file' && d[f.k] !== undefined && d[f.k] !== '' && (!f.pet || pk === 'pet'));
  const display = (f) => {
    const v = d[f.k];
    if (f.type === 'date') return fmtDate(v);
    if (f.type === 'datetime-local') return fmtDate(v, true);
    if (f.options) return f.options.find((o) => o.value === v)?.label || v;
    if (f.type === 'url') return h('a', { href: /^https?:\/\//.test(v) ? v : '#', rel: 'noopener noreferrer', target: '_blank' }, v);
    return String(v);
  };
  const file = d.file || d.card;

  return h('div.stack.record',
    h('a.back', { href: `#/p/${space.id}/k/${r.kind}` }, icon('back', { size: 16 }), pluralFor(r.kind, pk)),
    h('div.list-head', h('div', h('span.eyebrow', meta.label), h('h1', recordTitle(r)), recordSub(r) ? h('p.muted', recordSub(r)) : null),
      space.canWrite() ? h('div.row', button('Edit', () => go(`#/p/${space.id}/edit/${rid}`), { iconName: 'edit' }),
        button('Delete', async () => {
          if (await confirmDialog('Delete this record?', 'It is removed on every device and node that syncs this profile.', { ok: 'Delete', danger: true })) {
            await space.remove(rid); toast('Deleted'); go(`#/p/${space.id}/k/${r.kind}`);
          }
        }, { kind: 'ghost', iconName: 'trash' })) : null),
    isSensitive(r) ? h('div.callout.private', icon('lock'), h('div', h('strong', 'Private: '), d.sensitive.map((s) => SENSITIVE[s] || s).join(', '), '. Never preselected when you share.')) : null,
    r.kind === 'visit' ? await visitDetail(appState, space, r) : null,
    h('dl.details', fields.filter((f) => r.kind !== 'visit' || !['summary', 'instructions', 'questions'].includes(f.k)).map((f) => [h('dt', f.labelFor ? f.labelFor(d) : f.label), h('dd', display(f))])),
    file ? await filePanel(appState, space, file) : null,
    d.source ? h('p.provenance', icon('upload', { size: 14 }), ` Imported from ${d.source.name || d.source.type}${d.source.issuer ? ` · issued by ${d.source.issuer}` : ''}${d.source.verified ? ' · signature verified' : ''} on ${fmtDate(d.source.at)}`) : null,
    d.codes?.length ? h('p.provenance', 'Codes: ', d.codes.map((c) => `${c.system.replace(/^https?:\/\/(www\.)?/, '')} ${c.code}`).join(', ')) : null,
    h('p.provenance', icon('clock', { size: 14 }), ` Last changed by ${by} · ${when}`));
}

async function filePanel(appState, space, ref) {
  const out = h('section.panel.file-panel', h('h2', icon('file'), ' ', ref.name || 'File'), h('p.muted', `${ref.type || 'File'} · ${fmtSize(ref.size)}`));
  const preview = h('div.preview');
  const load = async () => new Blob([await appState.vault.readFile(space, ref)], { type: ref.type });
  out.append(preview, h('div.row',
    button('Open', async () => {
      try { const url = URL.createObjectURL(await load()); window.open(url, '_blank', 'noopener'); setTimeout(() => URL.revokeObjectURL(url), 120000); } catch (err) { toast(err.message, 'error'); }
    }, { iconName: 'eye' }),
    button('Download', async () => { try { downloadBlob(await load(), ref.name || 'file'); } catch (err) { toast(err.message, 'error'); } }, { iconName: 'download' })));
  if ((ref.type || '').startsWith('image/') && ref.size < 15 * 1024 * 1024) {
    load().then((blob) => { const url = URL.createObjectURL(blob); preview.append(h('img', { src: url, alt: ref.name || 'Attached image' })); }).catch(() => preview.append(h('p.muted', 'Preview unavailable until the file syncs.')));
  }
  return out;
}

