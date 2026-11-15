// Trusted Types: the pages enforce `require-trusted-types-for 'script'`, so the only way to load
// script is through this policy, which accepts same-origin URLs only. The app never uses innerHTML.
let policy;

export function scriptURL(url) {
  const resolved = new URL(url, globalThis.location?.href).href;
  if (!globalThis.trustedTypes) return resolved;
  policy ??= globalThis.trustedTypes.createPolicy('evolve-health', {
    createScriptURL(value) {
      const parsed = new URL(value, location.href);
      if (parsed.origin !== location.origin) throw new TypeError(`Blocked cross-origin script ${parsed.origin}`);
      return parsed.href;
    },
  });
  return policy.createScriptURL(resolved);
}
