/* ============================================================
   LuminOS — Browser (tabs, bookmarks, history, proxy mode)
   ============================================================ */

import { $, h, uid, store, sound, esc } from '../core.js';
import { icon } from '../icons.js';

const QUICK = [
  { name: 'Wikipedia', url: 'https://pt.wikipedia.org', c: ['#3b4c58', '#6b7c88'], g: 'W' },
  { name: 'YouTube', url: 'https://www.youtube.com', c: ['#ff4b4b', '#c1121f'], g: '▶' },
  { name: 'GitHub', url: 'https://github.com', c: ['#24292e', '#57606a'], g: 'G' },
  { name: 'Reddit', url: 'https://www.reddit.com', c: ['#ff6a3d', '#ff9a3d'], g: 'r' },
  { name: 'Twitch', url: 'https://www.twitch.tv', c: ['#7d4bd8', '#4b2a8a'], g: 'T' },
  { name: 'Google', url: 'https://www.google.com', c: ['#4285f4', '#34a853'], g: 'G' },
  { name: 'Discord', url: 'https://discord.com/app', c: ['#5865f2', '#8991f7'], g: 'D' },
  { name: 'Spotify', url: 'https://open.spotify.com', c: ['#1db954', '#0e7a37'], g: '♫' },
  { name: 'Example', url: 'https://example.com', c: ['#5a6b8c', '#8fa3c7'], g: 'e' },
  { name: 'Archive', url: 'https://archive.org', c: ['#2b2b2b', '#555'], g: 'A' },
];

const ENGINES = [
  { id: 'duck', name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=', color: '#de5833' },
  { id: 'google', name: 'Google', url: 'https://www.google.com/search?q=', color: '#4285f4' },
  { id: 'bing', name: 'Bing', url: 'https://www.bing.com/search?q=', color: '#0f7ec8' },
  { id: 'brave', name: 'Brave', url: 'https://search.brave.com/search?q=', color: '#fb542b' },
  { id: 'wiki', name: 'Wikipedia', url: 'https://pt.wikipedia.org/w/index.php?search=', color: '#3b4c58' },
];

const PROXIES = [
  { id: 'none', name: 'Direto (sem proxy)', tpl: '{url}' },
  { id: 'allorigins', name: 'AllOrigins', tpl: 'https://api.allorigins.win/raw?url={enc}' },
  { id: 'corsproxy', name: 'corsproxy.io', tpl: 'https://corsproxy.io/?url={enc}' },
  { id: 'codetabs', name: 'CodeTabs', tpl: 'https://api.codetabs.com/v1/proxy?quest={enc}' },
  { id: 'thingproxy', name: 'thingproxy', tpl: 'https://thingproxy.freeboard.io/fetch/{url}' },
];

export const bookmarkStore = {
  list: () => store.get('browser.bookmarks', [
    { name: 'GitHub', url: 'https://github.com' },
    { name: 'Wikipedia', url: 'https://pt.wikipedia.org' },
  ]),
  add(bm) { const l = bookmarkStore.list(); l.unshift(bm); store.set('browser.bookmarks', l.slice(0, 40)); },
  remove(url) { store.set('browser.bookmarks', bookmarkStore.list().filter(b => b.url !== url)); },
};

const history = {
  list: () => store.get('browser.history', []),
  add(url, title) {
    const l = history.list().filter((x) => x.url !== url);
    l.unshift({ url, title, ts: Date.now() });
    store.set('browser.history', l.slice(0, 80));
  },
};

export function resolveUrl(input, engineId = 'duck') {
  let q = (input || '').trim();
  if (!q) return { url: '', kind: 'blank' };
  if (/^(lumin|about):\/?\/?newtab$/i.test(q) || q === 'lumin://start') return { url: '', kind: 'blank' };
  const looksUrl = /^([a-z][a-z0-9+.-]*:\/\/)|^(localhost|127\.0\.0\.1)|^[\w-]+(\.[\w-]+)+(\/|$|:\d+)/i.test(q);
  if (looksUrl) {
    if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(q)) q = 'https://' + q;
    return { url: q, kind: 'url' };
  }
  if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(q) && !q.includes(' ')) return { url: 'https://' + q, kind: 'url' };
  const eng = ENGINES.find((e) => e.id === engineId) || ENGINES[0];
  return { url: eng.url + encodeURIComponent(q), kind: 'search' };
}

