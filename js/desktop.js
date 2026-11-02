/* ============================================================
   LuminOS — shell: desktop, topbar, dock, launcher, painéis
   ============================================================ */

import { $, $$, h, store, sound, clamp, pad, fmtTime, greet, accentPalette, debounce, isMac, modKey } from './core.js';
import { icon, appIcon } from './icons.js';
import { wm } from './wm.js';
import { registry, resolveApp } from './registry.js';
import { toast, contextMenu, promptDialog, confirmDialog, modal } from './ui.js';
import { renderPanel, renderBadge, clearAll } from './notifications.js';

const WALLPAPERS = [
  { id: 'aurora', name: 'Aurora', css: 'linear-gradient(150deg,#12162a 0%,#1b1436 38%,#0d1220 100%)' },
  { id: 'nebula', name: 'Nebulosa', css: 'radial-gradient(900px 600px at 15% 10%,#3b2a6b,transparent 60%),radial-gradient(700px 500px at 85% 90%,#0d4d5c,transparent 60%),linear-gradient(160deg,#080b16,#0b1220)' },
  { id: 'sunset', name: 'Pôr do sol', css: 'linear-gradient(160deg,#ff9e6d 0%,#f0709a 40%,#6f5bd6 100%)' },
  { id: 'mint', name: 'Menta', css: 'linear-gradient(150deg,#0f2f2a 0%,#14544a 50%,#0a1f1c 100%)' },
  { id: 'graphite', name: 'Grafite', css: 'linear-gradient(150deg,#1b1e24 0%,#2a2f38 60%,#121419 100%)' },
  { id: 'ocean', name: 'Oceano', css: 'radial-gradient(800px 500px at 80% 10%,#1f5f8b,transparent 60%),linear-gradient(160deg,#081726,#0a2338)' },
  { id: 'paper', name: 'Papel', css: 'linear-gradient(160deg,#f7f3ec 0%,#e9e2d6 60%,#dcd3c4 100%)' },
  { id: 'rose', name: 'Rosé', css: 'linear-gradient(150deg,#2b1220 0%,#4a1f33 50%,#1a0c14 100%)' },
];

export function wallpaperOptions() { return WALLPAPERS; }

/* ── theme & accent ───────────────────────────────────────── */
export function setTheme(id) {
  document.documentElement.dataset.theme = id;
  store.set('settings', { ...store.get('settings', {}), theme: id });
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', id === 'light' || id === 'sand' ? '#f4f5f8' : '#0b0d12');
  import('./notifications.js').then(({ renderPanel }) => { if (!$('#notifpanel').hidden) renderPanel(); });
}

export function setAccent(a) {
  if (typeof a === 'string') a = accentPalette.find((x) => x.id === a) || accentPalette[0];
  document.documentElement.style.setProperty('--accent', a.c);
  document.documentElement.style.setProperty('--accent-2', a.c2);
  store.set('settings', { ...store.get('settings', {}), accent: a.id });
}

export function setWallpaper(value) {
  const wp = $('#wallpaper');
  if (!wp) return;
  const preset = WALLPAPERS.find((w) => w.id === value);
  if (preset) {
    wp.style.background = preset.css;
    wp.style.backgroundImage = '';
    wp.style.backgroundSize = '';
    wp.classList.remove('image');
    store.set('wallpaper', value);
  } else {
    wp.style.background = '#0b0d12';
    wp.style.backgroundImage = `url("${value}")`;
    wp.style.backgroundSize = 'cover';
    wp.style.backgroundPosition = 'center';
    wp.classList.add('image');
    store.set('wallpaper', value);
  }
  const lb = $('#lock-bg');
  if (lb) {
    if (preset) lb.style.background = preset.css;
    else { lb.style.background = '#0b0d12'; lb.style.backgroundImage = `url("${value}")`; lb.style.backgroundSize = 'cover'; }
  }
}

export function applySettings() {
  const s = store.get('settings', {});
  const wp = $('#wallpaper');
  const icons = $('#icons');
  const dock = $('#dock');
  if (icons) icons.hidden = s.desktopIcons === false;
  if (dock) dock.classList.toggle('big', !!s.bigDock);
  document.body.classList.toggle('no-blur', s.blur === false);
  document.body.classList.toggle('no-motion', s.motion === false);
  const weather = $('#btn-weather');
  if (weather) weather.hidden = s.showWeather === false;
  if (wp) setWallpaper(store.get('wallpaper', 'aurora'));
  refreshIcons();
  refreshDock();
  updateProfileChip();
}

