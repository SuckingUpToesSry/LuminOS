/* ============================================================
   LuminOS — Browser (tabs, bookmarks, history, proxy mode)
   ============================================================ */

import { $, h, uid, store, sound, esc, relTime } from '../core.js';
import { icon } from '../icons.js';
import { UV, WISP_ENDPOINTS, uvSettings, saveUvSettings, encodeUV, initUV } from '../../uv/config.mjs';
import { ROOMS as CHAT_ROOMS, state as chatState, start as chatStart, send as chatSend, messages as chatMessages, onEvent as onChatEvent } from '../chat.js';

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
  { id: 'ultraviolet', name: 'Ultraviolet (proxy real)', tpl: '{url}', uv: true },
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
  const settings = store.get('browser.settings', { engine: 'duck', proxy: 'ultraviolet', home: '' });
  if (settings.proxy === undefined) settings.proxy = 'ultraviolet';
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
  const bChat = h('button.btn.icon.subtle', { html: icon('chat'), title: 'Chat Global (ao lado do navegador)' });
  const bMenu = h('button.btn.icon.subtle', { html: icon('dots'), title: 'Menu' });

  const urlInput = h('input', {
    type: 'text', placeholder: 'Pesquisar ou digitar um endereço', spellcheck: 'false', autocomplete: 'off',
    'aria-label': 'Barra de endereço',
  });
  const urlSec = h('span.sec', { html: icon('lock') });
  const urlBar = h('div.br-url', {}, urlSec, urlInput);
  const bar = h('div.br-bar', {}, bBack, bFwd, bReload, bHome, urlBar, bStar, bChat, bProxy, bMenu);

  const view = h('div.br-view');
  const chatPanel = buildChatPanel();
  const bodyRow = h('div', { style: { flex: '1', display: 'flex', minHeight: '0' } }, view, chatPanel.el);
  const load = h('div.br-load');
  wrap.append(tabsRow, bar, bodyRow);
  body.append(wrap);

  /* ── Chat Global (painel lateral do navegador) ──────── */
  function buildChatPanel() {
    const el = h('aside', { style: {
      width: '0', flex: 'none', borderLeft: '1px solid var(--line)', background: 'var(--surface-2)',
      display: 'flex', flexDirection: 'column', minHeight: '0', overflow: 'hidden',
      transition: 'width .22s cubic-bezier(.2,.8,.2,1)',
    } });
    let open = false;
    const roomChips = h('div', { style: { display: 'flex', gap: '4px', padding: '8px 8px 4px', flexWrap: 'wrap' } });
    const list = h('div', { style: { flex: '1', overflow: 'auto', padding: '6px 10px', display: 'flex', flexDirection: 'column', gap: '7px' } });
    const nickRow = h('div', { style: { display: 'flex', gap: '6px', padding: '8px' } });
    const nickInput = h('input.input', { placeholder: 'Seu nome…', value: chatState.nick, style: { fontSize: '12px', padding: '6px 9px' } });
    const msgInput = h('input.input', { placeholder: 'Mensagem…', style: { flex: '1', fontSize: '12px', padding: '7px 9px' } });
    const sendBtn = h('button.btn.primary.icon', { html: icon('send'), title: 'Enviar' });
    const status = h('div.tiny', { style: { padding: '0 10px 8px' }, text: 'conectando…' });

    const setNick = () => {
      chatState.nick = nickInput.value.trim() || 'anônimo';
      nickRow.hidden = true;
      renderMsgs();
    };
    nickInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') setNick(); });
    nickRow.append(nickInput, h('button.btn.icon', { html: icon('check'), onclick: setNick }));
    nickRow.hidden = !!chatState.nick;

    function renderRooms() {
      roomChips.innerHTML = '';
      CHAT_ROOMS.forEach((r) => {
        const b = h('button.chip', { text: '# ' + r.name, style: { cursor: 'pointer', padding: '3px 8px' } });
        b.classList.toggle('accent', r.id === chatState.room);
        b.onclick = () => { chatState.room = r.id; renderRooms(); renderMsgs(); };
        roomChips.append(b);
      });
    }

    function renderMsgs() {
      list.innerHTML = '';
      const msgs = chatMessages();
      if (!msgs.length) {
        list.append(h('div.empty', { style: { padding: '18px 6px' } }, h('div.big', { text: '💬' }),
          h('p', { text: 'Ninguém falou nada ainda em #' + chatState.room + '.' })));
      }
      msgs.slice(-60).forEach((m) => {
        const mine = m.who === chatState.nick;
        list.append(h('div', { style: {
          display: 'grid', gap: '1px', padding: '6px 8px', borderRadius: '9px',
          background: mine ? 'color-mix(in srgb,var(--accent) 18%,transparent)' : 'var(--surface-3)',
        } },
          h('div', { style: { display: 'flex', gap: '6px', alignItems: 'baseline' } },
            h('b', { style: { fontSize: '10.5px', color: mine ? 'var(--text)' : 'var(--accent)' }, text: m.who }),
            h('span.tiny', { style: { fontSize: '9.5px', marginLeft: 'auto' }, text: relTime(m.ts) })),
          h('div', { style: { fontSize: '12px', lineHeight: '1.45', wordBreak: 'break-word' }, text: m.text })));
      });
      list.scrollTop = list.scrollHeight;
    }

    async function sendMsg() {
      const text = msgInput.value.trim();
      if (!text) return;
      if (!chatState.nick) { nickRow.hidden = false; nickInput.focus(); return; }
      msgInput.value = '';
      const res = await chatSend(text, { who: chatState.nick });
      renderMsgs();
      status.textContent = res.relay ? 'enviado · relay online' : 'salvo localmente · relay offline';
      renderBadge();
    }
    sendBtn.onclick = sendMsg;
    msgInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendMsg(); });

    const head = h('div', { style: {
      display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 8px',
      borderBottom: '1px solid var(--line)',
    } },
      h('span', { html: `<span class="logo-dot" style="width:8px;height:8px"></span>`, style: { display: 'flex' } }),
      h('b', { style: { fontSize: '12px', flex: '1' }, text: 'Chat Global' }),
      h('button.btn.subtle.icon', { html: icon('x'), title: 'Fechar', onclick: () => toggle(false) }));

    el.append(head, roomChips, list, nickRow, h('div', { style: { display: 'flex', gap: '6px', padding: '0 8px 4px' } }, msgInput, sendBtn), status);

    onChatEvent((evt, d) => {
      if (!open) return;
      if (evt === 'message' && d.roomId === chatState.room) renderMsgs();
      if (evt === 'status') status.textContent = d.online ? 'relay online · mensagens ao vivo' : 'relay offline · modo local entre abas';
      if (evt === 'clear') renderMsgs();
    });

    function toggle(next) {
      open = next === undefined ? !open : next;
      el.style.width = open ? '290px' : '0';
      bChat.classList.toggle('primary', open);
      if (open) {
        chatStart(chatState.room);
        renderRooms(); renderMsgs();
        if (!chatState.nick) { nickRow.hidden = false; setTimeout(() => nickInput.focus(), 120); }
        else setTimeout(() => msgInput.focus(), 120);
      }
    }
    bChat.onclick = () => toggle();
    return { el, toggle, renderMsgs, renderBadge };
  }

  function renderBadge() {
    const n = chatMessages().length;
    bChat.title = 'Chat Global' + (n ? ` · ${n} mensagens` : '');
  }

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
  async function navigate(input, { addHistory = true } = {}) {
    const tab = active(); if (!tab) return;
    const r = resolveUrl(input, settings.engine);
    if (r.kind === 'blank') return showStart();
    if (addHistory) { tab.hist = tab.hist.slice(0, tab.idx + 1); tab.hist.push(r.url); tab.idx = tab.hist.length - 1; }
    tab.url = r.url;
    urlInput.value = r.url;
    await renderPage(tab);
    history.add(r.url, hostOf(r.url));
    if (r.kind === 'search') setTitle(tab, hostOf(r.url).replace('www.', '') + ' — busca');
  }

  function hostOf(u) { try { return new URL(u).host; } catch { return u; } }

  async function renderPage(tab) {
    view.innerHTML = '';
    const mode = settings.proxy || 'ultraviolet';

    const prog = h('div.br-load');
    const overlay = h('div.br-blocked', { hidden: true });
    view.append(prog, overlay);
    prog.style.width = '30%';

    /* ── Ultraviolet: proxy real via service worker ────── */
    if (mode === 'ultraviolet') {
      const statusLine = h('div', {
        style: {
          position: 'absolute', left: '50%', bottom: '18px', transform: 'translateX(-50%)',
          display: 'flex', alignItems: 'center', gap: '9px', padding: '9px 14px', borderRadius: '99px',
          background: 'var(--glass-2)', border: '1px solid var(--line-strong)', boxShadow: 'var(--shadow-sm)',
          fontSize: '12px', color: 'var(--text-2)', zIndex: '3', backdropFilter: 'blur(12px)',
        },
      }, h('span.spinner', {
        style: { width: '12px', height: '12px', border: '2px solid var(--line-strong)', borderTopColor: 'var(--accent)', borderRadius: '50%', display: 'block' },
      }), h('span', { text: 'Conectando ao proxy…' }));
      view.append(statusLine);
      bProxy.style.color = 'var(--accent)';

      const boot = await initUV();
      if (!boot.ok) {
        statusLine.remove();
        showUvError(tab, overlay, boot.error);
        return;
      }
      statusLine.querySelector('span:last-child').textContent = 'Ultraviolet ativo · ' + new URL(tab.url).host;
      const src = encodeUV(tab.url);
      const frame = h('iframe', {
        src, allow: 'fullscreen; autoplay; clipboard-read; clipboard-write; gamepad; pointer-lock',
        referrerpolicy: 'no-referrer',
      });
      frame.setAttribute('title', tab.title);
      tab.frame = frame;
      view.append(frame);
      let loaded = false;
      frame.addEventListener('load', () => {
        loaded = true;
        prog.style.width = '100%';
        setTimeout(() => { prog.style.opacity = '0'; prog.style.width = '0'; statusLine.remove(); }, 500);
        navigator.serviceWorker?.addEventListener('message', () => {});
      });
      setTimeout(() => { statusLine.remove(); if (!loaded) prog.style.width = '100%'; }, 12000);
      tab.uvFrame = frame;
      return;
    }

    /* ── modos antigos (CORS proxies / direto) ─────────── */
    const src = proxyUrl(tab.url, mode);
    const useProxy = mode !== 'none';
    const frame = h('iframe', {
      src, referrerpolicy: 'no-referrer', allow: 'fullscreen; autoplay; clipboard-read; clipboard-write',
      sandbox: useProxy ? 'allow-scripts allow-same-origin allow-forms allow-popups' : null,
    });
    frame.setAttribute('title', tab.title);
    tab.frame = frame;
    view.append(frame);
    bProxy.style.color = mode === 'none' ? '' : 'var(--ok)';
    prog.style.width = '35%';

    let loaded = false;
    frame.addEventListener('load', () => {
      loaded = true;
      prog.style.width = '100%';
      setTimeout(() => { prog.style.opacity = '0'; prog.style.width = '0'; }, 240);
      try {
        const doc = frame.contentDocument;
        if (doc && doc.location && doc.location.href === 'about:blank') showBlocked();
      } catch {}
    });
    setTimeout(() => { if (!loaded) prog.style.width = '100%'; }, 2500);
    setTimeout(() => { if (!loaded) showBlocked(); }, 7000);

    function showBlocked() {
      if (!overlay.hidden) return;
      overlay.hidden = false;
      overlay.innerHTML = '';
      overlay.append(h('.card', {},
        h('.chip.accent', { text: 'Bloqueado pelo site' }),
        h('h3', { text: 'Este site não permite ser exibido em outro domínio' }),
        h('p', { text: 'Alguns sites enviam X-Frame-Options/CSP que impedem iframes. O Ultraviolet resolve isso — ele reescreve as requisições no service worker.' }),
        h('.row', { style: { justifyContent: 'center', marginTop: '6px', flexWrap: 'wrap' } },
          h('button.btn.primary', { html: icon('shield') + ' Usar Ultraviolet', onclick: () => {
            settings.proxy = 'ultraviolet'; store.set('browser.settings', settings); renderPage(tab);
          } }),
          h('button.btn', { html: icon('external') + ' Abrir fora', onclick: () => window.open(tab.url, '_blank', 'noopener') }))));
    }
  }

  function showUvError(tab, overlay, detail) {
    overlay.hidden = false;
    overlay.innerHTML = '';
    const cfg = uvSettings();
    const wispInput = h('input.input', { value: cfg.wisp, style: { fontSize: '11.5px', padding: '7px 10px' } });
    overlay.append(h('.card', { style: { maxWidth: '420px' } },
      h('.chip.accent', { style: { background: 'color-mix(in srgb,var(--danger) 18%,transparent)' }, text: 'Proxy indisponível' }),
      h('h3', { text: 'O Ultraviolet não conseguiu iniciar' }),
      h('p', { text: (detail || '') + ' — normalmente é o relay Wisp bloqueado ou o service worker ainda registrando. Ajude escolhendo outro relay:' }),
      h('div', { style: { display: 'grid', gap: '6px', width: '100%', marginTop: '8px' } },
        wispInput,
        h('.row', { style: { gap: '6px', flexWrap: 'wrap' } },
          ...WISP_ENDPOINTS.map((w) => h('button.btn.subtle.tiny', {
            text: new URL(w).host, onclick: () => { wispInput.value = w; },
          }))),
        h('.row', { style: { gap: '8px', justifyContent: 'center', marginTop: '4px' } },
          h('button.btn.primary', { text: 'Recarregar com este relay', onclick: async () => {
            saveUvSettings({ wisp: wispInput.value.trim() });
            const { resetUV } = await import('../../uv/config.mjs');
            resetUV();
            renderPage(tab);
          } }),
          h('button.btn', { html: icon('external') + ' Abrir fora', onclick: () => window.open(tab.url, '_blank', 'noopener') }),
          h('button.btn.ghost', { text: 'Modo direto', onclick: () => {
            settings.proxy = 'none'; store.set('browser.settings', settings); renderPage(tab);
          } }))),
      h('p.tiny', { text: 'Os relays Wisp são públicos e veem os domínios acessados. Evite logar em contas sensíveis por eles.' })));
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
    settings.proxy = settings.proxy === 'ultraviolet' ? 'none' : 'ultraviolet';
    if (store.get('browser.proxy', null)) { /* noop */ }
    store.set('browser.settings', settings);
    bProxy.style.color = settings.proxy === 'none' ? '' : 'var(--accent)';
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
        { label: settings.proxy === 'ultraviolet' ? 'Desativar Ultraviolet' : 'Ativar Ultraviolet (proxy real)', icon: 'shield', action: toggleProxy },
        { label: 'Relay Wisp do Ultraviolet…', icon: 'globe', action: () => {
          import('../ui.js').then(({ modal }) => {
            const cfg = uvSettings();
            const inp = h('input.input', { value: cfg.wisp });
            modal({
              title: 'Relay Wisp', ok: 'Salvar',
              body: [h('p.tiny', { text: 'O Ultraviolet usa um relay público (Wisp) para falar com os sites. Escolha um que responda na sua rede.' }),
                h('.field', {}, h('span', { text: 'Endpoint' }), inp),
                h('.row', { style: { gap: '6px', flexWrap: 'wrap' } },
                  ...WISP_ENDPOINTS.map((w) => h('button.btn.subtle.tiny', { text: new URL(w).host, onclick: () => { inp.value = w; } })))],
              onOk: async () => {
                saveUvSettings({ wisp: inp.value.trim() });
                const { resetUV } = await import('../../uv/config.mjs');
                resetUV();
                toast('Relay salvo — recarregue a página atual', { kind: 'ok' });
              },
            });
          });
        } },
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

  bProxy.style.color = settings.proxy === 'none' ? '' : 'var(--accent)';
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

