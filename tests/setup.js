// Polyfills minimaux pour jsdom
if (typeof globalThis.crypto?.randomUUID !== 'function') {
  let n = 0;
  globalThis.crypto = { ...(globalThis.crypto || {}), randomUUID: () => `id-${++n}-${Math.random().toString(36).slice(2)}` };
}
if (typeof window !== 'undefined') {
  window.scrollTo = () => {};
}