export function updateProfileChip() {
  const p = store.get('profile', { name: 'Visitante' });
  const lb = $('#lock-user');
  if (lb) {
    lb.innerHTML = '';
    lb.append(h('div.lock-avatar', { text: (p.name || 'V')[0].toUpperCase() }), h('div', { text: p.name || 'Visitante' }));
  }
}

/* ── desktop icons ────────────────────────────────────────── */
export function refreshIcons() {
  const layer = $('#icons');
  if (!layer) return;
  layer.innerHTML = '';
  const s = store.get('settings', {});
  const hidden = new Set(store.get('desktop.hidden', []));
  registry.all().filter((a) => a.desktop && !hidden.has(a.id)).forEach((app) => {
    layer.append(deskIcon(app));
  });
  const custom = JSON.parse(localStorage.getItem('luminos:creator.apps') || '[]');
  custom.forEach((w) => layer.append(deskIcon({
    id: 'web:' + w.id, name: w.name, glyph: 'globe', grad: [w.c1, w.c2], emoji: w.emoji, custom: true,
  })));
  if (s.desktopIcons === false) layer.hidden = true;
}

function deskIcon(app) {
  const el = h('button.desk-icon', { title: app.name, dataset: { app: app.id } },
    h('span.ico', { html: appIcon(app, '') }),
    h('span.lbl', { text: app.name }));
  el.onclick = () => { selectIcon(el); };
  el.ondblclick = () => openApp(app.id);
  el.oncontextmenu = (e) => {
    e.preventDefault();
    selectIcon(el);
    contextMenu(e, [
      { label: 'Abrir', icon: 'external', action: () => openApp(app.id) },
      { label: 'Renomear', icon: 'edit', action: () => renameIcon(app) },
      { label: 'Remover do desktop', icon: 'x', action: () => removeIcon(app) },
      { sep: true },
      { label: 'Propriedades', icon: 'info', action: () => showProps(app) },
    ]);
  };
  return el;
}

function selectIcon(el) {
  $$('.desk-icon.sel', $('#icons')).forEach((x) => x.classList.remove('sel'));
  el.classList.add('sel');
}

function renameIcon(app) {
  promptDialog({ title: 'Renomear ícone', value: app.name, onOk: (name) => {
    if (app.custom) {
      const list = JSON.parse(localStorage.getItem('luminos:creator.apps') || '[]');
      const w = list.find((x) => app.id === 'web:' + x.id);
      if (w) { w.name = name; localStorage.setItem('luminos:creator.apps', JSON.stringify(list)); }
    } else {
      store.set('appNames', { ...store.get('appNames', {}), [app.id]: name });
    }
    refreshIcons(); refreshDock();
  } });
}

function removeIcon(app) {
  if (app.custom) {
    const list = JSON.parse(localStorage.getItem('luminos:creator.apps') || '[]')
      .filter((x) => app.id !== 'web:' + x.id);
    localStorage.setItem('luminos:creator.apps', JSON.stringify(list));
  } else {
    const hid = store.get('desktop.hidden', []);
    if (!hid.includes(app.id)) { hid.push(app.id); store.set('desktop.hidden', hid); }
  }
  refreshIcons();
  toast('Ícone removido do desktop');
}

function showProps(app) {
  modal({
    title: 'Propriedades', ok: 'Fechar', cancel: null,
    body: h('div', { style: { display: 'grid', gap: '7px' } },
      h('div.row', {}, h('span', { html: appIcon(app, ''), style: { width: '40px', height: '40px' } }),
        h('div', {}, h('b', { text: app.name }), h('small', { class: 'tiny', text: 'ID: ' + app.id }))),
      h('hr.sep'),
      h('div.tiny', { text: 'Categoria: ' + (app.category || 'App') }),
      h('div.tiny', { text: 'Tipo: ' + (app.custom ? 'Web app criado por você' : 'App do sistema') }),
      h('div.tiny', { text: 'Janela padrão: ' + (app.size ? `${app.size.w} × ${app.size.h}` : 'auto') })),
  });
}

