// Pages installs npm dependencies before publishing public/. Prepare that ephemeral
// checkout here so the existing Pages output setting does not need an API change.
import {existsSync, renameSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';

export function preparePages({root, env = process.env, run = spawnSync}) {
  if (env.CF_PAGES !== '1') return 'not-pages';
  let pagesURL;
  try { pagesURL = new URL(env.CF_PAGES_URL); } catch {}
  if (!/^[0-9a-f]{40}$/i.test(env.CF_PAGES_COMMIT_SHA || '') || !env.CF_PAGES_BRANCH
      || pagesURL?.protocol !== 'https:' || !pagesURL?.hostname.endsWith('.pages.dev')) {
    throw new Error('Incomplete Cloudflare Pages build identity; refusing to replace public/.');
  }
  const source = join(root, 'public');
  const marker = '.evolve-cloudflare-build.json';
  if (existsSync(join(source, marker))) return 'already-prepared';
  const prepared = join(root, '.cloudflare', 'public');
  const backup = join(root, '.cloudflare', 'source-public');
  if (existsSync(backup)) throw new Error('A previous Pages source backup exists; restore it before retrying.');
  const result = run('python3', [join(root, 'tools', 'build_cloudflare.py')], {cwd: root, env, stdio: 'inherit'});
  if (result.error || result.status !== 0 || !existsSync(join(prepared, marker))) {
    throw new Error('Cloudflare asset preparation failed; original public/ was retained.');
  }
  renameSync(source, backup);
  try {
    renameSync(prepared, source);
  } catch (error) {
    renameSync(backup, source);
    throw error;
  }
  return 'prepared';
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = preparePages({root: dirname(dirname(fileURLToPath(import.meta.url)))});
    if (result !== 'not-pages') console.log(`Cloudflare install hook: ${result}`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
