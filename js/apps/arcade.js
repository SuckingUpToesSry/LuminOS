/* ============================================================
   LuminOS — Games: LuminSDK (1.100+), GN-Math (848) e Jogos locais
   ============================================================ */

import { h, store, sound, debounce } from '../core.js';
import { icon } from '../icons.js';
import { toast, modal } from '../ui.js';
import { gameList } from './games.js';
import { initLumin, getGames, isReady as sdkReady, sdk, gameUrl, imageUrl, categories as sdkCategories, randomGames } from '../luminsdk.js';
import { fetchGameHTML, injectBase, isYtPlayable, coverUrls, loaderHTML, FEATURED } from '../gnmath.js';

const FAV = 'arcade.favorites';
const RECENT = 'arcade.recent';
const favs = () => store.get(FAV, []);
const recent = () => store.get(RECENT, []);

function toggleFav(entry) {
  const list = favs();
  const i = list.findIndex((x) => x.key === entry.key);
  if (i >= 0) list.splice(i, 1); else list.unshift(entry);
  store.set(FAV, list.slice(0, 120));
  sound.click();
  return i < 0;
}
function pushRecent(entry) {
  const list = recent().filter((x) => x.key !== entry.key);
  list.unshift({ ...entry, ts: Date.now() });
  store.set(RECENT, list.slice(0, 12));
}