/* ── dock ─────────────────────────────────────────────────── */
export function refreshDock() {
  const dock = $('#dock');
  if (!dock) return;
  dock.innerHTML = '';
  const running = new Set(wm.windows().map((w) => w.appId));
  const names = store.get('appNames', {});
  registry.dockApps().forEach((app) => {
    const el = h('button.dock-item', { class: running.has(app.id) ? 'running' : '', dataset: { app: app.id }, title: app.name },
      h('span.ico', { html: appIcon(app, '') }),
      h('span.dot'),
      h('span.tip', { text: names[app.id] || app.name }));
    el.onclick = () => {
      const open = wm.byApp(app.id);
      if (open.length === 1) wm.toggleMinimize(open[0].id);
      else if (open.length > 1) wm.focus(open[open.length - 1].id);
      else openApp(app.id);
    };
    el.oncontextmenu = (e) => {
      e.preventDefault();
      const wins = wm.byApp(app.id);
      contextMenu(e, [
        { label: 'Abrir', icon: 'external', action: () => openApp(app.id) },
        ...(wins.length ? [
          { label: 'Minimizar', icon: 'minus', action: () => wins.forEach((w) => wm.minimize(w.id)) },
          { label: 'Fechar', icon: 'x', action: () => wins.forEach((w) => wm.close(w.id)) },
        ] : []),
        { sep: true },
        { label: 'Nova janela', icon: 'plus', action: () => wm.open({ ...app, singleton: false }) },
      ]);
    };
    dock.append(el);
  });
  dock.append(h('div.dock-sep'));
  const term = h('button.dock-item', { title: 'Terminal', dataset: { app: 'terminal' } },
    h('span.ico', { html: appIcon(registry.get('terminal'), '') }), h('span.dot'),
    h('span.tip', { text: 'Terminal' }));
  term.onclick = () => openApp('terminal');
  dock.append(term);
  const launcher = h('button.dock-item', { title: 'Todos os apps', id: 'dock-launcher' },
    h('span.ico', { html: `<svg viewBox="0 0 48 48"><rect width="48" height="48" rx="12" fill="var(--surface-3)"/>
      ${[0, 1, 2, 3].map((i) => {
        const x = 13 + (i % 2) * 12, y = 13 + Math.floor(i / 2) * 12;
        return `<rect x="${x}" y="${y}" width="9" height="9" rx="2.4" fill="var(--text-2)"/>`;
      }).join('')}</svg>` }),
    h('span.tip', { text: 'Todos os apps' }));
  launcher.onclick = () => toggleLauncher();
  dock.append(launcher);
}

/* ── open app ─────────────────────────────────────────────── */
export function openApp(id, opts = {}) {
  const app = resolveApp(id);
  if (!app) { toast('App não encontrado: ' + id, { kind: 'err' }); return null; }
  closeAllPanels();
  sound.open();
  return wm.open(app, opts);
}

/* ── launcher ─────────────────────────────────────────────── */
function toggleLauncher() {
  const el = $('#launcher');
  if (!el.hidden) return closeAllPanels();
  closeAllPanels();
  el.hidden = false;
  el.innerHTML = '';
  const search = h('input.input', { placeholder: 'Pesquisar apps…', autocomplete: 'off' });
  el.append(h('div.launcher-head', {},
    h('span', { html: `<span class="logo-dot"></span>`, style: { display: 'flex' } }),
    h('div.launcher-search', {}, h('span', { html: icon('search') }), search),
    h('button.btn.icon.subtle', { html: icon('x'), title: 'Fechar', onclick: closeAllPanels })));

  const grid = h('div.app-grid');
  const customGrid = h('div.app-grid');
  const names = store.get('appNames', {});

  const cell = (app) => {
    const c = h('button.app-cell', { title: app.name },
      h('span.ico', { html: appIcon(app, '') }),
      h('span.nm', { text: names[app.id] || app.name }));
    c.onclick = () => { closeAllPanels(); openApp(app.id); };
    c.oncontextmenu = (e) => {
      e.preventDefault();
      contextMenu(e, [
        { label: 'Abrir', icon: 'external', action: () => { closeAllPanels(); openApp(app.id); } },
        { label: 'Nova janela', icon: 'plus', action: () => { closeAllPanels(); wm.open({ ...app, singleton: false }); } },
        { sep: true },
        { label: 'Adicionar ao desktop', icon: 'grid', action: () => {
          const hid = store.get('desktop.hidden', []).filter((x) => x !== app.id);
          store.set('desktop.hidden', hid); refreshIcons(); toast('Adicionado ao desktop', { kind: 'ok' });
        } },
      ]);
    };
    return c;
  };

  registry.categories().forEach((cat) => {
    const apps = registry.all().filter((a) => (a.category || 'Outros') === cat);
    if (!apps.length) return;
    el.append(h('h4', { text: cat }));
    const g = h('div.app-grid');
    apps.forEach((a) => g.append(cell(a)));
    el.append(g);
  });
  const custom = JSON.parse(localStorage.getItem('luminos:creator.apps') || '[]');
  if (custom.length) {
    el.append(h('h4', { text: 'Seus web apps' }));
    custom.forEach((w) => customGrid.append(cell({ id: 'web:' + w.id, name: w.name, glyph: 'globe', grad: [w.c1, w.c2], custom: true })));
    el.append(customGrid);
  }

  search.addEventListener('input', () => {
    const q = search.value.toLowerCase().trim();
    $$('.app-cell', el).forEach((c) => {
      c.hidden = !!q && !c.querySelector('.nm').textContent.toLowerCase().includes(q);
    });
    $$('h4', el).forEach((hh) => { hh.hidden = !!q; });
  });
  setTimeout(() => search.focus(), 30);
  sound.click();
}

