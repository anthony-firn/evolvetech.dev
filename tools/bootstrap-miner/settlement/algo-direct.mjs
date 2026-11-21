// SPDX-License-Identifier: GPL-3.0-or-later
/**
 * Mining straight to the fund's ALGO address instead of through Nano and a swap.
 *
 * unMineable pays ALGO at its market price with no network fee from 10 ALGO (unmineable.com/coins/ALGO, 2026-11-20).
 * The Nano route lost about 10% in the Nanswap conversion (5 XNO quoted 17.95 ALGO against 19.98 at market). The
 * fund's ALGO address has automatic payouts off, so this runner asks for a payout through the same authenticated
 * API the Nano route used, and keeps mining while it waits. The trader (fairground) sweeps the ALGO to USDC.
 *
 *   node algo-direct.mjs setup    attach the address to the API account and point both miners at it
 *   node algo-direct.mjs run      the service: keep mining, request payouts (replaces cli.mjs run)
 *   node algo-direct.mjs revert   restore the Nano route's miner settings and service
 */
import {copyFile, open, readFile, rm, writeFile, mkdir} from 'node:fs/promises';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {setTimeout as delay} from 'node:timers/promises';
import {FUND, privateDirectory, readJSON, requestJSON, writeJSON, poolClient} from './core.mjs';

export const ALGO_THRESHOLD = 10;
export const PAYOUT_RETRY_MS = 3600_000;
/** After a request, how long to wait for the pool balance to drop before asking again. */
export const PAYOUT_WAIT_MS = 6 * 3600_000;

/** One check: keep the miners running and ask for a payout when the pool holds the threshold. */
export class AlgoDirect {
  constructor(dependencies) {Object.assign(this, {now: () => Date.now()}, dependencies);}
  async tick() {
    const {state, save} = this, now = this.now();
    const chain = await this.algo();
    if (!chain.ready) {await this.stop(); throw Error('The fund wallet is not USDC-ready; mining stopped');}
    const pool = await this.poolStatus();
    const payable = Number(pool.balance_payable ?? pool.balance ?? 0);
    if (!Number.isFinite(payable) || payable < 0) throw Error('Unexpected pool balance');
    state.poolAlgo = String(payable);
    if (state.payoutRequestedAt && (payable < ALGO_THRESHOLD || now - Date.parse(state.payoutRequestedAt) > PAYOUT_WAIT_MS)) state.payoutRequestedAt = null;
    const retryLater = state.payoutRetryAt && Date.parse(state.payoutRetryAt) > now;
    if (!state.payoutRequestedAt && !retryLater && payable >= ALGO_THRESHOLD) {
      try {
        await this.poolPayout();
        state.payoutRequestedAt = new Date(now).toISOString(); state.payoutRetryAt = null; state.lastPayoutError = null;
        state.payouts = (state.payouts ?? 0) + 1; state.lastPayoutAlgo = String(payable);
      } catch (error) {
        if (!error.definitivelyRejected) throw error;
        // 409 means not yet; any refusal is retried in an hour while mining continues.
        state.payoutRetryAt = new Date(now + PAYOUT_RETRY_MS).toISOString(); state.lastPayoutError = error.message;
      }
    }
    state.mode = 'algo-direct'; state.phase = 'mining-algo';
    state.message = state.payoutRequestedAt ? `Payout of ${state.lastPayoutAlgo} ALGO requested; mining continues.` : `Mining to the fund: ${payable} of ${ALGO_THRESHOLD} ALGO at the pool.`;
    if (this.start) await this.start();
    await save(state);
  }
}

const root = join(homedir(), '.local/share/evolve-bootstrap'), dir = join(root, 'settlement'), units = join(homedir(), '.config/systemd/user');
const statePath = join(dir, 'algo-direct-state.json'), configPath = join(dir, 'algo-direct.json');
const gpuDropIn = join(units, 'evolve-bootstrap-gpu.service.d', 'algo-direct.conf');
const settlementDropIn = join(units, 'evolve-bootstrap-settlement.service.d', 'zz-algo-direct.conf');
const systemctl = (...args) => execFileSync('/usr/bin/systemctl', ['--user', ...args], {stdio: ['ignore', 'ignore', 'ignore']});
const publicPool = () => requestJSON('https://api.unmineable.com/v4/address/' + FUND + '?coin=ALGO').then(v => {
  if (!v.success || !v.data || v.data.address !== FUND || v.data.network !== 'ALGO') throw Error('Pool did not return the fund’s ALGO account');
  return v.data;
});
const walletStatus = async () => {
  const v = await requestJSON('http://127.0.0.1:8773/api/status');
  if (!v.wallet || v.address !== FUND) throw Error('Donation wallet status unavailable');
  return v.wallet;
};
async function credentials() {
  const c = await readJSON(join(dir, 'credentials.json'), null);
  if (!c?.unmineableKey || !c?.unmineableSecret) throw Error('unMineable API credentials are missing (settlement/credentials.json)');
  return c;
}
/** The GPU unit's command with the payout address switched from the Nano transit wallet to the fund. */
export function algoGpuCommand(unitText, fund = FUND) {
  const line = unitText.split('\n').find(l => l.startsWith('ExecStart='));
  if (!line || !/ -w NANO:nano_[13456789abcdefghijkmnopqrstuwxyz]{60}( |$)/.test(line)) throw Error('Unexpected GPU miner command');
  return line.slice('ExecStart='.length).replace(/ -w NANO:nano_[13456789abcdefghijkmnopqrstuwxyz]{60}/, ` -w ALGO:${fund}`);
}