function proxyUrl(url, providerId) {
  const p = PROXIES.find((x) => x.id === providerId) || PROXIES[0];
  if (p.id === 'none') return url;
  return p.tpl.replace('{url}', url).replace('{enc}', encodeURIComponent(url));
}

export function mountBrowser(body, api) {
  const settings = store.get('browser.settings', { engine: 'duck', proxy: 'none', home: '' });
  api?.onArgs?.((a) => { if (a?.url) setTimeout(() => newTab(a.url), 0); });
  let tabs = [];
  let activeId = null;

  body.innerHTML = '';
  const wrap = h('div.browser');

  /* tabs */
  const tabstrip = h('div.br-tabstrip');
  const btnNewTab = h('button.br-newtab', { html: icon('plus'), title: 'Nova aba (Ctrl+T)' });
  const tabsRow = h('div.br-tabs', {}, tabstrip, btnNewTab);

  /* bar */
  const bBack = h('button.btn.icon.subtle', { html: icon('chevL'), title: 'Voltar' });
  const bFwd = h('button.btn.icon.subtle', { html: icon('chevR'), title: 'Avançar' });
  const bReload = h('button.btn.icon.subtle', { html: icon('refresh'), title: 'Recarregar' });
  const bHome = h('button.btn.icon.subtle', { html: icon('home'), title: 'Início' });
  const bStar = h('button.btn.icon.subtle', { html: icon('star'), title: 'Favoritar' });
  const bProxy = h('button.btn.icon.subtle', { html: icon('shield'), title: 'Modo proxy' });
  const bMenu = h('button.btn.icon.subtle', { html: icon('dots'), title: 'Menu' });

  const urlInput = h('input', {
    type: 'text', placeholder: 'Pesquisar ou digitar um endereço', spellcheck: 'false', autocomplete: 'off',
    'aria-label': 'Barra de endereço',
  });
  const urlSec = h('span.sec', { html: icon('lock') });
  const urlBar = h('div.br-url', {}, urlSec, urlInput);
  const bar = h('div.br-bar', {}, bBack, bFwd, bReload, bHome, urlBar, bStar, bProxy, bMenu);

  const view = h('div.br-view');
  const load = h('div.br-load');
  wrap.append(tabsRow, bar, view);
  body.append(wrap);

  /* ── tab model ───────────────────────────────────────── */
  function newTab(url = '', { focus = true } = {}) {
    const tab = { id: uid('tab'), url: '', title: 'Nova aba', hist: [], idx: -1, el: null, frame: null, blocked: false };
    tabs.push(tab);
    activeId = tab.id;
    renderTabs();
    if (url) navigate(url);
    else showStart();
    if (focus) setTimeout(() => urlInput.focus(), 40);
    return tab;
  }

  function active() { return tabs.find((t) => t.id === activeId); }

  function closeTab(id) {
    const i = tabs.findIndex((t) => t.id === id);
    if (i < 0) return;
    tabs.splice(i, 1);
    if (!tabs.length) return newTab();
    if (activeId === id) activeId = tabs[Math.max(0, i - 1)].id;
    renderTabs();
    paintActive();
  }

  function renderTabs() {
    tabstrip.innerHTML = '';
    tabs.forEach((t) => {
      const el = h('div.br-tab', { class: t.id === activeId ? 'active' : '' },
        h('span.fav', { text: (t.title || '?').trim()[0]?.toUpperCase() || '?' }),
        h('span.nm', { text: t.title }),
        h('button.x', { html: icon('x'), title: 'Fechar aba', onclick: (e) => { e.stopPropagation(); closeTab(t.id); } }));
      el.onclick = () => { activeId = t.id; renderTabs(); paintActive(); };
      el.onauxclick = (e) => { if (e.button === 1) closeTab(t.id); };
      t.el = el;
      tabstrip.append(el);
    });
    btnNewTab.onclick = () => newTab();
  }

  function setTitle(tab, title) {
    tab.title = title || tab.url || 'Nova aba';
    if (tab.el) tab.el.querySelector('.nm').textContent = tab.title;
  }

  /* ── navigation ──────────────────────────────────────── */
  function navigate(input, { addHistory = true } = {}) {
    const tab = active(); if (!tab) return;
    const r = resolveUrl(input, settings.engine);
    if (r.kind === 'blank') return showStart();
    if (addHistory) { tab.hist = tab.hist.slice(0, tab.idx + 1); tab.hist.push(r.url); tab.idx = tab.hist.length - 1; }
    tab.url = r.url;
    urlInput.value = r.url;
    renderPage(tab);
    history.add(r.url, hostOf(r.url));
    if (r.kind === 'search') setTitle(tab, hostOf(r.url).replace('www.', '') + ' — busca');
  }

  function hostOf(u) { try { return new URL(u).host; } catch { return u; } }

  function renderPage(tab) {
    view.innerHTML = '';
    const useProxy = settings.proxy !== 'none';
    const src = proxyUrl(tab.url, settings.proxy);

    const prog = h('div.br-load');
    const frame = h('iframe', {
      src, referrerpolicy: 'no-referrer', allow: 'fullscreen; autoplay; clipboard-read; clipboard-write',
      sandbox: useProxy ? 'allow-scripts allow-same-origin allow-forms allow-popups' : null,
    });
    frame.setAttribute('title', tab.title);
    tab.frame = frame;
    const overlay = h('div.br-blocked', { hidden: true });

    view.append(prog, frame, overlay);
    prog.style.width = '35%';

    let loaded = false;
    frame.addEventListener('load', () => {
      loaded = true;
      prog.style.width = '100%';
      setTimeout(() => { prog.style.opacity = '0'; prog.style.width = '0'; }, 240);
      // heuristic: same-origin about:blank-ish or empty means blocked
      try {
        const doc = frame.contentDocument;
        if (doc && doc.location && doc.location.href === 'about:blank') showBlocked();
      } catch { /* cross-origin = good, real page */ }
    });
    setTimeout(() => { if (!loaded) { prog.style.width = '100%'; } }, 2500);
    setTimeout(() => { if (!loaded) showBlocked(); }, 7000);

    function showBlocked() {
      if (!overlay.hidden) return;
      overlay.hidden = false;
      overlay.innerHTML = '';
      const card = h('.card', {},
        h('.chip.accent', { html: 'Bloqueado pelo site' }),
        h('h3', { text: 'Este site não permite ser exibido em outro domínio' }),
        h('p', { text: 'Alguns sites enviam cabeçalhos X-Frame-Options / CSP que impedem a exibição dentro do LuminOS. Você pode abrir em nova aba ou tentar um proxy.' }),
        h('.row', { style: { justifyContent: 'center', marginTop: '6px' } },
          h('button.btn.primary', {
            html: icon('external') + ' Abrir em nova aba',
            onclick: () => window.open(tab.url, '_blank', 'noopener'),
          }),
          h('button.btn', {
            html: icon('shield') + ' Usar proxy',
            onclick: () => { settings.proxy = settings.proxy === 'none' ? 'allorigins' : settings.proxy; store.set('browser.settings', settings); renderPage(tab); },
          }),
          h('button.btn.ghost', { text: 'Recarregar', onclick: () => renderPage(tab) })));
      overlay.append(card);
    }
  }

  function showStart() {
    const tab = active(); if (!tab) return;
    tab.url = ''; urlInput.value = '';
    view.innerHTML = '';
    const nt = h('div.newtab');

    const search = h('input', { placeholder: 'Pesquise ou digite um endereço…', 'aria-label': 'Pesquisar' });
    const eng = ENGINES.find((e) => e.id === settings.engine) || ENGINES[0];
    const searchBox = h('div.nt-search', {}, h('span', { html: icon('search') }), search,
      h('span.engine', { text: eng.name }));
    search.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') navigate(search.value);
    });
    search.addEventListener('focus', () => setTimeout(() => { }, 50));

    const grid = h('div.nt-grid');
    const bms = bookmarkStore.list();
    QUICK.slice(0, 8).forEach((q) => grid.append(tile(q)));
    bms.forEach((b) => grid.append(tile({ name: b.name, url: b.url, c: ['#5b6b8f', '#8ea1c9'], g: (b.name || '?')[0] }, true)));

    function tile(q, isBm) {
      const colors = q.c || ['#5b6b8f', '#8ea1c9'];
      const el = h('button.nt-tile', { title: q.url },
        h('span.ico', { style: { background: `linear-gradient(145deg,${colors[0]},${colors[1]})` }, text: q.g || (q.name || '?')[0] }),
        h('span.nm', { text: q.name }));
      if (q.url === settings.home) el.style.outline = '1px solid var(--accent)';
      if (isBm) el.append(h('span.nt-add', { html: icon('x'), onclick: (e) => {
        e.stopPropagation(); bookmarkStore.remove(q.url); el.remove(); sound.click();
      } }));
      el.onclick = () => navigate(q.url);
      el.oncontextmenu = (e) => {
        e.preventDefault();
        import('../ui.js').then(({ contextMenu }) => contextMenu(e, [
          { label: 'Abrir', icon: 'globe', action: () => navigate(q.url) },
          { label: 'Definir como página inicial', icon: 'home', action: () => { settings.home = q.url; store.set('browser.settings', settings); } },
          { label: 'Abrir em nova aba do sistema', icon: 'external', action: () => window.open(q.url, '_blank', 'noopener') },
          { sep: true },
          { label: 'Remover atalho', icon: 'trash', danger: true, action: () => el.remove() },
        ]));
      };
      return el;
    }

    const featured = h('div.nt-featured');
    [
      { b: 'Modo proxy', s: 'Abra sites que bloqueiam iframes', i: 'shield', a: () => toggleProxy() },
      { b: 'Histórico', s: `${history.list().length} páginas visitadas`, i: 'clock', a: () => showMenu() },
      { b: 'Pesquisar na web', s: 'Enter para buscar com ' + eng.name, i: 'search', a: () => search.focus() },
    ].forEach((f) => {
      const c = h('button.nt-card', {}, h('span', { html: icon(f.i) }), h('b', { text: f.b }), h('span', { text: f.s }));
      c.onclick = f.a; featured.append(c);
    });

    const hint = h('div.nt-hint', {},
      h('span', { html: `<kbd>${navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}</kbd> + T nova aba` }),
      h('span', { html: `<kbd>Enter</kbd> navegar` }),
      h('span', { html: `<kbd>Alt</kbd> + ← voltar` }));

    nt.append(
      h('div.nt-logo', {}, h('div.dotlogo'), h('span', {}, 'Lumin', h('b', {}, 'Browser'))),
      searchBox, grid, featured, hint);
    view.append(nt);
    setTimeout(() => search.focus(), 40);
    setTitle(tab, 'Nova aba');
    renderTabs();
  }

  /* ── toolbar wiring ──────────────────────────────────── */
  urlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') navigate(urlInput.value);
    if (e.key === 'Escape') { urlInput.blur(); if (active()) urlInput.value = active().url; }
  });
  urlInput.addEventListener('focus', () => urlInput.select());

  bBack.onclick = () => { const t = active(); if (!t || t.idx <= 0) return; t.idx--; navigate(t.hist[t.idx], { addHistory: false }); };
  bFwd.onclick = () => { const t = active(); if (!t || t.idx >= t.hist.length - 1) return; t.idx++; navigate(t.hist[t.idx], { addHistory: false }); };
  bReload.onclick = () => { const t = active(); if (!t) return; t.url ? renderPage(t) : showStart(); };
  bHome.onclick = () => { if (settings.home) navigate(settings.home); else showStart(); };
  bStar.onclick = () => {
    const t = active(); if (!t || !t.url) return;
    const exists = bookmarkStore.list().some((b) => b.url === t.url);
    if (exists) { bookmarkStore.remove(t.url); sound.click(); }
    else { bookmarkStore.add({ name: hostOf(t.url).replace('www.', ''), url: t.url }); sound.ok(); }
    bStar.style.color = bookmarkStore.list().some((b) => b.url === t.url) ? 'var(--warn)' : '';
  };
  const toggleProxy = () => {
    settings.proxy = settings.proxy === 'none' ? 'allorigins' : 'none';
    if (store.get('browser.proxy', null)) { /* noop */ }
    store.set('browser.settings', settings);
    bProxy.style.color = settings.proxy === 'none' ? '' : 'var(--ok)';
    const t = active(); if (t && t.url) renderPage(t);
  };
  bProxy.onclick = toggleProxy;

  function showMenu() {
    import('../ui.js').then(({ contextMenu }) => {
      const rect = bMenu.getBoundingClientRect();
      contextMenu({ clientX: rect.right - 180, clientY: rect.bottom + 4 }, [
        { label: 'Nova aba', icon: 'plus', action: () => newTab() },
        { label: 'Página inicial', icon: 'home', action: () => showStart() },
        { sep: true },
        { label: settings.proxy === 'none' ? 'Ativar proxy' : 'Desativar proxy', icon: 'shield', action: toggleProxy },
        ...PROXIES.filter((p) => p.id !== 'none').map((p) => ({
          label: '  · ' + p.name, action: () => { settings.proxy = p.id; store.set('browser.settings', settings); bProxy.style.color = 'var(--ok)'; const t = active(); if (t?.url) renderPage(t); },
        })),
        { sep: true },
        { label: 'Motor de busca…', icon: 'search', action: (e) => { e.preventDefault(); import('../ui.js').then(({ contextMenu: cm }) => cm({ clientX: rect.right - 180, clientY: rect.bottom + 30 },
          ENGINES.map((en) => ({ label: en.name, action: () => { settings.engine = en.id; store.set('browser.settings', settings); const t = active(); if (t && !t.url) showStart(); } })) )); } },
        { label: 'Limpar histórico', icon: 'trash', danger: true, action: () => { store.set('browser.history', []); } },
        { sep: true },
        { label: 'Histórico recente', icon: 'clock', action: () => {
          const l = history.list().slice(0, 12);
          import('../ui.js').then(({ contextMenu: cm }) => cm({ clientX: rect.right - 180, clientY: rect.bottom + 30 },
            l.length ? l.map((it) => ({ label: it.title || it.url, icon: 'globe', action: () => navigate(it.url) })) : [{ label: 'Nada por aqui ainda', action: () => {} }]));
        } },
        { label: 'Abrir em nova janela do navegador', icon: 'external', action: () => { const t = active(); if (t?.url) window.open(t.url, '_blank', 'noopener'); } },
      ]);
    });
  }
  bMenu.onclick = showMenu;

  btnNewTab.onclick = () => newTab();

  function paintActive() {
    const t = active(); if (!t) return;
    urlInput.value = t.url || '';
    bStar.style.color = t.url && bookmarkStore.list().some((b) => b.url === t.url) ? 'var(--warn)' : '';
    view.innerHTML = '';
    if (!t.url) return showStart();
    renderPage(t);
  }

  /* keyboard inside browser */
  body.tabIndex = 0;
  body.addEventListener('keydown', (e) => {
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 't') { e.preventDefault(); newTab(); }
    else if (mod && e.key.toLowerCase() === 'w') { e.preventDefault(); closeTab(activeId); }
    else if (mod && e.key.toLowerCase() === 'l') { e.preventDefault(); urlInput.focus(); urlInput.select(); }
    else if (mod && e.key.toLowerCase() === 'r') { e.preventDefault(); bReload.onclick(); }
    else if (e.altKey && e.key === 'ArrowLeft') { e.preventDefault(); bBack.onclick(); }
    else if (e.altKey && e.key === 'ArrowRight') { e.preventDefault(); bFwd.onclick(); }
  });

  bProxy.style.color = settings.proxy === 'none' ? '' : 'var(--ok)';
  newTab(api?.args?.url || settings.home || '');

  return {
    args(a) { if (a?.url) newTab(a.url); },
    get tabs() { return tabs; },
  };
}

export const browserMeta = {
  // tiny helper icons for the browser chrome (kept local to avoid bloating global set)
};

export const browserApp = {
  id: 'browser',
  name: 'Navegador',
  glyph: 'globe',
  grad: ['#3f7ae0', '#5ec8f0'],
  size: { w: 880, h: 600 },
  category: 'Internet',
  dock: true,
  desktop: true,
  mount: mountBrowser,
};

export { QUICK as browserQuickLinks, ENGINES as searchEngines, PROXIES as proxyProviders };