/* ── quick settings panel ─────────────────────────────────── */
function toggleQuick() {
  const el = $('#quickpanel');
  if (!el.hidden) return closeAllPanels();
  closeAllPanels();
  el.hidden = false;
  renderQuick(el);
  sound.click();
}

function renderQuick(el) {
  el.innerHTML = '';
  const s = store.get('settings', {});
  const vol = store.get('sound.volume', .5);
  const bright = store.get('brightness', 100);

  const volRow = h('div.qp-slider', {},
    h('div.row', {}, h('span', { html: icon('vol') }), h('span', { text: 'Volume' }), h('span.grow', { style: { flex: '1' } }),
      h('span.tiny', { text: Math.round(vol * 100) + '%' })),
    h('input', { type: 'range', min: 0, max: 100, value: Math.round(vol * 100),
      oninput: (e) => { sound.volume = e.target.value / 100; store.set('sound.volume', sound.volume); e.target.closest('.qp-slider').querySelector('.tiny').textContent = e.target.value + '%'; } }));
  const brightRow = h('div.qp-slider', {},
    h('div.row', {}, h('span', { html: icon('sun') }), h('span', { text: 'Brilho' }), h('span.grow', { style: { flex: '1' } }),
      h('span.tiny', { text: bright + '%' })),
    h('input', { type: 'range', min: 30, max: 100, value: bright,
      oninput: (e) => {
        const v = +e.target.value;
        store.set('brightness', v);
        $('#wallpaper').style.filter = `brightness(${v / 100})`;
        e.target.closest('.qp-slider').querySelector('.tiny').textContent = v + '%';
      } }));

  const tile = (label, sub, on, onclick, ic) => {
    const b = h('button.qp-tile', { class: on ? 'on' : '' }, h('span', { html: icon(ic) }), h('b', { text: label }), h('span', { text: sub }));
    b.onclick = () => { onclick(b); };
    return b;
  };

  const tiles = h('div.qp-toggles', {},
    tile('Tema', document.documentElement.dataset.theme === 'light' ? 'Claro' : 'Escuro',
      document.documentElement.dataset.theme === 'light',
      (btn) => {
        const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
        setTheme(next);
        btn.classList.toggle('on', next === 'light');
        btn.querySelector('span').textContent = next === 'light' ? 'Claro' : 'Escuro';
      }, 'moon'),
    tile('Sons', sound.enabled ? 'Ativados' : 'Silenciados', sound.enabled, (btn) => {
      sound.enabled = !sound.enabled;
      store.set('sound.enabled', sound.enabled);
      btn.classList.toggle('on', sound.enabled);
      btn.querySelector('span').textContent = sound.enabled ? 'Ativados' : 'Silenciados';
    }, 'sound'),
    tile('Não perturbe', (s.dnd ? 'Ligado' : 'Desligado'), !!s.dnd, (btn) => {
      const cur = store.get('settings', {});
      cur.dnd = !cur.dnd; store.set('settings', cur);
      btn.classList.toggle('on', cur.dnd);
      btn.querySelector('span').textContent = cur.dnd ? 'Ligado' : 'Desligado';
      import('./notifications.js').then(({ notify }) => notify({ title: 'Não perturbe', body: cur.dnd ? 'Notificações silenciadas' : 'Notificações ativadas', iconName: 'bell', silent: true }));
    }, 'bell'),
    tile('Proxy', store.get('browser.settings', {}).proxy !== 'none' ? 'Ligado' : 'Desligado',
      store.get('browser.settings', {}).proxy !== 'none', (btn) => {
        const cur = store.get('browser.settings', {});
        cur.proxy = cur.proxy === 'none' || !cur.proxy ? 'allorigins' : 'none';
        store.set('browser.settings', cur);
        btn.classList.toggle('on', cur.proxy !== 'none');
        btn.querySelector('span').textContent = cur.proxy !== 'none' ? 'Ligado' : 'Desligado';
      }, 'shield'));

  const themes = h('div.qp-themes');
  [['dark', 'Escuro', '#14171f'], ['light', 'Claro', '#fff'], ['midnight', 'Meia-noite', '#0c0f19'], ['nord', 'Nord', '#3b4252'], ['glass', 'Vidro', '#2a1f5e']]
    .forEach(([id, nm, bg]) => {
      const b = h('button.qp-theme', { title: nm, style: { background: bg },
        class: document.documentElement.dataset.theme === id ? 'active' : '' });
      b.onclick = () => { setTheme(id); renderQuick(el); };
      themes.append(b);
    });

  const walls = h('div.qp-wallpapers');
  WALLPAPERS.slice(0, 7).forEach((w) => {
    const b = h('button.qp-wall', { title: w.name, style: { background: w.css } });
    b.onclick = () => setWallpaper(w.id);
    walls.append(b);
  });

  el.append(
    volRow, brightRow, tiles,
    h('div.tiny', { text: 'Tema' }), themes,
    h('div.tiny', { text: 'Papel de parede' }), walls,
    h('hr.sep'),
    h('div.row', { style: { gap: '6px' } },
      h('button.btn.subtle', { html: icon('settings') + ' Configurações', style: { flex: '1' }, onclick: () => { closeAllPanels(); openApp('settings'); } }),
      h('button.btn.subtle.icon', { html: icon('power'), title: 'Desligar', onclick: shutdown }),
      h('button.btn.subtle.icon', { html: icon('lock'), title: 'Bloquear', onclick: () => lock() })));
}

