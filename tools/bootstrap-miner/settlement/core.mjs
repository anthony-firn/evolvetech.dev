// SPDX-License-Identifier: GPL-3.0-or-later
import {randomBytes, createHash, createHmac} from 'node:crypto';
import {mkdir, open, readFile, rename, lstat} from 'node:fs/promises';
import {join} from 'node:path';
import nano from 'nanocurrency';
import {FUND} from '../protocol.mjs';

export {FUND};
export const RAW = 10n ** 30n;
export const MIN_ALGO_OUT = 300000n;
export const MAX_NANO = RAW;
export const DEFAULT_TARGET = 7n * RAW / 10n;
export const RPC_URL = 'https://rpc.nano.to';
export const SWAP_URL = 'https://api.nanswap.com/v1';
export const POOL_URL = 'https://api.unmineable.dev/v1';

export function decimal(value, places = 30) {
  const text = String(value);
  if (!/^\d+(\.\d+)?$/.test(text)) throw Error('Invalid decimal amount');
  const [whole, fraction = ''] = text.split('.');
  if (fraction.length > places) throw Error('Amount has excessive precision');
  return BigInt(whole) * 10n ** BigInt(places) + BigInt(fraction.padEnd(places, '0') || '0');
}
export function display(value, places = 30) {
  const n = BigInt(value), scale = 10n ** BigInt(places);
  if (n < 0n) throw Error('Negative balance');
  const tail = String(n % scale).padStart(places, '0').replace(/0+$/, '');
  return String(n / scale) + (tail ? '.' + tail : '');
}
export function planQuote(limits, quote, available) {
  const min = decimal(limits.min), max = decimal(limits.max);
  // 5% above the live minimum, rounded upward to eight Nano decimals.
  const quantum = 10n ** 22n;
  const padded = ((min * 105n / 100n + quantum - 1n) / quantum) * quantum;
  const amount = padded > DEFAULT_TARGET ? padded : DEFAULT_TARGET;
  if (amount > MAX_NANO || amount > max) throw Error('Swap minimum exceeds the one-Nano bootstrap budget');
  if (quote) {
    if (quote.error || (quote.from && quote.from !== 'XNO') || (quote.to && quote.to !== 'ALGO')) throw Error('Unexpected swap quote');
    if (decimal(quote.amountFrom) !== amount) throw Error('Quote amount mismatch');
    if (decimal(quote.amountTo, 6) < MIN_ALGO_OUT) throw Error('Quote does not cover wallet setup');
  }
  return {amount, funded: BigInt(available) >= amount};
}
export function validateOrder(order, amount, walletAddress) {
  if (!order || !/^[A-Za-z0-9_-]{4,100}$/.test(order.id ?? '') || order.from !== 'XNO' || order.to !== 'ALGO' || order.payoutAddress !== FUND) throw Error('Swap order destination mismatch');
  if (!nano.checkAddress(order.payinAddress) || nano.derivePublicKey(order.payinAddress) === nano.derivePublicKey(walletAddress) || nano.derivePublicKey(order.payinAddress) === '0'.repeat(64)) throw Error('Invalid swap deposit address');
  if (decimal(order.expectedAmountFrom) !== amount || decimal(order.expectedAmountTo, 6) < MIN_ALGO_OUT) throw Error('Swap order amount mismatch');
  return order;
}
export async function privateDirectory(dir) {
  await mkdir(dir, {recursive: true, mode: 0o700});
  const stat = await lstat(dir);
  if (!stat.isDirectory() || stat.isSymbolicLink() || stat.uid !== process.getuid() || (stat.mode & 0o077)) throw Error('Settlement directory must be owned by you with mode 0700');
}
export async function writeJSON(path, value) {
  const temporary = path + '.' + randomBytes(8).toString('hex') + '.tmp';
  const file = await open(temporary, 'wx', 0o600);
  try {await file.writeFile(JSON.stringify(value, null, 2) + '\n'); await file.sync();} finally {await file.close();}
  await rename(temporary, path);
}
export async function readJSON(path, fallback) {
  try {
    const stat = await lstat(path);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.uid !== process.getuid() || (stat.mode & 0o077)) throw Error('State/credential file must have mode 0600 and belong to you');
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {if (error.code === 'ENOENT' && fallback !== undefined) return fallback; throw error;}
}
export async function setupWallet(dir) {
  await privateDirectory(dir);
  const path = join(dir, 'wallet.json');
  let wallet = await readJSON(path, null);
  if (!wallet) {
    const seed = randomBytes(32).toString('hex').toUpperCase();
    const secret = nano.deriveSecretKey(seed, 0);
    wallet = {seed, index: 0, address: nano.deriveAddress(nano.derivePublicKey(secret), {useNanoPrefix: true})};
    // Never replace a pre-existing wallet, including during concurrent setup.
    const file = await open(path, 'wx', 0o600);
    try {await file.writeFile(JSON.stringify(wallet, null, 2) + '\n'); await file.sync();} finally {await file.close();}
  }
  const secret = nano.deriveSecretKey(wallet.seed, wallet.index);
  if (nano.deriveAddress(nano.derivePublicKey(secret), {useNanoPrefix: true}) !== wallet.address) throw Error('Wallet address failed its derivation check');
  await writeJSON(join(dir, 'public.json'), {nanoAddress: wallet.address, algoAddress: FUND, maxNano: display(MAX_NANO), targetNano: display(DEFAULT_TARGET)});
  return {address: wallet.address};
}

