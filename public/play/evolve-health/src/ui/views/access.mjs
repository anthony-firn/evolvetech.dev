// People with ongoing access to a profile: caregivers, adult children, partners, a parent's aide.
import { fill, h, icon, button, field, toast, confirmDialog, copyText, clear, spinner } from '../dom.mjs';
import { app as appState, go, render } from '../main.mjs';
import { ROLE_INFO, ROLES } from '../../core/membership.mjs';
import { Vault } from '../../core/vault.mjs';
import { qrSvg } from '../qr-svg.mjs';
import { nodeLabel, BROWSER_NODE } from '../../core/sync.mjs';

export function requestCard(vault, r) {
  const space = vault.space(r.space);
  return h('div.request',
    h('div', h('strong', `${r.name || 'Someone'} wants to join ${space?.profile.name || 'a profile'} as ${ROLE_INFO[r.role]?.label || r.role}`),
      h('p', 'Before approving, ask them to read you their safety code. It should be ', h('strong.mono', r.code), '. If it’s different, someone else may have the invite link: decline.')),
    h('div.row',
      button('Decline', async () => { await vault.declineRequest(r.id); toast('Declined'); }, { kind: 'ghost' }),
      button('Approve', async (e) => {
        e.currentTarget.disabled = true;
        try { await vault.approveRequest(r.id); toast(`${r.name || 'They'} now has access`); } catch (err) { toast(err.message, 'error'); e.currentTarget.disabled = false; }
      }, { kind: 'primary', iconName: 'check' })));
}

export async function view(app, space) {
  const vault = app.vault;
  const members = await vault.members(space);
  const canManage = space.canManage();
  const isOwner = space.membership.owner === vault.session.acct;
  const invites = Object.values(vault.keyring.invites || {}).filter((i) => i.space === space.id && i.expiresAt > Date.now());
  const requests = vault.requests().filter((r) => r.space === space.id);
  const nodes = space.membership.nodes || [];
  const name = space.profile.name || 'this profile';

  const roleSelect = (m) => {
    const sel = h('select', { 'aria-label': `Access for ${m.name}` }, ['viewer', 'contributor', ...(isOwner ? ['manager'] : [])].map((r) => h('option', { value: r, selected: m.role === r }, ROLE_INFO[r].label)));
    sel.addEventListener('change', async () => {
      try { await vault.changeRole(space, m.acct, sel.value); toast('Access updated'); } catch (err) { toast(err.message, 'error'); render(); }
    });
    return sel;
  };

  return h('div.stack',
    h('h1', 'People with access'),
    h('p.muted', `People here have their own Evolve Health vault and can open ${name}’s records from it. Each person’s access is encrypted to their own keys.`),
    requests.length ? h('section.panel.attention', h('h2', 'Waiting for approval'), requests.map((r) => requestCard(vault, r))) : null,
    h('ul.list.card-list.members', members.map((m) => h('li.member',
      h('span.avatar', m.name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase()),
      h('div.row-main', h('strong', m.you ? `${m.name} (you)` : m.name), h('span.muted', `${ROLE_INFO[m.role].label}: ${ROLE_INFO[m.role].blurb}`)),
      canManage && !m.you && m.role !== 'owner' && (isOwner || ROLES[m.role] < ROLES.manager) ? h('div.row', roleSelect(m),
        button('Remove', async () => {
          if (!await confirmDialog(`Remove ${m.name}?`, [`They lose access to ${name}’s records. The profile key is replaced, so nothing added from now on can be read with their old key.`, 'Anything they already saw or downloaded may still be on their devices.'], { ok: 'Remove access', danger: true })) return;
          try { await vault.removeMember(space, m.acct); toast(`${m.name} no longer has access`); } catch (err) { toast(err.message, 'error'); }
        }, { small: true, kind: 'danger', iconName: 'x' })) : null))),
    invites.length ? h('section.panel', h('h2', 'Open invites'), h('ul.list', invites.map((i) => h('li', h('span.row-main', h('strong', i.label || 'Invite'), h('span.muted', `${ROLE_INFO[i.role].label} · expires ${new Date(i.expiresAt).toLocaleDateString()}`)),
      button('Cancel invite', async () => { await vault.cancelInvite(i.id); toast('Invite cancelled'); }, { small: true, kind: 'ghost' }))))) : null,
    canManage ? inviteForm(app, space, nodes) : h('p.muted', 'Only the owner or a manager can invite people.'),
    h('section.panel.explain', h('h2', 'How access works'),
      h('ul',
        h('li', h('strong', 'Viewer'), ': sees everything in this profile.'),
        h('li', h('strong', 'Helper'), ': can also add records and record appointments, for example a home health aide or a sibling taking Mom to the doctor.'),
        h('li', h('strong', 'Manager'), ': can also share with professionals and invite helpers. Good for a spouse, adult child or someone with power of attorney.'),
        h('li', 'Everyone signs what they add, so you can always see who changed a record.'),
        h('li', 'Access travels through your sync node, which only ever holds encrypted data.'))));
}