/* ── panels close ─────────────────────────────────────────── */
export function closeAllPanels() {
  ['#launcher', '#quickpanel', '#notifpanel', '#palette'].forEach((s) => { const el = $(s); if (el) el.hidden = true; });
  const ds = $('#desk-search'); if (ds) ds.hidden = true;
}

/* ── palette (actions) ────────────────────────────────────── */
let palIndex = 0;
let palItems = [];

export function togglePalette() {
  const el = $('#palette');
  if (!el.hidden) return closeAllPanels();
  closeAllPanels();
  el.hidden = false;
  const input = $('#pal-q');
  input.value = '';
  palIndex = 0;
  buildPalette('');
  input.focus();
}

function buildPalette(q) {
  const list = $('#pal-list');
  const names = store.get('appNames', {});
  const actions = [
    { label: 'Abrir Configurações', sub: 'Sistema', icon: 'settings', run: () => openApp('settings') },
    { label: 'Alternar tema claro/escuro', sub: 'Aparência', icon: 'moon', run: () => setTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light') },
    { label: 'Trocar papel de parede', sub: 'Aparência', icon: 'image', run: () => openApp('settings', { args: { section: 'appearance' } }) },
    { label: 'Bloquear tela', sub: 'Segurança', icon: 'lock', run: () => lock() },
    { label: 'Nova nota', sub: 'Notas', icon: 'note', run: () => openApp('notes') },
    { label: 'Perguntar à LuminAI', sub: 'IA', icon: 'spark', run: () => openApp('ai') },
    { label: 'Abrir Terminal', sub: 'Sistema', icon: 'terminal', run: () => openApp('terminal') },
    { label: 'Abrir Loja de apps', sub: 'Sistema', icon: 'store', run: () => openApp('store') },
    { label: 'Tela cheia', sub: 'Janela', icon: 'maximize', run: () => toggleFullscreen() },
    { label: 'Limpar notificações', sub: 'Sistema', icon: 'bell', run: () => { clearAll(); toast('Notificações limpas', { kind: 'ok' }); } },
    { label: 'Exportar backup', sub: 'Dados', icon: 'download', run: () => openApp('settings', { args: { section: 'storage' } }) },
    { label: 'Desligar', sub: 'Encerrar', icon: 'power', run: () => shutdown() },
  ];
  const apps = registry.all().map((a) => ({
    label: 'Abrir ' + (names[a.id] || a.name), sub: a.category || 'App', icon: a.glyph, run: () => openApp(a.id),
  }));
  const seen = new Set();
  const all = [...actions, ...apps]
    .filter((it) => !q || (it.label + ' ' + it.sub).toLowerCase().includes(q.toLowerCase()))
    .filter((it) => { const k = it.label.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });

  palItems = all.slice(0, 40);
  list.innerHTML = '';
  if (!palItems.length) list.append(h('div.empty', { style: { padding: '22px' } }, h('b', { text: 'Nada encontrado' })));
  palItems.forEach((it, i) => {
    const row = h('div.pal-item', { class: i === palIndex ? 'sel' : '' },
      h('span.ico', { html: icon(it.icon) }),
      h('b', { text: it.label }),
      h('small', { text: it.sub }));
    row.onclick = () => { closeAllPanels(); it.run(); };
    list.append(row);
  });
}

function runPalette(dir) {
  if (!palItems.length) return;
  palIndex = (palIndex + dir + palItems.length) % palItems.length;
  $$('#pal-list .pal-item').forEach((r, i) => r.classList.toggle('sel', i === palIndex));
  $$('#pal-list .pal-item')[palIndex]?.scrollIntoView({ block: 'nearest' });
}

/* ── desk search (spotlight) ──────────────────────────────── */
function toggleDeskSearch() {
  const el = $('#desk-search');
  if (!el.hidden) return closeAllPanels();
  closeAllPanels();
  el.hidden = false;
  const input = $('#ds-input');
  input.value = '';
  renderDeskResults('');
  input.focus();
}

function renderDeskResults(q) {
  const box = $('#ds-results');
  box.innerHTML = '';
  const names = store.get('appNames', {});
  const apps = registry.all().filter((a) => !q || (names[a.id] || a.name).toLowerCase().includes(q.toLowerCase()));
  const notes = (store.get('notes.items', []) || []).filter((n) => !q || (n.title + n.body).toLowerCase().includes(q.toLowerCase())).slice(0, 4);
  apps.slice(0, 8).forEach((a) => {
    const row = h('div.pal-item', {}, h('span.ico', { html: appIcon(a, '') }), h('b', { text: names[a.id] || a.name }), h('small', { text: a.category || '' }));
    row.onclick = () => { closeAllPanels(); openApp(a.id); };
    box.append(row);
  });
  notes.forEach((n) => {
    const row = h('div.pal-item', {}, h('span.ico', { html: icon('note') }), h('b', { text: n.title || 'Nota' }), h('small', { text: 'Notas' }));
    row.onclick = () => { closeAllPanels(); openApp('notes'); };
    box.append(row);
  });
  if (q) {
    const row = h('div.pal-item', {}, h('span.ico', { html: icon('search') }), h('b', { text: `Pesquisar “${q}” na web` }), h('small', { text: 'Navegador' }));
    row.onclick = () => {
      closeAllPanels();
      const app = resolveApp('browser');
      wm.open(app, { args: { url: q.includes('.') ? q : 'https://duckduckgo.com/?q=' + encodeURIComponent(q) } });
    };
    box.append(row);
    const ai = h('div.pal-item', {}, h('span.ico', { html: icon('spark') }), h('b', { text: `Perguntar à IA: “${q}”` }), h('small', { text: 'LuminAI' }));
    ai.onclick = () => { closeAllPanels(); wm.open(resolveApp('ai'), { args: { prompt: q } }); };
    box.append(ai);
  }
  if (!box.children.length) box.append(h('div.empty', { style: { padding: '16px' } }, h('b', { text: 'Nenhum resultado' })));
}

/* ── clock / date ─────────────────────────────────────────── */
function tickClock() {
  const s = store.get('settings', {});
  const now = new Date();
  const t = $('#tb-clock-time');
  const d = $('#tb-clock-date');
  if (t) t.textContent = s.clockSeconds ? fmtTime(now, true) : fmtTime(now);
  if (d) d.textContent = now.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }).replace('.', '');
  const lt = $('#lock-time'), ld = $('#lock-date');
  if (lt) lt.textContent = fmtTime(now);
  if (ld) ld.textContent = now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
}

