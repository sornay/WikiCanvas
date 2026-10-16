// Desktop shims for the ported extension (src/ext.js):
//  - window.WC_PAGE defaults { lang, title }
//  - chrome.storage.local backed by the Rust kv store (keys encoded: ':' and '/' are
//    illegal in Windows filenames, and titles may contain both)
//  - fetch() for *.wikipedia.org routed through the cached Rust wiki_get (offline + CSP)
//  - wcConfirm(): styled dialog (native confirm is unreliable in a WebView)
(function () {
  'use strict';

  window.WC_PAGE = window.WC_PAGE || { lang: 'en', title: '' };
  const S = window.WCStore;

  // ---------- chrome.storage shim ----------
  const listeners = new Set();
  function emit(changes) { listeners.forEach((fn) => { try { fn(changes, 'local'); } catch { /* ignore */ } }); }

  // base64url of the UTF-8 bytes; safe for the Rust key rules and Windows filenames
  const encKey = (k) => 'wck_' + btoa(unescape(encodeURIComponent(k)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const decKey = (ek) => {
    if (typeof ek !== 'string' || !ek.startsWith('wck_')) return ek;
    let s = ek.slice(4).replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    try { return decodeURIComponent(escape(atob(s))); } catch { return ek; }
  };
  const decodeAll = (all) => {
    const o = {};
    Object.keys(all || {}).forEach((ek) => { o[decKey(ek)] = all[ek]; });
    return o;
  };

  function storageGet(keys, cb) {
    const done = (obj) => { try { cb(obj); } catch (e) { setTimeout(() => { throw e; }); } };
    const fallback = () => {
      if (keys == null) return done({});
      if (typeof keys === 'string') return done({});
      if (Array.isArray(keys)) { const o = {}; keys.forEach((k) => { o[k] = undefined; }); return done(o); }
      done(Object.assign({}, keys));
    };
    S.kvAll().then((all) => {
      const flat = decodeAll(all);
      if (keys == null) return done(flat);
      if (typeof keys === 'string') return done({ [keys]: flat[keys] });
      if (Array.isArray(keys)) { const o = {}; keys.forEach((k) => { o[k] = flat[k]; }); return done(o); }
      const o = {};
      Object.keys(keys).forEach((k) => { o[k] = (k in flat) ? flat[k] : keys[k]; });
      done(o);
    }).catch(fallback);
  }
  function storageSet(obj, cb) {
    Promise.all(Object.keys(obj).map((k) => S.kvSet(encKey(k), obj[k]))).then(() => {
      const changes = {};
      Object.keys(obj).forEach((k) => { changes[k] = { newValue: obj[k] }; });
      emit(changes);
      if (cb) cb();
    }).catch(() => { if (cb) cb(); });
  }
  function storageRemove(keys, cb) {
    (Array.isArray(keys) ? keys : [keys]).forEach((k) => S.kvRemove(encKey(k)).catch(() => {}));
    if (cb) setTimeout(cb, 0);
  }

  window.chrome = window.chrome || {};
  window.chrome.storage = window.chrome.storage || {};
  window.chrome.storage.local = { get: storageGet, set: storageSet, remove: storageRemove };
  window.chrome.storage.onChanged = { addListener: (fn) => listeners.add(fn) };

  // ---------- fetch shim: Wikipedia through the Rust cache ----------
  const realFetch = window.fetch.bind(window);
  window.fetch = function (url, opts) {
    const u = String((url && url.url) || url);
    if (/^https:\/\/[^/]*\.wikipedia\.org\//.test(u)) {
      // A failure rejects the fetch, exactly like a real network error. (It used to
      // resolve with an empty 503 body, which made callers throw the confusing
      // "Unexpected end of JSON input" instead of a useful message.)
      return S.wikiGet(u).then((text) => {
        if (!text) throw new Error('empty response');
        return new Response(text, { status: 200, headers: { 'Content-Type': 'application/json' } });
      });
    }
    return realFetch(url, opts);
  };

  // ---------- styled text prompt (uses .wc-dialog CSS) ----------
  window.wcPrompt = function (msg, value, okLabel) {
    return new Promise((resolve) => {
      const shade = document.createElement('div');
      shade.className = 'wc-dialog-shade';
      shade.innerHTML = '<div class="wc-dialog" role="dialog"><p></p>' +
        '<input class="wc-d-input" type="text" autocomplete="off" spellcheck="false" dir="auto">' +
        '<div class="wc-d-row"><button class="wc-d-no">Cancel</button>' +
        '<button class="wc-d-yes"></button></div></div>';
      shade.querySelector('p').textContent = msg;
      shade.querySelector('.wc-d-yes').textContent = okLabel || 'OK';
      const inp = shade.querySelector('.wc-d-input');
      inp.value = value || '';
      const done = (v) => { shade.remove(); resolve(v); };
      shade.querySelector('.wc-d-no').addEventListener('click', () => done(null));
      shade.querySelector('.wc-d-yes').addEventListener('click', () => done(inp.value.trim() || null));
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); done(inp.value.trim() || null); }
        else if (e.key === 'Escape') { e.preventDefault(); done(null); }
      });
      shade.addEventListener('pointerdown', (e) => { if (e.target === shade) done(null); });
      document.body.appendChild(shade);
      inp.focus();
      inp.select();
    });
  };

  // ---------- styled confirm dialog (uses .wc-dialog CSS) ----------
  window.wcConfirm = function (msg) {
    return new Promise((resolve) => {
      const shade = document.createElement('div');
      shade.className = 'wc-dialog-shade';
      shade.innerHTML = '<div class="wc-dialog" role="alertdialog"><p></p>' +
        '<div class="wc-d-row"><button class="wc-d-no">Cancel</button>' +
        '<button class="wc-d-yes">OK</button></div></div>';
      shade.querySelector('p').textContent = msg;
      const done = (v) => { shade.remove(); resolve(v); };
      shade.querySelector('.wc-d-no').addEventListener('click', () => done(false));
      shade.querySelector('.wc-d-yes').addEventListener('click', () => done(true));
      shade.addEventListener('pointerdown', (e) => { if (e.target === shade) done(false); });
      document.body.appendChild(shade);
      shade.querySelector('.wc-d-yes').focus();
    });
  };
})();
