// Minimal canvas: per-language cards, persisted via Rust kv_* store.
(function () {
  const $ = (s) => document.querySelector(s);
  const canvas = $("#wc-canvas"), status = $("#wc-status");
  const langSel = $("#wc-lang"), q = $("#wc-q"), addBtn = $("#wc-add");
  const S = window.WCStore;

  let lang = "en";
  let cards = {}; // id -> {title, x, y, minimized}
  let saveTimer = null;

  const canvasKey = () => "canvas:" + lang;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

  function setStatus(t) { status.textContent = t + (S.isTauri ? " — desktop" : " — browser (localStorage)"); }

  function scheduleSave() {
    setStatus("saving…");
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      try {
        await S.kvSet(canvasKey(), { cards });
        await S.kvSet("settings", { lang });
        setStatus("saved " + new Date().toLocaleTimeString());
      } catch (e) { setStatus("save failed: " + e); }
    }, 400);
  }

  function apiBase() { return "https://" + lang + ".wikipedia.org/w/api.php"; }
  function articleUrl(title) { return "https://" + lang + ".wikipedia.org/wiki/" + encodeURIComponent(title.replace(/ /g, "_")); }

  async function api(params) {
    const u = apiBase() + params + "&format=json" + (S.isTauri ? "" : "&origin=*");
    const text = await S.wikiGet(u);
    return JSON.parse(text);
  }

  async function summary(title) {
    try {
      const d = await api("?action=query&prop=extracts%7Cpageimages&exintro=1&explaintext=1&pithumbsize=320&redirects=1&titles=" + encodeURIComponent(title));
      const pages = (d.query && d.query.pages) || {};
      const p = Object.values(pages)[0] || {};
      return { extract: p.extract || "(no summary)", thumb: p.thumbnail && p.thumbnail.source };
    } catch (e) { return { extract: "offline / load failed: " + e }; }
  }

  async function links(title) {
    try {
      const d = await api("?action=query&prop=links&pllimit=12&plnamespace=0&redirects=1&titles=" + encodeURIComponent(title));
      const pages = (d.query && d.query.pages) || {};
      const p = Object.values(pages)[0] || {};
      return (p.links || []).map((l) => l.title).filter(Boolean);
    } catch { return []; }
  }

  function addCard(title, x, y) {
    const id = "c" + Date.now().toString(36) + Math.floor(Math.random() * 999);
    cards[id] = { title, x: x ?? 40 + Object.keys(cards).length * 24, y: y ?? 40 + Object.keys(cards).length * 24 };
    renderCard(id);
    scheduleSave();
    return id;
  }

  function renderCard(id) {
    const c = cards[id];
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement("div");
      el.className = "wc-card";
      el.id = id;
      canvas.appendChild(el);
    }
    el.style.left = c.x + "px";
    el.style.top = c.y + "px";
    el.innerHTML =
      "<header><span class='t'>" + esc(c.title) + "</span><span class='sp'></span>" +
      "<button data-a='open' title='Open in browser'>↗</button>" +
      "<button data-a='x' title='Remove'>✕</button></header>" +
      "<div class='body'>loading…</div>";
    el.querySelector("header").onpointerdown = (e) => {
      if (e.target.tagName === "BUTTON") return;
      const sx = e.clientX - c.x, sy = e.clientY - c.y;
      const mv = (ev) => { c.x = ev.clientX - sx; c.y = ev.clientY - sy; el.style.left = c.x + "px"; el.style.top = c.y + "px"; };
      const up = () => { window.removeEventListener("pointermove", mv); window.removeEventListener("pointerup", up); scheduleSave(); };
      window.addEventListener("pointermove", mv); window.addEventListener("pointerup", up);
    };
    el.querySelector("[data-a='x']").onclick = async () => { delete cards[id]; el.remove(); scheduleSave(); };
    el.querySelector("[data-a='open']").onclick = (e) => openMaybe(e, articleUrl(c.title));
    fillCard(id);
  }

  async function fillCard(id) {
    const c = cards[id]; if (!c) return;
    const el = document.getElementById(id); if (!el) return;
    const body = el.querySelector(".body");
    const s = await summary(c.title);
    if (!cards[id]) return;
    body.innerHTML =
      (s.thumb ? "<img src='" + esc(s.thumb) + "' style='max-width:100%'>" : "") +
      "<p class='wc-body'>" + esc(s.extract).slice(0, 900) + "</p>" +
      "<p><a href='#' data-full>Full view</a> · <a href='#' data-links>Links</a></p><div data-out></div>";
    const out = body.querySelector("[data-out]");
    body.querySelector("[data-full]").onclick = (e) => { e.preventDefault(); openMaybe(e, articleUrl(c.title)); };
    body.querySelector("[data-links]").onclick = async (e) => {
      e.preventDefault();
      out.textContent = "loading links…";
      const ls = await links(c.title);
      out.innerHTML = ls.map((t) => "<div><a href='#' data-t='" + esc(t) + "'>" + esc(t) + "</a></div>").join("") || "(no links)";
      out.querySelectorAll("a").forEach((a) => {
        a.onclick = (ev) => {
          ev.preventDefault();
          if (ev.ctrlKey || ev.shiftKey || ev.button === 1) return openMaybe(ev, articleUrl(a.dataset.t));
          addCard(a.dataset.t, c.x + 40, c.y + 40);
        };
        a.onauxclick = (ev) => { ev.preventDefault(); openMaybe(ev, articleUrl(a.dataset.t)); };
      });
    };
  }

  function openMaybe(e, url) {
    if (e.ctrlKey || e.shiftKey || e.button === 1) { e.preventDefault(); S.openExternal(url); return; }
    // Plain click on an article-derived URL stays in canvas as a new card is preferred,
    // but explicit ↗ / full view opens externally.
    S.openExternal(url);
  }

  async function load() {
    try {
      const all = await S.kvAll();
      if (all.settings && all.settings.lang) { lang = all.settings.lang; langSel.value = lang; }
      const c = all[canvasKey()];
      cards = (c && c.cards) || {};
      Object.keys(cards).forEach(renderCard);
      setStatus("ready — " + Object.keys(cards).length + " cards");
    } catch (e) { setStatus("load failed: " + e); }
  }

  async function searchAndAdd() {
    const term = q.value.trim(); if (!term) return;
    try {
      const d = await api("?action=opensearch&limit=1&search=" + encodeURIComponent(term));
      const title = (d[1] && d[1][0]) || term;
      addCard(title);
      q.value = "";
    } catch (e) { setStatus("search failed: " + e); }
  }

  langSel.onchange = async () => {
    lang = langSel.value;
    canvas.innerHTML = ""; cards = {};
    await load();
    scheduleSave();
  };
  addBtn.onclick = searchAndAdd;
  q.onkeydown = (e) => { if (e.key === "Enter") searchAndAdd(); };
  window.addEventListener("beforeunload", () => { /* Rust side quits after this */ });

  load();
})();