/* ── battery / weather chips ──────────────────────────────── */
async function initTray() {
  const btnBatt = $('#btn-batt');
  const setBatt = (level, charging) => {
    btnBatt.innerHTML = '';
    btnBatt.append(h('span', { html: icon(charging ? 'batt' : 'batt') }));
    btnBatt.append(h('span', { text: Math.round(level * 100) + '%' }));
    btnBatt.title = `Bateria ${Math.round(level * 100)}%${charging ? ' (carregando)' : ''}`;
  };
  try {
    const b = await navigator.getBattery?.();
    if (b) {
      setBatt(b.level, b.charging);
      b.addEventListener('levelchange', () => setBatt(b.level, b.charging));
      b.addEventListener('chargingchange', () => setBatt(b.level, b.charging));
    } else setBatt(1, true);
  } catch { setBatt(1, true); }

  const wtxt = $('#weather-txt');
  // deterministic pseudo-weather based on date (no network call)
  const d = new Date();
  const seed = d.getDate() * 7 + d.getMonth() * 3;
  const temps = [22, 25, 19, 28, 24, 21, 26];
  const iconsW = ['☀️', '⛅', '🌧️', '☀️', '🌤️', '🌥️', '☀️'];
  wtxt.textContent = `${iconsW[seed % 7]} ${temps[seed % 7]}°`;
  $('#btn-weather').title = 'Clima (demonstração, baseado na data)';
}

