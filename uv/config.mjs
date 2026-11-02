/* ============================================================
   LuminOS — ponte de configuração do Ultraviolet
   Usado pelo app Navegador para registrar o SW em /uv/,
   conectar o BareMux ao transporte Epoxy (Wisp) e montar URLs.
   ============================================================ */

/* Raiz do vendor /uv/. Funciona tanto em módulos nativos (import.meta.url)
   quanto no bundle IIFE, onde import.meta é vazio: nesse caso derivamos a
   raiz a partir da URL do próprio script carregado (js/luminos.bundle.js). */
function uvRoot() {
  // 1) módulos nativos
  try {
    const u = import.meta.url;
    if (u) return new URL('../../uv/', u);
  } catch { /* import.meta vazio no bundle */ }
  // 2) bundle clássico: procura o <script> do LuminOS e sobe um nível
  try {
    const src = document.currentScript?.src
      || [...document.querySelectorAll('script[src]')].map((s) => s.src).find((s) => /luminos?\.bundle|\/js\//i.test(s))
      || location.href;
    return new URL('../uv/', src.endsWith('.js') ? src : location.href);
  } catch {
    return new URL('uv/', location.href);
  }
}

const UV_ROOT = uvRoot();

export const UV = {
  root: UV_ROOT,
  swUrl: new URL('sw.js', UV_ROOT).href,
  scope: UV_ROOT.pathname,
  prefix: UV_ROOT.pathname + 'service/',
  bareMux: new URL('bare-mux.mjs', UV_ROOT).href,
  worker: new URL('baremux.worker.js', UV_ROOT).href,
  epoxy: new URL('epoxy.mjs', UV_ROOT).href,
};

/** Relays Wisp públicos conhecidos (ordem de preferência). */
export const WISP_ENDPOINTS = [
  'wss://wisp.mercurywork.shop/',
  'wss://bare-server.fly.dev/wisp/',
  'wss://wisp.terbiumon.top/',
  'wss://wisp.drlongass.xyz/',
];

const STORE_KEY = 'uv.settings';
export function uvSettings() {
  return { wisp: WISP_ENDPOINTS[0], transport: 'epoxy', engine: true, ...(JSON.parse(localStorage.getItem('luminos:' + STORE_KEY) || '{}')) };
}
export function saveUvSettings(patch) {
  const next = { ...uvSettings(), ...patch };
  localStorage.setItem('luminos:' + STORE_KEY, JSON.stringify(next));
  return next;
}

/** codificador idêntico ao do uv.config.js (xor + base64 url-safe) */
export function encodeUV(url) {
  const s = url.toString();
  let out = '';
  for (let i = 0; i < s.length; i++) out += String.fromCharCode(s.charCodeAt(i) ^ 2);
  const b64 = btoa(out).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return UV.prefix + b64;
}

let session = null;

/** registra o SW do UV e prepara o BareMux/Epoxy. Resolve { ok, error }. */
export async function initUV({ force = false } = {}) {
  const cfg = uvSettings();
  if (!('serviceWorker' in navigator)) return { ok: false, error: 'Service Worker indisponível (use https ou localhost).' };
  if (session && !force) return session;

  session = (async () => {
    try {
      const reg = await navigator.serviceWorker.register(UV.swUrl, { scope: UV.scope });
      await navigator.serviceWorker.ready;

      // BareMux aponta o transporte para o cliente Epoxy sobre Wisp
      const { BareMuxConnection } = await import(UV.bareMux);
      const conn = new BareMuxConnection(UV.worker);
      const wisp = cfg.wisp || WISP_ENDPOINTS[0];
      await conn.setTransport(UV.epoxy, [{ wisp }]);
      return { ok: true, reg, conn, wisp };
    } catch (err) {
      console.warn('[LuminOS] UV falhou:', err);
      return { ok: false, error: err?.message || String(err) };
    }
  })();
  return session;
}

export function resetUV() { session = null; }
