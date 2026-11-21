// SPDX-License-Identifier: GPL-3.0-or-later
import test from 'node:test';
import assert from 'node:assert/strict';
import {AlgoDirect, ALGO_THRESHOLD, PAYOUT_RETRY_MS, PAYOUT_WAIT_MS, algoGpuCommand} from './algo-direct.mjs';
import {FUND} from './core.mjs';

function engine(over = {}) {
  const calls = {payouts: 0, starts: 0, stops: 0};
  let balance = over.balance ?? 0, now = over.now ?? 1_800_000_000_000;
  const state = over.state ?? {};
  const e = new AlgoDirect({state, save: async () => {}, now: () => now, algo: async () => ({ready: over.ready ?? true}),
    poolStatus: async () => ({balance_payable: String(balance)}),
    poolPayout: async () => {calls.payouts++; if (over.refuse) {const err = Error('HTTP 409'); err.status = 409; err.definitivelyRejected = true; throw err;}},
    start: async () => {calls.starts++;}, stop: async () => {calls.stops++;}});
  return {e, state, calls, set: b => {balance = b;}, wait: ms => {now += ms;}};
}

test('mining continues and a payout is asked for once the pool holds 10 ALGO, then not again until it is paid', async () => {
  const t = engine({balance: 9.9});
  await t.e.tick(); assert.equal(t.calls.payouts, 0); assert.equal(t.calls.starts, 1); assert.equal(t.state.phase, 'mining-algo');
  t.set(ALGO_THRESHOLD); await t.e.tick(); assert.equal(t.calls.payouts, 1); assert.ok(t.state.payoutRequestedAt);
  t.wait(60_000); await t.e.tick(); assert.equal(t.calls.payouts, 1, 'no repeat while the payout is pending');
  t.set(0.2); t.wait(3600_000); await t.e.tick(); assert.equal(t.state.payoutRequestedAt, null, 'paid');
  t.set(10.5); await t.e.tick(); assert.equal(t.calls.payouts, 2);
  t.wait(PAYOUT_WAIT_MS + 1); await t.e.tick(); t.wait(1); await t.e.tick();
  assert.equal(t.calls.payouts, 3, 'asks again if a payout never arrives');
  assert.equal(t.calls.stops, 0); assert.equal(t.calls.starts, 7, 'the miners are kept running every check');
});

test('a refused payout is retried an hour later without stopping the miners', async () => {
  const t = engine({balance: 12, refuse: true});
  await t.e.tick(); assert.equal(t.calls.payouts, 1); assert.match(t.state.lastPayoutError, /409/);
  t.wait(PAYOUT_RETRY_MS - 1000); await t.e.tick(); assert.equal(t.calls.payouts, 1);
  t.wait(2000); await t.e.tick(); assert.equal(t.calls.payouts, 2);
  assert.equal(t.calls.stops, 0);
});

test('mining stops if the fund wallet stops being USDC-ready', async () => {
  const t = engine({ready: false, balance: 50});
  await assert.rejects(t.e.tick(), /USDC-ready/); assert.equal(t.calls.stops, 1); assert.equal(t.calls.payouts, 0);
});

test('the GPU miner is pointed at the fund’s ALGO address and nothing else changes', () => {
  const nanoAddr = 'nano_1qpyzx8cq58n8qjbni9crkb5wqhb5i6te6gy1gk36tuo1aezuxbjubdb84kd';
  const unit = `[Service]\nEnvironment=BZ=1\nExecStart=/x/bzminer --nvidia -a pearl -p stratum+ssl://pearlpow.unmineable.com:4444 -w NANO:${nanoAddr} --worker native-gpu --pass x\nTimeoutStopSec=15\n`;
  assert.equal(algoGpuCommand(unit), `/x/bzminer --nvidia -a pearl -p stratum+ssl://pearlpow.unmineable.com:4444 -w ALGO:${FUND} --worker native-gpu --pass x`);
  assert.throws(() => algoGpuCommand('[Service]\nExecStart=/x/bzminer -w BTC:abc\n'), /Unexpected/);
});
