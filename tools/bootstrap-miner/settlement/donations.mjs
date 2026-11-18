// SPDX-License-Identifier: GPL-3.0-or-later
import {FUND, MIN_ALGO_OUT, decimal, requestJSON, readJSON, writeJSON, privateDirectory} from './core.mjs';
import {join} from 'node:path';

export function donationMode(config, address) {
  if (config == null) return false;
  if (config.mode !== 'donations' || config.recipient !== FUND || config.nanoAddress !== address || config.maxNano !== '1') throw Error('Invalid ongoing donation configuration');
  return true;
}

export async function confirmDonation(order, request = requestJSON) {
  if (order.status !== 'completed') return null;
  if (!/^[A-Z2-7]{52}$/.test(order.payoutHash ?? '')) throw Error('Completed swap has no valid ALGO payout transaction');
  let value;
  try {value = await request('https://mainnet-idx.algonode.cloud/v2/transactions/' + order.payoutHash);}
  catch (error) {if (error.status === 404) return null; throw error;}
  const tx = value.transaction;
  if (!tx || !Number.isSafeInteger(tx['confirmed-round']) || tx['confirmed-round'] <= 0) return null;
  const pay = tx['payment-transaction'];
  if (tx.id !== order.payoutHash || tx['tx-type'] !== 'pay' || tx['genesis-hash'] !== 'wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=' || pay?.receiver !== FUND || !Number.isSafeInteger(pay.amount) || pay.amount < 0) throw Error('Donation payout transaction does not match the fixed mainnet recipient');
  if (BigInt(pay.amount) < MIN_ALGO_OUT || BigInt(pay.amount) !== decimal(order.amountTo, 6)) throw Error('Donation payout amount differs from the completed swap');
  return {txid: tx.id, microAlgo: String(pay.amount), round: tx['confirmed-round']};
}

export async function archiveDonation(dir, record) {
  if (!/^[A-Z2-7]{52}$/.test(record.receipt?.txid ?? '')) throw Error('Invalid donation receipt ID');
  await privateDirectory(dir);
  const path = join(dir, record.receipt.txid + '.json');
  const previous = await readJSON(path, null);
  if (previous) {
    if (previous.order.id !== record.order.id || previous.sendHash !== record.sendHash || previous.receipt.microAlgo !== record.receipt.microAlgo) throw Error('ALGO payout receipt was already used for a different batch');
    return;
  }
  await writeJSON(path, record);
}
