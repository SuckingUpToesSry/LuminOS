/* ============================================================
   LuminOS — central de proxy do navegador
   Protocolos:  Scramjet  ·  Ultraviolet
   Transportes: Epoxy  ·  Libcurl  ·  Bare (Wisp direto)
   Fonte única de verdade de config, relays Wisp, estatísticas
   e da URL do proxy (prefixo + codec de cada motor).
   ============================================================ */

import { store } from './core.js';

/* ── caminhos (funciona em módulo nativo e no bundle IIFE) ─── */
function selfDir() {
  try { const u = import.meta.url; if (u) return new URL('./', u); } catch { /* bundle */ }
  // no bundle: js/luminos.bundle.js → raiz do site
  const src = document.currentScript?.src
    || [...document.querySelectorAll('script[src]')].map((s) => s.src).find((s) => /luminos?\.bundle|\/js\//i.test(s))
    || location.href;
  try { return new URL('../', src.endsWith('.js') ? src : location.href); } catch { return new URL('./', location.href); }
}

const ROOT = selfDir();

export const PATHS = {
  uv: new URL('uv/', ROOT).href,
  sj: new URL('scramjet/', ROOT).href,
  sjEntry: new URL('scramjet/scramjet.js', ROOT).href,
  sjWasm: new URL('scramjet/scramjet.wasm', ROOT).href,
  sjInject: new URL('scramjet/controller.inject.js', ROOT).href,
  sjController: new URL('scramjet/controller.api.js', ROOT).href,
  sjSw: new URL('scramjet/sw.js', ROOT).href,
  uvSw: new URL('uv/sw.js', ROOT).href,
  uvPrefix: new URL('uv/service/', ROOT).pathname,
  bareMux: new URL('scramjet/bare-mux.mjs', ROOT).href,
  baremuxWorker: new URL('scramjet/baremux.worker.js', ROOT).href,
  epoxy: new URL('scramjet/epoxy.mjs', ROOT).href,
  libcurl: new URL('scramjet/libcurl.mjs', ROOT).href,
};

/* compatibilidade com o módulo antigo */
export const UV = {
  root: new URL('uv/', ROOT),
  swUrl: PATHS.uvSw,
  scope: new URL('uv/', ROOT).pathname,
  prefix: PATHS.uvPrefix,
  bareMux: PATHS.bareMux,
  worker: PATHS.baremuxWorker,
  epoxy: PATHS.epoxy,
};

/* ── catálogos ────────────────────────────────────────────── */
export const TRANSPORTS = [
  { id: 'epoxy', name: 'Epoxy', desc: 'TLS em WebAssembly — o mais compatível', lib: 'epoxy' },
  { id: 'libcurl', name: 'Libcurl', desc: 'libcurl.js com TLS próprio (bom p/ sites pesados)', lib: 'libcurl' },
  { id: 'bare', name: 'Bare', desc: 'Wisp puro, sem transporte extra (leve)', lib: null },
];

export const PROTOCOLS = [
  { id: 'scramjet', name: 'Scramjet', desc: 'Reescreve tudo no próprio site (recomendado)', engine: 'sj' },
  { id: 'ultraviolet', name: 'Ultraviolet', desc: 'Clássico, baseado em service worker', engine: 'uv' },
];

export const ENGINES = [
  { id: 'duck', name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=', color: '#de5833' },
  { id: 'google', name: 'Google', url: 'https://www.google.com/search?q=', color: '#4285f4' },
  { id: 'bing', name: 'Bing', url: 'https://www.bing.com/search?q=', color: '#00a4ef' },
  { id: 'brave', name: 'Brave', url: 'https://search.brave.com/search?q=', color: '#fb542b' },
  { id: 'wiki', name: 'Wikipedia', url: 'https://pt.wikipedia.org/w/index.php?search=', color: '#3b4c58' },
];

export const WISP_ENDPOINTS = [
  'wss://wisp.mercurywork.shop/',
  'wss://bare-server.fly.dev/wisp/',
  'wss://wisp.terbiumon.top/',
  'wss://wisp.drlongass.xyz/',
];

/* ── configuração persistida ──────────────────────────────── */
const KEY = 'proxy.settings';
const DEFAULTS = {
  protocol: 'scramjet',
  transport: 'epoxy',
  wisp: WISP_ENDPOINTS[0],
  engine: 'duck',
  homepage: '',
  suggestions: true,
  particles: true,
};

export function settings() {
  const saved = store.get(KEY, {}) || {};
  // migração do módulo antigo (uv.settings)
  const legacy = store.get('uv.settings', null) || {};
  return { ...DEFAULTS, ...legacy, ...saved };
}

export function save(patch) {
  const next = { ...settings(), ...patch };
  store.set(KEY, next);
  return next;
}

export function reset() { store.del(KEY); }

/* ── codecs ───────────────────────────────────────────────── */
export function encodeUV(url) {
  const s = String(url || '');
  let out = '';
  for (let i = 0; i < s.length; i++) out += String.fromCharCode(s.charCodeAt(i) ^ 2);
  const b64 = btoa(out).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return PATHS.uvPrefix + b64;
}

export function decodeUV(url) {
  try {
    const raw = String(url).slice(PATHS.uvPrefix.length);
    const b64 = raw.replace(/-/g, '+').replace(/_/g, '/');
    const s = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
    let out = '';
    for (let i = 0; i < s.length; i++) out += String.fromCharCode(s.charCodeAt(i) ^ 2);
    return out;
  } catch { return ''; }
}

/** Scramjet usa encodeURIComponent sobre o caminho do frame. */
export function encodeSJ(url, framePrefix) {
  return (framePrefix || '') + encodeURIComponent(String(url || ''));
}

/* ── sessões runtime ──────────────────────────────────────── */
export const runtime = {
  uv: null,        // { ok, reg, conn, wisp, error }
  sj: null,        // Controller
  frames: new WeakMap(), // iframe → frame do scramjet
  transport: null, // transporte aplicado ao BareMux
  stats: { attempts: 0, requests: 0, bytes: 0, errors: 0, lastError: '', lastAt: 0 },
};

/* ── BareMux / transportes ────────────────────────────────── */
let bareConn = null;

export async function ensureBaremux(transportId = settings().transport, wisp = settings().wisp) {
  const { BareMuxConnection } = await import(PATHS.bareMux);
  if (!bareConn) bareConn = new BareMuxConnection(PATHS.baremuxWorker);
  if (runtime.transport === transportId) return bareConn;

  if (transportId === 'epoxy') {
    await bareConn.setTransport(PATHS.epoxy, [{ wisp }]);
  } else if (transportId === 'libcurl') {
    // passa o módulo namespace: o worker procura mod[lib].LibcurlClient
    const mod = await import(PATHS.libcurl);
    await bareConn.setTransport(mod, [{ wisp }]);
  } else {
    // Bare = Wisp puro (sem transporte nomeado)
    await bareConn.setTransport('bare', [{ wisp }]);
  }
  runtime.transport = transportId;
  return bareConn;
}

/** Instância do cliente de transporte para o Scramjet (fora do BareMux). */
export async function createTransport(transportId = settings().transport, wisp = settings().wisp) {
  if (transportId === 'epoxy') {
    const mod = await import(PATHS.epoxy);
    const Epoxy = mod.default || mod.EpoxyClient;
    return new Epoxy(wisp);
  }
  if (transportId === 'libcurl') {
    const mod = await import(PATHS.libcurl);
    const Libcurl = mod.LibcurlClient || mod.default;
    return new Libcurl({ websocket: wisp });
  }
  // bare: usa o primeiro Wisp disponível
  const { BareClient } = await import(PATHS.bareMux);
  await ensureBaremux('bare', wisp);
  return new BareClient();
}

/* ── Ultraviolet ──────────────────────────────────────────── */
export async function initUV({ force = false } = {}) {
  if (!('serviceWorker' in navigator)) {
    return { ok: false, error: 'Service Worker indisponível (precisa de https ou localhost).' };
  }
  if (runtime.uv?.ok && !force) return runtime.uv;
  const cfg = settings();
  try {
    await ensureRootSW();
    const reg = await navigator.serviceWorker.register(PATHS.uvSw, { scope: new URL('uv/', ROOT).pathname });
    await Promise.race([navigator.serviceWorker.ready, new Promise((r) => setTimeout(r, 6000))]);
    const conn = await ensureBaremux(cfg.transport, cfg.wisp);
    runtime.uv = { ok: true, reg, conn, wisp: cfg.wisp };
    return runtime.uv;
  } catch (err) {
    runtime.uv = { ok: false, error: err?.message || String(err) };
    return runtime.uv;
  }
}

export function resetUV() { runtime.uv = null; runtime.transport = null; bareConn = null; }

/* ── Scramjet ─────────────────────────────────────────────── */
let sjScriptPromise = null;

/** Carrega o runtime do Scramjet (script clássico que expõe $scramjet). */
export function loadScramjetRuntime() {
  if (window.$scramjet) return Promise.resolve(window.$scramjet);
  if (sjScriptPromise) return sjScriptPromise;
  sjScriptPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = new URL('scramjet/scramjet.js', ROOT).href;
    s.async = true;
    s.onload = () => {
      const sj = window.$scramjet || globalThis.$scramjet;
      if (!sj) { reject(new Error('Scramjet não expôs $scramjet')); return; }
      window.$scramjet = sj;
      resolve(sj);
    };
    s.onerror = () => reject(new Error('Não consegui baixar scramjet.js'));
    document.head.append(s);
  }).catch((err) => { sjScriptPromise = null; throw err; });
  return sjScriptPromise;
}

