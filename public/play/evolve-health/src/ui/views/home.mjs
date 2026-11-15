// Home: every profile this account can open (its own, family members', pets', and shared ones).
import { h, icon, button } from '../dom.mjs';
import { go } from '../main.mjs';
import { ageFrom, isActive } from '../../health/model.mjs';
import { ROLE_INFO } from '../../core/membership.mjs';
import { requestCard } from './access.mjs';

export function avatar(profile, kind, size = '') {
  const name = profile.name || '?';
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
  return h(`span.avatar${size ? `.${size}` : ''}`, { class: kind === 'pet' ? 'pet' : '', 'aria-hidden': 'true' }, kind === 'pet' ? icon('paw', { size: size === 'big' ? 30 : 20 }) : initials);
}

export function profileLine(p, kind) {
  if (kind === 'pet') { const a = ageFrom(p.birthDate); return [p.species, p.breed, a && (/\d$/.test(a) ? `${a} years old` : `${a} old`)].filter(Boolean).join(' · '); }
  const age = ageFrom(p.birthDate);
  return [age && (/\d+$/.test(age) ? `${age} years old` : age), p.sex && p.sex[0].toUpperCase() + p.sex.slice(1)].filter(Boolean).join(' · ');
}

export async function view(app) {
  const vault = app.vault;
  const profiles = vault.profiles();
  const requests = vault.requests();
  const pending = vault.keyring.pending || [];
  const removed = Object.entries(vault.keyring.spaces).filter(([, e]) => e.removed && e.removedNote && Date.now() - e.removedAt < 7 * 86400000);
  const name = vault.keyring.name;

  return h('div.page',
    h('div.page-head', h('h1', name ? `Hi, ${name}` : 'Your profiles'),
      h('p.muted', profiles.length ? 'Choose a profile to see records, share them or record an appointment.' : 'Start by adding a profile for yourself, someone you care for, or a pet.')),
    requests.length ? h('section.panel.attention', h('h2', icon('people'), ' Waiting for your approval'), requests.map((r) => requestCard(vault, r))) : null,
    pending.length ? h('section.panel', h('h2', 'Invites you accepted'),
      pending.map((p) => h('div.pending', icon('clock'), h('div',
        h('strong', `${p.label}’s records`), h('p.muted', `Waiting for ${p.from || 'the owner'} to approve you as ${ROLE_INFO[p.role]?.label || p.role}.`),
        p.code ? h('p', 'If they ask, your safety code is ', h('strong.mono', p.code), '.') : null)))) : null,
    removed.map(([id, e]) => h('div.callout.warn', { key: id }, icon('alert'), h('div', `Your access to a shared profile ended (${e.removedNote}). Records added before then may still be in this browser until you remove them.`))),
    h('div.profile-grid',
      profiles.map((p) => {
        const s = p.space;
        const allergies = s.list('allergy').length;
        const meds = s.list('medication').filter(isActive).length;
        const upcoming = s.list('visit').filter((v) => v.data.status === 'planned' && v.data.date >= new Date().toISOString().slice(0, 10)).length;
        return h('a.card.profile-card', { href: `#/p/${p.id}` },
          h('div.profile-card-head', avatar(s.profile, p.kind),
            h('div', h('strong', p.name), h('span.muted', profileLine(s.profile, p.kind) || (p.kind === 'pet' ? 'Pet' : 'Person')))),
          h('div.chips',
            allergies ? h('span.chip.danger', `${allergies} ${allergies === 1 ? 'allergy' : 'allergies'}`) : h('span.chip', 'No allergies recorded'),
            meds ? h('span.chip', `${meds} current ${meds === 1 ? 'medicine' : 'medicines'}`) : null,
            upcoming ? h('span.chip.info', `${upcoming} upcoming`) : null,
            !p.mine ? h('span.chip.shared', `Shared with you · ${ROLE_INFO[p.role]?.label || p.role}`) : null));
      }),
      h('div.card.add-card',
        h('strong', 'Add a profile'),
        h('div.add-options',
          button('Me', () => go('#/new/person?self=1'), { iconName: 'person' }),
          button('Someone I care for', () => go('#/new/person'), { iconName: 'people' }),
          button('A pet', () => go('#/new/pet'), { iconName: 'paw' })))),
    !vault.nodesInUse().length && profiles.length ? h('div.callout.info', icon('cloud'), h('div',
      h('strong', 'Your records are only in this browser.'),
      h('p', 'Add a sync node to use them on your phone and computer, keep an encrypted copy if this device is lost, and invite caregivers. You can run your own node or use one someone you trust runs.'),
      button('Set up sync', () => go('#/settings/sync'), { small: true }))) : null);
}

