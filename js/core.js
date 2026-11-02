/* ============================================================
   LuminOS — core: helpers, storage, event bus, sound
   ============================================================ */

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** Tiny hyperscript: h('div.cls#id', {attrs}, ...children) */
export function h(tag, props, ...kids) {
  const m = tag.match(/^([a-z0-9-]+)?((?:[.#][\w-]+)*)$/i);
  const name = (m && m[1]) || 'div';
  const node = document.createElement(name);
  if (m && m[2]) {
    for (const part of m[2].match(/[.#][\w-]+/g) || []) {
      if (part[0] === '.') node.classList.add(part.slice(1));
      else node.id = part.slice(1);
    }
  }
  if (props && (typeof props !== 'object' || props.nodeType || Array.isArray(props))) { kids.unshift(props); props = null; }
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === 'class') node.className += ' ' + v;
      else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
      else if (k === 'html') node.innerHTML = v;
      else if (k === 'text') node.textContent = v;
      else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k === 'dataset') Object.assign(node.dataset, v);
      else if (k in node && k !== 'list' && typeof v !== 'string') node[k] = v;
      else node.setAttribute(k, v === true ? '' : v);
    }
  }
  const add = (c) => {
    if (c == null || c === false || c === true) return;
    if (Array.isArray(c)) return c.forEach(add);
    node.append(c.nodeType ? c : document.createTextNode(String(c)));
  };
  kids.forEach(add);
  return node;
}

export const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
export const uid = (p = 'id') => p + '-' + Math.random().toString(36).slice(2, 9);
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const debounce = (fn, ms = 250) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
export const throttle = (fn, ms = 60) => { let last = 0, t; return (...a) => {
  const now = Date.now();
  if (now - last >= ms) { last = now; fn(...a); }
  else { clearTimeout(t); t = setTimeout(() => { last = Date.now(); fn(...a); }, ms - (now - last)); }
}; };
export const rnd = (a, b) => a + Math.random() * (b - a);
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/* ── storage ──────────────────────────────────────────────── */
const NS = 'luminos:';
export const store = {
  get(key, fallback = null) {
    try { const raw = localStorage.getItem(NS + key); return raw == null ? fallback : JSON.parse(raw); }
    catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(NS + key, JSON.stringify(value)); return true; }
    catch { return false; }
  },
  del(key) { try { localStorage.removeItem(NS + key); } catch {} },
  keys() { try { return Object.keys(localStorage).filter(k => k.startsWith(NS)).map(k => k.slice(NS.length)); } catch { return []; } },
};

/* ── event bus ────────────────────────────────────────────── */
const listeners = new Map();
export const bus = {
  on(evt, fn) { (listeners.get(evt) || listeners.set(evt, []).get(evt)).push(fn); return () => bus.off(evt, fn); },
  off(evt, fn) { const a = listeners.get(evt); if (a) listeners.set(evt, a.filter(f => f !== fn)); },
  emit(evt, detail) {
    (listeners.get(evt) || []).forEach(fn => { try { fn(detail); } catch (e) { console.warn(e); } });
    try { document.dispatchEvent(new CustomEvent('lumin:' + evt, { detail })); } catch {}
  },
};

/* ── time helpers ─────────────────────────────────────────── */
export const pad = (n) => String(n).padStart(2, '0');
export const fmtTime = (d = new Date(), s = false) => s
  ? `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  : `${pad(d.getHours())}:${pad(d.getMinutes())}`;
export const fmtDate = (d = new Date()) => d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
export const fmtShortDate = (d = new Date()) => d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
export function relTime(ts) {
  const diff = (Date.now() - ts) / 1000;
  if (diff < 45) return 'agora';
  if (diff < 3600) return `${Math.round(diff / 60)} min`;
  if (diff < 86400) return `${Math.round(diff / 3600)} h`;
  if (diff < 604800) return `${Math.round(diff / 86400)} d`;
  return new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}
export const greet = (d = new Date()) => {
  const x = d.getHours();
  if (x < 6) return 'Boa madrugada';
  if (x < 12) return 'Bom dia';
  if (x < 19) return 'Boa tarde';
  return 'Boa noite';
};

/* ── color ────────────────────────────────────────────────── */
export const accentPalette = [
  { id: 'indigo', c: '#6f8bff', c2: '#b07bff', name: 'Índigo' },
  { id: 'violet', c: '#9d6bff', c2: '#e07bff', name: 'Violeta' },
  { id: 'cyan',   c: '#2fb8d9', c2: '#5ee3c5', name: 'Ciano' },
  { id: 'mint',   c: '#2ecf92', c2: '#83e86b', name: 'Menta' },
  { id: 'amber',  c: '#f0a92e', c2: '#ff8a5b', name: 'Âmbar' },
  { id: 'rose',   c: '#f0709a', c2: '#ff9f7a', name: 'Rosé' },
  { id: 'slate',  c: '#8792a8', c2: '#b7c0d4', name: 'Grafite' },
  { id: 'astolfo', c: '#ec6fa9', c2: '#c39bf7', name: 'Astolfo' },
];

/* ── tiny sound engine (no assets) ────────────────────────── */
class SoundEngine {
  constructor() { this.ctx = null; this.enabled = true; this.volume = .5; }
  ready() {
    if (!this.ctx) {
      try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; }
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }
  tone({ freq = 440, type = 'sine', dur = .12, gain = .2, slide = 0, delay = 0, attack = .01, release = null }) {
    if (!this.enabled) return;
    const ctx = this.ready(); if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gn = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t0 + dur);
    const peak = Math.max(.0001, gain * this.volume);
    gn.gain.setValueAtTime(.0001, t0);
    gn.gain.exponentialRampToValueAtTime(peak, t0 + attack);
    gn.gain.exponentialRampToValueAtTime(.0001, t0 + (release ?? dur));
    osc.connect(gn).connect(ctx.destination);
    osc.start(t0); osc.stop(t0 + (release ?? dur) + .02);
  }
  noise({ dur = .2, gain = .15, hp = 800, delay = 0 }) {
    if (!this.enabled) return;
    const ctx = this.ready(); if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
    const gn = ctx.createGain(); gn.gain.value = gain * this.volume;
    src.connect(f).connect(gn).connect(ctx.destination);
    src.start(t0);
  }
  click() { this.tone({ freq: 620, type: 'triangle', dur: .05, gain: .07, slide: -120 }); }
  open() { this.tone({ freq: 420, type: 'sine', dur: .1, gain: .09, slide: 260 }); }
  close() { this.tone({ freq: 420, type: 'sine', dur: .1, gain: .07, slide: -180 }); }
  ok() { this.tone({ freq: 660, dur: .1, gain: .09 }); this.tone({ freq: 990, dur: .14, gain: .07, delay: .08 }); }
  error() { this.tone({ freq: 200, type: 'square', dur: .12, gain: .06, slide: -60 }); }
  notify() { this.tone({ freq: 880, dur: .1, gain: .07 }); this.tone({ freq: 1180, dur: .16, gain: .05, delay: .1 }); }
  boot() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
      this.tone({ freq: f, type: 'sine', dur: .5, gain: .06, delay: i * .11, release: .9 }));
  }
}
export const sound = new SoundEngine();

/* ── human file size ──────────────────────────────────────── */
export function bytes(n) {
  if (n < 1024) return n + ' B';
  if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
  return (n / 1048576).toFixed(1) + ' MB';
}

export const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
export const modKey = () => (isMac ? '⌘' : 'Ctrl');
