/* ============================================================
   LuminOS — window manager
   ============================================================ */

import { $, h, clamp, uid, bus, store, sound } from './core.js';
import { icon } from './icons.js';

const lockScreen = () => import('./desktop.js').then(({ lock }) => lock());

const state = { wins: [], z: 20, seq: 0, activeId: null, minimizeStore: [] };
const layer = () => $('#windows');
const barH = () => parseInt(getComputedStyle(document.documentElement).getPropertyValue('--tb-h')) || 34;
const dockH = () => parseInt(getComputedStyle(document.documentElement).getPropertyValue('--dock-h')) || 62;
const bound = () => {
  const el = layer();
  const w = el.clientWidth || window.innerWidth;
  const hh = el.clientHeight || Math.max(300, window.innerHeight - barH() - dockH());
  return { x: 0, y: 0, w, h: hh };
};

export const wm = {
  windows: () => state.wins,
  active: () => state.wins.find((w) => w.id === state.activeId) || null,
  byApp: (appId) => state.wins.filter((w) => w.appId === appId),
  isOpen: (appId) => state.wins.some((w) => w.appId === appId),

  open(app, opts = {}) {
    if (!app) return null;
    if (app.singleton) {
      const found = state.wins.find((w) => w.appId === app.id || (app.aliases || []).includes(w.appId));
      if (found) {
        if (found.minimized) this.restore(found.id);
        this.focus(found.id);
        if (opts.args) found.hooks.args.forEach((fn) => { try { fn(opts.args); } catch (e) { console.warn(e); } });
        return found;
      }
    }

    const id = uid('win');
    const b = bound();
    const size = app.size || { w: 720, h: 500 };
    const small = b.w < 560;
    const w = small ? Math.max(280, b.w - 8) : Math.min(size.w, Math.max(300, b.w - 40));
    const hh = small ? Math.max(240, b.h - 8) : Math.min(size.h || 500, Math.max(220, b.h - 40));
    state.seq++;
    const off = small ? 0 : ((state.seq - 1) % 6) * 26;
    const x = small ? 4 : clamp(Math.round((b.w - w) / 2 - 60 + off), 8, Math.max(8, b.w - w - 8));
    const y = small ? 4 : clamp(Math.round((b.h - hh) / 2 - 40 + off), 8, Math.max(8, b.h - hh - 8));

    const el = h('div.win', {
      style: { left: x + 'px', top: y + 'px', width: w + 'px', height: hh + 'px', zIndex: ++state.z },
      role: 'dialog', 'aria-label': app.name,
    });
    const lights = h('div.win-lights');
    const bClose = h('button.close', { title: 'Fechar', 'aria-label': 'Fechar' });
    const bMin = h('button.min', { title: 'Minimizar', 'aria-label': 'Minimizar' });
    const bZoom = h('button.zoom', { title: 'Maximizar', 'aria-label': 'Maximizar' });
    lights.append(bClose, bMin, bZoom);

    const title = h('div.win-title', {}, h('span', { html: icon(app.glyph) }), h('span', { text: opts.title || app.name }));
    const tools = h('div.win-tools');
    const bar = h('div.win-bar', {}, lights, title, tools);
    const body = h('div.win-body');
    el.append(bar, body);
    ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'].forEach((d) => el.append(h(`div.resize-h.rh-${d}`, { 'data-dir': d })));

    const hooks = {
      args: [], focus: [], resize: [], close: [],
    };
    const win = {
      id, appId: app.id, app, el, body, bar, title, tools, api: null, hooks,
      minimized: false, maxed: false, prevRect: null, opts,
    };
    state.wins.push(win);
    layer().append(el);

    // mount app UI
    try {
      win.api = app.mount ? app.mount(body, {
        win,
        args: opts.args,
        setTitle: (t) => { title.lastChild.textContent = t; },
        addTool: (node) => tools.append(node),
        close: () => this.close(id),
        open: (id2, o) => document.dispatchEvent(new CustomEvent('lumin:open-app', { detail: { id: id2, args: o } })),
        onArgs: (fn) => hooks.args.push(fn),
        onFocus: (fn) => hooks.focus.push(fn),
        onResize: (fn) => hooks.resize.push(fn),
        onClose: (fn) => hooks.close.push(fn),
        lock: () => lockScreen(),
      }) || null : null;
    } catch (err) {
      console.error('[LuminOS] app crashed:', app.id, err);
      body.append(h('.empty', {}, h('div.big', { text: '⚠️' }), h('b', { text: 'Este app falhou ao abrir' }),
        h('p', { text: String(err && err.message || err) })));
    }

    // interactions
    bClose.onclick = (e) => { e.stopPropagation(); this.close(id); };
    bMin.onclick = (e) => { e.stopPropagation(); this.minimize(id); };
    bZoom.onclick = (e) => { e.stopPropagation(); this.toggleMax(id); };
    el.addEventListener('pointerdown', () => this.focus(id), true);
    bar.addEventListener('pointerdown', (e) => { if (e.target.closest('button')) return; this.startDrag(e, win); });
    bar.addEventListener('dblclick', (e) => { if (e.target.closest('button')) return; this.toggleMax(id); });
    el.querySelectorAll('.resize-h').forEach((r) => r.addEventListener('pointerdown', (e) => this.startResize(e, win, r.dataset.dir)));

    this.focus(id);
    bus.emit('windows-changed');
    if (opts.args?.focusInput) setTimeout(() => body.querySelector('input,textarea')?.focus(), 60);
    return win;
  },

  close(id) {
    const i = state.wins.findIndex((w) => w.id === id);
    if (i < 0) return;
    const w = state.wins[i];
    w.hooks.close.forEach((fn) => { try { fn(); } catch (e) { console.warn(e); } });
    try { w.api?.onClose?.(); } catch (e) { console.warn(e); }
    w.el.classList.add('closing');
    const done = () => {
      w.el.remove();
      state.wins.splice(state.wins.findIndex((x) => x.id === id), 1);
      if (state.activeId === id) {
        const next = [...state.wins].reverse().find((x) => !x.minimized);
        state.activeId = null;
        if (next) this.focus(next.id); else bus.emit('active-changed', null);
      }
      bus.emit('windows-changed');
    };
    w.el.addEventListener('animationend', done, { once: true });
    setTimeout(done, 220);
    sound.close();
  },

  closeAll() {
    [...state.wins].forEach((w) => {
      w.hooks.close.forEach((fn) => { try { fn(); } catch {} });
      try { w.api?.onClose?.(); } catch {}
      w.el.remove();
    });
    state.wins = [];
    state.activeId = null;
    bus.emit('windows-changed');
  },

  focus(id) {
    const w = state.wins.find((x) => x.id === id);
    if (!w) return;
    if (w.minimized) return this.restore(id);
    state.wins.forEach((x) => x.el.classList.toggle('active', x.id === id));
    if (state.activeId !== id) {
      w.el.style.zIndex = ++state.z;
      state.activeId = id;
      bus.emit('active-changed', w);
    }
    w.hooks.focus.forEach((fn) => { try { fn(); } catch (e) { console.warn(e); } });
    try { w.api?.onFocus?.(); } catch {}
  },

  minimize(id) {
    const w = state.wins.find((x) => x.id === id);
    if (!w) return;
    w.minimized = true;
    w.el.classList.add('minimized');
    if (state.activeId === id) {
      const next = [...state.wins].reverse().find((x) => !x.minimized);
      state.activeId = next ? next.id : null;
      if (next) this.focus(next.id); else bus.emit('active-changed', null);
    }
    bus.emit('windows-changed');
  },

  restore(id) {
    const w = state.wins.find((x) => x.id === id);
    if (!w) return;
    w.minimized = false;
    w.el.classList.remove('minimized');
    this.focus(id);
    bus.emit('windows-changed');
  },

  toggleMinimize(id) {
    const w = state.wins.find((x) => x.id === id);
    if (!w) return;
    if (w.minimized) this.restore(id);
    else if (state.activeId === id) this.minimize(id);
    else this.focus(id);
  },

  toggleMax(id) {
    const w = state.wins.find((x) => x.id === id);
    if (!w) return;
    const b = bound();
    w.el.classList.add('snapping');
    if (!w.maxed) {
      w.prevRect = { left: w.el.style.left, top: w.el.style.top, width: w.el.style.width, height: w.el.style.height };
      Object.assign(w.el.style, { left: '0px', top: '0px', width: b.w + 'px', height: b.h + 'px' });
      w.maxed = true;
      w.el.classList.add('max');
    } else {
      const p = w.prevRect || {};
      Object.assign(w.el.style, {
        left: p.left || '60px', top: p.top || '40px',
        width: p.width || '720px', height: p.height || '500px',
      });
      w.maxed = false;
      w.el.classList.remove('max');
    }
    setTimeout(() => w.el.classList.remove('snapping'), 260);
    w.hooks.resize.forEach((fn) => { try { fn(); } catch (e) { console.warn(e); } });
    w.api?.onResize?.();
    bus.emit('windows-changed');
  },

  snap(id, zone) {
    const w = state.wins.find((x) => x.id === id);
    if (!w) return;
    const b = bound();
    const half = Math.round(b.w / 2);
    const rects = {
      left: { left: 0, top: 0, width: half, height: b.h },
      right: { left: half, top: 0, width: b.w - half, height: b.h },
      top: { left: 0, top: 0, width: b.w, height: b.h },
      tl: { left: 0, top: 0, width: half, height: Math.round(b.h / 2) },
      tr: { left: half, top: 0, width: b.w - half, height: Math.round(b.h / 2) },
      bl: { left: 0, top: Math.round(b.h / 2), width: half, height: b.h - Math.round(b.h / 2) },
      br: { left: half, top: Math.round(b.h / 2), width: b.w - half, height: b.h - Math.round(b.h / 2) },
    }[zone];
    if (!rects) return;
    if (!w.maxed) w.prevRect = { left: w.el.style.left, top: w.el.style.top, width: w.el.style.width, height: w.el.style.height };
    w.el.classList.add('snapping');
    w.maxed = zone === 'top';
    w.el.classList.toggle('max', w.maxed);
    Object.assign(w.el.style, {
      left: rects.left + 'px', top: rects.top + 'px',
      width: rects.width + 'px', height: rects.height + 'px',
    });
    setTimeout(() => w.el.classList.remove('snapping'), 260);
    w.hooks.resize.forEach((fn) => { try { fn(); } catch (e) { console.warn(e); } });
    w.api?.onResize?.();
  },

  startDrag(e, win) {
    if (win.maxed) return;
    const el = win.el;
    el.classList.add('dragging');
    this.focus(win.id);
    const startX = e.clientX, startY = e.clientY;
    const r = el.getBoundingClientRect();
    const b = bound();
    const layerRect = layer().getBoundingClientRect();
    const offX = e.clientX - r.left, offY = e.clientY - r.top;
    let zone = null;
    const preview = $('#snap-preview');

    const move = (ev) => {
      const w = r.width;
      const nx = clamp(ev.clientX - layerRect.left - offX, -w + 90, b.w - 90);
      const ny = clamp(ev.clientY - layerRect.top - offY, 0, b.h - 40);
      el.style.left = nx + 'px';
      el.style.top = ny + 'px';

      // edge snap detection
      const m = 8;
      const nearL = ev.clientX <= layerRect.left + m;
      const nearR = ev.clientX >= layerRect.right - m;
      const nearT = ev.clientY <= layerRect.top + 2;
      let z = null;
      if (nearL && nearT) z = 'tl'; else if (nearR && nearT) z = 'tr';
      else if (nearL) z = 'left'; else if (nearR) z = 'right'; else if (nearT) z = 'top';
      if (z !== zone) {
        zone = z;
        if (z) {
          const rect = previewRect(z);
          Object.assign(preview.style, rect);
          preview.hidden = false;
        } else preview.hidden = true;
      }
    };
    const previewRect = (z) => {
      const b2 = bound();
      const lr = layer().getBoundingClientRect();
      const half = Math.round(b2.w / 2), halfH = Math.round(b2.h / 2);
      const map = {
        left: [0, 0, half, b2.h], right: [half, 0, b2.w - half, b2.h],
        top: [0, 0, b2.w, b2.h], tl: [0, 0, half, halfH], tr: [half, 0, b2.w - half, halfH],
        bl: [0, halfH, half, b2.h - halfH], br: [half, halfH, b2.w - half, b2.h - halfH],
      }[z];
      const [x, y, w, hh] = map;
      return { left: (lr.left + x) + 'px', top: (lr.top + y) + 'px', width: w + 'px', height: hh + 'px' };
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      el.classList.remove('dragging');
      preview.hidden = true;
      if (zone) this.snap(win.id, zone);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up, { once: true });
  },

  startResize(e, win, dir) {
    e.stopPropagation(); e.preventDefault();
    if (win.maxed) return;
    this.focus(win.id);
    const el = win.el;
    el.classList.add('dragging');
    const b = bound();
    const r = el.getBoundingClientRect();
    const lr = layer().getBoundingClientRect();
    const start = { x: e.clientX, y: e.clientY, left: r.left - lr.left, top: r.top - lr.top, w: r.width, h: r.height };
    const min = { w: 300, h: 200 };
    const move = (ev) => {
      const dx = ev.clientX - start.x, dy = ev.clientY - start.y;
      let { left, top, w, h: hh } = start;
      if (dir.includes('e')) w = clamp(start.w + dx, min.w, b.w - left);
      if (dir.includes('s')) hh = clamp(start.h + dy, min.h, b.h - top);
      if (dir.includes('w')) { const nw = clamp(start.w - dx, min.w, start.left + start.w); left = start.left + start.w - nw; w = nw; }
      if (dir.includes('n')) { const nh = clamp(start.h - dy, min.h, start.top + start.h); top = start.top + start.h - nh; hh = nh; }
      Object.assign(el.style, { left: left + 'px', top: top + 'px', width: w + 'px', height: hh + 'px' });
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      el.classList.remove('dragging');
      win.api?.onResize?.();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up, { once: true });
  },

  /** called on viewport resize: keep windows inside */
  clampAll() {
    const b = bound();
    state.wins.forEach((w) => {
      if (w.maxed) { Object.assign(w.el.style, { width: b.w + 'px', height: b.h + 'px' }); return; }
      const r = w.el.getBoundingClientRect();
      if (r.width > b.w) w.el.style.width = b.w - 16 + 'px';
      if (r.height > b.h) w.el.style.height = b.h - 16 + 'px';
      w.el.style.left = clamp(parseFloat(w.el.style.left) || 0, 0, Math.max(0, b.w - 120)) + 'px';
      w.el.style.top = clamp(parseFloat(w.el.style.top) || 0, 0, Math.max(0, b.h - 60)) + 'px';
    });
  },

  /** window switcher (Alt+Tab) */
  cycleSwitcher(dir = 1) {
    const list = state.wins.filter((w) => !w.minimized);
    if (!list.length) return;
    const overlay = $('#switcher');
    const wrap = $('#sw-list');
    if (overlay.hidden) {
      wrap.innerHTML = '';
      list.forEach((w) => {
        const item = h('div.sw-item', { dataset: { id: w.id } },
          h('div.sw-thumb', { html: `<span class="ico">${icon(w.app.glyph)}</span>` }),
          h('div.sw-name', {}, h('span', { text: w.app.name }),
            h('button.x', { html: icon('plus', 'ic'), title: 'Fechar', onclick: (e) => { e.stopPropagation(); wm.close(w.id); } })));
        item.onclick = () => { wm.focus(w.id); wm.hideSwitcher(); };
        wrap.append(item);
      });
      overlay.hidden = false;
      state.swIndex = 0;
    } else {
      state.swIndex = (state.swIndex + dir + list.length) % list.length;
    }
    [...wrap.children].forEach((c, i) => c.classList.toggle('active', i === state.swIndex));
    const chosen = list[state.swIndex];
    if (chosen) this.focus(chosen.id);
  },
  hideSwitcher() {
    const overlay = $('#switcher');
    if (!overlay.hidden) { overlay.hidden = true; }
  },
};

document.addEventListener('pointerdown', (e) => {
  if (!e.target.closest('#switcher')) wm.hideSwitcher();
});
window.addEventListener('resize', () => wm.clampAll());
