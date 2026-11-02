/* ============================================================
   LuminOS — Browser (tabs, bookmarks, history, proxy mode)
   ============================================================ */

import { $, h, uid, store, sound, esc, relTime } from '../core.js';
import { icon } from '../icons.js';
import { UV, WISP_ENDPOINTS, uvSettings, saveUvSettings, encodeUV, initUV } from '../../uv/config.mjs';
import * as proxy from '../proxy.js';
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

const ENGINES = proxy.ENGINES;

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
  // a config vive em js/proxy.js (protocolo, transporte, relay, engine…)
  const settings = proxy.settings();
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
  const bSettings = h('button.btn.icon.subtle', { html: icon('settings'), title: 'Configurações do navegador' });

  const urlInput = h('input', {
    type: 'text', placeholder: 'Pesquisar ou digitar um endereço', spellcheck: 'false', autocomplete: 'off',
    'aria-label': 'Barra de endereço',
  });
  const urlSec = h('span.sec', { html: icon('lock') });
  const urlBar = h('div.br-url', {}, urlSec, urlInput);
  const bar = h('div.br-bar', {}, bBack, bFwd, bReload, bHome, urlBar, bStar, bChat, bProxy, bSettings, bMenu);

  const view = h('div.br-view');
  // painel de configurações (declarado antes de ser montado no shell)
  const settingsPanel = h('aside.br-settings', { hidden: true });
  const chatPanel = buildChatPanel();
  const bodyRow = h('div.br-body', {}, view, chatPanel.el);
  const load = h('div.br-load');
  wrap.append(tabsRow, bar, h('div.br-shell', {}, bodyRow, settingsPanel));
  bSettings.onclick = () => openSettings();
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
      el.onclick = () => { activeId = t.id; closeSettings(); renderTabs(); paintActive(); };
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

  /* partículas do fundo (configurável) */
  let particleLayer = null;
  function applyParticles() {
    const on = proxy.settings().particles;
    if (partyOff(on)) return;
    function partyOff(v) {
      if (!v) { particleLayer?.remove(); particleLayer = null; return true; }
      return false;
    }
    if (particleLayer) return;
    particleLayer = h('div.br-particles');
    for (let i = 0; i < 26; i++) {
      particleLayer.append(h('i', { style: {
        left: (Math.random() * 100).toFixed(2) + '%',
        animationDuration: (7 + Math.random() * 12).toFixed(1) + 's',
        animationDelay: (-Math.random() * 14).toFixed(1) + 's',
        transform: `scale(${(.5 + Math.random() * .9).toFixed(2)})`,
      } }));
    }
    view.append(particleLayer);
  }

  async function renderPage(tab) {
    view.innerHTML = '';
    proxy.runtime.stats.attempts++;
    const cfg = proxy.settings();
    const protocol = cfg.protocol;

    const prog = h('div.br-load');
    const overlay = h('div.br-blocked', { hidden: true });
    view.append(prog, overlay);
    prog.style.width = '22%';

    const statusLine = h('div.br-status', {},
      h('span.spinner'),
      h('span', { text: 'Iniciando ' + proxy.describe(protocol, cfg.transport) + '…' }));
    view.append(statusLine);
    bProxy.style.color = 'var(--accent)';

    const done = () => {
      prog.style.width = '100%';
      setTimeout(() => { prog.style.opacity = '0'; prog.style.width = '0'; statusLine.remove(); }, 520);
    };

    /* ── Scramjet (padrão) ─────────────────────────────── */
    if (protocol === 'scramjet') {
      const boot = await proxy.initScramjet();
      if (!boot.ok) {
        proxy.note(false, boot.error);
        statusLine.remove();
        showUvError(tab, overlay, boot.error, 'scramjet');
        return;
      }
      const frame = h('iframe', {
        src: 'about:blank',
        allow: 'fullscreen; autoplay; clipboard-read; clipboard-write; gamepad; pointer-lock; compute-pressure',
        referrerpolicy: 'no-referrer',
      });
      frame.setAttribute('title', tab.title);
      tab.frame = frame;
      view.append(frame);
      statusLine.querySelector('span:last-child').textContent =
        'Scramjet · ' + proxy.describe('scramjet', cfg.transport) + ' · ' + hostOf(tab.url);
      frame.addEventListener('load', () => { proxy.note(true); done(); }, { once: true });
      setTimeout(() => { try { proxy.scramjetOpen(frame, tab.url); } catch (err) { proxy.note(false, err.message); statusLine.querySelector('span:last-child').textContent = 'Scramjet: ' + err.message; } }, 30);
      setTimeout(() => { if (statusLine.isConnected) done(); }, 9000);
      return;
    }

    /* ── Ultraviolet ───────────────────────────────────── */
    if (protocol === 'ultraviolet') {
      const boot = await proxy.initUV();
      if (!boot.ok) {
        proxy.note(false, boot.error);
        statusLine.remove();
        showUvError(tab, overlay, boot.error, 'ultraviolet');
        return;
      }
      statusLine.querySelector('span:last-child').textContent =
        'Ultraviolet · ' + proxy.describe('ultraviolet', cfg.transport) + ' · ' + hostOf(tab.url);
      const frame = h('iframe', {
        src: proxy.encodeUV(tab.url),
        allow: 'fullscreen; autoplay; clipboard-read; clipboard-write; gamepad; pointer-lock',
        referrerpolicy: 'no-referrer',
      });
      frame.setAttribute('title', tab.title);
      tab.frame = frame;
      view.append(frame);
      let loaded = false;
      frame.addEventListener('load', () => { loaded = true; proxy.note(true); done(); }, { once: true });
      setTimeout(() => { if (!loaded) done(); }, 12000);
      return;
    }

    /* ── modos antigos (direto / CORS proxy) ───────────── */
    const src = proxyUrl(tab.url, protocol);
    const useProxy = protocol !== 'none';
    const frame = h('iframe', {
      src, referrerpolicy: 'no-referrer', allow: 'fullscreen; autoplay; clipboard-read; clipboard-write',
      sandbox: useProxy ? 'allow-scripts allow-same-origin allow-forms allow-popups' : null,
    });
    frame.setAttribute('title', tab.title);
    tab.frame = frame;
    view.append(frame);
    statusLine.remove();
    bProxy.style.color = protocol === 'none' ? '' : 'var(--ok)';
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
        h('p', { text: 'Alguns sites enviam X-Frame-Options/CSP que impedem iframes. O Scramjet ou o Ultraviolet resolvem — eles reescrevem as requisições no service worker.' }),
        h('.row', { style: { justifyContent: 'center', marginTop: '6px', flexWrap: 'wrap' } },
          h('button.btn.primary', { html: icon('shield') + ' Usar Scramjet', onclick: () => {
            proxy.save({ protocol: 'scramjet' }); renderPage(tab);
          } }),
          h('button.btn', { html: icon('external') + ' Abrir fora', onclick: () => window.open(tab.url, '_blank', 'noopener') }))));
    }
  }

  function showUvError(tab, overlay, detail, engine = 'scramjet') {
    overlay.hidden = false;
    overlay.innerHTML = '';
    const cfg = proxy.settings();
    const wispInput = h('input.input', { value: cfg.wisp, style: { fontSize: '11.5px', padding: '7px 10px' } });
    const name = engine === 'scramjet' ? 'Scramjet' : 'Ultraviolet';
    overlay.append(h('.card', { style: { maxWidth: '440px' } },
      h('.chip.accent', { style: { background: 'color-mix(in srgb,var(--danger) 18%,transparent)' }, text: 'Proxy indisponível' }),
      h('h3', { text: `O ${name} não conseguiu iniciar` }),
      h('p', { text: (detail || 'erro desconhecido') + ' — quase sempre é o relay Wisp bloqueado ou o service worker ainda registrando. Escolha outro relay e/ou troque o transporte:' }),
      h('div', { style: { display: 'grid', gap: '6px', width: '100%', marginTop: '8px' } },
        wispInput,
        h('.row', { style: { gap: '6px', flexWrap: 'wrap' } },
          ...WISP_ENDPOINTS.map((w) => h('button.btn.subtle.tiny', {
            text: new URL(w).host, onclick: () => { wispInput.value = w; },
          }))),
        h('.row', { style: { gap: '6px', flexWrap: 'wrap', justifyContent: 'center' } },
          ...proxy.TRANSPORTS.map((t) => h('button.btn.subtle.tiny', {
            text: 'Transporte: ' + t.name,
            onclick: () => { proxy.save({ transport: t.id, wisp: wispInput.value.trim() }); proxy.resetUV(); proxy.resetScramjet(); renderPage(tab); },
          }))),
        h('.row', { style: { gap: '8px', justifyContent: 'center', marginTop: '4px' } },
          h('button.btn.primary', { text: 'Recarregar com este relay', onclick: async () => {
            proxy.save({ wisp: wispInput.value.trim() });
            proxy.resetUV(); proxy.resetScramjet();
            renderPage(tab);
          } }),
          h('button.btn', { html: icon('external') + ' Abrir fora', onclick: () => window.open(tab.url, '_blank', 'noopener') }),
          h('button.btn.ghost', { text: 'Modo direto', onclick: () => {
            proxy.save({ protocol: 'none' }); renderPage(tab);
          } })))));
  }

  /* ── Configurações (estilo cliente de proxy) ─────────── */
  function closeSettings() { settingsPanel.hidden = true; settingsPanel.classList.remove('in'); }
  function openSettings() { settingsPanel.hidden = false; requestAnimationFrame(() => settingsPanel.classList.add('in')); renderSettings(); }

  function segRow(items, current, onPick) {
    return h('div.br-seg', {}, ...items.map((it) => {
      const b = h('button.br-segbtn', { class: it.id === current ? 'on' : '', text: it.name, title: it.desc || '' });
      b.onclick = () => onPick(it);
      return b;
    }));
  }

  function field(label, sub, ctl) {
    return h('div.br-setrow', {},
      h('div.br-setlbl', {}, h('b', { text: label }), sub ? h('small', { text: sub }) : null),
      h('div.br-setctl', {}, ctl));
  }

  function toggle(on, onChange) {
    const t = h('button.br-switch', { class: on ? 'on' : '', role: 'switch', 'aria-checked': on ? 'true' : 'false' },
      h('i'));
    t.onclick = () => {
      const next = !t.classList.contains('on');
      t.classList.toggle('on', next);
      t.setAttribute('aria-checked', next ? 'true' : 'false');
      onChange(next);
      sound.click();
    };
    return t;
  }

  function renderSettings() {
    const cfg = proxy.settings();
    settingsPanel.innerHTML = '';
    const statusText = h('div.br-setstatus', { text: 'Starting…' });
    const statusDot = h('i');

    const paintStatus = () => {
      const st = proxy.runtime.stats;
      const tName = proxy.TRANSPORTS.find((t) => t.id === proxy.settings().transport)?.name || '—';
      const pName = proxy.PROTOCOLS.find((p) => p.id === proxy.settings().protocol)?.name || 'direto';
      let label = 'Starting…';
      let cls = '';
      if (st.errors && st.lastError) { label = `${pName} falhou · ${st.lastError}`; }
      else if (proxy.runtime.sj?.isReady) { label = `Ready · ${pName} + ${tName}`; cls = 'ok'; }
      else if (proxy.runtime.uv?.ok) { label = `Ready · ${pName} + ${tName}`; cls = 'ok'; }
      else if (st.attempts > 0) { label = `Conectando · ${pName} + ${tName}…`; }
      statusText.textContent = label;
      statusText.className = 'br-setstatus ' + cls;
      const clock = settingsPanel.querySelector('.br-clock');
      if (clock) clock.textContent = proxy.clockLabel();
    };

    const home = h('input.input', { value: cfg.homepage || '', placeholder: 'https://exemplo.com', spellcheck: 'false' });

    settingsPanel.append(
      h('header.br-sethead', {},
        h('div', {}, h('b', { text: 'Configurações' }), h('small', { text: 'Navegador · proxy' })),
        h('span', { style: { flex: '1' } }),
        h('span.br-clock', { text: proxy.clockLabel() }),
        h('button.btn.icon.subtle', { html: icon('x'), title: 'Fechar', onclick: closeSettings })),

      h('div.br-setbody', {},
        h('div.br-setgroup', {}, h('h4', { text: 'Transport' }),
          segRow(proxy.TRANSPORTS, cfg.transport, async (t) => {
            proxy.save({ transport: t.id });
            renderSettings();
            closeSettings();
            const tab = active();
            if (tab?.url) await renderPage(tab); else renderSettings();
          })),

        h('div.br-setgroup', {}, h('h4', { text: 'Protocol' }),
          segRow(proxy.PROTOCOLS, cfg.protocol, (p) => {
            proxy.save({ protocol: p.id });
            renderSettings();
            const tab = active();
            if (tab?.url) renderPage(tab);
          })),

        h('div.br-setgroup', {}, h('h4', { text: 'Search engine' }),
          segRow(proxy.ENGINES.slice(0, 4), cfg.engine, (e) => {
            proxy.save({ engine: e.id });
            renderSettings();
          })),

        h('div.br-setgroup', {},
          field('Homepage', 'Abrir ao criar uma nova aba', home),
          field('Search suggestions', 'Sugestões do motor na barra de endereço',
            toggle(cfg.suggestions, (v) => proxy.save({ suggestions: v }))),
          field('Particles', 'Fundo animado na página inicial',
            toggle(cfg.particles, (v) => { proxy.save({ particles: v }); applyParticles(); }))),

        h('div.br-setgroup', {},
          field('Relay Wisp', 'Servidor que fala com os sites',
            h('select.input', { style: { minWidth: '190px' },
              onchange: (e) => { proxy.save({ wisp: e.target.value }); proxy.resetUV(); proxy.resetScramjet(); } },
              ...proxy.WISP_ENDPOINTS.map((w) => h('option', { value: w, selected: w === cfg.wisp, text: new URL(w).host }))))),

        h('div.br-setactions', {},
          h('button.btn', { html: icon('trash') + ' Clear History', onclick: () => {
            store.set('browser.history', []);
            toast('Histórico e cookies limpos', { kind: 'ok' });
            paintStatus();
          } }),
          h('button.btn.primary', { html: icon('wand') + ' Repair', onclick: async () => {
            proxy.resetUV(); proxy.resetScramjet();
            proxy.runtime.stats.errors = 0; proxy.runtime.stats.lastError = '';
            try {
              const regs = await navigator.serviceWorker?.getRegistrations?.() || [];
              await Promise.all(regs.filter((r) => /\/uv\/|\/scramjet\//.test(r.scope)).map((r) => r.scope));
            } catch {}
            toast('Proxy reiniciado', { kind: 'ok' });
            const tab = active();
            if (tab?.url) renderPage(tab); else paintStatus();
          } })),
      ),

      h('footer.br-setfoot', {},
        h('span', {}, statusDot, statusText),
        h('span', { style: { flex: '1' } }),
        h('button.br-setbrand', {
          html: '<b>TripleTHD</b><span>built on LuminOS</span>',
          title: 'Abrir o site do TripleTHD',
          onclick: () => window.open('https://github.com/', '_blank', 'noopener'),
        })));

    home.onchange = () => proxy.save({ homepage: home.value.trim() });
    paintStatus();
    clearInterval(settingsClock);
    settingsClock = setInterval(() => {
      const c = settingsPanel.querySelector('.br-clock');
      if (c && !settingsPanel.hidden) c.textContent = proxy.clockLabel();
      if (!settingsPanel.hidden) paintStatus();
      else clearInterval(settingsClock);
    }, 1000);
  }

  let settingsClock = 0;

  function showMenu() {
    import('../ui.js').then(({ contextMenu }) => {
      const rect = bMenu.getBoundingClientRect();
      const cfg = proxy.settings();
      contextMenu({ clientX: rect.right - 200, clientY: rect.bottom + 4 }, [
        { label: 'Nova aba', icon: 'plus', action: () => newTab() },
        { label: 'Página inicial', icon: 'home', action: () => showStart() },
        { label: 'Configurações do navegador…', icon: 'settings', action: () => openSettings() },
        { sep: true },
        { label: 'Protocolo: ' + (proxy.PROTOCOLS.find((p) => p.id === cfg.protocol)?.name || 'direto'), icon: 'shield', action: () => {} },
        ...proxy.PROTOCOLS.map((p) => ({
          label: '  · ' + p.name + (p.id === cfg.protocol ? '  ✓' : ''),
          action: () => { proxy.save({ protocol: p.id }); const t = active(); if (t?.url) renderPage(t); },
        })),
        { label: 'Desligar proxy (modo direto)', action: () => { proxy.save({ protocol: 'none' }); const t = active(); if (t?.url) renderPage(t); } },
        { sep: true },
        { label: 'Transporte: ' + (proxy.TRANSPORTS.find((t) => t.id === cfg.transport)?.name || '—'), icon: 'layers', action: () => {} },
        ...proxy.TRANSPORTS.map((t) => ({
          label: '  · ' + t.name + (t.id === cfg.transport ? '  ✓' : ''),
          action: () => {
            proxy.save({ transport: t.id });
            proxy.resetUV(); proxy.resetScramjet();
            toast('Transporte: ' + t.name, { kind: 'ok' });
            const tab = active(); if (tab?.url) renderPage(tab);
          },
        })),
        { label: 'Relay Wisp…', icon: 'globe', action: () => {
          import('../ui.js').then(({ modal }) => {
            const inp = h('input.input', { value: proxy.settings().wisp });
            modal({
              title: 'Relay Wisp', ok: 'Salvar',
              body: [h('p.tiny', { text: 'O proxy usa um relay público (Wisp) para falar com os sites. Escolha um que responda na sua rede.' }),
                h('.field', {}, h('span', { text: 'Endpoint' }), inp),
                h('.row', { style: { gap: '6px', flexWrap: 'wrap' } },
                  ...WISP_ENDPOINTS.map((w) => h('button.btn.subtle.tiny', { text: new URL(w).host, onclick: () => { inp.value = w; } })))],
              onOk: async () => {
                proxy.save({ wisp: inp.value.trim() });
                proxy.resetUV(); proxy.resetScramjet();
                toast('Relay salvo — navegue novamente', { kind: 'ok' });
              },
            });
          });
        } },
        { sep: true },
        { label: 'Motor de busca…', icon: 'search', action: () => {
          import('../ui.js').then(({ contextMenu: cm }) => cm({ clientX: rect.right - 200, clientY: rect.bottom + 30 },
            proxy.ENGINES.map((en) => ({
              label: en.name + (en.id === cfg.engine ? '  ✓' : ''),
              action: () => { proxy.save({ engine: en.id }); const t = active(); if (t && !t.url) showStart(); },
            }))));
        } },
        { label: 'Limpar histórico', icon: 'trash', danger: true, action: () => { store.set('browser.history', []); toast('Histórico limpo', { kind: 'ok' }); } },
        { label: 'Histórico recente', icon: 'clock', action: () => {
          const l = history.list().slice(0, 12);
          import('../ui.js').then(({ contextMenu: cm }) => cm({ clientX: rect.right - 200, clientY: rect.bottom + 30 },
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

  bProxy.style.color = proxy.settings().protocol === 'none' ? '' : 'var(--accent)';
  bProxy.onclick = () => openSettings();
  newTab(api?.args?.url || proxy.settings().homepage || '');

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

