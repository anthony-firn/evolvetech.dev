export function checkoutState(value) {
  const production = value?.provider === 'meld' && value?.environment === 'production';
  return { buy: production && value.ramp === true, sell: production && value.ramp === true && value.sell === true };
}
export function fundCanReceive(value) {
  return Array.isArray(value?.assets) && value.assets.some(a => a?.['asset-id'] === 31566704 && !a.deleted && a['is-frozen'] === false);
}
async function readJSON(url) {
  const response = await fetch(url, { credentials: 'omit', cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error('Public status unavailable.');
  const body = response.body.getReader(), chunks = []; let size = 0;
  try { while (true) { const { value, done } = await body.read(); if (done) break; size += value.length; if (size > 32_000) throw Error('Status response exceeds limit.'); chunks.push(value); } }
  finally { await body.cancel().catch(() => {}); }
  const bytes = new Uint8Array(size); let at = 0; for (const chunk of chunks) { bytes.set(chunk, at); at += chunk.length; }
  return JSON.parse(new TextDecoder().decode(bytes));
}
if (globalThis.document) {
  const storageKey = 'evolvetech.wallet-setup.checklist.v1';
  const boxes = [...document.querySelectorAll('[data-step]')];
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(storageKey) || '{}') || {}; } catch {}
  for (const box of boxes) box.checked = saved[box.dataset.step] === true;
  const update = () => {
    document.getElementById('progress').textContent = `${boxes.filter(b => b.checked).length} of ${boxes.length} steps checked`;
    try { localStorage.setItem(storageKey, JSON.stringify(Object.fromEntries(boxes.map(b => [b.dataset.step, b.checked])))); } catch {}
  };
  for (const box of boxes) box.addEventListener('change', update);
  update();
  const button = document.getElementById('check-readiness');
  button.addEventListener('click', async () => {
    button.disabled = true;
    const checkout = document.getElementById('checkout-status'), fund = document.getElementById('fund-status');
    checkout.textContent = 'Checking card/bank configuration…'; fund.textContent = 'Checking the public receiving fund…';
    const address = document.getElementById('fund-address').textContent.trim();
    await Promise.allSettled([
      readJSON('/fairground/wallet/config').then(value => {
        const state = checkoutState(value);
        checkout.textContent = state.buy ? `Card checkout is configured. ${state.sell ? 'Bank cash-out is configured too.' : 'Bank cash-out is not configured.'} Your provider determines eligibility and fees.` : 'Card/bank checkout is not available here yet. Follow the ALGO transfer steps above.';
      }, () => { checkout.textContent = 'Card/bank configuration could not be verified. Use the ALGO transfer instructions; do not assume checkout is available.'; }),
      readJSON(`https://mainnet-idx.4160.nodely.dev/v2/accounts/${address}/assets?asset-id=31566704`).then(value => {
        fund.textContent = fundCanReceive(value) ? 'The shared fund can receive native USDC on Algorand. This checks the recipient, not your own wallet.' : 'The shared fund cannot receive USDC yet. Its owner must finish wallet setup; visitor donations stay gated.';
      }, () => { fund.textContent = 'Fund readiness could not be verified. Check again later; an unavailable status is not proof that setup failed.'; }),
    ]);
    button.disabled = false;
  });
}