/** Registra o service worker da raiz e espera ele assumir a página. */
let rootSwPromise = null;
export function ensureRootSW() {
  if (rootSwPromise) return rootSwPromise;
  rootSwPromise = (async () => {
    try {
      const reg = await navigator.serviceWorker.register(new URL('sw.js', ROOT).href, { scope: new URL('./', ROOT).pathname });
      if (!navigator.serviceWorker.controller) {
        await new Promise((resolve) => {
          const t = setTimeout(resolve, 2500);
          navigator.serviceWorker.addEventListener('controllerchange', () => { clearTimeout(t); resolve(); }, { once: true });
        });
      }
      return reg;
    } catch (err) {
      console.warn('[proxy] sw raiz:', err?.message);
      return null;
    }
  })();
  return rootSwPromise;
}

/** Cria (uma vez) o Controller do Scramjet ligado ao transporte atual. */
export async function initScramjet({ force = false } = {}) {
  if (!('serviceWorker' in navigator)) {
    return { ok: false, error: 'Service Worker indisponível (precisa de https ou localhost).' };
  }
  // o controller precisa rodar DENTRO do sw raiz (escopo da página)
  await ensureRootSW();
  if (runtime.sj && runtime.sj.isReady && !force) return { ok: true, controller: runtime.sj };

  try {
    const cfg = settings();
    const transport = await createTransport(cfg.transport, cfg.wisp);
    await loadScramjetRuntime();

    // o controller roda DENTRO do sw raiz (já garantido por ensureRootSW)
    const reg = await navigator.serviceWorker.register(PATHS.sjSw, { scope: new URL('scramjet/', ROOT).pathname });
    await Promise.race([navigator.serviceWorker.ready, new Promise((r) => setTimeout(r, 6000))]);

    const mod = await import(PATHS.sjController);
    if (runtime.sj?.frames) { try { runtime.sj.frames.splice(0); } catch {} }
    const rootReg = await navigator.serviceWorker.getRegistration(new URL('./', ROOT).pathname).catch(() => null);
    const pageSw = rootReg?.active || navigator.serviceWorker.controller || reg.active || reg.installing;
    const controller = new mod.Controller({
      serviceworker: pageSw,
      transport,
      config: {
        prefix: '/~/sj/',
        scramjetPath: new URL('scramjet/scramjet.js', ROOT).pathname,
        injectPath: new URL('scramjet/controller.inject.js', ROOT).pathname,
        wasmPath: new URL('scramjet/scramjet.wasm', ROOT).pathname,
        virtualWasmPath: 'scramjet.wasm.js',
        codec: {
          encode: (u) => (u ? encodeURIComponent(u) : u),
          decode: (u) => (u ? decodeURIComponent(u) : u),
        },
      },
    });

    await controller.wait();
    controller.setTransport?.(transport);
    runtime.sj = controller;
    runtime.transport = cfg.transport;
    return { ok: true, controller };
  } catch (err) {
    runtime.sj = null;
    return { ok: false, error: err?.message || String(err) };
  }
}

