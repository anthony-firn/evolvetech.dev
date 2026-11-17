// SPDX-License-Identifier: GPL-3.0-or-later
import {homedir} from 'node:os';
import {join} from 'node:path';
import {mkdir, readFile, writeFile, rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {writeJSON} from './core.mjs';

export async function activateHost(root, wallet, uuid) {
  const ctl = (...args) => execFileSync('/usr/bin/systemctl', ['--user', ...args], {stdio: 'ignore'});
  ctl('cat', 'evolve-bootstrap-settlement.service');
  const units = join(homedir(), '.config/systemd/user');
  const cpuPath = join(root, 'cpu.json'), gpuPath = join(units, 'evolve-bootstrap-gpu.service');
  const oldCpu = JSON.parse(await readFile(cpuPath, 'utf8')), oldGpu = await readFile(gpuPath, 'utf8');
  if (!oldGpu.includes('pearlpow.unmineable.com:4444')) throw Error('Unexpected GPU pool configuration');
  const gpu = oldGpu.replace(/-w (?:ALGO:[A-Z2-7]{58}|NANO:nano_[13456789abcdefghijkmnopqrstuwxyz]{60}) /, '-w NANO:' + wallet.address + ' ');
  if (!gpu.includes('-w NANO:' + wallet.address + ' ')) throw Error('GPU payout address could not be set');
  const dir = join(root, 'settlement');
  await writeJSON(join(dir, 'previous-cpu.json'), oldCpu);
  await writeJSON(join(dir, 'previous-gpu.json'), {unit: oldGpu});
  const dropins = ['cpu', 'gpu'].map(backend => join(units, 'evolve-bootstrap-' + backend + '.service.d', 'settlement.conf'));
  try {
    const cpu = structuredClone(oldCpu); cpu.pools[0].user = 'NANO:' + wallet.address + '.native-cpu';
    await writeJSON(cpuPath, cpu); await writeFile(gpuPath, gpu);
    for (const path of dropins) {
      await mkdir(join(path, '..'), {recursive: true});
      await writeFile(path, '[Unit]\nBindsTo=evolve-bootstrap-settlement.service\nAfter=evolve-bootstrap-settlement.service\n');
    }
    await writeJSON(join(dir, 'activation.json'), {mode: 'nano', address: wallet.address, uuid, activatedAt: new Date().toISOString()});
    await writeJSON(join(root, 'cpu-policy.json'), {enabled: true});
    ctl('daemon-reload');
    ctl('start', 'evolve-bootstrap-settlement.service');
    ctl('restart', 'evolve-bootstrap-cpu.service', 'evolve-bootstrap-gpu.service');
  } catch (error) {
    try {ctl('stop', 'evolve-bootstrap-settlement.service');} catch {}
    for (const path of dropins) await rm(path, {force: true});
    await writeJSON(cpuPath, oldCpu); await writeFile(gpuPath, oldGpu);
    await rm(join(dir, 'activation.json'), {force: true});
    await writeJSON(join(root, 'cpu-policy.json'), {enabled: true});
    ctl('daemon-reload');
    try {ctl('is-active', '--quiet', 'evolve-bootstrap-watch.service'); ctl('restart', 'evolve-bootstrap-cpu.service', 'evolve-bootstrap-gpu.service');} catch {}
    throw error;
  }
}
