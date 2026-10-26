// Pinned upstream source and license: ../lib/evolve-inbox/SOURCE.json.
// Keep the existing mail store, password and webhook settings across deployments.
import { createInbox } from '../lib/evolve-inbox/src/inbox.mjs';

const defaults = { MAIL_LABEL: 'EvolveTech', MAIL_DOMAIN: 'evolvetech.dev' };
const setting = (name) => globalThis.Netlify?.env.get(name) || process.env[name] || defaults[name] || '';

export default createInbox({ setting });
export const config = { path: ['/mail', '/mail/*'] };
