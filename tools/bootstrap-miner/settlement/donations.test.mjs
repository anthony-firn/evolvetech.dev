// SPDX-License-Identifier: GPL-3.0-or-later
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import nano from 'nanocurrency';
import {FUND} from './core.mjs';
import {Settlement} from './engine.mjs';
import {donationMode, confirmDonation, archiveDonation} from './donations.mjs';

const address = seed => nano.deriveAddress(nano.derivePublicKey(nano.deriveSecretKey(seed.repeat(64),0)),{useNanoPrefix:true});
const wallet = {address: address('0')}, deposit = address('1');
const makeOrder = () => ({id:'fixture-order',from:'XNO',to:'ALGO',payinAddress:deposit,payoutAddress:FUND,expectedAmountFrom:0.7,expectedAmountTo:1.4});

test('ongoing mode requires the fixed recipient, transit wallet and one-Nano cap', () => {
  const config={mode:'donations',recipient:FUND,nanoAddress:wallet.address,maxNano:'1'};
  assert.equal(donationMode(null,wallet.address),false);
  assert.equal(donationMode(config,wallet.address),true);
  for(const change of [{recipient:deposit},{nanoAddress:deposit},{maxNano:'2'},{mode:'bootstrap'}])
    assert.throws(()=>donationMode({...config,...change},wallet.address),/configuration/);
});

test('receipts require the actual mainnet payment, recipient and exact amount', async () => {
  const id='D'.repeat(52), order={status:'completed',payoutHash:id,amountTo:1.4,createdAt:'2026-11-18T05:00:00Z'};
  const tx={id,'tx-type':'pay','genesis-hash':'wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=','confirmed-round':42,'round-time':Math.floor(Date.parse(order.createdAt)/1000)+60,'payment-transaction':{receiver:FUND,amount:1400000}};
  const request=async()=>({transaction:structuredClone(tx)});
  assert.deepEqual(await confirmDonation(order,request),{txid:id,microAlgo:'1400000',round:42});
  assert.equal(await confirmDonation({...order,status:'exchanging'},request),null);
  assert.equal(await confirmDonation(order,async()=>{throw Object.assign(Error('not indexed'),{status:404});}),null);
  assert.equal(await confirmDonation(order,async()=>({transaction:{...tx,'confirmed-round':0}})),null);
  for(const change of [{'genesis-hash':'testnet'},{id:'E'.repeat(52)},{'tx-type':'axfer'},{'round-time':1},
      {'payment-transaction':{receiver:deposit,amount:1400000}}, {'payment-transaction':{receiver:FUND,amount:1400001}}])
    await assert.rejects(confirmDonation(order,async()=>({transaction:{...tx,...change}})),/payout/);
});

test('ongoing mining proceeds for a ready wallet but stops if USDC readiness is lost', async () => {
  const state={mode:'donations'};let ready=true,starts=0,stops=0;
  const engine=new Settlement({state,wallet,donationMode:true,save:async()=>{},algo:async()=>({ready,funded:true}),start:async()=>{starts++;},stop:async()=>{stops++;},
    rpc:async action=>action==='account_info'?{balance:'0'}:{blocks:{}},
    swap:async path=>path==='/get-limits'?{min:0.66666666,max:100}:{amountFrom:0.7,amountTo:1.4},poolStatus:async()=>({balance:'0.1'})});
  await engine.tick();assert.equal(state.phase,'mining-nano');assert.equal(starts,1);assert.equal(stops,0);
  ready=false;await assert.rejects(engine.tick(),/USDC-ready/);assert.equal(stops,1);
});

test('a batch clears payment state only after confirmed payout and durable receipt', async () => {
  const hash='B'.repeat(64),id='D'.repeat(52),state={mode:'donations',batchNumber:1,completedBatches:0,totalDonatedMicroAlgo:'0',sendHash:hash,order:makeOrder()};
  let indexed=false,failArchive=true,archived=0,starts=0;
  const engine=new Settlement({state,wallet,donationMode:true,save:async()=>{},algo:async()=>({ready:true,funded:true}),stop:async()=>{},start:async()=>{starts++;},
    rpc:async action=>action==='account_info'?{balance:'0'}:{blocks:{}},poolStatus:async()=>({balance:'0'}),
    swap:async path=>path.startsWith('/get-order')?{...makeOrder(),status:'completed',payinHash:hash,payoutHash:id}:path==='/get-limits'?{min:0.66666666,max:100}:{amountFrom:0.7,amountTo:1.4},
    confirmPayout:async()=>indexed?{txid:id,microAlgo:'1400000',round:42}:null,
    archive:async()=>{if(failArchive)throw Error('disk full');archived++;}});
  await engine.tick();assert.equal(state.sendHash,hash);assert.equal(state.phase,'waiting-for-algo');assert.equal(archived,0);
  indexed=true;await assert.rejects(engine.tick(),/disk full/);assert.equal(state.sendHash,hash);assert.equal(state.completedBatches,0);
  failArchive=false;await engine.tick();assert.equal(state.sendHash,undefined);assert.equal(state.batchNumber,2);
  assert.equal(state.completedBatches,1);assert.equal(state.totalDonatedMicroAlgo,'1400000');assert.equal(archived,1);
  await engine.tick();assert.equal(state.phase,'mining-nano');assert.equal(starts,1);assert.equal(state.completedBatches,1);
});

test('a payout transaction cannot be reused as a receipt for another batch', async () => {
  const dir=await mkdtemp(join(tmpdir(),'evolve-receipts-'));
  try {
    const record={order:makeOrder(),sendHash:'B'.repeat(64),receipt:{txid:'D'.repeat(52),microAlgo:'1400000',round:42}};
    await archiveDonation(dir,record);await archiveDonation(dir,record);
    await assert.rejects(archiveDonation(dir,{...record,order:{...record.order,id:'other-order'}}),/already used/);
  } finally {await rm(dir,{recursive:true,force:true});}
});