async function setup() {
  await privateDirectory(dir);
  const pool = poolClient(await credentials()), identity = await publicPool();
  if (!/^[A-Fa-f0-9-]{16,64}$/.test(identity.uuid ?? '')) throw Error('Pool has not registered the fund’s ALGO address');
  try {await pool('GET', '/legacy-addresses/' + identity.uuid);}
  catch (error) {
    if (error.status !== 404) throw error;
    await pool('POST', '/legacy-addresses/attach', {uuid: identity.uuid});
    await pool('GET', '/legacy-addresses/' + identity.uuid);
  }
  await writeJSON(configPath, {address: FUND, uuid: identity.uuid, threshold: ALGO_THRESHOLD, activatedAt: new Date().toISOString()});
  // Keep the Nano settings to revert to.
  const cpuPath = join(root, 'cpu.json'), cpu = JSON.parse(await readFile(cpuPath, 'utf8'));
  if (!cpu.pools?.[0]?.user) throw Error('Unexpected CPU miner configuration');
  if (cpu.pools[0].user.startsWith('NANO:')) await writeFile(join(root, 'cpu.nano.json'), JSON.stringify(cpu, null, 2) + '\n', {mode: 0o600});
  cpu.pools[0].user = `ALGO:${FUND}.native-cpu`;
  await writeFile(cpuPath, JSON.stringify(cpu, null, 2) + '\n', {mode: 0o600});
  const modePath = join(dir, 'mode.json'), mode = await readJSON(modePath, null);
  if (mode?.mode === 'donations') await writeJSON(join(dir, 'mode.nano.json'), mode);
  await writeJSON(modePath, {mode: 'algo-direct', recipient: FUND});
  const gpu = algoGpuCommand(await readFile(join(units, 'evolve-bootstrap-gpu.service'), 'utf8'));
  await mkdir(join(units, 'evolve-bootstrap-gpu.service.d'), {recursive: true});
  await writeFile(gpuDropIn, `# Mine to the fund's ALGO address (algo-direct.mjs). Delete to return to the Nano route.\n[Service]\nExecStart=\nExecStart=${gpu}\n`);
  await writeFile(settlementDropIn, `# ALGO-direct mining (algo-direct.mjs). Delete to return to the Nano settlement.\n[Service]\nExecStart=\nExecStart=${process.execPath} ${fileURLToPath(import.meta.url)} run\n`);
  systemctl('daemon-reload');
  console.log('ALGO-direct mining is set up; start it with: systemctl --user start evolve-bootstrap-settlement.service');
}

async function revert() {
  for (const path of [gpuDropIn, settlementDropIn]) await rm(path, {force: true});
  const nanoCpu = await readJSON(join(root, 'cpu.nano.json'), null), nanoMode = await readJSON(join(dir, 'mode.nano.json'), null);
  if (nanoCpu) await writeFile(join(root, 'cpu.json'), JSON.stringify(nanoCpu, null, 2) + '\n', {mode: 0o600});
  if (nanoMode) await writeJSON(join(dir, 'mode.json'), nanoMode);
  systemctl('daemon-reload');
  console.log('Nano route restored.');
}

async function run() {
  if (process.env.EVOLVE_SETTLEMENT_LOCKED !== '1') {
    await privateDirectory(dir);
    const lock = await open(join(dir, 'run.lock'), 'a', 0o600); await lock.close();
    try {execFileSync('/usr/bin/flock', ['-n', '-E', '75', join(dir, 'run.lock'), process.execPath, fileURLToPath(import.meta.url), 'run'], {stdio: 'inherit', env: {...process.env, EVOLVE_SETTLEMENT_LOCKED: '1'}}); process.exit(0);}
    catch (error) {process.exit(error.status ?? 1);}
  }
  const config = await readJSON(configPath, null);
  if (config?.address !== FUND || !config.uuid) throw Error('Run setup first');
  const pool = poolClient(await credentials()), state = await readJSON(statePath, {});
  const cpuOk = async () => JSON.parse(await readFile(join(root, 'cpu.json'), 'utf8')).pools[0].user === `ALGO:${FUND}.native-cpu`;
  const engine = new AlgoDirect({state, save: value => {value.checkedAt = new Date().toISOString(); return writeJSON(statePath, value);},
    algo: walletStatus, poolStatus: publicPool, poolPayout: () => pool('POST', '/legacy-addresses/' + config.uuid + '/payments', {platform: 'api'}),
    start: async () => {
      if (!await cpuOk()) throw Error('The CPU miner is not configured for the fund');
      await writeJSON(join(root, 'cpu-policy.json'), {enabled: true});
      const guard = JSON.parse(await readFile(join(root, 'watch-status.json'), 'utf8').catch(() => '{}'));
      systemctl('start', 'evolve-bootstrap-gpu.service');
      if (!guard.cooling) systemctl('start', 'evolve-bootstrap-cpu.service');
    },
    stop: async () => {await writeJSON(join(root, 'cpu-policy.json'), {enabled: false}); systemctl('stop', 'evolve-bootstrap-cpu.service', 'evolve-bootstrap-gpu.service');}});
  let quitting = false;
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => {quitting = true;});
  while (!quitting) {
    try {state.error = null; await engine.tick();}
    catch (error) {state.error = error.message; await writeJSON(statePath, state); console.error(error.message);}
    for (let i = 0; i < 60 && !quitting; i++) await delay(1000);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const command = process.argv[2];
  if (command === 'setup') await setup();
  else if (command === 'run') await run();
  else if (command === 'revert') await revert();
  else throw Error('Use setup, run or revert');
}