export function resetScramjet() {
  try { runtime.sj?.frames?.splice?.(0); } catch {}
  runtime.sj = null;
}

/** Abre uma URL no Scramjet dentro de um iframe. */
export function scramjetOpen(iframe, url) {
  if (!runtime.sj) throw new Error('Scramjet não inicializado');
  let frame = runtime.frames.get(iframe);
  if (!frame) {
    frame = runtime.sj.createFrame(iframe);
    runtime.frames.set(iframe, frame);
  }
  frame.go(url);
  return frame;
}

/* ── fachada usada pelo app Navegador ─────────────────────── */
export async function prepare(protocolId = settings().protocol, { force = false } = {}) {
  if (protocolId === 'ultraviolet') {
    const r = await initUV({ force });
    return { ok: r.ok, engine: 'uv', error: r.error };
  }
  const r = await initScramjet({ force });
  return { ok: r.ok, engine: 'sj', error: r.error };
}

/** URL final para navegar (usada no modo iframe/compartilhar). */
export function proxiedUrl(url, protocolId = settings().protocol, iframe) {
  if (protocolId === 'scramjet' && iframe) {
    const frame = runtime.frames.get(iframe);
    if (frame) return frame.prefix + encodeURIComponent(url);
  }
  if (protocolId === 'scramjet') return encodeSJ(url, '/~/sj/');
  return encodeUV(url);
}

export function describe(protocolId = settings().protocol, transportId = settings().transport) {
  const p = PROTOCOLS.find((x) => x.id === protocolId) || PROTOCOLS[0];
  const t = TRANSPORTS.find((x) => x.id === transportId) || TRANSPORTS[0];
  return `${p.name} + ${t.name}`;
}

/** Registra uma requisição nas estatísticas (o SW não expõe, então
 *  medimos o que dá: cliques de navegação, iframes carregados etc.). */
export function note(ok, info = '') {
  runtime.stats.requests++;
  if (!ok) { runtime.stats.errors++; runtime.stats.lastError = String(info).slice(0, 180); runtime.stats.lastAt = Date.now(); }
}

export function uptime() {
  return Math.max(0, Math.round(performance.now() / 1000));
}

export function clockLabel(d = new Date()) {
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
