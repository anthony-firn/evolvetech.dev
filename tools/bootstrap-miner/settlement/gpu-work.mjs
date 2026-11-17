// SPDX-License-Identifier: GPL-3.0-or-later
import {spawn} from 'node:child_process';
import {access} from 'node:fs/promises';
import {constants} from 'node:fs';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import {requestJSON} from './core.mjs';
import {createServer} from 'node:net';

// The upstream Nano work server receives only a public block root, never a key.
// It is started for one request, bound to loopback, then stopped.
export async function gpuWork(root, threshold) {
  const binary = join(homedir(), '.local/share/evolve-bootstrap/nano-work-server/target/release/nano-work-server');
  await access(binary, constants.X_OK);
  const reservation = createServer();
  await new Promise((resolve, reject) => {reservation.once('error', reject); reservation.listen(0, '127.0.0.1', resolve);});
  const port = reservation.address().port;
  await new Promise(resolve => reservation.close(resolve));
  const child = spawn(binary, ['--listen-address', '127.0.0.1:' + port, '--gpu', '0:0', '--cpu-threads', '0'], {stdio: 'ignore'});
  let failed = false;
  child.once('error', () => {failed = true;});
  const call = data => requestJSON('http://127.0.0.1:' + port, {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(data)});
  try {
    let ready = false;
    for (let i = 0; i < 100 && !ready; i++) {
      if (failed || child.exitCode !== null) throw Error('Local GPU work server did not start');
      try {await call({action: 'status'}); ready = true;} catch {await delay(100);}
    }
    if (!ready) throw Error('Local GPU work server startup timed out');
    const value = await call({action: 'work_generate', hash: root, difficulty: threshold});
    if (!value.work) throw Error('Local GPU did not return work');
    return value.work;
  } finally {
    child.kill('SIGTERM');
    if (child.exitCode === null) await Promise.race([new Promise(resolve => child.once('exit', resolve)), delay(2000).then(() => child.kill('SIGKILL'))]);
  }
}