export async function requestJSON(url, options = {}) {
  const response = await fetch(url, {...options, redirect: 'error', signal: AbortSignal.timeout(20000)});
  if (!response.ok) {const error = Error(`${new URL(url).hostname} returned HTTP ${response.status}`); error.status = response.status; error.definitivelyRejected = response.status >= 400 && response.status < 500; throw error;}
  const reader = response.body.getReader(); let length = 0; const chunks = [];
  while (true) {const {value, done} = await reader.read(); if (done) break; length += value.length; if (length > 512 * 1024) {await reader.cancel(); throw Error('Service response too large');} chunks.push(value);}
  try {return JSON.parse(Buffer.concat(chunks).toString('utf8'));}
  catch {throw Error('Invalid JSON response from ' + new URL(url).hostname);}
}
export function poolSignature(method, path, query, body, timestamp, secret) {
  const payload = [method, path, query, timestamp, createHash('sha256').update(body).digest('hex')].join('\n');
  return createHmac('sha256', secret).update(payload).digest('hex');
}
export function poolClient(credentials, request = requestJSON) {
  return async (method, path, data) => {
    const body = data === undefined ? '' : JSON.stringify(data), timestamp = String(Date.now());
    const fullPath = '/v1' + path;
    const value = await request(POOL_URL + path, {method, headers: {'content-type': 'application/json', 'x-user-api-key': credentials.unmineableKey, 'x-user-api-timestamp': timestamp, 'x-user-api-signature': poolSignature(method, fullPath, '', body, timestamp, credentials.unmineableSecret)}, ...(body ? {body} : {})});
    if (value.success === false || value.error) {const error = Error('Pool rejected the authenticated request'); error.definitivelyRejected = true; throw error;}
    return value.data ?? value;
  };
}
export function swapClient(key, request = requestJSON) {
  return async (path, data) => {
    const url = new URL(SWAP_URL + path);
    if (!data) {url.searchParams.set('from', 'XNO'); url.searchParams.set('to', 'ALGO');}
    const options = {headers: {'content-type': 'application/json', ...(key ? {'nanswap-api-key': key} : {})}};
    if (data) {options.method = 'POST'; options.body = JSON.stringify(data);}
    const value = await request(url, options);
    if (value.error) {const error = Error('Swap service rejected the request'); error.definitivelyRejected = true; throw error;}
    return value;
  };
}
export function nanoClient(request = requestJSON) {
  const allowed = new Set(['version', 'account_info', 'account_balance', 'receivable', 'block_info', 'blocks_info', 'active_difficulty', 'work_generate', 'process']);
  return async (action, data = {}) => {
    if (!allowed.has(action)) throw Error('RPC action not allowed');
    return request(RPC_URL, {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({action, ...data})});
  };
}

// The journal is persisted BEFORE broadcasting. Repeating a prepared block only
// republishes the same hash; it never signs a second payment after a timeout.
export async function broadcastPending(state, save, rpc) {
  const pending = state.pendingBlock;
  if (!pending) return;
  const known = await rpc('block_info', {hash: pending.hash, json_block: 'true'});
  if (known.error) {
    const result = await rpc('process', {json_block: 'true', subtype: pending.subtype, block: pending.block});
    if (result.error && !/already|old block/i.test(result.error)) throw Error('Nano node rejected the prepared block');
    if (result.hash && result.hash.toUpperCase() !== pending.hash.toUpperCase()) throw Error('Nano node returned a different block hash');
  }
  const confirmed = await rpc('block_info', {hash: pending.hash, json_block: 'true'});
  if (confirmed.error || !['true', true].includes(confirmed.confirmed)) return false;
  if (pending.subtype === 'send') {state.sendHash = pending.hash; state.phase = 'swap-funded';}
  state.pendingBlock = null; await save(state);
  return true;
}
export async function prepareBlock({wallet, account, balance, link, subtype, state, save, rpc, work}) {
  if (state.pendingBlock) throw Error('A previous block still needs confirmation');
  if (!['send', 'receive', 'open'].includes(subtype)) throw Error('Unsupported bootstrap block type');
  if (subtype === 'send' && state.sendHash) throw Error('This bootstrap swap has already been paid');
  if (subtype === 'send' && (!state.order || link !== state.order.payinAddress)) throw Error('Send destination differs from saved swap order');
  if (subtype === 'send') {
    const amount = decimal(state.order.expectedAmountFrom);
    validateOrder(state.order, amount, wallet.address);
    if (amount > MAX_NANO || amount <= 0n || BigInt(balance) !== BigInt(account.balance) - amount) throw Error('Send amount exceeds the saved bootstrap order');
  }
  const secret = nano.deriveSecretKey(wallet.seed, wallet.index);
  const publicKey = nano.derivePublicKey(secret);
  const previous = account.frontier ?? null;
  const representative = account.representative ?? wallet.address;
  const root = previous ?? publicKey;
  const difficulty = await rpc('active_difficulty');
  const threshold = subtype === 'send' ? (difficulty.network_minimum ?? 'fffffff800000000') : (difficulty.network_receive_minimum ?? 'fffffe0000000000');
  if (!/^[a-fA-F0-9]{16}$/.test(threshold)) throw Error('Invalid work threshold');
  const proof = await work(root, threshold);
  if (!nano.validateWork({blockHash: root, work: proof, threshold})) throw Error('Nano proof-of-work verification failed');
  const block = nano.createBlock(secret, {previous, representative, balance: String(balance), link, work: proof});
  if (!nano.verifyBlock({hash: block.hash, signature: block.block.signature, publicKey})) throw Error('Nano block signature verification failed');
  state.pendingBlock = {...block, subtype}; await save(state);
  return broadcastPending(state, save, rpc);
}
