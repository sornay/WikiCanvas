(() => {
  'use strict';

  const MIN_Z = 0.2, MAX_Z = 2;
  const SVGNS = 'http://www.w3.org/2000/svg';
  const NS = /^(Special|File|Image|Media|Talk|User|Wikipedia|WP|Project|Template|Help|Category|Portal|Draft|MediaWiki|Module|Book|TimedText)([ _]talk)?:/i;
  const JUNK = '.mw-editsection,.navbox,.navbox-styles,.sistersitebox,.noprint,.mw-empty-elt,' +
               '.printfooter,#toc,.toc,.vector-toc,script,.mw-authority-control,.catlinks';


  // Predefined relationships. A trailing "~" marks a mutual relationship (no arrow by default).
  const REL_GROUPS = [
    { name: 'Ownership & control', items: [
      'owns', 'owned by', 'controls', 'controlled by', 'manages', 'managed by', 'operates', 'operated by',
      'funds', 'funded by', 'sponsors', 'sponsored by', 'employs', 'employed by', 'founded', 'founded by',
      'leads', 'led by', 'governs', 'governed by', 'regulates', 'regulated by', 'licenses', 'licensed by',
      'acquired', 'acquired by', 'subsidiary of', 'parent company of', 'shareholder of', 'member of',
      'has member', 'affiliated with~', 'allied with~', 'partner of~'] },
    { name: 'Family & people', items: [
      'parent of', 'child of', 'sibling of~', 'spouse of~', 'married to~', 'relative of~', 'ancestor of',
      'descendant of', 'heir of', 'guardian of', 'friend of~', 'colleague of~', 'collaborator with~',
      'rival of~', 'mentor of', 'student of', 'teacher of', 'patron of', 'successor of', 'predecessor of'] },
    { name: 'Structure & hierarchy', items: [
      'part of', 'has part', 'contains', 'contained in', 'includes', 'included in', 'composed of',
      'component of', 'branch of', 'section of', 'division of', 'region of', 'belongs to', 'located in',
      'capital of', 'has capital', 'borders~', 'subclass of', 'superclass of', 'instance of', 'has instance',
      'type of', 'category of'] },
    { name: 'Cause & effect', items: [
      'causes', 'caused by', 'leads to', 'results in', 'results from', 'enables', 'enabled by', 'prevents',
      'prevented by', 'triggers', 'triggered by', 'influences', 'influenced by', 'depends on', 'required by',
      'requires', 'contributes to', 'mitigates', 'amplifies', 'inhibits', 'correlates with~'] },
    { name: 'Time & sequence', items: [
      'precedes', 'follows', 'preceded by', 'succeeded by', 'before', 'after', 'during', 'begins', 'ends',
      'concurrent with~', 'led up to', 'replaces', 'replaced by', 'evolved into', 'evolved from', 'revived'] },
    { name: 'Creation & authorship', items: [
      'created', 'created by', 'wrote', 'written by', 'invented', 'invented by', 'discovered', 'discovered by',
      'designed', 'designed by', 'composed', 'composed by', 'directed', 'directed by', 'produced', 'produced by',
      'published', 'published by', 'developed', 'developed by', 'built', 'built by', 'painted', 'painted by',
      'translated', 'translated by'] },
    { name: 'Similarity & contrast', items: [
      'related to~', 'similar to~', 'same as~', 'equivalent to~', 'synonym of~', 'antonym of~',
      'different from~', 'opposite of~', 'contrasts with~', 'contradicts~', 'compared with~', 'alternative to~',
      'not to be confused with~', 'variant of', 'derived from', 'based on', 'inspired by', 'inspired',
      'imitates', 'parody of'] },
    { name: 'Evidence & reasoning', items: [
      'supports', 'supported by', 'refutes', 'refuted by', 'explains', 'explained by', 'defines', 'defined by',
      'illustrates', 'example of', 'has example', 'cites', 'cited by', 'source for', 'sourced from',
      'evidence for', 'proves', 'implies', 'assumes', 'questions', 'exception to', 'summarizes',
      'elaborates on', 'background for', 'generalizes', 'specializes', 'motivates'] },
    { name: 'Usage & function', items: [
      'uses', 'used by', 'used for', 'applies to', 'implements', 'implemented by', 'consumes', 'powers',
      'powered by', 'tool for', 'measures', 'measured by', 'treats', 'treated by', 'protects', 'supplies',
      'supplied by', 'extends', 'extended by', 'integrates with~'] },
    { name: 'Place & participation', items: [
      'located at', 'born in', 'died in', 'lives in', 'lived in', 'works at', 'worked at', 'studied at',
      'attended', 'hosted', 'hosted by', 'participated in', 'fought in', 'won', 'lost to', 'defeated',
      'defeated by', 'played for', 'elected to', 'appointed to', 'awarded', 'awarded to', 'visited',
      'traveled to', 'occurred in', 'takes place in', 'named after'] },
    { name: 'Notes & workflow', items: [
      'see also~', 'note~', 'question~', 'idea~', 'todo~', 'important~', 'definition~', 'summary~', 'source~',
      'to read~', 'unresolved~', 'agree~', 'disagree~'] },
  ];
  // One color per label text: the same label always gets the same color.
  const LABEL_COLORS = ['#2563eb', '#dc2626', '#059669', '#d97706', '#7c3aed', '#db2777', '#0891b2',
                        '#65a30d', '#ea580c', '#4f46e5', '#0d9488', '#b45309', '#9333ea', '#be123c'];
  // Notes paper colors (bg = paper, head = header strip, text = ink for typing and the "auto" pen)
  const PAD_COLORS = {
    yellow: { bg: '#fff9d6', head: '#fff3b8', border: '#d9cf8f', text: '#3b3516', muted: '#a09650' },
    orange: { bg: '#ffe9d2', head: '#ffd9b5', border: '#e5b88c', text: '#4a2a0b', muted: '#b0805a' },
    pink:   { bg: '#ffe4ea', head: '#ffd0db', border: '#e8a9b8', text: '#4a1f2b', muted: '#b0707f' },
    purple: { bg: '#eee6ff', head: '#e0d4ff', border: '#bba8ea', text: '#2c1f4d', muted: '#8b79b8' },
    blue:   { bg: '#e1f0ff', head: '#c9e3ff', border: '#9cc3ec', text: '#16304d', muted: '#6a90b8' },
    green:  { bg: '#e3f6e1', head: '#cdeec9', border: '#9fcf9a', text: '#1d3a1b', muted: '#6a9a66' },
    gray:   { bg: '#f1f0ec', head: '#e5e3dc', border: '#cbc8bd', text: '#2a2a28', muted: '#8d8a80' },
    white:  { bg: '#ffffff', head: '#f3f3f3', border: '#d6d6d6', text: '#222222', muted: '#999999' },
    dark:   { bg: '#2b2d31', head: '#383b40', border: '#4a4d53', text: '#eceae4', muted: '#8e9097' },
  };
  // highlight colors for passages saved to Notes (they stay marked in the card)
  const HL_COLORS = { yellow: '#ffe066', green: '#a7f3a0', pink: '#ffb3c7', blue: '#a5d8ff', orange: '#ffc078' };
  const INK_COLORS = ['#c0392b', '#d35400', '#1e8449', '#2563eb', '#7c3aed', '#ffffff'];
  const parseRel = (x) => (x.endsWith('~') ? { text: x.slice(0, -1), sym: true } : { text: x, sym: false });

  const dec = (s) => { try { return decodeURIComponent(s); } catch { return s; } };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // ---- desktop: no live Wikipedia page; the shell provides WC_PAGE { lang, title } ----
  const WC = (window.WC_PAGE && typeof window.WC_PAGE === 'object') ? window.WC_PAGE : {};
  let WC_LANG = WC.lang || 'en';
  const pageTitle = WC.title || '';
  const RTL_LANGS = ['fa', 'ar', 'ur', 'he', 'ps', 'yi'];
  let pageDir = WC.dir || (RTL_LANGS.includes(WC_LANG) ? 'rtl' : 'ltr');
  let pageLang = WC_LANG;
  let WC_API = 'https://' + WC_LANG + '.wikipedia.org';
  const WC_HOST = () => WC_LANG + '.wikipedia.org';

  // Localized namespace names (e.g. fa: ویژه:, رده:) from this wiki's own API
  let nsRe = NS;
  const escRe = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  function fetchNsRe() {
    fetch(`${WC_API}/w/api.php?action=query&meta=siteinfo&siprop=namespaces%7Cnamespacealiases&format=json&formatversion=2`)
    .then((r) => r.json())
    .then((j) => {
      const names = new Set();
      Object.values(j.query.namespaces).forEach((n) => {
        if (n.id === 0) return;
        if (n.name) names.add(n.name);
        if (n.canonical) names.add(n.canonical);
      });
      j.query.namespacealiases.forEach((a) => names.add(a.alias));
      if (names.size) nsRe = new RegExp('^(' + [...names].map(escRe).join('|') + ')\\s*:', 'i');
    })
    .catch(() => {});
  }
  fetchNsRe();

  // desktop: always on, no toolbar toggle
  boot();

  function boot() {
    const state = { x: 0, y: 0, zoom: 1, cards: [], trails: [], notes: [], z: 10, nextId: 1, linkDrag: null, dots: true, inkZoom: 1, inkTimer: 0, full: null, sel: null, fullNotes: true, hlColor: 'yellow' };
    const cardByEl = new WeakMap();
    const keyOf = (t) => t.replace(/_/g, ' ').trim().toLowerCase();

    // ---------- helpers ----------
    function titleFromHref(a) {
      let u;
      try { u = new URL(a.getAttribute('href'), WC_API + '/'); } catch { return null; }
      if (!/\.wikipedia\.org$/i.test(u.hostname) || !u.pathname.startsWith('/wiki/')) return null;
      const t = dec(u.pathname.slice(6)).replace(/_/g, ' ');
      return (NS.test(t) || nsRe.test(t)) ? null : t;
    }
    const hashOf = (a) => { try { return dec(new URL(a.href).hash.slice(1)); } catch { return ''; } };

    function clean(node) {
      node.querySelectorAll(JUNK).forEach((n) => n.remove());
      node.querySelectorAll('a[href]').forEach((a) => {
        a.draggable = false;
        if (a.getAttribute('href').startsWith('#')) return;
        if (!titleFromHref(a)) { a.target = '_blank'; a.rel = 'noopener'; }
      });
      node.querySelectorAll('img').forEach((i) => {
        i.draggable = false;
        // desktop: the page URL is not https, so protocol-relative sources must be made absolute
        const src = i.getAttribute('src');
        if (src && src.startsWith('//')) i.src = 'https:' + src;
        const ss = i.getAttribute('srcset');
        if (ss && ss.includes('//')) i.setAttribute('srcset', ss.replace(/(^|,\s*)\/\//g, '$1https://'));
      });
      node.querySelectorAll('video[src], audio[src], source[src]').forEach((m) => {
        const src = m.getAttribute('src');
        if (src && src.startsWith('//')) m.src = 'https:' + src;
      });
      node.querySelectorAll('table').forEach((t) => {
        if (t.closest('.wc-tablewrap')) return;
        const w = document.createElement('div');
        w.className = 'wc-tablewrap';
        t.replaceWith(w);
        w.appendChild(t);
      });
      return node;
    }

    function scrollToId(card, id) {
      if (!card || !id) return;
      const target = card.body.querySelector('[id="' + CSS.escape(id) + '"]');
      if (!target) return;
      card.body.scrollTo({
        top: (target.getBoundingClientRect().top - card.body.getBoundingClientRect().top) / (card.fullView ? 1 : state.zoom) + card.body.scrollTop - 8,
        behavior: 'smooth',
      });
    }

    // ---------- DOM ----------
    const root = document.createElement('div');
    root.id = 'wc-root';
    root.lang = pageLang;
    if (pageDir === 'rtl') root.classList.add('wc-rtl');
    root.innerHTML = `
      <div class="wc-bar">
        <span class="wc-brand">Wikipedia · canvas</span>
        <select class="wc-lang" title="Wikipedia language">
          <option value="en">English</option>
          <option value="fa">فارسی</option>
          <option value="ar">العربية</option>
          <option value="de">Deutsch</option>
          <option value="fr">Français</option>
          <option value="es">Español</option>
          <option value="it">Italiano</option>
          <option value="ja">日本語</option>
          <option value="ru">Русский</option>
          <option value="zh">中文</option>
        </select>
        <div class="wc-search">
          <input type="text" placeholder="Search Wikipedia…  ( / )" autocomplete="off" spellcheck="false" dir="auto">
          <div class="wc-results" hidden></div>
        </div>
        <span class="wc-grow"></span>
        <button data-act="zoomout" title="Zoom out ( - )">−</button>
        <button data-act="zoomreset" class="wc-zoomval" title="Reset zoom ( 0 )">100%</button>
        <button data-act="zoomin" title="Zoom in ( + )">+</button>
        <button data-act="note" title="Add a text box (or double-click the empty canvas)">+ Text</button>
        <button data-act="dots" class="wc-toggle on" title="Show or hide the background dots">Dots</button>
        <button data-act="fit" title="Fit everything in view">Fit</button>
        <button data-act="minall" title="Minimize / expand every card">Minimize all</button>
        <button data-act="closeall" title="Close every card and text box">Close all</button>
        <button data-act="off" title="Quit Wiki Canvas">Quit</button>
      </div>
      <div class="wc-viewport">
        <div class="wc-world">
          <svg class="wc-trails" width="1" height="1"></svg>
        </div>
        <div class="wc-empty" hidden>Search for an article above to start a canvas.</div>
      </div>
      <div class="wc-full" hidden>
        <header class="wc-full-head">
          <button class="wc-full-back" title="Back to the canvas (Esc)">← Back to canvas</button>
          <span class="wc-full-title" dir="auto"></span>
          <span class="wc-full-tools">
            <button class="wc-full-notes on" title="Show or hide the notes">Notes</button>
            <a class="wc-full-ext" target="_blank" rel="noopener" title="Open on Wikipedia">↗</a>
          </span>
        </header>
        <div class="wc-full-main">
          <div class="wc-full-article"></div>
          <div class="wc-full-side"></div>
        </div>
      </div>
      <div class="wc-selbar" hidden><button class="wc-sel-add" title="Save the selected text to this card's notes with a reference, and highlight it">Add to Notes</button><span class="wc-sel-sep"></span><span class="wc-sel-colors"></span></div>
      <div class="wc-ctx" hidden><button data-a="add">Add to Notes</button><div class="wc-ctx-hl"><span>Highlight</span><span class="wc-ctx-colors"></span></div><button data-a="copy">Copy</button></div>
      <div class="wc-toast" hidden></div>
      <div class="wc-preview" hidden></div>
      <div class="wc-ghost" hidden></div>`;
    const bar = root.querySelector('.wc-bar');
    const vp = root.querySelector('.wc-viewport');
    const world = root.querySelector('.wc-world');
    const svg = root.querySelector('.wc-trails');
    const defs = document.createElementNS(SVGNS, 'defs');
    svg.appendChild(defs);
    const ghost = root.querySelector('.wc-ghost');
    const empty = root.querySelector('.wc-empty');
    const input = root.querySelector('input');
    const results = root.querySelector('.wc-results');
    const zoomVal = root.querySelector('.wc-zoomval');
    const dotsBtn = root.querySelector('[data-act="dots"]');
    ['zoomout', 'zoomreset', 'zoomin', 'note', 'dots', 'fit', 'minall', 'closeall']
      .forEach((a) => root.querySelector('[data-act="' + a + '"]').classList.add('wc-canvasonly'));
    const full = root.querySelector('.wc-full');
    const fullBack = root.querySelector('.wc-full-back');
    const fullTitle = root.querySelector('.wc-full-title');
    const fullExt = root.querySelector('.wc-full-ext');
    const fullNotesBtn = root.querySelector('.wc-full-notes');
    const fullMain = root.querySelector('.wc-full-main');
    const fullArticle = root.querySelector('.wc-full-article');
    const fullSide = root.querySelector('.wc-full-side');
    const selBar = root.querySelector('.wc-selbar');
    const ctxMenu = root.querySelector('.wc-ctx');
    const toastEl = root.querySelector('.wc-toast');
    const prevEl = root.querySelector('.wc-preview');

    // Grab the live article before covering the page
    // desktop: no live page; cards are created from search or the restored canvas
    const liveContent = null;
    const liveTitle = pageTitle;
    const liveClone = null;

    document.documentElement.classList.add('wc-on');
    document.body.appendChild(root);

    // ---------- view (pan / zoom) ----------
    let animTimer;
    function applyView() {
      world.style.transform = `translate(${state.x}px, ${state.y}px) scale(${state.zoom})`;
      const g = 28 * state.zoom;
      vp.style.backgroundSize = `${g}px ${g}px`;
      vp.style.backgroundPosition = `${state.x}px ${state.y}px`;
      zoomVal.textContent = Math.round(state.zoom * 100) + '%';
      if (state.zoom !== state.inkZoom) {            // handwriting is redrawn sharply after zooming
        state.inkZoom = state.zoom;
        clearTimeout(state.inkTimer);
        state.inkTimer = setTimeout(() => state.cards.forEach((c) => { if (inkActive(c)) renderInk(c); }), 160);
      }
    }
    function animateView() {
      root.classList.add('wc-anim');
      clearTimeout(animTimer);
      animTimer = setTimeout(() => root.classList.remove('wc-anim'), 400);
    }
    function screenToWorld(cx, cy) {
      const r = vp.getBoundingClientRect();
      return { x: (cx - r.left - state.x) / state.zoom, y: (cy - r.top - state.y) / state.zoom };
    }
    function zoomAt(factor, cx, cy) {
      const r = vp.getBoundingClientRect();
      const px = cx - r.left, py = cy - r.top;
      const z2 = clamp(state.zoom * factor, MIN_Z, MAX_Z);
      const k = z2 / state.zoom;
      state.x = px - (px - state.x) * k;
      state.y = py - (py - state.y) * k;
      state.zoom = z2;
      applyView();
    }
    function zoomCenter(factor) {
      const r = vp.getBoundingClientRect();
      animateView();
      zoomAt(factor, r.left + r.width / 2, r.top + r.height / 2);
    }
    function fit() {
      const items = [...state.cards, ...state.notes];
      if (!items.length) return;
      let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
      items.forEach((c) => {
        const b = rectOf(c);
        x1 = Math.min(x1, b.x); y1 = Math.min(y1, b.y);
        x2 = Math.max(x2, b.x + b.w); y2 = Math.max(y2, b.y + b.h);
      });
      const r = vp.getBoundingClientRect(), pad = 50;
      const bw = Math.max(1, x2 - x1), bh = Math.max(1, y2 - y1);
      const z = clamp(Math.min((r.width - pad * 2) / bw, (r.height - pad * 2) / bh), MIN_Z, 1);
      animateView();
      state.zoom = z;
      state.x = (r.width - bw * z) / 2 - x1 * z;
      state.y = (r.height - bh * z) / 2 - y1 * z;
      applyView();
    }
    function ensureVisible(c) {
      const r = vp.getBoundingClientRect(), z = state.zoom, m = 30;
      const b = rectOf(c);
      const left = state.x + b.x * z, top = state.y + b.y * z;
      const right = left + b.w * z, bottom = top + b.h * z;
      let dx = 0, dy = 0;
      if (right > r.width - m) dx = r.width - m - right;
      if (left + dx < m) dx = m - left;
      if (bottom > r.height - m) dy = r.height - m - bottom;
      if (top + dy < m) dy = m - top;
      if (dx || dy) { animateView(); state.x += dx; state.y += dy; applyView(); return true; }
      return false;
    }

    // pan by dragging the background
    vp.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || e.target.closest('.wc-card, .wc-label, .wc-note, .wc-pad')) return;
      vp.setPointerCapture(e.pointerId);
      root.classList.add('wc-panning');
      const ae = document.activeElement;                       // leave any text box / pad first
      if (ae && ae !== document.body && root.contains(ae) && ae.blur) ae.blur();
      const sel0 = window.getSelection();
      if (sel0) sel0.removeAllRanges();                        // and drop any existing selection
      const sx = e.clientX, sy = e.clientY, ox = state.x, oy = state.y;
      const mv = (ev) => { state.x = ox + ev.clientX - sx; state.y = oy + ev.clientY - sy; applyView(); };
      const up = (ev) => {
        vp.removeEventListener('pointermove', mv);
        vp.removeEventListener('pointerup', up);
        vp.removeEventListener('pointercancel', up);
        root.classList.remove('wc-panning');
        try { vp.releasePointerCapture(ev.pointerId); } catch { /* ignore */ }
      };
      vp.addEventListener('pointermove', mv);
      vp.addEventListener('pointerup', up);
      vp.addEventListener('pointercancel', up);
    });

    // wheel: ctrl/cmd (or trackpad pinch) zooms, plain wheel pans the canvas, article text scrolls normally
    vp.addEventListener('wheel', (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        zoomAt(Math.exp(-clamp(e.deltaY, -60, 60) * 0.005), e.clientX, e.clientY);
        return;
      }
      if (e.target.closest('.wc-body, .wc-pad-text')) return;
      e.preventDefault();
      state.x -= e.deltaX;
      state.y -= e.deltaY;
      applyView();
    }, { passive: false });

    vp.addEventListener('dragstart', (e) => e.preventDefault());

    // double-click empty canvas: new text box right there
    vp.addEventListener('dblclick', (e) => {
      if (e.target.closest('.wc-card, .wc-label, .wc-note, .wc-pad')) return;
      const p = screenToWorld(e.clientX, e.clientY);
      createNote(p.x - 20, p.y - 14);
    });

    // ---------- trails ----------
    let raf = 0;
    const queueTrails = () => { if (!raf) raf = requestAnimationFrame(updateTrails); };
    // a card's box, widened to include its notes when they are open
    const rectOf = (c) => {
      const r = { x: c.x, y: c.y, w: c.el.offsetWidth, h: c.el.offsetHeight };
      const b = c.padBox;
      if (!b) return r;
      const x1 = Math.min(r.x, b.x), x2 = Math.max(r.x + r.w, b.x + b.w);
      return { x: x1, y: r.y, w: x2 - x1, h: r.h };
    };

    // where a link sits in world coordinates (clamped to the visible part of the card body)
    function anchorWorld(card, anchor) {
      const w = card.el.offsetWidth, h = card.el.offsetHeight;
      if (card.minimized || !anchor.isConnected || !card.el.contains(anchor)) return { x: card.x + w / 2, y: card.y + h / 2, clamped: true };
      const z = state.zoom;
      const cr = card.el.getBoundingClientRect();
      const br = card.body.getBoundingClientRect();
      const r = anchor.getClientRects()[0] || anchor.getBoundingClientRect();
      let sx = r.left + r.width / 2, sy = r.top + r.height / 2;
      const cx = clamp(sx, br.left + 6, br.right - 6), cy = clamp(sy, br.top + 6, br.bottom - 6);
      const clamped = cx !== sx || cy !== sy;
      return { x: card.x + (cx - cr.left) / z, y: card.y + (cy - cr.top) / z, clamped };
    }

    // point where the straight line from a card's center toward (px, py) leaves the card border
    function edgePoint(r, px, py) {
      const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
      const dx = px - cx, dy = py - cy;
      if (Math.abs(dx) <= r.w / 2 && Math.abs(dy) <= r.h / 2) return { x: cx, y: cy, nx: 0, ny: 0 };
      const kx = (r.w / 2) / (Math.abs(dx) || 1e-6), ky = (r.h / 2) / (Math.abs(dy) || 1e-6);
      const k = Math.min(kx, ky);
      return { x: cx + dx * k, y: cy + dy * k, nx: kx < ky ? Math.sign(dx) : 0, ny: kx < ky ? 0 : Math.sign(dy) };
    }

    // smooth curve between two edge points (each leaves its card along the outward normal)
    function curve(s, t) {
      const len = Math.hypot(t.x - s.x, t.y - s.y);
      const k = Math.max(30, len * 0.4);
      const sn = (s.nx || s.ny) ? { x: s.nx, y: s.ny } : { x: (t.x - s.x) / (len || 1), y: (t.y - s.y) / (len || 1) };
      const tn = (t.nx || t.ny) ? { x: t.nx, y: t.ny } : { x: (s.x - t.x) / (len || 1), y: (s.y - t.y) / (len || 1) };
      const c1 = { x: s.x + sn.x * k, y: s.y + sn.y * k };
      const c2 = { x: t.x + tn.x * k, y: t.y + tn.y * k };
      return {
        d: `M ${s.x} ${s.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${t.x} ${t.y}`,
        mid: { x: (s.x + 3 * c1.x + 3 * c2.x + t.x) / 8, y: (s.y + 3 * c1.y + 3 * c2.y + t.y) / 8 },
      };
    }

    // trails run card-to-card and carry the link text as a label; they live behind the cards
    function updateTrails() {
      raf = 0;
      const seen = new Map();
      for (const t of state.trails) {
        const pr = rectOf(t.parent), cr = rectOf(t.child);
        const s = edgePoint(pr, cr.x + cr.w / 2, cr.y + cr.h / 2);
        const e = edgePoint(cr, pr.x + pr.w / 2, pr.y + pr.h / 2);
        const { d, mid } = curve(s, e);
        t.path.setAttribute('d', d);
        t.d1.setAttribute('cx', s.x); t.d1.setAttribute('cy', s.y);
        t.d2.setAttribute('cx', e.x); t.d2.setAttribute('cy', e.y);
        const pk = t.parent.uid + '>' + t.child.uid;     // several links between the same two cards: stack labels
        const idx = seen.get(pk) || 0;
        seen.set(pk, idx + 1);
        t.label.style.left = mid.x + 'px';
        t.label.style.top = (mid.y + idx * 24) + 'px';
      }
    }

    // color is decided by the label text (case-insensitive) and remembered across sessions
    let labelColors = {};
    chrome.storage.local.get({ labelColors: {} }, (v) => { labelColors = v.labelColors || {}; });
    function colorFor(text) {
      const k = text.trim().toLowerCase();
      if (!(k in labelColors)) {
        if (Object.keys(labelColors).length > 500) labelColors = {};
        labelColors[k] = Object.keys(labelColors).length % LABEL_COLORS.length;
        chrome.storage.local.set({ labelColors });
      }
      return LABEL_COLORS[labelColors[k] % LABEL_COLORS.length];
    }

    function addTrail(parent, anchor, child) {
      if (parent === child) return null;
      if (state.trails.some((t) => t.parent === parent && t.anchor === anchor && t.child === child)) return null;
      const id = state.nextId++;
      const color = `hsl(${(id * 67) % 360} 62% 42%)`;

      const g = document.createElementNS(SVGNS, 'g');
      g.setAttribute('class', 'wc-trail');
      const path = document.createElementNS(SVGNS, 'path');
      path.setAttribute('stroke', color);
      const d1 = document.createElementNS(SVGNS, 'circle');
      const d2 = document.createElementNS(SVGNS, 'circle');
      d1.setAttribute('r', 4.5); d2.setAttribute('r', 4.5);
      d1.setAttribute('fill', color); d2.setAttribute('fill', color);
      g.append(path, d1, d2);
      svg.appendChild(g);

      const marker = document.createElementNS(SVGNS, 'marker');
      marker.setAttribute('id', 'wc-m-' + id);
      marker.setAttribute('viewBox', '0 0 14 14');
      marker.setAttribute('markerWidth', '22');
      marker.setAttribute('markerHeight', '22');
      marker.setAttribute('refX', '13');
      marker.setAttribute('refY', '7');
      marker.setAttribute('orient', 'auto-start-reverse');
      marker.setAttribute('markerUnits', 'userSpaceOnUse');
      const mp = document.createElementNS(SVGNS, 'path');
      mp.setAttribute('d', 'M1 1.5 L13 7 L1 12.5 Z');
      mp.setAttribute('fill', color);
      marker.appendChild(mp);
      defs.appendChild(marker);

      const label = document.createElement('div');
      label.className = 'wc-label';
      label.style.setProperty('--trail', color);
      label.dir = 'auto';
      label.title = 'Click to set the relationship';
      world.appendChild(label);

      const t = {
        id, parent, anchor, child, g, path, d1, d2, label, marker,
        auto: (anchor.textContent.trim() || child.title).slice(0, 60),   // the link text
        custom: null,                                                    // chosen relationship, if any
        dir: 'fwd',                                                      // fwd: parent -> child, rev, none
      };
      label.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (popTrail === t) closePicker(); else openPicker(t);
      });

      anchor.classList.add('wc-has-trail');
      anchor.style.setProperty('--trail', color);
      state.trails.push(t);
      styleTrail(t);
      queueTrails();
      return t;
    }

    // label text, relationship look, and arrowheads
    function styleTrail(t) {
      const text = t.custom != null ? t.custom : t.auto;
      const color = colorFor(text);                       // same text -> same color
      t.label.textContent = text;
      t.label.classList.toggle('wc-rel', t.custom != null);
      t.path.setAttribute('stroke', color);
      t.d1.setAttribute('fill', color);
      t.d2.setAttribute('fill', color);
      t.marker.firstChild.setAttribute('fill', color);
      t.label.style.setProperty('--trail', color);
      t.anchor.style.setProperty('--trail', color);
      t.path.removeAttribute('marker-end');
      t.path.removeAttribute('marker-start');
      if (t.dir === 'fwd') t.path.setAttribute('marker-end', `url(#wc-m-${t.id})`);
      if (t.dir === 'rev') t.path.setAttribute('marker-start', `url(#wc-m-${t.id})`);
      t.d1.style.display = t.dir === 'rev' ? 'none' : '';
      t.d2.style.display = t.dir === 'fwd' ? 'none' : '';
    }

    function removeTrail(t) {
      if (popTrail === t) closePicker();
      t.g.remove();
      t.label.remove();
      t.marker.remove();
      state.trails = state.trails.filter((x) => x !== t);
      if (!state.trails.some((x) => x.anchor === t.anchor)) {
        t.anchor.classList.remove('wc-has-trail');
        t.anchor.style.removeProperty('--trail');
      }
    }

    // ---------- cards ----------
    const ro = new ResizeObserver(() => {
      state.cards.forEach(placePad);
      if (state.full && state.full.pad) { inkCheck(state.full); syncMirror(state.full); }
      queueTrails();
    });

    function place(c) { c.el.style.left = c.x + 'px'; c.el.style.top = c.y + 'px'; placePad(c); }
    function focusCard(c) { c.el.style.zIndex = ++state.z; if (c.pad) c.pad.el.style.zIndex = state.z; }
    function refreshEmpty() { empty.hidden = state.cards.length > 0 || state.notes.length > 0; }

    function setMin(c, flag) {
      c.minimized = flag;
      c.el.classList.toggle('wc-min', flag);
      placePad(c);
      const b = c.el.querySelector('.wc-minbtn');
      b.textContent = flag ? '▢' : '–';
      b.title = flag ? 'Expand' : 'Minimize to a name';
      queueTrails();
      if (!flag) ensureVisible(c);
    }

    function setTitle(c, t) {
      c.title = t;
      c.canon = keyOf(t);
      c.el.querySelector('.wc-title').textContent = t;
      refreshPadIndicator(c);
      c.el.querySelector('.wc-ext').href = '/wiki/' + encodeURIComponent(t.replace(/ /g, '_'));
    }

    function fill(c, nodes) {
      c.body.classList.remove('wc-loading');
      c.flatCache = null;
      c.body.replaceChildren(...nodes);
      queueTrails();
      const q = c.loadQ;
      if (q) { c.loadQ = null; q.forEach((f) => f(c)); }
      scheduleMarks();
    }

    // run fn once the card's article has finished loading
    function afterLoad(c, fn) {
      if (!c.body.classList.contains('wc-loading')) fn(c);
      else (c.loadQ = c.loadQ || []).push(fn);
    }

    async function fetchPage(title) {
      const url = `${WC_API}/w/api.php?action=parse&page=${encodeURIComponent(title)}` +
        '&prop=text&redirects=1&disableeditsection=1&disablelimitreport=1&format=json&formatversion=2';
      const j = await (await fetch(url)).json();
      if (j.error) throw new Error(j.error.info || j.error.code);
      return { title: j.parse.title, html: j.parse.text };
    }

    function pulse(c) {
      c.el.classList.remove('wc-pulse');
      void c.el.offsetWidth;
      c.el.classList.add('wc-pulse');
      setTimeout(() => c.el.classList.remove('wc-pulse'), 1000);
    }

    function freeSpot(x, y, w, h) {
      const hit = (px, py) => state.cards.some((c) => {
        const r = rectOf(c);
        return px - 16 < r.x + r.w && px + w + 16 > r.x && py - 16 < r.y + r.h && py + h + 16 > r.y;
      });
      for (let i = 0; i < 14; i++) { if (!hit(x, y)) return { x, y }; y += 70; }
      return { x: x + 50, y };
    }

    function createCard(o) {
      const k = keyOf(o.title);
      const existing = state.cards.find((c) => c.key === k || c.canon === k);
      if (existing) {                         // already on the canvas: just connect it and highlight it
        const nt = (o.parent && o.anchor) ? addTrail(o.parent, o.anchor, existing) : null;
        if (existing.minimized) setMin(existing, false);
        focusCard(existing);
        pulse(existing);
        const pannedTo = ensureVisible(existing);
        if (nt && !o.noPicker) offerPicker(nt, pannedTo);
        if (o.hash) scrollToId(existing, o.hash);
        return existing;
      }

      const el = document.createElement('section');
      el.className = 'wc-card';
      el.style.width = (o.w || 420) + 'px';
      el.style.height = (o.h || 480) + 'px';
      el.innerHTML = `
        <header class="wc-head">
          <span class="wc-title" dir="auto"></span>
          <span class="wc-tools">
            <button class="wc-fullbtn" title="Open in full view (article + notes)">⤢</button>
            <button class="wc-padbtn" title="Notes: typed or handwritten notes for this article">✎</button>
            <button class="wc-minbtn" title="Minimize to a name">–</button>
            <a class="wc-ext" target="_blank" rel="noopener" title="Open on Wikipedia">↗</a>
            <button class="wc-close" title="Close (Shift+click: also close cards opened from it)">×</button>
          </span>
        </header>
        <div class="wc-body wc-loading">Loading…</div>`;
      const c = {
        uid: state.nextId++, key: k, canon: null, title: o.title, x: o.x, y: o.y, minimized: false,
        pad: null, padOpen: false, padBox: null, padLoaded: false, padKeyUsed: null, padTimer: 0, hasNotes: false,
        fullView: false, loadQ: null, padLoading: false, padQ: null, marks: null, markRanges: [], flatCache: null,
        el, head: el.querySelector('.wc-head'), body: el.querySelector('.wc-body'),
      };
      c.body.dir = pageDir;
      cardByEl.set(el, c);
      state.cards.push(c);
      world.appendChild(el);
      setTitle(c, o.title);
      place(c);
      focusCard(c);
      ro.observe(el);
      refreshEmpty();

      el.addEventListener('pointerdown', () => focusCard(c), true);
      el.addEventListener('pointerenter', () => {
        state.trails.forEach((t) => {
          if (t.parent === c || t.child === c) { t.g.classList.add('wc-hot'); t.label.classList.add('wc-hot'); }
        });
      });
      el.addEventListener('pointerleave', () => {
        state.trails.forEach((t) => { t.g.classList.remove('wc-hot'); t.label.classList.remove('wc-hot'); });
      });

      // header: buttons + drag to move (click a minimized card to expand it)
      c.head.addEventListener('click', (e) => {
        if (e.target.closest('.wc-close')) closeCard(c, e.shiftKey);
        else if (e.target.closest('.wc-fullbtn')) enterFull(c);
        else if (e.target.closest('.wc-padbtn')) togglePad(c);
        else if (e.target.closest('.wc-minbtn')) setMin(c, !c.minimized);
      });
      c.head.addEventListener('pointerdown', (e) => {
        if (e.button !== 0 || e.target.closest('button, a')) return;
        e.preventDefault();
        c.head.setPointerCapture(e.pointerId);
        const sx = e.clientX, sy = e.clientY, ox = c.x, oy = c.y;
        let moved = false;
        const mv = (ev) => {
          const dx = ev.clientX - sx, dy = ev.clientY - sy;
          if (!moved && Math.hypot(dx, dy) < 4) return;
          moved = true;
          c.x = ox + dx / state.zoom;
          c.y = oy + dy / state.zoom;
          place(c);
          queueTrails();
        };
        const up = (ev) => {
          c.head.removeEventListener('pointermove', mv);
          c.head.removeEventListener('pointerup', up);
          c.head.removeEventListener('pointercancel', up);
          try { c.head.releasePointerCapture(ev.pointerId); } catch { /* ignore */ }
          if (!moved && c.minimized) setMin(c, false);
        };
        c.head.addEventListener('pointermove', mv);
        c.head.addEventListener('pointerup', up);
        c.head.addEventListener('pointercancel', up);
      });

      const nt = (o.parent && o.anchor) ? addTrail(o.parent, o.anchor, c) : null;
      const panned = ensureVisible(c);
      if (nt && !o.noPicker) offerPicker(nt, panned);

      // content
      if (o.liveNode) {
        fill(c, [clean(o.liveNode)]);
        if (o.hash) setTimeout(() => scrollToId(c, o.hash), 60);
      } else {
        fetchPage(o.title).then((page) => {
          setTitle(c, page.title);
          const doc = new DOMParser().parseFromString(page.html, 'text/html');
          fill(c, [...clean(doc.body).childNodes]);
          if (o.hash) scrollToId(c, o.hash);
        }).catch((err) => {
          c.body.classList.remove('wc-loading');
          c.body.textContent = `Couldn't load "${o.title}" (${err.message}).`;
        });
      }
      return c;
    }

    function closeCard(c, branch) {
      const victims = new Set([c]);
      if (branch) {
        const q = [c];
        while (q.length) {
          const cur = q.pop();
          state.trails.forEach((t) => {
            if (t.parent === cur && !victims.has(t.child)) { victims.add(t.child); q.push(t.child); }
          });
        }
      }
      victims.forEach((v) => {
        state.trails.filter((t) => t.parent === v || t.child === v).forEach(removeTrail);
        if (state.full === v) exitFull(false);
        savePadNow(v);
        if (v.pad) { ro.unobserve(v.pad.el); v.pad.el.remove(); }
        ro.unobserve(v.el);
        v.el.remove();
        cardByEl.delete(v.el);
      });
      state.cards = state.cards.filter((x) => !victims.has(x));
      refreshEmpty();
      queueTrails();
      scheduleMarks();
    }

    // open a link as a card to the right of the card it was clicked in
    function openFromLink(parent, anchor, title, hash) {
      const w = 420, h = 480;
      const a = anchorWorld(parent, anchor);
      const pb = rectOf(parent);
      const p = freeSpot(pb.x + pb.w + 90, Math.max(parent.y, a.y - 40), w, h);
      createCard({ title, x: p.x, y: p.y, w, h, parent, anchor, hash });
    }

    // ---------- links: click opens, drag places ----------
    vp.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
      const a = e.target.closest('.wc-body a[href]');
      if (!a || a.getAttribute('href').startsWith('#')) return;
      const title = titleFromHref(a);
      if (!title) return;
      const parent = cardByEl.get(a.closest('.wc-card'));
      if (!parent) return;
      e.preventDefault();

      const sx = e.clientX, sy = e.clientY;
      let dragging = false;
      const mv = (ev) => {
        if (!dragging && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 5) {
          dragging = true;
          beginLinkDrag(parent, a, title);
        }
        if (dragging) moveLinkDrag(ev);
      };
      const up = (ev) => {
        window.removeEventListener('pointermove', mv);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', cancel);
        if (dragging) endLinkDrag(ev, false);
        else openFromLink(parent, a, title, hashOf(a));
      };
      const cancel = (ev) => {
        window.removeEventListener('pointermove', mv);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', cancel);
        if (dragging) endLinkDrag(ev, true);
      };
      window.addEventListener('pointermove', mv);
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', cancel);
      state.linkCancel = cancel;
    });

    vp.addEventListener('click', (e) => {
      const a = e.target.closest('.wc-body a[href]');
      if (!a || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
      const href = a.getAttribute('href');
      const parent = cardByEl.get(a.closest('.wc-card'));
      if (href.startsWith('#')) { e.preventDefault(); scrollToId(parent, dec(href.slice(1))); return; }
      const title = titleFromHref(a);
      if (!title) return;
      e.preventDefault();
      if (e.detail === 0 && parent) openFromLink(parent, a, title, hashOf(a));   // keyboard activation
    });

    function beginLinkDrag(parent, anchor, title) {
      hidePreview();
      const line = document.createElementNS(SVGNS, 'path');
      line.setAttribute('class', 'wc-dragline');
      svg.appendChild(line);
      ghost.textContent = title;
      ghost.hidden = false;
      root.classList.add('wc-linkdrag');
      state.linkDrag = { parent, anchor, title, line };
    }

    function moveLinkDrag(ev) {
      const d = state.linkDrag;
      if (!d) return;
      ghost.style.transform = `translate(${ev.clientX + 14}px, ${ev.clientY + 14}px)`;
      const p = screenToWorld(ev.clientX, ev.clientY);
      const s = edgePoint(rectOf(d.parent), p.x, p.y);
      d.line.setAttribute('d', curve(s, { x: p.x, y: p.y, nx: 0, ny: 0 }).d);
    }

    function endLinkDrag(ev, cancelled) {
      const d = state.linkDrag;
      state.linkDrag = null;
      state.linkCancel = null;
      if (!d) return;
      d.line.remove();
      ghost.hidden = true;
      root.classList.remove('wc-linkdrag');
      if (cancelled) return;
      const r = vp.getBoundingClientRect();
      if (ev.clientX < r.left || ev.clientX > r.right || ev.clientY < r.top || ev.clientY > r.bottom) return;
      const w = screenToWorld(ev.clientX, ev.clientY);
      createCard({
        title: d.title, x: w.x - 40, y: w.y - 16, w: 420, h: 480,
        parent: d.parent, anchor: d.anchor, hash: hashOf(d.anchor),
      });
    }

    // ---------- toolbar ----------
    bar.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-act]');
      if (!b) return;
      switch (b.dataset.act) {
        case 'zoomin': zoomCenter(1.25); break;
        case 'zoomout': zoomCenter(0.8); break;
        case 'zoomreset': zoomCenter(1 / state.zoom); break;
        case 'fit': fit(); break;
        case 'minall': {
          const all = state.cards.every((c) => c.minimized);
          state.cards.forEach((c) => setMin(c, !all));
          break;
        }
        case 'closeall':
          if (state.cards.length || state.notes.length) {
            wcConfirm('Close all cards and text boxes?').then((ok) => {
              if (!ok) return;
              [...state.cards].forEach((c) => closeCard(c, false));
              [...state.notes].forEach(removeNote);
            });
          }
          break;
        case 'note': {
          const r = vp.getBoundingClientRect();
          const p = screenToWorld(r.left + r.width / 2, r.top + r.height / 2);
          const k = state.notes.length % 6;
          createNote(p.x - 130 + k * 24, p.y - 40 + k * 24);
          break;
        }
        case 'dots': setDots(!state.dots, true); break;
        case 'off': if (window.WCStore && WCStore.quit) WCStore.quit(); break;   // desktop: quit the app
      }
    });

    function setDots(on, save) {
      state.dots = on;
      root.classList.toggle('wc-nodots', !on);
      dotsBtn.classList.toggle('on', on);
      if (save) chrome.storage.local.set({ showDots: on });
    }
    chrome.storage.local.get({ showDots: true }, (v) => setDots(v.showDots !== false, false));

    // ---------- search ----------
    let timer;
    function go(t) {
      if (!t) return;
      input.value = '';
      results.hidden = true;
      input.blur();
      const r = vp.getBoundingClientRect();
      const c = screenToWorld(r.left + r.width / 2, r.top + r.height / 2);
      const p = freeSpot(c.x - 210, c.y - 240, 420, 480);
      const nc = createCard({ title: t, x: p.x, y: p.y, w: 420, h: 480 });
      if (state.full) enterFull(nc);
    }

    input.addEventListener('input', () => {
      clearTimeout(timer);
      const q = input.value.trim();
      if (!q) { results.hidden = true; return; }
      timer = setTimeout(async () => {
        try {
          const r = await fetch(`${WC_API}/w/api.php?action=opensearch&search=${encodeURIComponent(q)}&limit=8&namespace=0&format=json`);
          const titles = (await r.json())[1] || [];
          if (input.value.trim() !== q) return;
          results.replaceChildren(...titles.map((t) => {
            const d = document.createElement('div');
            d.textContent = t;
            d.addEventListener('mousedown', (ev) => { ev.preventDefault(); go(t); });
            return d;
          }));
          results.hidden = !titles.length;
        } catch { /* ignore */ }
      }, 180);
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') go(!results.hidden && results.firstChild ? results.firstChild.textContent : input.value.trim());
      if (e.key === 'Escape') { input.blur(); results.hidden = true; }
    });
    input.addEventListener('blur', () => { results.hidden = true; });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !pop.hidden) { closePicker(); return; }
      if (e.key === 'Escape' && (!selBar.hidden || !ctxMenu.hidden || !prevEl.hidden)) { hideSelUI(); hidePreview(); return; }
      if (e.key === 'Escape' && state.full) { exitFull(false); return; }
      if (e.key === 'Escape' && state.linkDrag && state.linkCancel) { state.linkCancel(e); return; }
      if (/^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName) || document.activeElement.isContentEditable || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === '/') { e.preventDefault(); input.focus(); }
      else if (state.full) return;
      else if (e.key === '+' || e.key === '=') zoomCenter(1.25);
      else if (e.key === '-') zoomCenter(0.8);
      else if (e.key === '0') zoomCenter(1 / state.zoom);
    });

    window.addEventListener('resize', queueTrails);

    // ---------- relationship picker (double-click a label) ----------
    let popTrail = null;
    let popFilter = '';
    let customLabels = [];     // saved by the user, kept in chrome.storage.local
    let recentLabels = [];
    const relSym = new Map();
    REL_GROUPS.forEach((g) => g.items.forEach((it) => { const p = parseRel(it); relSym.set(p.text.toLowerCase(), p.sym); }));

    chrome.storage.local.get({ customLabels: [], recentLabels: [] }, (v) => {
      customLabels = v.customLabels || [];
      recentLabels = v.recentLabels || [];
    });
    chrome.storage.onChanged.addListener((ch, area) => {
      if (area !== 'local') return;
      if (ch.customLabels) customLabels = ch.customLabels.newValue || [];
      if (ch.recentLabels) recentLabels = ch.recentLabels.newValue || [];
      if (ch.labelColors) labelColors = ch.labelColors.newValue || {};
      if (popTrail) renderPickerList();
    });

    const short = (str, n) => (str.length > n ? str.slice(0, n - 1) + '…' : str);
    const sameLabel = (a, b) => a.toLowerCase() === b.toLowerCase();

    function symFor(text) {            // true / false if we know the label, null for unknown text
      const cu = customLabels.find((l) => sameLabel(l.text, text));
      if (cu) return !!cu.sym;
      const k = text.toLowerCase();
      return relSym.has(k) ? relSym.get(k) : null;
    }
    function pushRecent(text, sym) {
      recentLabels = [{ text, sym }, ...recentLabels.filter((l) => !sameLabel(l.text, text))].slice(0, 8);
      chrome.storage.local.set({ recentLabels });
    }
    function saveCustom(text, sym) {
      customLabels = [{ text, sym }, ...customLabels.filter((l) => !sameLabel(l.text, text))].slice(0, 100);
      chrome.storage.local.set({ customLabels });
    }
    function deleteCustom(text) {
      customLabels = customLabels.filter((l) => !sameLabel(l.text, text));
      chrome.storage.local.set({ customLabels });
      if (popTrail) renderPickerList();
    }

    // text == null puts the link text back
    function setRel(t, text, sym) {
      if (text == null) {
        t.custom = null;
      } else {
        t.custom = text;
        if (sym === true) t.dir = 'none';                       // mutual relationship: no arrow
        else if (sym === false && t.dir === 'none') t.dir = 'fwd';
        pushRecent(text, t.dir === 'none');
      }
      styleTrail(t);
      queueTrails();
    }

    const pop = document.createElement('div');
    pop.className = 'wc-pop';
    pop.hidden = true;
    pop.innerHTML = `
      <div class="wc-pop-head"><span class="wc-pop-pair" dir="auto"></span><button class="wc-pop-x" title="Close">×</button></div>
      <div class="wc-pop-dir">
        <button data-dir="fwd" title="Arrow from the first card to the second"><span class="wc-dn wc-dl" dir="auto"></span><svg class="wc-darrow" viewBox="0 0 56 14"><line x1="2" y1="7" x2="42" y2="7"/><path d="M40 1.5 L53 7 L40 12.5 Z"/></svg><span class="wc-dn wc-dr" dir="auto"></span></button>
        <button data-dir="rev" title="Arrow from the second card to the first"><span class="wc-dn wc-dl" dir="auto"></span><svg class="wc-darrow" viewBox="0 0 56 14"><line x1="14" y1="7" x2="54" y2="7"/><path d="M16 1.5 L3 7 L16 12.5 Z"/></svg><span class="wc-dn wc-dr" dir="auto"></span></button>
        <button data-dir="none" title="Plain line, no arrow"><span class="wc-dn wc-dl" dir="auto"></span><svg class="wc-darrow" viewBox="0 0 56 14"><line x1="2" y1="7" x2="54" y2="7"/></svg><span class="wc-dn wc-dr" dir="auto"></span></button>
      </div>
      <div class="wc-pop-input">
        <input type="text" maxlength="60" placeholder="Pick one, or type your own…" dir="auto" spellcheck="false">
        <button class="wc-pop-save" title="Save this label to My labels">☆ Save</button>
      </div>
      <div class="wc-pop-list"></div>
      <div class="wc-pop-foot"><button class="wc-pop-reset">Use link text</button><span>Enter applies · Esc closes</span></div>`;
    root.appendChild(pop);
    const popPair = pop.querySelector('.wc-pop-pair');
    const popDir = pop.querySelector('.wc-pop-dir');
    const popInput = pop.querySelector('input');
    const popList = pop.querySelector('.wc-pop-list');

    function closePicker() { pop.hidden = true; popTrail = null; }

    function renderDir() {
      const t = popTrail;
      if (!t) return;
      popDir.querySelectorAll('button').forEach((btn) => {
        btn.querySelector('.wc-dl').textContent = t.parent.title;     // full names, one option per row
        btn.querySelector('.wc-dr').textContent = t.child.title;
        btn.classList.toggle('on', t.dir === btn.dataset.dir);
      });
    }

    function makeChip(text, sym, deletable) {
      const wrap = document.createElement('span');
      wrap.className = 'wc-chip' + (deletable ? ' wc-chip-custom' : '');
      const b = document.createElement('button');
      b.className = 'wc-chip-main';
      b.textContent = text;
      b.title = sym ? 'Mutual relationship (no arrow)' : 'Directional relationship';
      b.addEventListener('click', () => { if (popTrail) setRel(popTrail, text, sym); closePicker(); });
      wrap.appendChild(b);
      if (deletable) {
        const x = document.createElement('button');
        x.className = 'wc-chip-del';
        x.textContent = '×';
        x.title = 'Delete from My labels';
        x.addEventListener('click', (e) => { e.stopPropagation(); deleteCustom(text); });
        wrap.appendChild(x);
      }
      return wrap;
    }

    function renderPickerList() {
      const f = popFilter.trim().toLowerCase();
      const match = (txt) => !f || txt.toLowerCase().includes(f);
      popList.replaceChildren();
      const section = (title, chips) => {
        if (!chips.length) return;
        const h = document.createElement('div');
        h.className = 'wc-sec';
        h.textContent = title;
        const box = document.createElement('div');
        box.className = 'wc-chips';
        box.append(...chips);
        popList.append(h, box);
      };
      section('Recent', recentLabels.filter((l) => match(l.text)).map((l) => makeChip(l.text, !!l.sym, false)));
      section('My labels', customLabels.filter((l) => match(l.text)).map((l) => makeChip(l.text, !!l.sym, true)));
      const seen = new Set();
      REL_GROUPS.forEach((g) => {
        const chips = [];
        g.items.forEach((it) => {
          const p = parseRel(it), k = p.text.toLowerCase();
          if (seen.has(k) || !match(p.text)) return;
          seen.add(k);
          chips.push(makeChip(p.text, p.sym, false));
        });
        section(g.name, chips);
      });
      if (!popList.childNodes.length) {
        const none = document.createElement('div');
        none.className = 'wc-none';
        none.textContent = 'No match. Press Enter to use “' + popInput.value.trim() + '”.';
        popList.appendChild(none);
      }
    }

    function openPicker(t) {
      popTrail = t;
      popFilter = '';
      popPair.textContent = 'Relationship';
      popInput.value = t.custom != null ? t.custom : '';
      pop.hidden = false;
      renderDir();
      renderPickerList();
      const r = t.label.getBoundingClientRect();
      const pw = pop.offsetWidth, ph = pop.offsetHeight;
      const left = clamp(r.left + r.width / 2 - pw / 2, 8, Math.max(8, window.innerWidth - pw - 8));
      let top = r.bottom + 8;
      if (top + ph > window.innerHeight - 8) top = Math.max(8, r.top - ph - 8);
      pop.style.left = left + 'px';
      pop.style.top = top + 'px';
      setTimeout(() => { popInput.focus(); popInput.select(); }, 0);
    }

    popInput.addEventListener('input', () => { popFilter = popInput.value; renderPickerList(); });
    popInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { closePicker(); return; }
      if (e.key !== 'Enter' || !popTrail) return;
      const v = popInput.value.trim();
      if (!v) setRel(popTrail, null);
      else setRel(popTrail, v, symFor(v));
      closePicker();
    });
    popDir.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-dir]');
      if (!b || !popTrail) return;
      popTrail.dir = b.dataset.dir;
      styleTrail(popTrail);
      queueTrails();
      renderDir();
    });
    pop.querySelector('.wc-pop-x').addEventListener('click', closePicker);
    pop.querySelector('.wc-pop-reset').addEventListener('click', () => {
      if (popTrail) setRel(popTrail, null);
      closePicker();
    });
    pop.querySelector('.wc-pop-save').addEventListener('click', () => {
      if (!popTrail) return;
      const v = popInput.value.trim() || (popTrail.custom || '');
      if (!v) { popInput.focus(); return; }
      saveCustom(v, popTrail.dir === 'none');
      setRel(popTrail, v, symFor(v));
      closePicker();
    });
    document.addEventListener('pointerdown', (e) => {          // click outside closes the picker
      if (pop.hidden || pop.contains(e.target)) return;
      const lab = e.target.closest && e.target.closest('.wc-label');
      if (lab && popTrail && lab === popTrail.label) return;     // its click handler toggles the picker
      closePicker();
    }, true);

    // open the relationship dialog for a freshly made trail (after the view has finished panning)
    function offerPicker(t, delayed) {
      setTimeout(() => {
        if (!state.trails.includes(t)) return;
        if (raf) { cancelAnimationFrame(raf); raf = 0; }
        updateTrails();                      // make sure the label sits where the dialog should point
        openPicker(t);
      }, delayed ? 420 : 0);
    }

    // ---------- text boxes ----------
    const NOTE_TEXT = ['#222222', '#c0392b', '#d35400', '#1e8449', '#0d9488', '#2563eb', '#7c3aed', '#ffffff'];
    const NOTE_BG = ['#fff3a3', '#ffd6d6', '#d9f7d9', '#d6f0ff', '#e8dcff', '#222222'];
    const NOTE_SIZES = [12, 14, 16, 18, 22, 28, 36, 48, 64];
    let lastNoteStyle = { color: '#222222', size: 18, bg: null };

    function removeNote(n) {
      if (!state.notes.includes(n)) return;
      n.el.remove();
      state.notes = state.notes.filter((x) => x !== n);
      refreshEmpty();
    }

    function createNote(x, y) {
      const n = { uid: state.nextId++, x, y, ...lastNoteStyle };
      const el = document.createElement('div');
      el.className = 'wc-note';
      el.innerHTML = `
        <div class="wc-note-bar">
          <span class="wc-grip" title="Drag to move">⠿</span>
          <span class="wc-group" data-kind="color"></span>
          <span class="wc-sep"></span>
          <span class="wc-group" data-kind="bg"></span>
          <span class="wc-sep"></span>
          <button class="wc-sz" data-d="-1" title="Smaller text">A−</button>
          <span class="wc-szv"></span>
          <button class="wc-sz" data-d="1" title="Larger text">A+</button>
          <span class="wc-sep"></span>
          <button class="wc-note-del" title="Delete this text box">×</button>
        </div>
        <div class="wc-note-text" contenteditable="plaintext-only" spellcheck="false" data-placeholder="Type here…" dir="auto"></div>`;
      n.el = el;
      const bar = el.querySelector('.wc-note-bar');
      const textEl = el.querySelector('.wc-note-text');
      const colorBox = el.querySelector('[data-kind="color"]');
      const bgBox = el.querySelector('[data-kind="bg"]');
      const szv = el.querySelector('.wc-szv');

      const swatch = (value, title) => {
        const b = document.createElement('button');
        b.className = 'wc-sw' + (value == null ? ' wc-sw-none' : '');
        b.dataset.v = value == null ? '' : value;
        b.title = title;
        if (value != null) b.style.background = value;
        return b;
      };
      NOTE_TEXT.forEach((v) => colorBox.appendChild(swatch(v, 'Text color')));
      colorBox.title = 'Text color';
      bgBox.appendChild(swatch(null, 'No background'));
      NOTE_BG.forEach((v) => bgBox.appendChild(swatch(v, 'Background color')));

      const apply = () => {
        textEl.style.color = n.color;
        textEl.style.fontSize = n.size + 'px';
        textEl.style.background = n.bg || 'transparent';
        textEl.classList.toggle('wc-bg', !!n.bg);
        szv.textContent = n.size;
        colorBox.querySelectorAll('.wc-sw').forEach((b) => b.classList.toggle('on', b.dataset.v === n.color));
        bgBox.querySelectorAll('.wc-sw').forEach((b) => b.classList.toggle('on', b.dataset.v === (n.bg || '')));
        lastNoteStyle = { color: n.color, size: n.size, bg: n.bg };   // new text boxes start with the last style
      };

      // keep the caret in the text while using the toolbar
      bar.addEventListener('pointerdown', (e) => e.preventDefault());
      bar.addEventListener('click', (e) => {
        const sw = e.target.closest('.wc-sw');
        if (sw) {
          if (sw.parentElement.dataset.kind === 'color') n.color = sw.dataset.v;
          else n.bg = sw.dataset.v || null;
          apply();
          return;
        }
        const sz = e.target.closest('.wc-sz');
        if (sz) {
          let i = NOTE_SIZES.findIndex((v) => v >= n.size);
          if (i < 0) i = NOTE_SIZES.length - 1;
          n.size = NOTE_SIZES[clamp(i + Number(sz.dataset.d), 0, NOTE_SIZES.length - 1)];
          apply();
          return;
        }
        if (e.target.closest('.wc-note-del')) removeNote(n);
      });

      el.querySelector('.wc-grip').addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        const g = e.currentTarget;
        g.setPointerCapture(e.pointerId);
        const sx = e.clientX, sy = e.clientY, ox = n.x, oy = n.y;
        const mv = (ev) => {
          n.x = ox + (ev.clientX - sx) / state.zoom;
          n.y = oy + (ev.clientY - sy) / state.zoom;
          el.style.left = n.x + 'px';
          el.style.top = n.y + 'px';
        };
        const up = (ev) => {
          g.removeEventListener('pointermove', mv);
          g.removeEventListener('pointerup', up);
          g.removeEventListener('pointercancel', up);
          try { g.releasePointerCapture(ev.pointerId); } catch { /* ignore */ }
        };
        g.addEventListener('pointermove', mv);
        g.addEventListener('pointerup', up);
        g.addEventListener('pointercancel', up);
      });

      textEl.addEventListener('keydown', (e) => { if (e.key === 'Escape') textEl.blur(); });
      textEl.addEventListener('blur', (e) => {              // an empty text box disappears when you leave it
        if (el.contains(e.relatedTarget)) return;
        setTimeout(() => {
          if (!textEl.textContent.trim() && document.activeElement !== textEl) removeNote(n);
        }, 0);
      });
      el.addEventListener('pointerdown', () => { el.style.zIndex = ++state.z; }, true);

      el.style.left = n.x + 'px';
      el.style.top = n.y + 'px';
      el.style.zIndex = ++state.z;
      world.appendChild(el);
      state.notes.push(n);
      refreshEmpty();
      apply();
      textEl.focus();
      return n;
    }

    // ---------- notes attached to a card: typed or handwritten, saved per article ----------
    const padKey = (c) => `pad:${WC_HOST()}:${c.canon || c.key}`;
    const hasContent = (r) => !!r.text.trim() || r.ink.length > 0;

    // saved record -> {text, color, mode, ink}; older saves were just a string of text
    function normRec(v) {
      const r = { text: '', color: 'yellow', mode: 'text', ink: [], refs: [], refSeq: 0, refsCollapsed: false };
      if (typeof v === 'string') { r.text = v; return r; }
      if (v && typeof v === 'object') {
        if (typeof v.text === 'string') r.text = v.text;
        if (v.color in PAD_COLORS) r.color = v.color;
        if (v.mode === 'ink') r.mode = 'ink';
        if (Array.isArray(v.ink)) r.ink = v.ink.filter((st) => st && Array.isArray(st.p) && st.p.length >= 3);
        if (Array.isArray(v.refs)) r.refs = v.refs.filter((x) => x && typeof x.q === 'string' && typeof x.n === 'number');
        r.refs.forEach((x) => { if (!(x.color in HL_COLORS)) x.color = 'yellow'; });
        r.refSeq = Math.max(Number(v.refSeq) || 0, ...r.refs.map((x) => x.n), 0);
        if (v.refsCollapsed === true) r.refsCollapsed = true;
        // earlier versions wrote “quote”⏎— Article › Section [n]; the number in front is enough, so tidy those blocks
        // (only when they still match exactly what was generated: anything you edited is left alone)
        r.refs.forEach((x) => {
          const old = '“' + x.q + '”\n— ';
          let at = r.text.indexOf(old);
          while (at >= 0) {
            const lineEnd = r.text.indexOf('\n', at + old.length);
            const end = lineEnd < 0 ? r.text.length : lineEnd;
            if (r.text.slice(at + old.length, end).endsWith(' [' + x.n + ']')) {
              r.text = r.text.slice(0, at) + '[' + x.n + '] “' + x.q + '”' + r.text.slice(end);
              r.migrated = true;
              break;
            }
            at = r.text.indexOf(old, at + 1);
          }
        });
      }
      return r;
    }

    function updatePadBtn(c) {
      const b = c.el.querySelector('.wc-padbtn');
      if (!b) return;
      b.classList.toggle('on', c.padOpen);
      b.classList.toggle('has-notes', c.hasNotes);
    }

    function refreshPadIndicator(c) {            // dot on the pad button + the saved passages to highlight
      if (c.padOpen || c.padLoading || c.padLoaded) return;
      const k = padKey(c);
      chrome.storage.local.get(k, (v) => {
        const rec = normRec(v && v[k]);
        c.hasNotes = !!(v && v[k]) && hasContent(rec);
        c.marks = rec.refs;
        updatePadBtn(c);
        scheduleMarks();
      });
    }

    const inkActive = (c) => !!(c.pad && c.padOpen && !c.minimized && c.pad.rec.mode === 'ink');
    const inkScale = () => (window.devicePixelRatio || 1) * Math.max(1, Math.min(state.zoom, 3));

    // ---- handwriting rendering: smooth curves, width follows pressure (pen) or speed (mouse / finger) ----
    function inkStyle(ctx, st, auto) {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalCompositeOperation = st.e ? 'destination-out' : 'source-over';
      const col = st.e ? '#000' : (st.c || auto);
      ctx.strokeStyle = col;
      ctx.fillStyle = col;
    }

    function drawDot(ctx, st, auto) {
      ctx.save();
      inkStyle(ctx, st, auto);
      const base = st.e ? st.w * 5 : st.w;
      ctx.beginPath();
      ctx.arc(st.p[0], st.p[1], Math.max(0.5, base * st.p[2] / 2), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Curve i (1 .. n-2) bends towards point i and runs between the midpoints on either side of it, so the
    // line is smooth without lagging behind the pen. Returns the next curve index to draw.
    function drawSegments(ctx, st, auto, from, final) {
      const p = st.p, n = p.length / 3;
      if (n < 2) return from;
      const base = st.e ? st.w * 5 : st.w;
      const X = (k) => p[k * 3], Y = (k) => p[k * 3 + 1], F = (k) => p[k * 3 + 2];
      const MX = (k) => (X(k) + X(k + 1)) / 2, MY = (k) => (Y(k) + Y(k + 1)) / 2;
      ctx.save();
      inkStyle(ctx, st, auto);
      if (n === 2) {
        if (final) {
          ctx.lineWidth = base * (F(0) + F(1)) / 2;
          ctx.beginPath();
          ctx.moveTo(X(0), Y(0));
          ctx.lineTo(X(1), Y(1));
          ctx.stroke();
        }
        ctx.restore();
        return from;
      }
      let k = Math.max(1, from);
      for (; k <= n - 2; k++) {
        const sx = k === 1 ? X(0) : MX(k - 1), sy = k === 1 ? Y(0) : MY(k - 1);
        ctx.lineWidth = base * F(k);
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.quadraticCurveTo(X(k), Y(k), MX(k), MY(k));
        ctx.stroke();
      }
      if (final) {                                         // the last little stretch up to the final point
        ctx.lineWidth = base * F(n - 1);
        ctx.beginPath();
        ctx.moveTo(MX(n - 2), MY(n - 2));
        ctx.lineTo(X(n - 1), Y(n - 1));
        ctx.stroke();
      }
      ctx.restore();
      return k;
    }

    function drawStroke(ctx, st, auto) {
      const n = st.p.length / 3;
      if (!n) return;
      if (n === 1) drawDot(ctx, st, auto);
      else drawSegments(ctx, st, auto, 1, true);
    }

    function undoInk(c) {
      const p = c.pad, last = p.rec.ink.pop();
      if (last) { p.redo.push(last); renderInk(c); scheduleSave(c); }
    }
    function redoInk(c) {
      const p = c.pad, back = p.redo.pop();
      if (back) { p.rec.ink.push(back); renderInk(c); scheduleSave(c); }
    }

    // the pointer is a dot the size of the pen (a ring the size of the eraser)
    function brushStyle(c) {
      const p = c.pad;
      if (!p || !p.brush) return;
      const d = Math.max(3, p.tool === 'eraser' ? p.width * 5 : p.width);
      p.brush.style.width = d + 'px';
      p.brush.style.height = d + 'px';
      p.brush.classList.toggle('wc-brush-eraser', p.tool === 'eraser');
      p.brush.style.background = p.tool === 'eraser' ? '' : (p.pen || PAD_COLORS[p.rec.color].text);
      p.brushR = d / 2;
    }
    function brushMove(c, ev) {
      const p = c.pad;
      if (ev.pointerType === 'touch') { p.brush.hidden = true; return; }     // a finger has no pointer to show
      const r = p.canvas.getBoundingClientRect();
      const x = (ev.clientX - r.left) / state.zoom, y = (ev.clientY - r.top) / state.zoom;
      p.brush.hidden = false;
      p.brush.style.transform = `translate(${x - p.brushR}px, ${y - p.brushR}px)`;
    }

    // ---- typed notes: saved quotes are colored through a mirror layer behind the (transparent) textarea ----
    function renderMirror(c) {
      const p = c.pad;
      if (!p || !p.mirror) return;
      const text = p.rec.text, ranges = [], blocks = [];
      p.rec.refs.forEach((ref) => {
        const col = HL_COLORS[ref.color] || HL_COLORS.yellow;
        const tag = '[' + ref.n + ']';
        const needle = tag + ' “' + ref.q + '”';                       // [n] “quote”
        const at = text.lastIndexOf(needle);
        if (at >= 0) {
          ranges.push({ s: at, e: at + tag.length, col, strong: true });
          ranges.push({ s: at + tag.length + 1, e: at + needle.length, col });
          blocks.push({ ref, s: at, e: at + needle.length, tagS: at, tagE: at + tag.length });
          return;
        }
        // older notes that were edited by hand: “quote”⏎— Source [n]
        let t = text.lastIndexOf(tag), ls = -1;
        while (t >= 0) {
          const s0 = t === 0 ? 0 : text.lastIndexOf('\n', t - 1) + 1;
          if (text.charAt(s0) === '—') { ls = s0; break; }
          t = t === 0 ? -1 : text.lastIndexOf(tag, t - 1);
        }
        if (ls < 0) return;
        ranges.push({ s: t, e: t + tag.length, col, strong: true });
        const qLen = ref.q.length, qEnd = ls - 1, qStart = qEnd - qLen - 2;
        let from = ls;
        if (qStart >= 0 && text.charAt(qStart) === '“' && text.charAt(qEnd - 1) === '”' &&
            text.slice(qStart + 1, qStart + 1 + qLen) === ref.q) {
          ranges.push({ s: qStart, e: qEnd, col });
          from = qStart;
        }
        blocks.push({ ref, s: from, e: t + tag.length, tagS: t, tagE: t + tag.length });
      });
      p.blocks = blocks;
      ranges.sort((a, b) => a.s - b.s);
      const parts = [];
      let pos = 0;
      for (const r of ranges) {
        if (r.s < pos) continue;
        if (r.s > pos) parts.push(document.createTextNode(text.slice(pos, r.s)));
        const m = document.createElement('mark');
        m.className = 'wc-q' + (r.strong ? ' wc-qtag' : '');
        m.style.setProperty('--hl', r.col);
        m.textContent = text.slice(r.s, r.e);
        parts.push(m);
        pos = r.e;
      }
      parts.push(document.createTextNode(text.slice(pos) + '\u200b'));
      p.mirror.replaceChildren(...parts);
      syncMirror(c);
    }
    function syncMirror(c) {
      const p = c.pad;
      if (!p || !p.mirror) return;
      p.mirror.style.right = Math.max(0, p.text.offsetWidth - p.text.clientWidth) + 'px';   // same wrapping as the textarea
      p.mirror.scrollTop = p.text.scrollTop;
    }

    function renderInk(c) {
      const p = c.pad;
      if (!p) return;
      const cv = p.canvas, cssW = cv.clientWidth, cssH = cv.clientHeight;
      if (!cssW || !cssH) return;
      const sc = inkScale();
      const W = Math.round(cssW * sc), H = Math.round(cssH * sc);
      if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
      const ctx = cv.getContext && cv.getContext('2d');
      if (!ctx) return;
      p.sc = sc;
      p.cssKey = cssW + 'x' + cssH + '@' + sc;
      ctx.setTransform(sc, 0, 0, sc, 0, 0);
      ctx.clearRect(0, 0, cssW, cssH);
      const auto = PAD_COLORS[p.rec.color].text;
      p.rec.ink.forEach((st) => drawStroke(ctx, st, auto));
    }

    // redraw the handwriting when the pad's size (or the zoom) changed
    function inkCheck(c) {
      const p = c.pad;
      if (!p || p.rec.mode !== 'ink') return;
      const key = p.canvas.clientWidth + 'x' + p.canvas.clientHeight + '@' + inkScale();
      if (key !== p.cssKey) renderInk(c);
    }

    function placePad(c) {
      const p = c.pad;
      if (!p) return;
      if (c.fullView) return;                        // in full view the pad lives in the side column
      const show = c.padOpen && !c.minimized;
      p.el.hidden = !show;
      if (!show) { c.padBox = null; return; }
      const cw = c.el.offsetWidth, ch = c.el.offsetHeight, pw = p.el.offsetWidth;
      const x = p.side === 'right' ? c.x + cw : c.x - pw;
      p.el.style.left = x + 'px';
      p.el.style.top = c.y + 'px';
      p.el.style.height = ch + 'px';
      c.padBox = { x, y: c.y, w: pw, h: ch };
      inkCheck(c);
      if (p.rec.mode === 'text') syncMirror(c);
    }

    function savePadNow(c) {
      if (!c.pad) return;
      clearTimeout(c.padTimer);
      if (!c.padLoaded) return;                  // never overwrite notes that were not loaded yet
      const r = c.pad.rec, k = c.padKeyUsed;
      if (!hasContent(r) && r.color === 'yellow') chrome.storage.local.remove(k);
      else chrome.storage.local.set({ [k]: { text: r.text, color: r.color, mode: r.mode, ink: r.ink, refs: r.refs, refSeq: r.refSeq, refsCollapsed: r.refsCollapsed } });
      c.hasNotes = hasContent(r);
      c.pad.status.textContent = 'Saved';
      updatePadBtn(c);
    }
    function scheduleSave(c) {
      c.pad.status.textContent = 'Saving…';
      clearTimeout(c.padTimer);
      c.padTimer = setTimeout(() => savePadNow(c), 400);
    }

    // paper color, mode tabs and pen buttons all reflect the pad's record
    function applyPadUI(c) {
      const p = c.pad, r = p.rec, col = PAD_COLORS[r.color];
      const st = p.el.style;
      st.setProperty('--pb', col.bg);
      st.setProperty('--ph', col.head);
      st.setProperty('--pbd', col.border);
      st.setProperty('--pt', col.text);
      st.setProperty('--pm', col.muted);
      p.el.dataset.mode = r.mode;
      p.el.querySelectorAll('.wc-pad-tab').forEach((b) => b.classList.toggle('on', b.dataset.mode === r.mode));
      p.el.querySelectorAll('.wc-pad-col').forEach((b) => b.classList.toggle('on', b.dataset.c === r.color));
      p.el.querySelectorAll('.wc-ink-tool').forEach((b) => b.classList.toggle('on', b.dataset.tool === p.tool));
      p.el.querySelectorAll('.wc-ink-c').forEach((b) => b.classList.toggle('on', b.dataset.c === (p.pen || '')));
      p.el.querySelectorAll('.wc-ink-w').forEach((b) => b.classList.toggle('on', Number(b.dataset.w) === p.width));
      brushStyle(c);
      if (r.mode === 'text') renderMirror(c);
      if (r.mode === 'ink') renderInk(c);
    }

    function createPad(c) {
      const el = document.createElement('aside');
      el.className = 'wc-pad';
      el.dataset.side = 'right';
      el.dataset.mode = 'text';
      el.innerHTML = `
        <header class="wc-pad-head">
          <span class="wc-pad-title">Notes</span>
          <span class="wc-pad-tabs">
            <button class="wc-pad-tab on" data-mode="text" title="Typed notes">Aa</button>
            <button class="wc-pad-tab" data-mode="ink" title="Handwritten notes">✍</button>
          </span>
          <span class="wc-pad-grow"></span>
          <span class="wc-pad-tools">
            <button class="wc-pad-palette" title="Change the pad color">◐</button>
            <button class="wc-pad-side" title="Move to the other side of the card">⇄</button>
            <button class="wc-pad-x" title="Close notes (they are kept)">×</button>
          </span>
        </header>
        <div class="wc-pad-colors" hidden></div>
        <div class="wc-pad-ink">
          <button class="wc-ink-tool on" data-tool="pen" title="Pen">✎</button>
          <button class="wc-ink-tool" data-tool="eraser" title="Eraser">⌫</button>
          <span class="wc-sep"></span>
          <span class="wc-ink-colors"></span>
          <span class="wc-sep"></span>
          <button class="wc-ink-w" data-w="1.5" title="Fine"><i style="width:2px;height:2px"></i></button>
          <button class="wc-ink-w on" data-w="3" title="Medium"><i style="width:4px;height:4px"></i></button>
          <button class="wc-ink-w" data-w="6" title="Bold"><i style="width:7px;height:7px"></i></button>
          <button class="wc-ink-w" data-w="12" title="Marker"><i style="width:11px;height:11px"></i></button>
          <span class="wc-sep"></span>
          <button class="wc-ink-undo" title="Undo">↶</button>
          <button class="wc-ink-redo" title="Redo">↷</button>
          <button class="wc-ink-clear" title="Erase all handwriting">⌦</button>
        </div>
        <div class="wc-pad-body">
          <div class="wc-pad-textwrap">
            <div class="wc-pad-mirror" aria-hidden="true" dir="auto"></div>
            <textarea class="wc-pad-text" placeholder="Take notes about this article…" spellcheck="false" dir="auto"></textarea>
          </div>
          <div class="wc-pad-refs" hidden></div>
          <canvas class="wc-pad-canvas"></canvas>
          <div class="wc-brush" hidden></div>
        </div>
        <div class="wc-pad-foot"><span class="wc-pad-status">Saved</span></div>
        <div class="wc-pad-edge" title="Drag to change the width of the notes"></div>
        <div class="wc-pad-grip" title="Drag to resize the card"></div>`;
      const pad = {
        el, side: 'right', rec: normRec(null), redo: [], tool: 'pen', pen: null, width: 3, sc: 1, cssKey: '',
        penAt: 0, drawing: null, brushR: 2,
        text: el.querySelector('.wc-pad-text'), canvas: el.querySelector('.wc-pad-canvas'),
        status: el.querySelector('.wc-pad-status'), refsBox: el.querySelector('.wc-pad-refs'),
        mirror: el.querySelector('.wc-pad-mirror'), brush: el.querySelector('.wc-brush'),
      };
      c.pad = pad;

      // swatches: paper colors and pen colors
      const colorsBox = el.querySelector('.wc-pad-colors');
      Object.keys(PAD_COLORS).forEach((key) => {
        const b = document.createElement('button');
        b.className = 'wc-pad-col';
        b.dataset.c = key;
        b.title = key[0].toUpperCase() + key.slice(1);
        b.style.background = key === 'dark' ? PAD_COLORS[key].bg : PAD_COLORS[key].head;
        colorsBox.appendChild(b);
      });
      const inkColors = el.querySelector('.wc-ink-colors');
      [null, ...INK_COLORS].forEach((v) => {
        const b = document.createElement('button');
        b.className = 'wc-ink-c' + (v == null ? ' wc-ink-auto' : '');
        b.dataset.c = v || '';
        b.title = v == null ? 'Automatic (follows the pad color)' : 'Pen color';
        if (v) b.style.background = v;
        inkColors.appendChild(b);
      });

      // header buttons
      el.querySelector('.wc-pad-side').addEventListener('click', () => {
        pad.side = pad.side === 'right' ? 'left' : 'right';
        el.dataset.side = pad.side;
        placePad(c);
        applyFullSide(c);
        queueTrails();
      });
      el.querySelector('.wc-pad-x').addEventListener('click', () => (c.fullView ? setFullNotes(false) : togglePad(c)));
      el.querySelector('.wc-pad-palette').addEventListener('click', () => { colorsBox.hidden = !colorsBox.hidden; });
      colorsBox.addEventListener('click', (e) => {
        const b = e.target.closest('.wc-pad-col');
        if (!b || !c.padLoaded) return;
        pad.rec.color = b.dataset.c;
        applyPadUI(c);
        scheduleSave(c);
      });
      el.querySelector('.wc-pad-tabs').addEventListener('click', (e) => {
        const b = e.target.closest('.wc-pad-tab');
        if (!b || !c.padLoaded) return;
        pad.rec.mode = b.dataset.mode;
        applyPadUI(c);
        scheduleSave(c);
        if (pad.rec.mode === 'text') pad.text.focus();
      });

      // typed notes
      pad.text.addEventListener('input', () => { pad.rec.text = pad.text.value; renderMirror(c); scheduleSave(c); });
      pad.text.addEventListener('scroll', () => syncMirror(c), { passive: true });
      // one click on a reference number opens it ([2] in front of a note); Ctrl/Cmd+click anywhere in the note works too
      pad.text.addEventListener('click', (e) => {
        if (!c.padLoaded) return;
        const ta = pad.text;
        if (ta.selectionStart !== ta.selectionEnd) return;               // selecting text, not clicking
        const pos = ta.selectionStart, blocks = pad.blocks || [];
        let hit = blocks.find((b) => pos > b.tagS && pos <= b.tagE);
        if (!hit && (e.ctrlKey || e.metaKey)) hit = blocks.find((b) => pos >= b.s && pos <= b.e);
        let ref = hit && hit.ref;
        if (!ref) {                                                       // a [n] you typed yourself
          const re = /\[(\d+)\]/g;
          let t;
          while ((t = re.exec(ta.value))) {
            if (pos > t.index && pos <= t.index + t[0].length) { ref = pad.rec.refs.find((x) => x.n === Number(t[1])); break; }
          }
        }
        if (ref) goToRef(c, ref);
      });

      // pen / eraser / colors / widths / undo
      el.querySelector('.wc-pad-ink').addEventListener('click', (e) => {
        const t = e.target.closest('button');
        if (!t) return;
        if (t.classList.contains('wc-ink-tool')) pad.tool = t.dataset.tool;
        else if (t.classList.contains('wc-ink-c')) { pad.pen = t.dataset.c || null; pad.tool = 'pen'; }
        else if (t.classList.contains('wc-ink-w')) pad.width = Number(t.dataset.w);
        else if (t.classList.contains('wc-ink-undo')) undoInk(c);
        else if (t.classList.contains('wc-ink-redo')) redoInk(c);
        else if (t.classList.contains('wc-ink-clear')) {
          if (pad.rec.ink.length) {
            wcConfirm('Erase all handwriting on this pad?').then((ok) => {
              if (!ok) return;
              pad.rec.ink = [];
              pad.redo = [];
              renderInk(c);
              scheduleSave(c);
            });
          }
        }
        applyPadUI(c);
      });

      // handwriting: mouse, pen (pressure-sensitive) or touch
      const cv = pad.canvas;
      cv.tabIndex = 0;
      cv.addEventListener('pointermove', (e) => {
        if (e.pointerType === 'pen') pad.penAt = performance.now();
        brushMove(c, e);
      });
      cv.addEventListener('pointerleave', () => { pad.brush.hidden = true; });
      cv.addEventListener('keydown', (e) => {                       // Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z or Ctrl+Y
        if (!(e.ctrlKey || e.metaKey)) return;
        const k = (e.key || '').toLowerCase();
        if (k === 'z' && !e.shiftKey) { e.preventDefault(); e.stopPropagation(); undoInk(c); }
        else if ((k === 'z' && e.shiftKey) || k === 'y') { e.preventDefault(); e.stopPropagation(); redoInk(c); }
      });
      cv.addEventListener('pointerdown', (e) => {
        if (!c.padLoaded || pad.drawing !== null) return;
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        if (e.pointerType === 'pen') pad.penAt = performance.now();
        // palm rejection: ignore touches while a pen is in use and very large contacts
        if (e.pointerType === 'touch' && (performance.now() - pad.penAt < 1200 || (e.width || 0) > 40)) return;
        e.preventDefault();
        cv.focus({ preventScroll: true });
        cv.setPointerCapture(e.pointerId);
        pad.drawing = e.pointerId;
        const eraser = pad.tool === 'eraser';
        const stroke = { c: eraser ? null : pad.pen, w: pad.width, e: eraser, p: [] };
        pad.rec.ink.push(stroke);
        pad.redo = [];
        const ctx = cv.getContext && cv.getContext('2d');
        const auto = PAD_COLORS[pad.rec.color].text;
        let sx = 0, sy = 0, f = 1, lastT = 0, nextSeg = 1;

        // add a point: a little stabilizer follows the pointer slightly behind (hand shake is smoothed out);
        // width comes from pen pressure, or from speed for a mouse / finger (slower = a touch thicker, like ink)
        const add = (ev, first, k) => {
          const r = cv.getBoundingClientRect();
          const rx = (ev.clientX - r.left) / state.zoom, ry = (ev.clientY - r.top) / state.zoom;
          const gain = k || (ev.pointerType === 'pen' ? 0.72 : 0.55);
          const x = first ? rx : sx + (rx - sx) * gain, y = first ? ry : sy + (ry - sy) * gain;
          const dist = Math.hypot(x - sx, y - sy);
          if (!first && dist < 0.4) return;                          // ignore jitter
          let target = 1;
          if (ev.pointerType === 'pen') target = 0.35 + 1.3 * (ev.pressure || 0.5);
          else if (!first) target = 1.25 - 0.45 * Math.min(1, (dist / Math.max(1, ev.timeStamp - lastT)) / 1.2);
          f = first ? target : f * 0.7 + target * 0.3;
          sx = x; sy = y; lastT = ev.timeStamp;
          stroke.p.push(Math.round(x * 10) / 10, Math.round(y * 10) / 10, Math.round(f * 100) / 100);
        };
        const paint = (final) => {
          if (!ctx) return;
          ctx.setTransform(pad.sc, 0, 0, pad.sc, 0, 0);
          nextSeg = drawSegments(ctx, stroke, auto, nextSeg, final);
        };

        sx = (e.clientX - cv.getBoundingClientRect().left) / state.zoom;
        sy = (e.clientY - cv.getBoundingClientRect().top) / state.zoom;
        lastT = e.timeStamp;
        add(e, true);
        if (ctx) { ctx.setTransform(pad.sc, 0, 0, pad.sc, 0, 0); drawDot(ctx, stroke, auto); }
        brushMove(c, e);

        const mv = (ev) => {
          const evs = ev.getCoalescedEvents ? ev.getCoalescedEvents() : [];
          (evs.length ? evs : [ev]).forEach((x) => add(x, false));
          paint(false);
        };
        const up = (ev) => {
          cv.removeEventListener('pointermove', mv);
          cv.removeEventListener('pointerup', up);
          cv.removeEventListener('pointercancel', up);
          try { cv.releasePointerCapture(ev.pointerId); } catch { /* ignore */ }
          add(ev, false, 1);                                           // finish exactly where the pen was lifted
          paint(true);
          pad.drawing = null;
          scheduleSave(c);
        };
        cv.addEventListener('pointermove', mv);
        cv.addEventListener('pointerup', up);
        cv.addEventListener('pointercancel', up);
      });

      // resize the card from the notes: the corner grip changes the card's width and height
      // (the notes follow it), the edge handle changes the width of the notes themselves
      const drag = (handle, onMove) => handle.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        handle.setPointerCapture(e.pointerId);
        const start = { x: e.clientX, y: e.clientY, w: c.el.offsetWidth, h: c.el.offsetHeight, cx: c.x, pw: el.offsetWidth };
        const mv = (ev) => onMove(start, (ev.clientX - start.x) / state.zoom, (ev.clientY - start.y) / state.zoom);
        const up = (ev) => {
          handle.removeEventListener('pointermove', mv);
          handle.removeEventListener('pointerup', up);
          handle.removeEventListener('pointercancel', up);
          try { handle.releasePointerCapture(ev.pointerId); } catch { /* ignore */ }
        };
        handle.addEventListener('pointermove', mv);
        handle.addEventListener('pointerup', up);
        handle.addEventListener('pointercancel', up);
      });
      drag(el.querySelector('.wc-pad-grip'), (st, dx, dy) => {
        const left = pad.side === 'left';
        const nw = Math.max(240, st.w + (left ? -dx : dx));            // on the left the card grows towards the left
        const nh = Math.max(110, st.h + dy);
        if (left) c.x = st.cx + (st.w - nw);
        c.el.style.width = nw + 'px';
        c.el.style.height = nh + 'px';
        place(c);
        queueTrails();
      });
      drag(el.querySelector('.wc-pad-edge'), (st, dx) => {
        const nw = clamp(st.pw + (pad.side === 'left' ? -dx : dx), 220, 700);
        el.style.width = nw + 'px';
        placePad(c);
        queueTrails();
      });

      el.addEventListener('pointerdown', () => focusCard(c), true);
      world.appendChild(el);
      ro.observe(el);
      focusCard(c);
      applyPadUI(c);
    }

    // load the saved notes the first time they are needed (several callers can wait on the same load)
    function loadPad(c, cb) {
      if (!c.pad) createPad(c);
      if (c.padLoaded) { if (cb) cb(); return; }
      (c.padQ = c.padQ || []).push(cb);
      if (c.padLoading) return;
      c.padLoading = true;
      const k = padKey(c);
      c.padKeyUsed = k;
      c.pad.text.disabled = true;
      chrome.storage.local.get(k, (v) => {
        c.pad.rec = normRec(v && v[k]);
        c.pad.text.value = c.pad.rec.text;
        c.pad.text.disabled = false;
        c.padLoaded = true;
        c.padLoading = false;
        if (c.pad.rec.migrated) { c.pad.rec.migrated = false; scheduleSave(c); }
        applyPadUI(c);
        renderRefs(c);
        scheduleMarks();
        const q = c.padQ || [];
        c.padQ = null;
        q.forEach((f) => { if (f) f(); });
      });
    }

    function togglePad(c) {
      if (!c.pad) createPad(c);
      c.padOpen = !c.padOpen;
      if (c.padOpen) {
        if (c.minimized) setMin(c, false);
        c.pad.el.hidden = false;
        loadPad(c, () => { if (c.padOpen && c.pad.rec.mode === 'text') c.pad.text.focus(); });
      } else {
        savePadNow(c);
      }
      updatePadBtn(c);
      placePad(c);
      queueTrails();
      if (c.padOpen) ensureVisible(c);
    }

    // references saved with the notes: click to jump back to the passage
    function renderRefs(c) {
      const p = c.pad;
      if (!p) return;
      const rec = p.rec, refs = rec.refs;
      p.refsBox.hidden = !refs.length;
      p.refsBox.replaceChildren();
      if (!refs.length) return;
      const h = document.createElement('button');                   // click the header to collapse / expand the list
      h.className = 'wc-refs-head';
      h.title = rec.refsCollapsed ? 'Show the references' : 'Hide the references';
      h.textContent = (rec.refsCollapsed ? '▸ ' : '▾ ') + `References (${refs.length})` +
        (rec.refsCollapsed ? '' : ' · click one to jump to the passage');
      h.addEventListener('click', () => { rec.refsCollapsed = !rec.refsCollapsed; renderRefs(c); scheduleSave(c); });
      p.refsBox.appendChild(h);
      if (rec.refsCollapsed) return;
      refs.forEach((ref) => {
        const row = document.createElement('div');
        row.className = 'wc-ref';
        row.style.setProperty('--hl', HL_COLORS[ref.color] || HL_COLORS.yellow);
        const go = document.createElement('button');
        go.className = 'wc-ref-go';
        go.title = 'Jump to this passage in the article';
        const n = document.createElement('b');
        n.textContent = `[${ref.n}]`;
        const q = document.createElement('span');
        q.className = 'wc-ref-q';
        q.textContent = '“' + short(ref.q.replace(/\s+/g, ' '), 90) + '”';
        const src = document.createElement('span');
        src.className = 'wc-ref-src';
        src.textContent = ref.sec ? ref.sec + ' ↗' : 'in the article ↗';
        go.append(n, q, src);
        go.addEventListener('click', () => goToRef(c, ref));
        const del = document.createElement('button');
        del.className = 'wc-ref-del';
        del.textContent = '×';
        del.title = 'Remove this reference';
        del.addEventListener('click', () => removeRef(c, ref));
        row.append(go, del);
        p.refsBox.appendChild(row);
      });
    }

    // remove a reference: the numbers start over (1, 2, 3 …) and the [n] tags in the notes text follow along
    function removeRef(c, ref) {
      const p = c.pad, rec = p.rec;
      const keep = rec.refs.filter((x) => x !== ref).sort((a, b) => a.n - b.n);
      const map = new Map();
      keep.forEach((x, i) => map.set(x.n, i + 1));
      const top = p.text.scrollTop;
      rec.text = rec.text.split('\n').map((line) => {
        let m = /^\[(\d+)\] (“.*)$/.exec(line);                       // "[n] “quote”"
        if (m) {
          const num = Number(m[1]);
          if (num === ref.n) return m[2];                            // the quote stays, only its stale number goes
          return map.has(num) ? '[' + map.get(num) + '] ' + m[2] : line;
        }
        m = /^(—\s.*?)\s*\[(\d+)\](\s*)$/.exec(line);              // older "— Source [n]" lines
        if (!m) return line;
        const num = Number(m[2]);
        if (num === ref.n) return m[1];
        return map.has(num) ? m[1] + ' [' + map.get(num) + ']' + m[3] : line;
      }).join('\n');
      keep.forEach((x) => { x.n = map.get(x.n); });
      rec.refs = keep;
      rec.refSeq = keep.length;
      p.text.value = rec.text;
      p.text.scrollTop = top;
      renderRefs(c);
      renderMirror(c);
      scheduleSave(c);
      scheduleMarks();
    }

    // ---------- full view: one card's article and its notes, in place of the canvas ----------
    function applyFullSide(c) {
      if (state.full !== c) return;
      fullMain.classList.toggle('wc-notes-left', !!c.pad && c.pad.side === 'left');
    }
    function setFullNotes(on) {
      state.fullNotes = on;
      fullSide.hidden = !on;
      fullNotesBtn.classList.toggle('on', on);
      const c = state.full;
      if (on && c && c.pad && c.pad.rec.mode === 'ink') requestAnimationFrame(() => renderInk(c));
    }

    // the card's own article element (and its notes) are moved here, so nothing is rebuilt or lost
    function enterFull(c) {
      if (!c || state.full === c || !state.cards.includes(c)) return;
      if (state.full) exitFull(true);
      hidePreview();
      hideSelUI();
      closePicker();
      state.full = c;
      c.fullView = true;
      const sc = c.body.scrollTop;
      fullTitle.textContent = c.title;
      fullExt.href = '/wiki/' + encodeURIComponent(c.title.replace(/ /g, '_'));
      fullArticle.replaceChildren(c.body);
      c.body.scrollTop = sc;
      if (!c.pad) createPad(c);
      c.pad.el.classList.add('wc-pad-full');
      c.pad.el.hidden = false;
      fullSide.replaceChildren(c.pad.el);
      applyFullSide(c);
      loadPad(c, () => applyPadUI(c));
      vp.style.visibility = 'hidden';
      full.hidden = false;
      root.classList.add('wc-fullview');
      setFullNotes(state.fullNotes);
      scheduleMarks();
    }

    function exitFull(keepOpen) {
      const c = state.full;
      if (!c) return;
      const sc = c.body.scrollTop;
      c.el.appendChild(c.body);
      if (c.pad) {
        c.pad.el.classList.remove('wc-pad-full');
        world.appendChild(c.pad.el);
      }
      c.fullView = false;
      state.full = null;
      if (!keepOpen) {
        full.hidden = true;
        vp.style.visibility = '';
        root.classList.remove('wc-fullview');
      }
      state.cards.forEach(placePad);
      queueTrails();
      c.body.scrollTop = sc;
      scheduleMarks();
      if (!keepOpen) pulse(c);
    }

    fullBack.addEventListener('click', () => exitFull(false));
    fullNotesBtn.addEventListener('click', () => setFullNotes(!state.fullNotes));

    // links in full view: open the article as a card (with its trail) and show it in full view
    full.addEventListener('click', (e) => {
      const a = e.target.closest('.wc-body a[href]');
      const c = state.full;
      if (!a || !c || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
      const href = a.getAttribute('href');
      if (href.startsWith('#')) { e.preventDefault(); scrollToId(c, dec(href.slice(1))); return; }
      const t = titleFromHref(a);
      if (!t) return;
      e.preventDefault();
      const pb = rectOf(c);
      const spot = freeSpot(pb.x + pb.w + 90, c.y, 420, 480);
      const child = createCard({ title: t, x: spot.x, y: spot.y, w: 420, h: 480, parent: c, anchor: a, hash: hashOf(a), noPicker: true });
      enterFull(child);
    });

    // ---------- link previews (Wikipedia-style hover cards) ----------
    const prevCache = new Map();
    let prevTimer = 0, prevHide = 0, prevToken = 0;

    function hidePreview() {
      prevToken++;
      clearTimeout(prevTimer);
      clearTimeout(prevHide);
      prevEl.hidden = true;
    }

    async function showPreview(title, x, y) {
      const my = ++prevToken;
      let d = prevCache.get(title);
      if (!d) {
        try {
          const r = await fetch(`${WC_API}/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`);
          d = r.ok ? await r.json() : { missing: true };
        } catch { d = { missing: true }; }
        prevCache.set(title, d);
      }
      if (my !== prevToken || d.missing || !d.extract) return;
      prevEl.dir = pageDir;
      prevEl.replaceChildren();
      if (d.thumbnail && d.thumbnail.source) {
        const img = document.createElement('img');
        img.src = d.thumbnail.source;
        img.draggable = false;
        prevEl.appendChild(img);
      }
      const h = document.createElement('h4');
      h.textContent = d.title || title;
      prevEl.appendChild(h);
      if (d.description) {
        const ds = document.createElement('div');
        ds.className = 'wc-prev-desc';
        ds.textContent = d.description;
        prevEl.appendChild(ds);
      }
      const p = document.createElement('p');
      p.textContent = d.extract;
      prevEl.appendChild(p);
      prevEl.hidden = false;
      const w = prevEl.offsetWidth || 340, hh = prevEl.offsetHeight || 160;
      prevEl.style.left = clamp(x - 24, 8, Math.max(8, window.innerWidth - w - 8)) + 'px';
      let top = y + 20;
      if (top + hh > window.innerHeight - 8) top = Math.max(8, y - hh - 14);
      prevEl.style.top = top + 'px';
    }

    root.addEventListener('mouseover', (e) => {
      const a = e.target.closest && e.target.closest('.wc-body a[href]');
      if (!a || state.linkDrag || a.getAttribute('href').startsWith('#')) return;
      const t = titleFromHref(a);
      if (!t) return;
      clearTimeout(prevHide);
      clearTimeout(prevTimer);
      const x = e.clientX, y = e.clientY;
      prevTimer = setTimeout(() => showPreview(t, x, y), 380);
    });
    root.addEventListener('mouseout', (e) => {
      if (!(e.target.closest && e.target.closest('.wc-body a[href]'))) return;
      prevToken++;
      clearTimeout(prevTimer);
      clearTimeout(prevHide);
      prevHide = setTimeout(() => { prevEl.hidden = true; }, 180);
    });
    prevEl.addEventListener('mouseenter', () => clearTimeout(prevHide));
    prevEl.addEventListener('mouseleave', hidePreview);
    root.addEventListener('scroll', hidePreview, true);
    root.addEventListener('pointerdown', (e) => { if (!prevEl.contains(e.target)) hidePreview(); }, true);

    // ---------- selected text -> Notes, with a reference back to the passage ----------
    let selTimer = 0, toastTimer = 0, flashTimer = 0, pointerIsDown = false;

    function showToast(msg) {
      toastEl.textContent = msg;
      toastEl.hidden = false;
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => { toastEl.hidden = true; }, 2200);
    }

    // every non-blank character of an article body, with where it lives (for matching passages)
    function flatten(body) {
      const chars = [], map = [];
      const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT, {
        acceptNode: (n) => (n.parentElement && /^(STYLE|SCRIPT)$/.test(n.parentElement.tagName)
          ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
      });
      let n;
      while ((n = walker.nextNode())) {
        const t = n.nodeValue;
        for (let i = 0; i < t.length; i++) {
          if (/\s/.test(t[i])) continue;
          chars.push(t[i]);
          map.push([n, i]);
        }
      }
      return { flat: chars.join(''), map };
    }
    function firstAtOrAfterStart(map, r) {
      let lo = 0, hi = map.length;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (r.comparePoint(map[mid][0], map[mid][1]) < 0) lo = mid + 1; else hi = mid;
      }
      return lo;
    }
    function lastEndingBeforeEnd(map, r) {
      let lo = 0, hi = map.length;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (r.comparePoint(map[mid][0], map[mid][1] + 1) <= 0) lo = mid + 1; else hi = mid;
      }
      return lo - 1;
    }

    function sectionAt(body, node) {
      let best = null;
      for (const h of body.querySelectorAll('h2, h3, h4')) {
        if (h.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING) best = h; else break;
      }
      if (!best) return { text: '', id: '' };
      return { text: best.textContent.replace(/\[edit\]/gi, '').trim().slice(0, 80), id: best.id || '' };
    }

    function getFlat(c) { return c.flatCache || (c.flatCache = flatten(c.body)); }

    function findPassage(c, ref) {
      const { flat, map } = getFlat(c);
      const needles = [ref.qn, (ref.q || '').replace(/\s+/g, '')].filter(Boolean);
      for (const needle of needles) {
        let best = -1, bestScore = -1, from = 0, i;
        while ((i = flat.indexOf(needle, from)) !== -1) {          // several matches: use the saved context
          let score = 0;
          if (ref.pre && flat.slice(Math.max(0, i - ref.pre.length), i) === ref.pre) score++;
          if (ref.post && flat.slice(i + needle.length, i + needle.length + ref.post.length) === ref.post) score++;
          if (score > bestScore) { best = i; bestScore = score; }
          from = i + 1;
        }
        if (best >= 0) {
          const s0 = map[best], e0 = map[best + needle.length - 1];
          const r = document.createRange();
          r.setStart(s0[0], s0[1]);
          r.setEnd(e0[0], e0[1] + 1);
          return r;
        }
      }
      return null;
    }

    function flashRange(range) {
      clearTimeout(flashTimer);
      try {
        if (window.CSS && CSS.highlights && window.Highlight) {
          const h = new Highlight(range);
          h.priority = 10;
          CSS.highlights.set('wc-ref', h);
          flashTimer = setTimeout(() => CSS.highlights.delete('wc-ref'), 6000);
          return;
        }
      } catch { /* fall back to a normal selection */ }
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }

    // jump to the card (canvas or full view) and light up the referenced passage
    function goToRef(c, ref) {
      if (!state.cards.includes(c)) return;
      if (!state.full) {
        if (c.minimized) setMin(c, false);
        focusCard(c);
        ensureVisible(c);
      }
      afterLoad(c, () => {
        const r = findPassage(c, ref);
        if (!r) {
          if (ref.secId) scrollToId(c, ref.secId);
          showToast('That passage could not be found in the article any more.');
          return;
        }
        const z = c.fullView ? 1 : state.zoom;
        const rr = r.getBoundingClientRect ? r.getBoundingClientRect() : null;
        if (rr) {
          const br = c.body.getBoundingClientRect();
          // instant (not animated) so a single click always lands on the passage
          c.body.scrollTop = Math.max(0, c.body.scrollTop + (rr.top - br.top) / z - c.body.clientHeight / 3);
        }
        flashRange(r);
      });
    }

    const rangeBox = (r) => {
      const b = r.getBoundingClientRect ? r.getBoundingClientRect() : null;
      return b && (b.width || b.height) ? b : null;
    };
    const cardOfBody = (body) => {
      if (!body) return null;
      if (body.closest('.wc-full')) return state.full;
      const el = body.closest('.wc-card');
      return el ? cardByEl.get(el) : null;
    };

    // the current selection, if it lies inside one card's article
    function captureSelection() {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.rangeCount) return null;
      const range = sel.getRangeAt(0);
      const elOf = (n) => (n.nodeType === 1 ? n : n.parentElement);
      const sBody = elOf(range.startContainer) && elOf(range.startContainer).closest('.wc-body');
      const eBody = elOf(range.endContainer) && elOf(range.endContainer).closest('.wc-body');
      if (!sBody || sBody !== eBody) return null;
      const card = cardOfBody(sBody);
      const text = sel.toString().replace(/\n{3,}/g, '\n\n').trim();
      if (!card || !text) return null;
      return { card, body: sBody, range: range.cloneRange(), text };
    }

    function hideSelBar() { selBar.hidden = true; }
    function hideCtx() { ctxMenu.hidden = true; }
    function hideSelUI() { hideSelBar(); hideCtx(); }

    function updateSelBar() {
      if (pointerIsDown) return;
      const info = captureSelection();
      const box = info && rangeBox(info.range);
      if (!info || !box) { hideSelBar(); return; }
      state.sel = info;
      selBar.hidden = false;
      const w = selBar.offsetWidth || 130, h = selBar.offsetHeight || 34;
      let top = box.top - h - 8;
      if (top < 50) top = box.bottom + 8;
      selBar.style.left = clamp(box.left + box.width / 2 - w / 2, 8, Math.max(8, window.innerWidth - w - 8)) + 'px';
      selBar.style.top = top + 'px';
    }
    const scheduleSel = () => { clearTimeout(selTimer); selTimer = setTimeout(updateSelBar, 160); };

    const selColors = selBar.querySelector('.wc-sel-colors');
    const ctxColors = ctxMenu.querySelector('.wc-ctx-colors');
    [selColors, ctxColors].forEach((box) => Object.keys(HL_COLORS).forEach((k) => {
      const b = document.createElement('button');
      b.className = 'wc-hlc';
      b.dataset.c = k;
      b.style.background = HL_COLORS[k];
      b.title = 'Add to Notes with a ' + k + ' highlight';
      box.appendChild(b);
    }));

    function paintSelColors() {
      selBar.style.setProperty('--hl', HL_COLORS[state.hlColor]);
      [selColors, ctxColors].forEach((box) => box.querySelectorAll('.wc-hlc').forEach((b) => b.classList.toggle('on', b.dataset.c === state.hlColor)));
    }
    function setHlColor(col) {
      if (!HL_COLORS[col]) return;
      state.hlColor = col;
      chrome.storage.local.set({ hlColor: col });
      paintSelColors();
    }
    chrome.storage.local.get({ hlColor: 'yellow' }, (v) => { state.hlColor = HL_COLORS[v.hlColor] ? v.hlColor : 'yellow'; paintSelColors(); });
    paintSelColors();

    // save the selection to the card's Notes (with a reference) and highlight it in the card
    function addToNotes(info, color) {
      if (!info || !state.cards.includes(info.card)) return;
      const c = info.card;
      const col = HL_COLORS[color] ? color : state.hlColor;
      if (col !== state.hlColor) setHlColor(col);
      const { flat, map } = getFlat(c);
      const lo = firstAtOrAfterStart(map, info.range);
      const hi = lastEndingBeforeEnd(map, info.range);
      let qn = '', pre = '', post = '';
      if (hi >= lo && lo < map.length) {                   // a fingerprint of where the passage sits
        qn = flat.slice(lo, hi + 1);
        pre = flat.slice(Math.max(0, lo - 30), lo);
        post = flat.slice(hi + 1, hi + 31);
      }
      const sec = sectionAt(info.body, info.range.startContainer);
      if (state.full === c) setFullNotes(true);
      else if (!c.padOpen) togglePad(c);
      loadPad(c, () => {
        const rec = c.pad.rec;
        const n = Math.max(0, ...rec.refs.map((x) => x.n)) + 1;          // numbers always start again from 1
        rec.refSeq = n;
        const quote = info.text.slice(0, 2000);
        rec.refs.push({
          n, title: c.title, key: c.canon || c.key, sec: sec.text, secId: sec.id,
          q: quote, qn: qn.slice(0, 4000), pre, post, color: col,
        });
        const block = '[' + n + '] “' + quote + '”';          // the number in front is the whole reference
        const sep = !rec.text ? '' : (rec.text.endsWith('\n\n') ? '' : (rec.text.endsWith('\n') ? '\n' : '\n\n'));
        rec.text = rec.text + sep + block + '\n';           // existing notes stay exactly as they were
        rec.mode = 'text';
        c.pad.text.value = rec.text;
        applyPadUI(c);
        renderRefs(c);
        c.pad.text.scrollTop = c.pad.text.scrollHeight;
        scheduleSave(c);
        scheduleMarks();                                    // the passage is highlighted in the card too
        showToast('Added to Notes · reference [' + n + ']');
      });
      const sel = window.getSelection();
      if (sel) sel.removeAllRanges();
      hideSelUI();
    }

    selBar.addEventListener('mousedown', (e) => e.preventDefault());         // keep the selection
    selBar.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (b) addToNotes(state.sel, b.dataset.c);            // a color dot adds with that color, the main button with the last one
    });
    ctxMenu.addEventListener('mousedown', (e) => e.preventDefault());
    ctxMenu.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b || !state.sel) return;
      if (b.classList.contains('wc-hlc')) addToNotes(state.sel, b.dataset.c);
      else if (b.dataset.a === 'add') addToNotes(state.sel);
      else if (b.dataset.a === 'copy') {
        const text = state.sel.text;
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).catch(() => document.execCommand('copy'));
        else document.execCommand('copy');
      }
      hideCtx();
    });

    // right-click on selected article text: our menu (otherwise the normal browser menu)
    root.addEventListener('contextmenu', (e) => {
      const body = e.target.closest && e.target.closest('.wc-body');
      if (!body) return;
      const info = captureSelection();
      if (!info || info.body !== body) return;
      e.preventDefault();
      hideSelBar();
      state.sel = info;
      ctxMenu.hidden = false;
      const w = ctxMenu.offsetWidth || 170, h = ctxMenu.offsetHeight || 80;
      ctxMenu.style.left = clamp(e.clientX, 8, Math.max(8, window.innerWidth - w - 8)) + 'px';
      ctxMenu.style.top = clamp(e.clientY, 8, Math.max(8, window.innerHeight - h - 8)) + 'px';
    });

    document.addEventListener('pointerdown', (e) => {
      pointerIsDown = true;
      if (!selBar.contains(e.target)) hideSelBar();
      if (!ctxMenu.contains(e.target)) hideCtx();
      try { if (window.CSS && CSS.highlights) CSS.highlights.delete('wc-ref'); } catch { /* ignore */ }
    }, true);
    document.addEventListener('pointerup', () => { pointerIsDown = false; scheduleSel(); }, true);
    document.addEventListener('pointercancel', () => { pointerIsDown = false; }, true);
    document.addEventListener('selectionchange', scheduleSel);
    document.addEventListener('selectstart', (e) => {          // dragging the canvas must never start a selection
      if (root.classList.contains('wc-panning')) e.preventDefault();
    }, true);
    root.addEventListener('scroll', hideSelUI, true);
    root.addEventListener('wheel', hideSelUI, { passive: true });

    // ---------- highlights: saved passages stay marked in the card ----------
    let marksTimer = 0;
    const marksOf = (c) => (c.padLoaded && c.pad ? c.pad.rec.refs : (c.marks || []));
    function scheduleMarks() { clearTimeout(marksTimer); marksTimer = setTimeout(applyMarks, 40); }

    // (re)build one highlight per color from every card's saved passages (nothing is written into the article)
    function applyMarks() {
      if (!(window.CSS && CSS.highlights && window.Highlight)) return;
      const byColor = {};
      state.cards.forEach((c) => {
        c.markRanges = [];
        if (c.body.classList.contains('wc-loading')) return;
        marksOf(c).forEach((ref) => {
          const r = findPassage(c, ref);
          if (!r) return;
          c.markRanges.push({ ref, range: r });
          const col = HL_COLORS[ref.color] ? ref.color : 'yellow';
          (byColor[col] = byColor[col] || []).push(r);
        });
      });
      Object.keys(HL_COLORS).forEach((k) => {
        if (byColor[k]) CSS.highlights.set('wc-hl-' + k, new Highlight(...byColor[k]));
        else CSS.highlights.delete('wc-hl-' + k);
      });
    }

    // show a reference's note: open Notes, switch to typed text, scroll to it and flash its row
    function openRefNote(c, ref) {
      if (state.full === c) setFullNotes(true);
      else if (!c.padOpen) togglePad(c);
      loadPad(c, () => {
        const rec = c.pad.rec;
        if (rec.mode !== 'text') { rec.mode = 'text'; applyPadUI(c); scheduleSave(c); }
        const ta = c.pad.text;
        const at = ta.value.lastIndexOf('[' + ref.n + ']');
        if (at >= 0) ta.scrollTop = Math.max(0, (ta.value.slice(0, at).split('\n').length - 1) * 21.7 - ta.clientHeight / 3);
        const row = c.pad.refsBox.querySelectorAll('.wc-ref')[rec.refs.findIndex((x) => x.n === ref.n)];
        if (row) {
          c.pad.refsBox.scrollTop = Math.max(0, row.offsetTop - 28);
          row.classList.add('wc-ref-flash');
          setTimeout(() => row.classList.remove('wc-ref-flash'), 1500);
        }
      });
    }

    function pointInfo(x, y) {
      if (document.caretPositionFromPoint) {
        const cp = document.caretPositionFromPoint(x, y);
        return cp ? { node: cp.offsetNode, offset: cp.offset } : null;
      }
      if (document.caretRangeFromPoint) {
        const cr = document.caretRangeFromPoint(x, y);
        return cr ? { node: cr.startContainer, offset: cr.startOffset } : null;
      }
      return null;
    }

    // one click on a highlighted passage opens its note
    root.addEventListener('click', (e) => {
      if (e.button !== 0 || e.target.closest('a, button, input, textarea')) return;
      const body = e.target.closest('.wc-body');
      if (!body) return;
      const sel = window.getSelection();
      if (sel && !sel.isCollapsed) return;                    // that was a text selection, not a click
      const c = cardOfBody(body);
      if (!c || !c.markRanges || !c.markRanges.length) return;
      const pt = pointInfo(e.clientX, e.clientY);
      if (!pt) return;
      const hit = c.markRanges.find((m) => { try { return m.range.isPointInRange(pt.node, pt.offset); } catch { return false; } });
      if (hit) openRefNote(c, hit.ref);
    });

    // ---------- desktop: external links, canvas persistence, language ----------
    // (the extension ran on a live Wikipedia page; here the canvas owns the window)
    const langSel = root.querySelector('.wc-lang');
    const articleUrl = (title) => WC_API + '/wiki/' + encodeURIComponent(String(title).replace(/ /g, '_'));
    function wcOpenExternal(href) {
      try { WCStore.openExternal(new URL(href, WC_API + '/').href); }
      catch { try { WCStore.openExternal(href); } catch { /* ignore */ } }
    }
    // non-article links (and modified/middle clicks on article links) open in the
    // default browser; plain article clicks stay the canvas's own (open card / drag)
    ['click', 'auxclick'].forEach((evName) => root.addEventListener(evName, (e) => {
      if (evName === 'auxclick' && e.button !== 1) return;
      const a = e.target.closest && e.target.closest('a[href]');
      if (!a || !root.contains(a)) return;
      const href = a.getAttribute('href') || '';
      if (!href || href.startsWith('#')) return;
      const t = a.closest('.wc-body') ? titleFromHref(a) : null;
      if (t) {
        if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1 || evName === 'auxclick') {
          e.preventDefault(); e.stopPropagation();
          wcOpenExternal(articleUrl(t));
        }
        return;
      }
      e.preventDefault(); e.stopPropagation();
      wcOpenExternal(href);
    }, true));

    // one file per language: { view, cards, trails, notes } ('_' not ':' — ':' is illegal on Windows)
    const wcKey = () => 'canvas_' + WC_LANG;
    function snapshotCanvas() {
      return {
        v: 1,
        view: { x: Math.round(state.x), y: Math.round(state.y), zoom: state.zoom },
        cards: state.cards.map((c) => ({
          t: c.title, x: Math.round(c.x), y: Math.round(c.y),
          w: c.el.offsetWidth, h: c.el.offsetHeight, min: !!c.minimized,
        })),
        trails: state.trails.map((t) => {
          let a = null;
          try { a = titleFromHref(t.anchor); } catch { a = null; }
          return { p: t.parent.key, a, c: t.child.key, custom: t.custom, dir: t.dir };
        }).filter((t) => t.p && t.c && t.a),
        notes: state.notes.map((n) => ({
          x: Math.round(n.x), y: Math.round(n.y),
          color: n.color, size: n.size, bg: n.bg,
          text: (n.el.querySelector('.wc-note-text') || {}).textContent || '',
        })),
      };
    }
    function saveCanvasNow() {
      try {
        WCStore.kvSet(wcKey(), snapshotCanvas()).catch(() => {});
        WCStore.kvSet('settings', { lang: WC_LANG }).catch(() => {});
      } catch { /* ignore */ }
    }
    let wcSaveTimer = 0;
    function scheduleCanvasSave() { clearTimeout(wcSaveTimer); wcSaveTimer = setTimeout(saveCanvasNow, 1500); }
    ['pointerup', 'wheel', 'keyup'].forEach((ev) => root.addEventListener(ev, scheduleCanvasSave, true));
    setInterval(() => { if (state.cards.length || state.notes.length) saveCanvasNow(); }, 5000);
    window.addEventListener('beforeunload', saveCanvasNow);

    function loadCanvasData(data) {
      if (!data || (!data.cards?.length && !data.notes?.length)) return;
      if (data.view) {
        state.x = data.view.x || 0; state.y = data.view.y || 0; state.zoom = data.view.zoom || 1;
        applyView();
      }
      const byKey = new Map();
      (data.cards || []).forEach((s) => {
        if (!s.t) return;
        const c = createCard({ title: s.t, x: s.x || 40, y: s.y || 40, w: s.w || 420, h: s.h || 480, noPicker: true });
        if (s.min) setMin(c, true);
        byKey.set(c.key, c);
      });
      (data.notes || []).forEach((s) => {
        lastNoteStyle = { color: s.color || '#222222', size: s.size || 18, bg: s.bg || null };
        const n = createNote(s.x || 40, s.y || 40);
        const te = n.el.querySelector('.wc-note-text');
        if (te && s.text) te.textContent = s.text;
      });
      const finish = () => {
        (data.trails || []).forEach((s) => {
          const p = byKey.get(s.p), ch = byKey.get(s.c);
          if (!p || !ch || p === ch) return;
          const anchor = [...p.body.querySelectorAll('a[href]')].find((a) => {
            try { return titleFromHref(a) === s.a; } catch { return false; }
          });
          if (!anchor) return;
          const t = addTrail(p, anchor, ch);
          if (t) {
            if (s.custom != null) t.custom = s.custom;
            if (s.dir) t.dir = s.dir;
            styleTrail(t);
          }
        });
        if (data.view) {
          state.x = data.view.x || 0; state.y = data.view.y || 0; state.zoom = data.view.zoom || 1;
          applyView();
        }
        queueTrails();
        scheduleMarks();
        if (document.activeElement && root.contains(document.activeElement)) document.activeElement.blur();
      };
      const pending = [...byKey.values()];
      if (!pending.length) { finish(); return; }
      let left = pending.length;
      pending.forEach((c) => afterLoad(c, () => { if (--left === 0) finish(); }));
    }

    async function loadCanvas() {
      try {
        const all = await WCStore.kvAll();
        loadCanvasData(all && all[wcKey()]);
      } catch { /* ignore */ }
      scheduleMarks();
    }

    function setLangUI() {
      document.documentElement.lang = WC_LANG;
      document.documentElement.dir = pageDir;
      root.lang = pageLang = WC_LANG;
      if (langSel) langSel.value = WC_LANG;
      root.classList.toggle('wc-rtl', pageDir === 'rtl');
    }

    async function switchLang(nl) {
      if (!nl || nl === WC_LANG) return;
      saveCanvasNow();
      if (state.full) exitFull(false);
      [...state.trails].forEach(removeTrail);
      [...state.cards].forEach((c) => {
        savePadNow(c);
        try { ro.unobserve(c.el); } catch { /* ignore */ }
        if (c.pad) { try { ro.unobserve(c.pad.el); } catch { /* ignore */ } c.pad.el.remove(); }
        cardByEl.delete(c.el);
        c.el.remove();
      });
      [...state.notes].forEach((n) => n.el.remove());
      state.cards = []; state.notes = []; state.trails = [];
      state.x = 0; state.y = 0; state.zoom = 1;
      WC_LANG = nl; WC_PAGE.lang = nl;
      WC_API = 'https://' + WC_LANG + '.wikipedia.org';
      pageDir = RTL_LANGS.includes(WC_LANG) ? 'rtl' : 'ltr';
      nsRe = NS; fetchNsRe();
      setLangUI(); applyView(); refreshEmpty();
      await loadCanvas();
      scheduleMarks();
    }
    if (langSel) langSel.addEventListener('change', () => switchLang(langSel.value));

    // ---------- first paint ----------
    applyView();
    setLangUI();
    WCStore.kvAll().then((all) => {
      const sLang = all && all.settings && all.settings.lang;
      if (sLang && sLang !== WC_LANG && langSel && langSel.querySelector(`option[value="${sLang}"]`)) {
        switchLang(sLang);
      } else {
        loadCanvas();
      }
    }).catch(() => {});
  }
})();
