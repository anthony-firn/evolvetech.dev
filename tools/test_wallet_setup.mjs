import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkoutState, fundCanReceive } from '../public/assets/v2/wallet-setup.js';
test('checkout is offered only for explicitly configured production Meld routes', () => {
  for (const value of [null, {}, { ramp: true }, { provider: 'meld', ramp: true, environment: 'sandbox', sell: true }, { provider: 'other', ramp: true, environment: 'production' }]) assert.deepEqual(checkoutState(value), { buy: false, sell: false });
  assert.deepEqual(checkoutState({ provider: 'meld', ramp: true, sell: false, environment: 'production' }), { buy: true, sell: false });
  assert.deepEqual(checkoutState({ provider: 'meld', ramp: true, sell: true, environment: 'production' }), { buy: true, sell: true });
});
test('fund readiness requires an existing, unfrozen native USDC holding', () => {
  for (const value of [null, {}, { assets: [] }, { assets: [{ 'asset-id': 31566704 }] }, { assets: [{ 'asset-id': 123, 'is-frozen': false }] }, { assets: [{ 'asset-id': 31566704, 'is-frozen': true }] }, { assets: [{ 'asset-id': 31566704, deleted: true, 'is-frozen': false }] }]) assert.equal(fundCanReceive(value), false);
  assert.equal(fundCanReceive({ assets: [{ 'asset-id': 31566704, amount: 0, 'is-frozen': false }] }), true);
});
