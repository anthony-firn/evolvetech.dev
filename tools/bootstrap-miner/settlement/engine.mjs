// SPDX-License-Identifier: GPL-3.0-or-later
import {decimal, display, planQuote, validateOrder, prepareBlock, broadcastPending, FUND} from './core.mjs';

export class Settlement {
  constructor(dependencies) {Object.assign(this, dependencies);}
  async tick() {
    const {state, save, rpc, swap, wallet} = this;
    const chain = await this.algo();
    if (chain.funded || chain.ready) {
      state.phase = 'complete'; state.message = 'ALGO received. Complete USDC opt-in in the existing owner wallet.';
      await save(state); await this.stop(); return;
    }
    if (state.phase === 'order-create-uncertain') throw Error('Order creation needs reconciliation before continuing');
    if (state.pendingBlock) {if (!await broadcastPending(state, save, rpc)) return;}
    if (state.sendHash) {
      const order = await swap('/get-order?id=' + encodeURIComponent(state.order.id));
      validateOrder(order, decimal(state.order.expectedAmountFrom), wallet.address);
      state.swapStatus = order.status; state.phase = 'waiting-for-algo';
      state.message = 'Swap funded; checking the actual ALGO donation wallet.';
      await save(state); return;
    }

    let account = await rpc('account_info', {account: wallet.address, representative: 'true', include_confirmed: 'true'});
    if (account.error) {
      if (!/account not found/i.test(account.error)) throw Error('Nano account lookup failed');
      account = {balance: '0'};
    }
    const pending = await rpc('receivable', {account: wallet.address, count: '8', threshold: '1000000000000000000000000', source: 'true', include_only_confirmed: 'true'});
    if (pending.error) throw Error('Nano receivable lookup failed');
    const entries = Object.entries(pending.blocks || {});
    if (entries.length) {
      const [hash, receipt] = entries[0];
      if (!/^[A-Fa-f0-9]{64}$/.test(hash) || !/^\d+$/.test(receipt.amount ?? receipt)) throw Error('Malformed Nano receipt');
      const amount = BigInt(receipt.amount ?? receipt);
      if (amount <= 0n) throw Error('Invalid Nano receipt amount');
      state.phase = 'receiving-nano'; await save(state);
      await prepareBlock({wallet, account, balance: BigInt(account.balance) + amount, link: hash, subtype: account.frontier ? 'receive' : 'open', state, save, rpc, work: this.work});
      return;
    }

    const limits = await swap('/get-limits');
    const plan = planQuote(limits, null, account.balance);
    const amount = display(plan.amount);
    const quote = await swap('/get-estimate?amount=' + encodeURIComponent(amount));
    planQuote(limits, quote, account.balance);
    state.targetNano = amount; state.quotedAlgo = String(quote.amountTo); state.walletNano = display(account.balance);
    if (plan.funded) {
      await this.stop();
      if (!state.order) {
        // A timeout may have created an order. Do not silently repeat this POST.
        state.phase = 'order-create-uncertain'; state.message = 'Creating the one-time Nano-to-ALGO order.'; await save(state);
        let order;
        try {order = await swap('/create-order', {from: 'XNO', to: 'ALGO', amount: Number(amount), toAddress: FUND});}
        catch (error) {if (error.definitivelyRejected) {state.phase = 'order-rejected'; await save(state);} throw error;}
        validateOrder(order, plan.amount, wallet.address);
        state.order = order; state.phase = 'order-created'; await save(state);
      } else validateOrder(state.order, plan.amount, wallet.address);
      if (!account.frontier) throw Error('Funded Nano account has no frontier');
      await prepareBlock({wallet, account, balance: BigInt(account.balance) - plan.amount, link: state.order.payinAddress, subtype: 'send', state, save, rpc, work: this.work});
      return;
    }

    // A higher minimum after a received cashout needs only the shortfall.
    // An ambiguous or unreceived payout stays latched.
    if (state.poolPayoutRequestedAt && state.payoutTargetNano &&
        BigInt(account.balance) >= decimal(state.payoutTargetNano)) {
      state.poolPayoutRequestedAt = null; state.payoutTargetNano = null;
      await save(state);
    }
    if (state.poolPayoutRequestedAt) {
      await this.stop(); state.phase = 'waiting-for-nano';
      state.message = 'Mining stopped; waiting for the previously requested Nano payout.';
      await save(state); return;
    }

    const pool = await this.poolStatus();
    state.poolNano = String(pool.balance_payable ?? pool.balance ?? '0');
    if (decimal(state.poolNano) + BigInt(account.balance) >= plan.amount) {
      await this.stop();
      if (!state.poolPayoutRequestedAt) {
        state.payoutTargetNano = amount;
        state.poolPayoutRequestedAt = new Date().toISOString(); state.phase = 'pool-payout-requested';
        state.message = 'Requesting the mined Nano payout into the local transit wallet.'; await save(state);
        try {await this.poolPayout();}
        catch (error) {if (error.definitivelyRejected) {state.poolPayoutRequestedAt = null; await save(state);} throw error;}
      }
      state.phase = 'waiting-for-nano'; state.message = 'Mining stopped; waiting for the requested Nano payout.';
    } else {
      state.phase = 'mining-nano'; state.message = 'Accumulating the live swap minimum for wallet initialization.';
      if (this.start) await this.start();
    }
    await save(state);
  }
}
