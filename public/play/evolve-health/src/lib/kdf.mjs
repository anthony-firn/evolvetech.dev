// Argon2id key stretching. In the browser the WebAssembly runs in a short-lived worker so the page
// stays responsive and the 64 MiB work area is released afterwards; under Node it runs inline.
import { scriptURL } from './tt.mjs';

export const ACCOUNT_KDF = Object.freeze({ alg: 'argon2id', m: 65536, t: 3, p: 1 });
export const PIN_KDF = Object.freeze({ alg: 'argon2id', m: 19456, t: 2, p: 1 });
const WASM_URL = new URL('./argon2.wasm', import.meta.url);

let modulePromise;
async function wasmModule() {
  modulePromise ??= (async () => {
    if (globalThis.process?.versions?.node && WASM_URL.protocol === 'file:') {
      const { readFile } = await import('node:fs/promises');
      return WebAssembly.compile(await readFile(WASM_URL));
    }
    const res = await fetch(WASM_URL);
    if (!res.ok) throw new Error(`Could not load the key-stretching engine (${res.status})`);
    return WebAssembly.compile(await res.arrayBuffer());
  })();
  return modulePromise;
}

/** Run Argon2id in this thread. `secret` and `ad` are optional RFC 9106 inputs. */
export async function argon2idInline(password, salt, params, outLen = 32, secret = new Uint8Array(), ad = new Uint8Array()) {
  const instance = await WebAssembly.instantiate(await wasmModule(), {});
  const { memory, eh_alloc: alloc, eh_free: free, eh_argon2id: run } = instance.exports;
  const bufs = [];
  const put = (bytes) => {
    const ptr = alloc(bytes.length);
    new Uint8Array(memory.buffer, ptr, bytes.length).set(bytes);
    bufs.push([ptr, bytes.length]);
    return ptr;
  };
  try {
    const pw = put(password), sa = put(salt), se = put(secret), a = put(ad);
    const out = alloc(outLen);
    bufs.push([out, outLen]);
    const code = run(pw, password.length, sa, salt.length, se, secret.length, a, ad.length, params.m, params.t, params.p, out, outLen);
    if (code !== 0) throw new Error(`Argon2id failed (${code})`);
    return new Uint8Array(memory.buffer, out, outLen).slice();
  } finally {
    for (const [ptr, len] of bufs) free(ptr, len);
  }
}

/** Argon2id, off the main thread when a Worker is available. */
export async function argon2id(password, salt, params, outLen = 32) {
  if (typeof Worker === 'undefined' || typeof window === 'undefined') return argon2idInline(password, salt, params, outLen);
  const worker = new Worker(scriptURL(new URL('./kdf-worker.mjs', import.meta.url).href), { type: 'module' });
  try {
    return await new Promise((resolve, reject) => {
      worker.onmessage = (e) => (e.data.error ? reject(new Error(e.data.error)) : resolve(e.data.key));
      worker.onerror = (e) => reject(new Error(e.message || 'Key-stretching worker failed'));
      worker.postMessage({ password, salt, params, outLen });
    });
  } finally {
    worker.terminate();
  }
}
