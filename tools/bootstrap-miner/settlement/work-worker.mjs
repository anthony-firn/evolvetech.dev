// SPDX-License-Identifier: GPL-3.0-or-later
import {parentPort, workerData} from 'node:worker_threads';
import nano from 'nanocurrency';
try {parentPort.postMessage({work: await nano.computeWork(workerData.root, {workThreshold: workerData.threshold})});}
catch {parentPort.postMessage({error: 'Local Nano proof-of-work failed'});}
