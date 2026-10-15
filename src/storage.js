// Bridge to the Rust side (saved data, Wikipedia downloads, opening links).
// Falls back to localStorage + direct fetch when opened in a plain browser.
(function () {
  const tauri = window.__TAURI__ && window.__TAURI__.core;
  const invoke = tauri ? tauri.invoke : null;
  const nativeFetch = window.fetch.bind(window);

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
    const r = await nativeFetch(url);
    if (!r.ok) throw new Error("http " + r.status);
    return r.text();
  }
  async function openExternal(url) {
    if (invoke) return invoke("open_external", { url });
    window.open(url, "_blank", "noopener");
  }
  async function quit() {
    if (invoke) return invoke("quit_app");
    window.close();
  }
  async function exportFile(suggestedName, text) {
    if (invoke) return invoke("canvas_export", { name: suggestedName, contents: text });
    const blob = new Blob([text], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = suggestedName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    return a.download;
  }
  async function importFile() {
    if (invoke) return invoke("canvas_import");
    return new Promise((resolve) => {
      const inp = document.createElement("input");
      inp.type = "file";
      inp.accept = ".json,application/json";
      inp.onchange = () => {
        const f = inp.files && inp.files[0];
        if (!f) return resolve(null);
        const r = new FileReader();
        r.onload = () => resolve({ name: f.name, contents: String(r.result) });
        r.onerror = () => resolve(null);
        r.readAsText(f);
      };
      inp.click();
    });
  }
  async function toggleFullscreen() {
    if (invoke) return invoke("toggle_fullscreen");
    try {
      if (document.fullscreenElement) { await document.exitFullscreen(); return false; }
      await document.documentElement.requestFullscreen();
      return true;
    } catch { return !!document.fullscreenElement; }
  }

  window.WCStore = { isTauri: !!invoke, kvAll, kvSet, kvRemove, wikiGet, openExternal, quit, exportFile, importFile, toggleFullscreen };
})();
