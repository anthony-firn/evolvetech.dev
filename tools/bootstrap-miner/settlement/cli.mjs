// SPDX-License-Identifier: GPL-3.0-or-later
import {homedir} from 'node:os';
import {join} from 'node:path';
import {open, readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {Worker} from 'node:worker_threads';
import {setTimeout as delay} from 'node:timers/promises';
import {fileURLToPath} from 'node:url';
import {setupWallet, readJSON, writeJSON, privateDirectory, requestJSON, nanoClient, swapClient, poolClient, FUND} from './core.mjs';
import {Settlement} from './engine.mjs';
import {activateHost} from './activate-host.mjs';
import nano from 'nanocurrency';
import {gpuWork} from './gpu-work.mjs';

const root = join(homedir(), '.local/share/evolve-bootstrap');
const dir = join(root, 'settlement');
const statePath = join(dir, 'state.json');
const command = process.argv[2] ?? 'status';
if (command === 'run' && process.env.EVOLVE_SETTLEMENT_LOCKED !== '1') {
  await privateDirectory(dir);
  const lock = await open(join(dir, 'run.lock'), 'a', 0o600); await lock.close();
  try {
    execFileSync('/usr/bin/flock', ['-n', '-E', '75', join(dir, 'run.lock'), process.execPath, fileURLToPath(import.meta.url), 'run'], {stdio: 'inherit', env: {...process.env, EVOLVE_SETTLEMENT_LOCKED: '1'}});
    process.exit(0);
  } catch (error) {process.exit(error.status ?? 1);}
}
const systemctl = (...args) => execFileSync('/usr/bin/systemctl', ['--user', ...args], {stdio: ['ignore', 'ignore', 'ignore']});
const publicPool = address => requestJSON('https://api.unmineable.com/v4/address/' + encodeURIComponent(address) + '?coin=NANO').then(v => {if (!v.success || !v.data) throw Error('Nano pool identity unavailable'); return v.data;});
const algo = async () => {
  const v = await requestJSON('http://127.0.0.1:8773/api/status');
  if (!v.wallet || v.address !== FUND) throw Error('Donation wallet status unavailable');
  return v.wallet;
};
async function stop() {
  await writeJSON(join(root, 'cpu-policy.json'), {enabled: false});
  systemctl('stop', 'evolve-bootstrap-cpu.service', 'evolve-bootstrap-gpu.service');
}
function localWork(hash, threshold) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./work-worker.mjs', import.meta.url), {workerData: {root: hash, threshold}});
    const timer = setTimeout(() => {worker.terminate(); reject(Error('Local Nano work generation timed out'));}, 600000);
    worker.once('message', value => {clearTimeout(timer); worker.terminate(); value.work ? resolve(value.work) : reject(Error('Local Nano work generation failed'));});
    worker.once('error', () => {clearTimeout(timer); reject(Error('Local Nano worker failed'));});
  });
}
async function getPoolIdentity(wallet, pool) {
  const identity = await publicPool(wallet.address);
  if (!nano.checkAddress(identity.address) || nano.derivePublicKey(identity.address) !== nano.derivePublicKey(wallet.address) || identity.network !== 'NANO') throw Error('Pool returned a different payout identity');
  if (!/^[A-Fa-f0-9-]{16,64}$/.test(identity.uuid ?? '')) throw Error('Pool has not registered the Nano mining address yet');
  // The provider enforces the signed-in account's ownership/alias requirements.
  try {await pool('GET', '/legacy-addresses/' + identity.uuid);}
  catch (error) {
    if (error.status !== 404) throw error;
    await pool('POST', '/legacy-addresses/attach', {uuid: identity.uuid});
    await pool('GET', '/legacy-addresses/' + identity.uuid);
  }
  return identity.uuid;
}