/* ── lock / shutdown ──────────────────────────────────────── */
export function lock() {
  closeAllPanels();
  const el = $('#lockscreen');
  el.hidden = false;
  updateProfileChip();
  tickClock();
  const pin = $('#lock-pin');
  pin.value = '';
  setTimeout(() => pin.focus(), 80);
}

function shutdown() {
  closeAllPanels();
  wm.closeAll();
  const el = $('#shutdown');
  el.hidden = false;
  setTimeout(() => { el.hidden = true; location.reload(); }, 1500);
}

export function resetUserdata() {
  store.keys().forEach((k) => store.del(k));
  localStorage.removeItem('luminos:creator.apps');
  location.reload();
}

/* ── fullscreen ───────────────────────────────────────────── */
export function toggleFullscreen() {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
  else document.exitFullscreen?.();
}

/* ── init shell ───────────────────────────────────────────── */
export function initDesktop() {
  const s = store.get('settings', {});
  setTheme(s.theme || 'dark');
  setAccent(s.accent || 'indigo');
  applySettings();
  tickClock();
  setInterval(tickClock, 1000);

  $('#btn-launcher').onclick = (e) => { e.stopPropagation(); toggleLauncher(); };
  $('#btn-clock').onclick = (e) => {
    e.stopPropagation();
    const el = $('#notifpanel');
    if (!el.hidden) return closeAllPanels();
    closeAllPanels();
    el.hidden = false;
    renderPanel();
    sound.click();
  };
  $('#btn-batt').onclick = (e) => { e.stopPropagation(); toggleQuick(); };
  $('#btn-vol')?.remove();
  const volBtn = h('button.tray-btn', { html: icon('vol'), title: 'Controle rápido' });
  volBtn.onclick = (e) => { e.stopPropagation(); toggleQuick(); };
  $('#tray').prepend(volBtn);
  $('#btn-weather').onclick = (e) => {
    e.stopPropagation();
    toast('Clima é uma demonstração local (sem chamadas externas).');
  };
  const tray = $('#tray');
  tray.insertAdjacentHTML('beforeend', `<button class="tray-btn" id="btn-fs" title="Tela cheia">${icon('maximize')}</button>`);
  $('#btn-fs').onclick = (e) => { e.stopPropagation(); toggleFullscreen(); };

  // close panels on outside click
  document.addEventListener('pointerdown', (e) => {
    if (e.target.closest('#launcher, #quickpanel, #notifpanel, #btn-clock, #btn-launcher, #btn-batt, .tray-btn, #palette, #desk-search')) return;
    closeAllPanels();
  });

  // keyboard
  document.addEventListener('keydown', (e) => {
    const mod = e.ctrlKey || e.metaKey;
    const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
    if (mod && e.key.toLowerCase() === 'k') { e.preventDefault(); toggleDeskSearch(); }
    else if (mod && (e.code === 'Space' || e.key === ' ')) { e.preventDefault(); togglePalette(); }
    else if (mod && e.key === ',') { e.preventDefault(); openApp('settings'); }
    else if (mod && e.key.toLowerCase() === 'w' && !typing) {
      const a = wm.active(); if (a) { e.preventDefault(); wm.close(a.id); }
    } else if (mod && e.key.toLowerCase() === 'm' && !typing) {
      const a = wm.active(); if (a) { e.preventDefault(); wm.minimize(a.id); }
    } else if (e.altKey && e.key === 'Tab') { e.preventDefault(); wm.cycleSwitcher(e.shiftKey ? -1 : 1); }
    else if (e.key === 'F11') { e.preventDefault(); toggleFullscreen(); }
    else if (e.key === 'Escape') { closeAllPanels(); }
  });

  document.addEventListener('keyup', (e) => { if (e.key === 'Alt') wm.hideSwitcher(); });

  // palette input
  $('#pal-q').addEventListener('input', (e) => { palIndex = 0; buildPalette(e.target.value); });
  $('#pal-q').addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); runPalette(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); runPalette(-1); }
    else if (e.key === 'Enter') { e.preventDefault(); const it = palItems[palIndex]; if (it) { closeAllPanels(); it.run(); } }
    else if (e.key === 'Escape') closeAllPanels();
  });

  $('#ds-input').addEventListener('input', (e) => renderDeskResults(e.target.value));
  $('#ds-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { const first = $('#ds-results .pal-item'); if (first) first.click(); }
    if (e.key === 'Escape') closeAllPanels();
  });

  // desktop context menu
  $('#desktop').addEventListener('contextmenu', (e) => {
    if (e.target.closest('.desk-icon, .win, #dock, #topbar')) return;
    e.preventDefault();
    contextMenu(e, [
      { label: 'Novo app web…', icon: 'plus', action: () => openApp('creator') },
      { label: 'Nova pasta', icon: 'folder', action: () => openApp('files') },
      { sep: true },
      { label: 'Trocar papel de parede…', icon: 'image', action: () => openApp('settings', { args: { section: 'appearance' } }) },
      { label: 'Configurações…', icon: 'settings', action: () => openApp('settings') },
      { sep: true },
      { label: 'Organizar ícones', icon: 'grid', action: () => { refreshIcons(); toast('Ícones reorganizados'); } },
      { label: 'Atualizar', icon: 'refresh', action: () => { refreshIcons(); refreshDock(); toast('Desktop atualizado'); } },
      { sep: true },
      { label: 'Sobre o LuminOS', icon: 'info', action: () => openApp('about') },
    ]);
  });

  // dock context menu
  $('#dock').addEventListener('contextmenu', (e) => {
    if (e.target.closest('.dock-item')) return;
    e.preventDefault();
    contextMenu(e, [
      { label: 'Posição: inferior', icon: 'grid', action: () => toast('A dock fica sempre na parte inferior no LuminOS.') },
      { label: 'Todos os apps', icon: 'apps', action: () => toggleLauncher() },
      { sep: true },
      { label: 'Configurações…', icon: 'settings', action: () => openApp('settings') },
    ]);
  });

  // lock form
  $('#lock-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const p = store.get('profile', { pin: '' });
    const v = $('#lock-pin').value;
    if (p.pin && v !== p.pin) {
      toast('PIN incorreto', { kind: 'err' });
      sound.error();
      $('#lock-pin').value = '';
      return;
    }
    $('#lockscreen').hidden = true;
    sound.ok();
  });
  $('#lock-switch').onclick = () => {
    $('#lockscreen').hidden = true;
    $('#setup').hidden = false;
    $('#setup').classList.add('again');
  };

  // window events
  window.addEventListener('lumin:open', (e) => openApp(e.detail.id, e.detail.args ? { args: e.detail.args } : {}));
  document.addEventListener('lumin:open-app', (e) => openApp(e.detail.id, { args: e.detail.args }));
  import('./wm.js').then(({ wm: w }) => {
    document.addEventListener('windows-changed', () => {});
    w._refreshDock = refreshDock;
  });

  initTray();
  renderBadge();

  // periodic ambient notifications (tasteful, rare)
  setTimeout(() => {
    if (!store.get('seen.welcome')) {
      store.set('seen.welcome', true);
      import('./notifications.js').then(({ notify }) => notify({
        title: 'Bem-vindo ao LuminOS', body: 'Dica: Ctrl/Cmd + K abre a busca de apps.', iconName: 'spark',
      }));
    }
  }, 2600);
}

/* called by wm on window list changes */
document.addEventListener('lumin:windows-changed', () => {
  refreshDock();
  const names = store.get('appNames', {});
  const menu = $('#tb-appmenu');
  if (!menu) return;
  menu.innerHTML = '';
  wm.windows().filter((w) => !w.minimized).forEach((w) => {
    const b = h('button', { text: names[w.appId] || w.app.name, class: w.id === wm.active()?.id ? 'on' : '' });
    b.onclick = () => wm.focus(w.id);
    menu.append(b);
  });
  const active = wm.active();
  if (active) {
    const app = resolveApp(active.appId);
    const b = h('button', { text: (names[active.appId] || app?.name || 'App') + ' ▾' });
    b.onclick = (e) => contextMenu(e, [
      { label: 'Sobre este app', icon: 'info', action: () => showProps(app || { name: 'App', id: active.appId }) },
      { sep: true },
      { label: 'Minimizar', icon: 'minus', action: () => wm.minimize(active.id) },
      { label: 'Maximizar / restaurar', icon: 'maximize', action: () => wm.toggleMax(active.id) },
      { label: 'Fechar', icon: 'x', action: () => wm.close(active.id) },
    ]);
    menu.append(b);
  }
});

export { WALLPAPERS };