function inviteForm(app, space, nodes) {
  const box = h('section.panel');
  const label = h('input', { type: 'text', placeholder: 'e.g. Sam (my daughter)', maxlength: 60 });
  const isOwner = space.membership.owner === app.vault.session.acct;
  const role = h('select', ['viewer', 'contributor', ...(isOwner ? ['manager'] : [])].map((r) => h('option', { value: r, selected: r === 'contributor' }, `${ROLE_INFO[r].label}: ${ROLE_INFO[r].blurb}`)));
  label.addEventListener('input', () => { appState.hold = true; });
  if (!nodes.length) {
    return h('section.panel', h('h2', 'Invite someone'),
      h('p', 'Invites and shared records travel through a sync node you both can reach. This profile doesn’t use one yet.'),
      h('div.row', button('Set up a sync node', () => go('#/settings/sync'), { kind: 'primary', iconName: 'cloud' }),
        button('Only people on this computer', async () => {
          try { await app.vault.addNode(BROWSER_NODE); toast('This browser can now relay access between vaults on this computer'); } catch (err) { toast(err.message, 'error'); }
        })),
      h('p.hint', '“Only people on this computer” is for a shared family computer: each person keeps their own vault in this browser and access is passed between them without any server.'));
  }
  const draw = () => fill(box, h('h2', 'Invite someone'),
    h('div.form-grid', field({ label: 'Who is it for?', hint: 'Only you see this label until they accept.' }, label), field({ label: 'Access' }, role)),
    h('div.actions', button('Create invite link', async () => {
      try {
        const { invite, code } = await app.vault.createInvite(space, { role: role.value, label: label.value.trim() });
        const link = `${app.appUrl}#invite=${code}`;
        fill(box, h('h2', `Invite for ${invite.label || 'someone'}`),
          h('p', 'Send this link privately (text or email directly to them). It works once and expires in 7 days.'),
          h('div.link-box', h('code', `${link.slice(0, 80)}…`), button('Copy link', () => copyText(link, 'Invite link copied'), { kind: 'primary', iconName: 'copy' })),
          h('figure.share-qr', qrSvg(link, { ecl: 'L', label: 'Invite QR code' }), h('figcaption', 'Or scan it from their phone')),
          h('ol.steps-text',
            h('li', 'They open the link and create a vault (or unlock theirs).'),
            h('li', 'Their request appears here and on your home screen.'),
            h('li', 'You compare a 12-digit safety code with them, then approve.')),
          h('p.hint', `Travels through ${nodes.map(nodeLabel).join(', ')}.`),
          button('Done', () => { appState.hold = false; render(); }));
        appState.hold = true;
      } catch (err) { toast(err.message, 'error'); }
    }, { kind: 'primary', iconName: 'link' })));
  draw();
  return box;
}

export async function acceptView(app) {
  const code = app.pendingInvite;
  if (!code) return h('div.page.narrow', h('h1', 'No invite to accept'), h('p', 'Open the invite link you were sent.'), button('Home', () => go('#/'), { kind: 'primary' }));
  let p;
  try { p = Vault.parseInvite(code); } catch (err) { app.pendingInvite = null; return h('div.page.narrow', h('h1', 'That invite link is damaged'), h('p', err.message)); }
  const name = h('input', { type: 'text', value: app.vault.keyring.name || '', placeholder: 'e.g. Sam', autofocus: true });
  const root = h('div.page.narrow.stack');
  const draw = () => fill(root, 
    h('h1', `Help with ${p.l}’s records`),
    h('p', `${p.f || 'The owner'} invited you as ${ROLE_INFO[p.r]?.label || p.r}: ${ROLE_INFO[p.r]?.blurb.toLowerCase() || ''}.`),
    p.x < Date.now() ? h('div.callout.warn', 'This invite has expired. Ask for a new one.') : null,
    field({ label: 'Your name, as they will see it' }, name),
    h('p.hint', `Your request goes through ${p.n.map(nodeLabel).join(', ')}. They approve it after comparing a safety code with you.`),
    h('div.actions', button('Not now', () => { app.pendingInvite = null; go('#/'); }), button('Accept invite', async () => {
      appState.hold = true; // keep background sync from redrawing this screen mid-request
      root.replaceChildren(spinner('Sending your request…'));
      try {
        const { code: safety } = await app.vault.acceptInvite(code, { name: name.value.trim() });
        app.pendingInvite = null;
        fill(root, h('div.callout.ok', icon('check'), h('div', h('strong', 'Request sent.'), h('p', `When ${p.f || 'they'} approve${p.f ? 's' : ''}, ${p.l}’s profile appears on your home screen.`))),
          h('p', 'If they ask for your safety code, read them this:'), h('p.code-big.mono', safety),
          button('Go to my profiles', () => go('#/'), { kind: 'primary' }));
      } catch (err) { appState.hold = false; toast(err.message, 'error'); draw(); }
    }, { kind: 'primary', iconName: 'check', disabled: p.x < Date.now() })));
  draw();
  return root;
}
