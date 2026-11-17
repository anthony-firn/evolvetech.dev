// SPDX-License-Identifier: GPL-3.0-or-later
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, chmod, stat, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import nano from 'nanocurrency';
import {decimal, display, planQuote, validateOrder, setupWallet, FUND, poolSignature, prepareBlock, broadcastPending, nanoClient} from './core.mjs';
import {Settlement} from './engine.mjs';

const wallet = {seed: '0'.repeat(64), index: 0};
const secret = nano.deriveSecretKey(wallet.seed, 0);
wallet.address = nano.deriveAddress(nano.derivePublicKey(secret), {useNanoPrefix: true});
const deposit = nano.deriveAddress(nano.derivePublicKey(nano.deriveSecretKey('1'.repeat(64), 0)), {useNanoPrefix: true});
const makeOrder = () => ({id: 'fixture-order', from: 'XNO', to: 'ALGO', payinAddress: deposit, payoutAddress: FUND, expectedAmountFrom: 0.7, expectedAmountTo: 1.4});

test('exact Nano amounts and live minimum/fee checks', () => {
  assert.equal(display(decimal('0.700000000000000000000000000001')), '0.700000000000000000000000000001');
  assert.throws(() => decimal('1e-3'));
  assert.throws(() => decimal('-1'));
  assert.equal(planQuote({min: 0.6171, max: 100}, {amountFrom: 0.647955, amountTo: 1.4}, decimal('0.8')).amount, decimal('0.647955'));
  assert.equal(planQuote({min: '0.59524', max: 100}, null, 0n).amount, decimal('0.625002'));
  assert.equal(planQuote({min: '0.00000001', max: 100}, null, 0n).amount, decimal('0.00000002'));
  assert.throws(() => planQuote({min: 0, max: 100}, null, 0n), /limits/);
  assert.throws(() => planQuote({min: 1, max: 100}, null, decimal('2')), /budget/);
  assert.throws(() => planQuote({min: 0.66666666, max: 100}, {amountFrom: 0.7, amountTo: 0.2}, decimal('0.8')), /setup/);
  assert.throws(() => planQuote({min: 0.66666666, max: 100}, {amountFrom: 0.8, amountTo: 1.4}, decimal('0.8')), /mismatch/);
});
test('swap output and deposit are validated before signing', () => {
  assert.equal(validateOrder(makeOrder(), decimal('0.7'), wallet.address).payoutAddress, FUND);
  assert.throws(() => validateOrder({...makeOrder(), payoutAddress: 'OTHER'}, decimal('0.7'), wallet.address), /destination/);
  assert.throws(() => validateOrder({...makeOrder(), payinAddress: wallet.address}, decimal('0.7'), wallet.address), /deposit/);
  assert.throws(() => validateOrder({...makeOrder(), payinAddress: wallet.address.replace('nano_','xrb_')}, decimal('0.7'), wallet.address), /deposit/);
  assert.throws(() => validateOrder({...makeOrder(), from: 'BTC'}, decimal('0.7'), wallet.address), /destination/);
});
test('wallet persists without replacement and rejects exposed state files', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'evolve-wallet-'));
  try {
    const a = await setupWallet(dir), b = await setupWallet(dir);
    assert.equal(a.address, b.address); assert.deepEqual(Object.keys(a), ['address']);
    assert.equal((await stat(join(dir, 'wallet.json'))).mode & 0o777, 0o600);
    await chmod(join(dir, 'wallet.json'), 0o644);
    await assert.rejects(setupWallet(dir), /0600/);
  } finally {await rm(dir, {recursive: true, force: true});}
});
test('pool HMAC matches an independently calculated fixture', () => {
  assert.equal(poolSignature('POST', '/v1/legacy-addresses/test/payments', '', '{"platform":"api"}', '1743460800000', 'test-secret'), '4cc4660fca08c716a761f08ebfb0c7a0dc5d330feb982324ffd385473e40ce03');
});
test('RPC client cannot import a seed or create a remote wallet', async () => {
  let called = false;
  const rpc = nanoClient(async () => {called = true;});
  await assert.rejects(rpc('wallet_create', {seed: wallet.seed}), /not allowed/);
  assert.equal(called, false);
});
test('a send accepted just before a network timeout is never paid twice', async () => {
  const state = {order: makeOrder()}; let journal = null, processCount = 0, accepted = false;
  const save = async s => {journal = structuredClone(s);};
  const rpc = async (action, data) => {
    if (action === 'active_difficulty') return {network_minimum: '0000000000000000'};
    if (action === 'block_info') return accepted ? {confirmed: 'true'} : {error: 'Block not found'};
    assert.equal(action, 'process'); processCount++;
    assert.equal(journal.pendingBlock.block.signature, data.block.signature, 'signed block was journaled before broadcast');
    assert.ok(nano.verifyBlock({hash: journal.pendingBlock.hash, signature: data.block.signature, publicKey: nano.derivePublicKey(secret)}));
    accepted = true; throw Error('transport timed out after node acceptance');
  };
  await assert.rejects(prepareBlock({wallet, account: {balance: String(decimal('0.8')), frontier: 'A'.repeat(64), representative: wallet.address}, balance: decimal('0.1'), link: deposit, subtype: 'send', state, save, rpc, work: async () => '0'.repeat(16)}), /timed out/);
  assert.ok(state.pendingBlock);
  assert.equal(await broadcastPending(state, save, rpc), true);
  assert.equal(processCount, 1); assert.ok(state.sendHash); assert.equal(state.pendingBlock, null);
  await assert.rejects(prepareBlock({wallet, account: {}, balance: 0, link: deposit, subtype: 'send', state, save, rpc, work: async () => ''}), /already been paid/);
});
test('pool cashout is requested once, including after ambiguous timeout', async () => {
  const state = {}; let requests = 0;
  const engine = new Settlement({wallet, state, save: async () => {}, stop: async () => {}, algo: async () => ({funded: false}),
    rpc: async action => action === 'account_info' ? {balance: '0'} : {blocks: {}},
    swap: async path => path.startsWith('/get-limits') ? {min: 0.66666666, max: 100} : {amountFrom: 0.7, amountTo: 1.4},
    poolStatus: async () => ({balance: '0.7'}), poolPayout: async () => {requests++; throw Error('timeout');}});
  await assert.rejects(engine.tick(), /timeout/);
  await engine.tick(); assert.equal(requests, 1); assert.equal(state.phase, 'waiting-for-nano');
});
test('an order with a substituted ALGO address is never funded', async () => {
  let broadcasts = 0;
  const state = {};
  const engine = new Settlement({wallet, state, save: async () => {}, stop: async () => {}, algo: async () => ({funded: false}),
    rpc: async action => {if (action === 'process') broadcasts++; return action === 'account_info' ? {balance: String(decimal('0.8')), frontier: 'A'.repeat(64)} : {blocks: {}};},
    swap: async path => path === '/get-limits' ? {min: 0.66666666, max: 100} : path === '/create-order' ? {...makeOrder(), payoutAddress: 'SUBSTITUTED'} : {amountFrom: 0.7, amountTo: 1.4}});
  await assert.rejects(engine.tick(), /destination/); assert.equal(broadcasts, 0);
  await assert.rejects(engine.tick(), /reconciliation/); assert.equal(broadcasts, 0);
});
test('a completed swap is not counted as wallet funding until ALGO arrives', async () => {
  const state = {order: makeOrder(), sendHash: 'B'.repeat(64)}; let funded = false, stopped = 0;
  const engine = new Settlement({wallet, state, save: async () => {}, stop: async () => {stopped++;}, algo: async () => ({funded}), swap: async () => ({...makeOrder(), status: 'completed'})});
  await engine.tick(); assert.equal(state.phase, 'waiting-for-algo'); assert.equal(stopped, 0);
  funded = true; await engine.tick(); assert.equal(state.phase, 'complete'); assert.equal(stopped, 1);
});
test('the signer rejects an amount larger than the saved one-time order', async () => {
  let calls = 0;
  await assert.rejects(prepareBlock({wallet, account:{balance:String(decimal('0.8'))}, balance:0, link:deposit, subtype:'send', state:{order:makeOrder()}, save:async()=>{}, rpc:async()=>{calls++;}, work:async()=>{calls++;}}), /amount exceeds/);
  assert.equal(calls,0);
});
test('confirmed Nano receipt, one swap payment and actual ALGO arrival complete the workflow', async () => {
  const state = {}; let frontier = null, balance = 0n, received = false, funded = false, orders = 0, sends = 0;
  const ledger = new Map();
  const rpc = async (action,data) => {
    if (action==='account_info') return frontier ? {frontier,balance:String(balance),representative:wallet.address} : {error:'Account not found'};
    if (action==='receivable') return {blocks:received ? {} : {['C'.repeat(64)]:{amount:String(decimal('0.7'))}}};
    if (action==='active_difficulty') return {network_minimum:'0000000000000000',network_receive_minimum:'0000000000000000'};
    if (action==='block_info') return ledger.get(data.hash) ?? {error:'Block not found'};
    assert.equal(action,'process');
    const hash=nano.hashBlock(data.block);
    assert.ok(nano.verifyBlock({hash,signature:data.block.signature,publicKey:nano.derivePublicKey(secret)}));
    assert.equal(nano.derivePublicKey(data.block.account),nano.derivePublicKey(wallet.address));
    if(data.subtype==='open'){assert.equal(data.block.previous,'0'.repeat(64));received=true;}
    if(data.subtype==='send'){assert.equal(data.block.link,nano.derivePublicKey(deposit));sends++;}
    balance=BigInt(data.block.balance);frontier=hash;ledger.set(hash,{confirmed:'true'});return {hash};
  };
  const engine=new Settlement({wallet,state,rpc,work:async()=> '0'.repeat(16),save:async()=>{},stop:async()=>{},algo:async()=>({funded}),swap:async path=>{
    if(path==='/get-limits')return {min:0.66666666,max:100};
    if(path==='/create-order'){orders++;return makeOrder();}
    if(path.startsWith('/get-order'))return {...makeOrder(),status:'completed'};
    return {amountFrom:0.7,amountTo:1.4};
  }});
  await engine.tick();assert.equal(received,true);assert.equal(balance,decimal('0.7'));
  await engine.tick();assert.equal(sends,1);assert.equal(orders,1);assert.equal(balance,0n);
  await engine.tick();assert.equal(state.phase,'waiting-for-algo');
  funded=true;await engine.tick();assert.equal(state.phase,'complete');
  await engine.tick();assert.equal(sends,1);assert.equal(orders,1);
});

test('a received cashout resumes mining if the live swap minimum rises', async () => {
  const state = {poolPayoutRequestedAt:'2026-11-17T00:00:00Z', payoutTargetNano:'0.6'};
  let starts = 0, requests = 0;
  const engine = new Settlement({wallet, state, save:async()=>{}, stop:async()=>{}, start:async()=>{starts++;}, algo:async()=>({funded:false}),
    rpc:async action=>action==='account_info' ? {balance:String(decimal('0.6'))} : {blocks:{}},
    swap:async path=>path==='/get-limits' ? {min:0.66666666,max:100} : {amountFrom:0.7,amountTo:1.4},
    poolStatus:async()=>({balance:'0.01'}), poolPayout:async()=>{requests++;}});
  await engine.tick();
  assert.equal(state.phase,'mining-nano'); assert.equal(starts,1); assert.equal(requests,0);
  assert.equal(state.poolPayoutRequestedAt,null);
});
