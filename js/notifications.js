/* ============================================================
   LuminOS — notificações
   ============================================================ */

import { $, h, store, fmtTime, sound } from './core.js';
import { icon } from './icons.js';

const KEY = 'notifications';

export function list() { return store.get(KEY, []); }

export function notify({ title = 'LuminOS', body = '', iconName = 'bell', silent = false } = {}) {
  const cfg = store.get('notif.settings', { enabled: true, quiet: false, sound: true });
  const items = list();
  const item = { id: 'n' + Date.now() + Math.random().toString(36).slice(2, 6), title, body, icon: iconName, ts: Date.now() };
  items.unshift(item);
  store.set(KEY, items.slice(0, 40));
  if (cfg.enabled === false || cfg.quiet) { renderBadge(); return item; }
  if (!silent && cfg.sound !== false) sound.notify();
  renderBadge();
  if (!$('#notifpanel').hidden) renderPanel();
  import('./ui.js').then(({ toast }) => toast(`<b>${title}</b>${body ? ' — ' + body : ''}`, { iconName }));
  return item;
}

export function clearAll() {
  store.set(KEY, []);
  renderBadge();
  renderPanel();
}

export function renderBadge() {
  const n = list().length;
  const btn = $('#btn-clock');
  const dot = $('#notif-dot');
  if (!btn) return;
  if (n > 0 && !dot) {
    btn.append(h('span', { id: 'notif-dot', style: {
      width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)',
      display: 'inline-block', marginLeft: '4px',
    } }));
  } else if (n === 0 && dot) dot.remove();
}

export function renderPanel() {
  const panel = $('#notifpanel');
  const items = list();
  panel.innerHTML = '';
  const head = h('div.notif-head', {},
    h('h3', { text: 'Notificações' }),
    h('button.btn.subtle.tiny', { text: 'Limpar tudo', onclick: clearAll }));
  const bodyList = h('div.notif-list');
  if (!items.length) {
    bodyList.append(h('div.notif-empty', {}, h('div', { text: '🔔', style: { fontSize: '22px', marginBottom: '6px' } }),
      h('div', { text: 'Nada por aqui' })));
  }
  items.forEach((n) => {
    bodyList.append(h('div.notif-item', {},
      h('span.ico', { html: icon(n.icon || 'bell') }),
      h('div', { style: { flex: '1', minWidth: '0' } },
        h('b', { text: n.title }),
        n.body ? h('p', { text: n.body }) : null,
        h('span.t', { text: fmtTime(new Date(n.ts)) }))));
  });

  /* mini calendar */
  const now = new Date();
  const cal = h('div.cal-grid');
  ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].forEach((d) => cal.append(h('div.dw', { text: d })));
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const start = new Date(first); start.setDate(1 - first.getDay());
  for (let i = 0; i < 42; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    const out = d.getMonth() !== now.getMonth();
    const today = d.toDateString() === now.toDateString();
    cal.append(h('div.d', { class: `${out ? 'out' : ''} ${today ? 'today' : ''}`, text: String(d.getDate()) }));
  }
  panel.append(head, bodyList, h('div.notif-cal', {},
    h('div.row', { style: { marginBottom: '7px', justifyContent: 'space-between' } },
      h('b', { text: now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) }),
      h('span.tiny', { text: now.toLocaleDateString('pt-BR', { weekday: 'long' }) })),
    cal));
}
