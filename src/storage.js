// Bridge to the Rust side (saved data, Wikipedia downloads, opening links).
// Falls back to localStorage + direct fetch when opened in a plain browser.
(function () {
  const tauri = window.__TAURI__ && window.__TAURI__.core;
  const invoke = tauri ? tauri.invoke : null;

  async function kvAll() {
    if (invoke) return invoke("kv_all");
    const out = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      try { out[k] = JSON.parse(localStorage.getItem(k)); } catch { /* skip */ }
    }
    return out;
  }
  async function kvSet(key, value) {
    if (invoke) return invoke("kv_set", { key, value });
    localStorage.setItem(key, JSON.stringify(value));
  }
  async function kvRemove(key) {
    if (invoke) return invoke("kv_remove", { key });
    localStorage.removeItem(key);
  }
  async function wikiGet(url) {
    if (invoke) return invoke("wiki_get", { url });
    const r = await fetch(url);
    if (!r.ok) throw new Error("http " + r.status);
    return r.text();
  }
  async function openExternal(url) {
    if (invoke) return invoke("open_external", { url });
    window.open(url, "_blank", "noopener");
  }

  window.WCStore = { isTauri: !!invoke, kvAll, kvSet, kvRemove, wikiGet, openExternal };
})();
