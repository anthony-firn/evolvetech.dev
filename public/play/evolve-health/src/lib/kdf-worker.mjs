import { argon2idInline } from './kdf.mjs';

self.onmessage = async ({ data }) => {
  try {
    const key = await argon2idInline(data.password, data.salt, data.params, data.outLen);
    self.postMessage({ key }, [key.buffer]);
  } catch (err) {
    self.postMessage({ error: String(err?.message || err) });
  }
};