if (command === 'setup') {
  console.log(JSON.stringify(await setupWallet(dir)));
} else if (command === 'status') {
  await privateDirectory(dir);
  const pub = await readJSON(join(dir, 'public.json'), null);
  const state = await readJSON(statePath, {});
  console.log(JSON.stringify({wallet: pub, phase: state.phase ?? 'not-activated', message: state.message, targetNano: state.targetNano, poolNano: state.poolNano, walletNano: state.walletNano, quotedAlgo: state.quotedAlgo, swapStatus: state.swapStatus, sendHash: state.sendHash, error: state.error}, null, 2));
} else if (command === 'check' || command === 'activate' || command === 'run' || command === 'retry-order') {
  await setupWallet(dir);
  const credentials = await readJSON(join(dir, 'credentials.json'), null);
  if (!credentials?.nanswapKey || !credentials?.unmineableKey || !credentials?.unmineableSecret) throw Error('Enter the Nanswap and unMineable API credentials in the local setup console');
  const wallet = await readJSON(join(dir, 'wallet.json'));
  const rpc = nanoClient(), swap = swapClient(credentials.nanswapKey), pool = poolClient(credentials);
  const version = await rpc('version');
  if (version.network !== 'live') throw Error('Nano RPC is not on the live network');
  await swap('/get-limits');
  let activation = await readJSON(join(dir, 'activation.json'), null);
  if (command === 'retry-order') {
    systemctl('stop', 'evolve-bootstrap-settlement.service');
    const saved = await readJSON(statePath, {});
    if (saved.phase !== 'order-create-uncertain' || saved.order || saved.orderResponse || saved.pendingBlock || saved.sendHash) throw Error('Only an uncertain request without a saved provider response or payment may be retried');
    saved.phase = 'quote-ready'; saved.error = null; await writeJSON(statePath, saved);
    systemctl('start', 'evolve-bootstrap-settlement.service');
    console.log('Unfunded order retry enabled; saved signed payments were not changed.'); process.exit(0);
  }
  if (command !== 'run') {
    const chain = await algo();
    if (chain.funded || chain.ready) throw Error('Donation wallet already funded; no more mining needed');
    const uuid = await getPoolIdentity(wallet, pool);
    if (command === 'check') {console.log('Public quote, Nano mainnet and authenticated pool access checked.'); process.exit(0);}
    if (!activation) await activateHost(root, wallet, uuid);
    else {
      if (activation.address !== wallet.address || activation.uuid !== uuid) throw Error('Existing activation identifies a different wallet');
      systemctl('restart', 'evolve-bootstrap-settlement.service');
    }
    console.log('Nano mining and the one-time settlement service are active.');
    process.exit(0);
  }
  if (!activation || activation.address !== wallet.address) throw Error('Activate the prepared route first');
  const state = await readJSON(statePath, {phase: 'mining-nano'});
  const save = async value => {value.checkedAt = new Date().toISOString(); await writeJSON(statePath, value);};
  const start = async () => {
    const config = JSON.parse(await readFile(join(root, 'cpu.json'), 'utf8'));
    if (config.pools[0].user !== 'NANO:' + wallet.address + '.native-cpu') throw Error('Mining is not configured for the saved transit wallet');
    await writeJSON(join(root, 'cpu-policy.json'), {enabled: true});
    const guard = JSON.parse(await readFile(join(root, 'watch-status.json'), 'utf8'));
    systemctl('start', 'evolve-bootstrap-gpu.service');
    if (!guard.cooling) systemctl('start', 'evolve-bootstrap-cpu.service');
  };
  const work = async (hash, threshold) => {
    try {
      const proof = await gpuWork(hash, threshold);
      if (nano.validateWork({blockHash: hash, work: proof, threshold})) return proof;
    } catch {}
    return localWork(hash, threshold);
  };
  const engine = new Settlement({wallet, state, save, rpc, swap, algo, stop, start, work,
    poolStatus: () => publicPool(wallet.address),
    poolPayout: () => pool('POST', '/legacy-addresses/' + activation.uuid + '/payments', {platform: 'api'})});
  let quitting = false;
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => {quitting = true;});
  while (!quitting) {
      try {
        state.error = null; await engine.tick();
        if (state.phase === 'complete') {execFileSync('notify-send', ['Donation wallet funded', state.message]); break;}
      } catch (error) {
        // Error strings here contain endpoint/status descriptions, never raw
        // authenticated response bodies or credential values.
        state.error = error.message; await save(state);
        console.error(error.message);
        if (state.order || state.phase === 'order-create-uncertain') await stop();
      }
      for (let i = 0; i < 30 && !quitting; i++) await delay(1000);
  }
} else throw Error('Use setup, status, check, activate, run or retry-order');
