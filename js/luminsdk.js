/* ============================================================
   LuminOS — LuminSDK (1.100+ jogos)
   Integração exata do snippet oficial:

     <script src="https://cdn.jsdelivr.net/gh/luminsdk/script@latest/lumin.min.js"></script>
     Lumin.init({ container: '#games', theme: 'dark' });

   Aqui usamos o modo *headless* para desenhar nossa própria grade
   (cards, busca, categorias, favoritos) e um player próprio com
   `getGameUrl(id)` — a URL é de uso único, então pedimos sempre.
   ============================================================ */

const CDNS = [
  'https://cdn.jsdelivr.net/gh/luminsdk/script@latest/lumin.min.js',
  'https://fastly.jsdelivr.net/gh/luminsdk/script@latest/lumin.min.js',
  'https://cdn.statically.io/gh/luminsdk/script/main/lumin.min.js',
];

let loading = null;
export const sdk = { ready: false, error: null, cdn: null, headless: false };

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolve(src);
    s.onerror = () => reject(new Error('falhou: ' + src));
    document.head.append(s);
    setTimeout(() => reject(new Error('timeout: ' + src)), 12000);
  });
}

/** Carrega o script do CDN e inicializa em modo headless. Idempotente. */
export function initLumin({ headless = true } = {}) {
  if (loading) return loading;
  loading = (async () => {
    if (typeof window.Lumin !== 'undefined') {
      sdk.ready = true;
      try { await window.Lumin.init({ headless }); } catch {}
      return sdk;
    }
    let lastErr = null;
    for (const url of CDNS) {
      try {
        await loadScript(url);
        if (typeof window.Lumin === 'undefined') throw new Error('script carregou mas Lumin não existe');
        await window.Lumin.init({ headless });
        sdk.ready = true;
        sdk.cdn = url;
        sdk.headless = headless;
        return sdk;
      } catch (err) { lastErr = err; }
    }
    sdk.error = lastErr?.message || 'LuminSDK indisponível';
    throw lastErr;
  })();
  return loading;
}

export function isReady() { return sdk.ready && typeof window.Lumin !== 'undefined'; }

/** Lista paginada: { games, total, pages } */
export async function getGames({ page = 1, limit = 24, q = '' } = {}) {
  if (!isReady()) await initLumin();
  const res = await window.Lumin.getGames({ page, limit, q });
  return { games: res?.games || [], total: res?.total || 0, pages: res?.pages || 1, page: res?.page || page };
}

export async function searchGames(q) {
  if (!isReady()) await initLumin();
  if (window.Lumin.search) {
    try {
      const r = await window.Lumin.search(q);
      if (r) return r.games || r || [];
    } catch {}
  }
  const res = await getGames({ q, limit: 60 });
  return res.games;
}

export async function categories() {
  if (!isReady()) return [];
  try { return (await window.Lumin.getCategories()) || []; } catch { return []; }
}

export async function randomGames(n = 12) {
  if (!isReady()) await initLumin();
  try { return (await window.Lumin.getRandomGames(n)) || []; } catch { return []; }
}

/** URL de iframe (uso único) para o player próprio */
export async function gameUrl(id) {
  if (!isReady()) await initLumin();
  const r = await window.Lumin.getGameUrl(id);
  return r?.url || null;
}

export async function imageUrl(token) {
  if (!token) return null;
  try { return await window.Lumin.getImageUrl(token); } catch { return null; }
}

export function destroy() {
  try { window.Lumin?.destroy?.(); } catch {}
  sdk.ready = false;
  loading = null;
}