export const arcadeApp = {
  id: 'games',
  name: 'Jogos',
  glyph: 'game',
  grad: ['#4ade80', '#14b8a6'],
  size: { w: 960, h: 660 },
  category: 'Mídia',
  dock: true,
  desktop: true,
  singleton: true,
  mount(body, api) {
    let tab = 'lumin';           // lumin | gnmath | local | fav
    let page = 1, limit = 24, query = '', total = 0, pages = 1;
    let items = [], loading = false;
    let gnCache = null;
    let currentGame = null;

    body.innerHTML = '';
    const wrap = h('div', { style: { display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--surface)', minHeight: '0' } });

    /* ── barra superior ─────────────────────────────────── */
    const search = h('input.input', { placeholder: 'Buscar jogo…', style: { width: '220px', fontSize: '12.5px' } });
    const tabs = h('div', { style: { display: 'flex', gap: '4px' } });
    const statusChip = h('span.chip', { text: 'LuminSDK' });

    const mkTab = (id, label, ic) => {
      const b = h('button.btn.subtle', { html: icon(ic) + ' ' + label, dataset: { tab: id } });
      b.onclick = () => { tab = id; page = 1; renderTabs(); render(); };
      return b;
    };
    const tLumin = mkTab('lumin', 'LuminSDK', 'spark');
    const tGn = mkTab('gnmath', 'GN-Math', 'game');
    const tLocal = mkTab('local', 'Clássicos', 'apps');
    const tFav = mkTab('fav', 'Favoritos', 'star');
    tabs.append(tLumin, tGn, tLocal, tFav);

    const bar = h('div.app-toolbar', {},
      tabs,
      h('span.grow'),
      search,
      h('button.btn.subtle.icon', { html: icon('wand'), title: 'Aleatório', onclick: playRandom }),
      h('button.btn.subtle.icon', { html: icon('refresh'), title: 'Atualizar', onclick: () => { loading = false; items = []; render(); } }),
      statusChip);

    /* ── página (grade) e player ────────────────────────── */
    const pager = h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', padding: '14px 0 22px' } });
    const grid = h('div.store-grid', { style: { gridTemplateColumns: 'repeat(auto-fill,minmax(148px,1fr))', padding: '6px 18px 0' } });
    const main = h('div.app-main', { style: { minHeight: '0' } }, grid, pager);
    const player = h('div', { style: {
      position: 'absolute', inset: '0', display: 'none', flexDirection: 'column',
      background: 'var(--bg)', zIndex: 4,
    } });
    const stageWrap = h('div', { style: { flex: '1', position: 'relative', minHeight: '0', background: '#000' } });
    const playerBar = h('div', { style: {
      display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px',
      borderBottom: '1px solid var(--line)', background: 'var(--surface-2)', flexWrap: 'wrap',
    } });
    const playerTitle = h('b', { style: { fontSize: '13px' }, text: 'Jogo' });
    const playerSub = h('span.tiny', { text: '' });
    const frame = h('iframe', {
      style: { position: 'absolute', inset: '0', width: '100%', height: '100%', border: '0', background: '#000' },
      allow: 'autoplay; fullscreen; pointer-lock; gamepad; clipboard-write; accelerometer; gyroscope',
      referrerpolicy: 'no-referrer',
    });
    const loaderLayer = h('div', { style: { position: 'absolute', inset: '0', display: 'none' } });
    const loaderFrame = h('iframe', {
      style: { width: '100%', height: '100%', border: '0', background: '#0b0d12' },
      sandbox: 'allow-scripts allow-same-origin',
    });
    loaderLayer.append(loaderFrame);
    stageWrap.append(frame, loaderLayer);

    playerBar.append(
      h('button.btn', { html: icon('chevL') + ' Voltar', onclick: closePlayer }),
      playerTitle, playerSub,
      h('span.grow'),
      h('button.btn.subtle.icon', { html: icon('refresh'), title: 'Reiniciar', onclick: () => currentGame?.reload?.() }),
      h('button.btn.subtle.icon', { html: icon('maximize'), title: 'Tela cheia', onclick: () => stageWrap.requestFullscreen?.().catch(() => {}) }),
      h('button.btn.subtle.icon', { html: icon('external'), title: 'Abrir em outra aba', onclick: () => currentGame?.openExternal?.() }));
    player.append(playerBar, stageWrap);
    wrap.append(bar, main, player);
    body.append(wrap);
    body.style.position = 'relative';

    /* ── helpers de UI ──────────────────────────────────── */
    function renderTabs() {
      [tLumin, tGn, tLocal, tFav].forEach((b) => {
        b.classList.toggle('primary', b.dataset.tab === tab);
      });
      statusChip.textContent = {
        lumin: sdk.ready ? 'LuminSDK conectado' : 'LuminSDK',
        gnmath: '848 jogos · GN-Math',
        local: 'offline',
        fav: `${favs().length} salvos`,
      }[tab];
    }

    function skeleton(n = 12) {
      grid.innerHTML = '';
      for (let i = 0; i < n; i++) {
        grid.append(h('div.store-card', { style: { opacity: '.5' } },
          h('div.cover', { style: { height: '76px' } }),
          h('div.body', {}, h('b', { text: '···' }), h('p', { text: 'carregando' }))));
      }
    }

    function card(entry) {
      const fav = favs().some((x) => x.key === entry.key);
      const cover = h('div.cover', { style: { height: '82px', overflow: 'hidden', position: 'relative' } });
      if (entry.thumb) {
        const img = h('img', {
          src: entry.thumb, loading: 'lazy', alt: entry.name,
          style: { width: '100%', height: '100%', objectFit: 'cover' },
        });
        img.onerror = () => { img.remove(); cover.append(h('span', { style: { fontSize: '26px' }, text: '🎮' })); };
        cover.append(img);
      } else cover.append(h('span', { style: { fontSize: '26px' }, text: '🎮' }));

      const el = h('div.store-card', { style: { cursor: 'pointer' } },
        cover,
        h('div.body', {},
          h('b', { text: entry.name, style: { display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }),
          h('p', { text: entry.note || entry.cat || '' }),
          h('.foot', {},
            h('span.chip', { text: entry.source }),
            h('button.btn.subtle.icon', {
              html: icon('star'), title: fav ? 'Remover dos favoritos' : 'Favoritar',
              style: { color: fav ? 'var(--warn)' : '' },
              onclick: (e) => { e.stopPropagation(); toggleFav(entry); render(); },
            }))));
      el.onclick = () => openEntry(entry);
      return el;
    }

    /* ── carregamento ───────────────────────────────────── */
    async function loadLumin() {
      loading = true; skeleton();
      try {
        if (!sdkReady()) { statusChip.textContent = 'conectando…'; await initLumin(); }
        const res = await getGames({ page, limit, q: query });
        items = res.games.map((g) => ({
          key: 'lumin:' + g.id, source: 'LuminSDK', name: g.name, cat: g.category || '',
          note: g.category || 'LuminSDK', id: g.id, image_token: g.image_token, kind: 'lumin',
        }));
        total = res.total; pages = res.pages;
        // capas resolvidas em paralelo (blob URLs)
        items.forEach((it) => { imageUrl(it.image_token).then((u) => { if (u && it.el) it.el.querySelector('img')?.setAttribute('src', u); }); });
        renderGrid();
      } catch (err) {
        grid.innerHTML = '';
        grid.append(h('div.empty', { style: { gridColumn: '1/-1' } },
          h('div.big', { text: '📡' }),
          h('b', { text: 'LuminSDK não respondeu' }),
          h('p', { text: err.message + ' — pode ser bloqueio de rede. O catálogo GN-Math (848 jogos) continua funcionando offline.' }),
          h('div.row', { style: { gap: '8px', marginTop: '8px' } },
            h('button.btn.primary', { text: 'Tentar de novo', onclick: () => { loading = false; render(); } }),
            h('button.btn', { text: 'Ir para GN-Math', onclick: () => { tab = 'gnmath'; renderTabs(); render(); } }))));
      } finally {
        loading = false;
        renderTabs();
      }
    }

    async function loadGnMath() {
      loading = true; skeleton(16);
      if (!gnCache) {
        try {
          const res = await fetch('data/gnmath-games.json');
          gnCache = (await res.json()).games || [];
        } catch {
          gnCache = [];
        }
      }
      const q = query.toLowerCase();
      let list = gnCache.filter((g) => !q || g.n.toLowerCase().includes(q) || (g.a || '').toLowerCase().includes(q));
      total = list.length; pages = Math.max(1, Math.ceil(total / (limit * 2)));
      list = list.slice((page - 1) * limit * 2, page * limit * 2);
      items = list.map((g) => ({
        key: 'gn:' + g.i, source: 'GN-Math', name: g.n, cat: (g.t || []).join(','),
        note: g.a || '', f: g.f, c: g.c, kind: 'gn',
      }));
      loading = false;
      renderGrid();
    }

    function loadLocal() {
      const names = { snake: 'Serpente', memory: 'Memória', ttt: 'Jogo da Velha', '2048': '2048', reaction: 'Reflexo', mines: 'Campo Minado', simon: 'Simon' };
      items = gameList.map((g) => ({ key: 'local:' + g.id, source: 'Local', name: names[g.id] || g.name, note: g.desc, kind: 'local', game: g }));
      total = items.length; pages = 1;
      renderGrid();
    }

    function loadFavs() {
      items = favs().map((f) => ({ ...f, source: f.source || 'Favorito' }));
      total = items.length; pages = 1;
      renderGrid();
    }

    function renderGrid() {
      grid.innerHTML = '';
      if (!items.length) {
        grid.append(h('div.empty', { style: { gridColumn: '1/-1' } }, h('div.big', { text: '🎮' }),
          h('b', { text: 'Nada por aqui' }), h('p', { text: query ? 'Nenhum jogo corresponde a “' + query + '”.' : 'Nenhum jogo nesta aba.' })));
        pager.innerHTML = '';
        return;
      }
      items.forEach((it) => {
        const el = card(it);
        it.el = el;
        grid.append(el);
      });
      pager.innerHTML = '';
      if (pages > 1) {
        pager.append(
          h('button.btn.subtle.icon', { html: icon('chevL'), disabled: page <= 1, onclick: () => { page = Math.max(1, page - 1); render(); } }),
          h('span.tiny', { text: `página ${page} de ${pages} · ${total} jogos` }),
          h('button.btn.subtle.icon', { html: icon('chevR'), disabled: page >= pages, onclick: () => { page = Math.min(pages, page + 1); render(); } }));
      } else if (total) {
        pager.append(h('span.tiny', { text: `${total} jogos` }));
      }
    }

    function render() {
      if (loading) return;
      if (tab === 'lumin') return loadLumin();
      if (tab === 'gnmath') return loadGnMath();
      if (tab === 'local') return loadLocal();
      return loadFavs();
    }

    /* ── player ─────────────────────────────────────────── */
    function showLoader(title, detail) {
      loaderLayer.style.display = 'block';
      loaderFrame.srcdoc = loaderHTML(title);
      playerSub.textContent = detail || '';
    }
    function hideLoader() { loaderLayer.style.display = 'none'; }

    function openPlayerUI(title, sub) {
      player.style.display = 'flex';
      playerTitle.textContent = title;
      playerSub.textContent = sub || '';
      sound.open();
    }
    function closePlayer() {
      player.style.display = 'none';
      frame.removeAttribute('srcdoc');
      frame.src = 'about:blank';
      hideLoader();
      currentGame = null;
      renderTabs();
    }

    async function openEntry(entry) {
      pushRecent({ key: entry.key, source: entry.source, name: entry.name, note: entry.note, thumb: entry.thumb });
      if (entry.kind === 'local') {
        // reabre o app "Clássicos" já no jogo escolhido
        document.dispatchEvent(new CustomEvent('lumin:open-classic', { detail: { game: entry.game.id } }));
        return;
      }

      openPlayerUI(entry.name, entry.source + (entry.note ? ' · ' + entry.note : ''));
      frame.src = 'about:blank';
      frame.removeAttribute('srcdoc');
      showLoader('Abrindo “' + entry.name + '”…', 'Buscando nos espelhos…');

      if (entry.kind === 'lumin') {
        try {
          const url = await gameUrl(entry.id);
          if (!url) throw new Error('URL indisponível');
          currentGame = {
            reload: () => openEntry({ ...entry, key: entry.key }),
            openExternal: () => window.open(url, '_blank', 'noopener'),
          };
          frame.src = url;
          frame.onload = () => { hideLoader(); sound.ok(); };
          setTimeout(() => hideLoader(), 6000);
        } catch (err) {
          hideLoader();
          toast('Não consegui abrir este jogo: ' + err.message, { kind: 'err' });
        }
        return;
      }

      if (entry.kind === 'gn') {
        try {
          const { html, used } = await fetchGameHTML({ f: entry.f }, {
            onProgress: (p) => {
              if (p.phase === 'download') playerSub.textContent = `${p.percent}% · espelho ${p.index + 1}/${p.total}`;
              if (p.phase === 'retry') playerSub.textContent = `tentando espelho ${p.index + 2}/${p.total}…`;
            },
          });
          if (isYtPlayable(html)) {
            hideLoader();
            toast('YouTube Playables não roda embutido; abrindo fora', { kind: 'err' });
            window.open(used, '_blank', 'noopener');
            return;
          }
          frame.srcdoc = injectBase(html, used);
          hideLoader();
          currentGame = {
            reload: () => openEntry(entry),
            openExternal: () => window.open(used, '_blank', 'noopener'),
          };
          sound.ok();
        } catch (err) {
          hideLoader();
          frame.src = `https://cdn.jsdelivr.net/gh/freebuisness/html@main/${entry.f}`;
          currentGame = { reload: () => openEntry(entry), openExternal: () => window.open(frame.src, '_blank', 'noopener') };
          toast('Espelhos lentos — tentando direto do CDN', { kind: 'err' });
        }
        return;
      }

      // favorito de qualquer origem
      if (entry.f) return openEntry({ ...entry, kind: 'gn' });
      if (entry.id) return openEntry({ ...entry, kind: 'lumin' });
      hideLoader();
    }

    async function playRandom() {
      if (tab === 'lumin') {
        try {
          const list = await randomGames(1);
          if (list[0]) openEntry({ key: 'lumin:' + list[0].id, kind: 'lumin', name: list[0].name, id: list[0].id, source: 'LuminSDK', note: list[0].category || '' });
        } catch { toast('LuminSDK indisponível para sorteio', { kind: 'err' }); }
      } else {
        if (!gnCache) { await loadGnMath(); }
        const g = gnCache[Math.floor(Math.random() * gnCache.length)];
        if (g) openEntry({ key: 'gn:' + g.i, kind: 'gn', name: g.n, f: g.f, c: g.c, source: 'GN-Math', note: (g.t || []).join(',') });
      }
    }

    /* ── busca / atalhos ────────────────────────────────── */
    const doSearch = debounce(() => { query = search.value.trim(); page = 1; render(); }, 320);
    search.addEventListener('input', doSearch);
    search.addEventListener('keydown', (e) => { if (e.key === 'Enter') { query = search.value.trim(); page = 1; render(); } });

    api?.onArgs?.((a) => {
      if (a?.game) {
        tab = 'local'; page = 1; renderTabs(); render();
      }
      if (a?.gameId) {
        const g = gameList.find((x) => x.id === a.gameId);
        if (g) {
          const names = { snake: 'Serpente', memory: 'Memória', ttt: 'Jogo da Velha', '2048': '2048', reaction: 'Reflexo', mines: 'Campo Minado', simon: 'Simon' };
          openEntry({ key: 'local:' + g.id, source: 'Local', name: names[g.id] || g.name, note: g.desc, kind: 'local', game: g });
        }
      }
    });

    renderTabs();
    render();

    // atalhos fixos do usuário (GN-Math) no rodapé da aba GN-Math
    // atalho: "Clássicos" abre uma janela própria com os jogos locais
    document.addEventListener('lumin:open-classic', (e) => {
      const gid = e.detail?.game;
      const open = () => window.dispatchEvent(new CustomEvent('lumin:open', { detail: { id: 'classic-games', args: gid ? { game: gid } : undefined } }));
      open();
    }, { once: false });

    window.LuminArcade = window.LuminArcade || {};
    Object.assign(window.LuminArcade, { favs, recent, openEntry, toggleFav });

    // entrada dos jogos clássicos (montados por uma janela "games" separada)
    void FEATURED; void modal;
    return {
      onClose() { frame.src = 'about:blank'; hideLoader(); },
    };
  },
};
