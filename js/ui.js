/* ============================================================
   LuminOS — shared UI: toasts, modals, context menus
   ============================================================ */

import { $, h, uid, sound } from './core.js';
import { icon } from './icons.js';

/* ── toasts ───────────────────────────────────────────────── */
export function toast(msg, { kind = 'info', iconName = null, timeout = 3200 } = {}) {
  const host = $('#toasts');
  const ic = iconName || ({ ok: 'check', err: 'warning', info: 'info' }[kind] || 'info');
  const el = h(`div.toast.${kind === 'ok' ? 'ok' : kind === 'err' ? 'err' : ''}`,
    h('span.ico', { html: icon(ic) }),
    h('span', { html: String(msg) }));
  host.append(el);
  const kill = () => { el.classList.add('out'); setTimeout(() => el.remove(), 200); };
  const t = setTimeout(kill, timeout);
  el.onclick = () => { clearTimeout(t); kill(); };
  return { close: kill };
}

/* ── modal ────────────────────────────────────────────────── */
export function modal({ title, body = [], ok = 'Salvar', cancel = 'Cancelar', onOk, onCancel, danger = false, wide = false, footer = null }) {
  const root = $('#modal-root');
  const back = h('div.modal-back');
  const box = h('div.modal', { style: wide ? { width: 'min(620px,100%)' } : null, role: 'dialog', 'aria-modal': 'true' });
  const close = (result) => {
    back.remove();
    document.removeEventListener('keydown', esc);
  };
  const esc = (e) => { if (e.key === 'Escape') { close(); onCancel?.(); } };

  if (title) box.append(h('h3', { text: title }));
  const bodyWrap = h('div', { style: { display: 'grid', gap: '11px' } });
  (Array.isArray(body) ? body : [body]).forEach((n) => n && bodyWrap.append(n));
  box.append(bodyWrap);

  const finish = () => {
    const r = onOk?.();
    if (r === false) return;
    close();
  };

  const foot = footer || h('div.modal-actions', {},
    h('button.btn.ghost', { text: cancel, onclick: () => { close(); onCancel?.(); } }),
    h('button.btn', { class: danger ? 'danger' : 'primary', text: ok, onclick: finish }));

  box.append(foot);
  back.append(box);
  back.addEventListener('pointerdown', (e) => { if (e.target === back) { close(); onCancel?.(); } });
  root.append(back);
  document.addEventListener('keydown', esc);
  setTimeout(() => box.querySelector('input,textarea,button.btn.primary')?.focus(), 60);

  box.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); finish(); } });
  return { close };
}

export function confirmDialog({ title = 'Confirmar', text = '', ok = 'Confirmar', danger = false, onOk }) {
  return modal({
    title, body: text ? h('p', { text }) : null, ok, danger,
    onOk,
    cancel: 'Cancelar',
  });
}

export function promptDialog({ title = 'Digite um valor', label = '', value = '', placeholder = '', ok = 'OK', type = 'text', onOk }) {
  const input = h('input.input', { value, placeholder, type, spellcheck: 'false' });
  return modal({
    title, body: [label ? h('.field', {}, h('span', { text: label }), input) : input], ok,
    onOk: () => {
      const v = input.value.trim();
      if (!v) { input.focus(); return false; }
      onOk?.(v);
    },
  });
}

/* ── context menu ─────────────────────────────────────────── */
export function contextMenu(e, items) {
  closeMenus();
  const menu = $('#ctxmenu');
  menu.innerHTML = '';
  items.filter(Boolean).forEach((it) => {
    if (it.sep) return menu.append(h('hr'));
    const b = h('button', { class: it.danger ? 'danger' : '' },
      h('span', { html: icon(it.icon || 'chevR') }),
      h('span', { text: it.label }),
      it.kbd ? h('span.kbd', {}, h('kbd', { text: it.kbd })) : null);
    b.onclick = (ev) => { closeMenus(); it.action?.(ev); };
    if (it.disabled) b.disabled = true;
    menu.append(b);
  });
  menu.hidden = false;
  const pad = 8;
  const r = menu.getBoundingClientRect();
  const x = Math.min(e.clientX ?? 0, window.innerWidth - r.width - pad);
  const y = Math.min(e.clientY ?? 0, window.innerHeight - r.height - pad);
  menu.style.left = Math.max(pad, x) + 'px';
  menu.style.top = Math.max(pad, y) + 'px';
  requestAnimationFrame(() => {
    const r2 = menu.getBoundingClientRect();
    if (r2.bottom > window.innerHeight - pad) menu.style.top = Math.max(pad, window.innerHeight - r2.height - pad) + 'px';
  });
  sound.click();
}

export function closeMenus() {
  const m = $('#ctxmenu');
  if (m) m.hidden = true;
}

document.addEventListener('pointerdown', (e) => {
  if (!e.target.closest('#ctxmenu')) closeMenus();
}, true);
document.addEventListener('scroll', () => closeMenus(), true);
window.addEventListener('blur', () => closeMenus());

/* ── helpers ──────────────────────────────────────────────── */
export function toggleSwitch(on, onChange) {
  const el = h('button.switch', { class: on ? 'on' : '', role: 'switch', 'aria-checked': String(!!on) });
  el.onclick = () => {
    const next = !el.classList.contains('on');
    el.classList.toggle('on', next);
    el.setAttribute('aria-checked', String(next));
    sound.click();
    onChange?.(next);
  };
  return el;
}

export function downloadBlob(name, content, type = 'text/plain') {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function readFileAsText(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsText(file);
  });
}

