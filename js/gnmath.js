/* ============================================================
   LuminOS — GN-Math (acervo de 848 jogos)
   • Catálogo local: data/gnmath-games.json (acervo freebuisness/html)
   • Player: baixa o HTML do jogo e injeta em <iframe srcdoc> com <base>
     apontando para a pasta correta — exatamente como o GN-Math faz.
   • Espelhos jsDelivr/CDN + loader com progresso e fallback,
     no estilo do loader "practice-geometry" (a2.svg).
   ============================================================ */

const MIRRORS = [
  'https://cdn.jsdelivr.net/gh/freebuisness/html@main/',
  'https://fastly.jsdelivr.net/gh/freebuisness/html@main/',
  'https://gcore.jsdelivr.net/gh/freebuisness/html@main/',
  'https://testingcf.jsdelivr.net/gh/freebuisness/html@main/',
  'https://originfastly.jsdelivr.net/gh/freebuisness/html@main/',
  'https://quantil.jsdelivr.net/gh/freebuisness/html@main/',
  'https://jsdelivr.b-cdn.net/gh/freebuisness/html@main/',
  'https://cdn.statically.io/gh/freebuisness/html/main/',
  'https://raw.githubusercontent.com/freebuisness/html/main/',
  'https://raw.githack.com/freebuisness/html/main/',
];

const COVER_MIRRORS = [
  'https://cdn.jsdelivr.net/gh/freebuisness/covers@main/',
  'https://fastly.jsdelivr.net/gh/freebuisness/covers@main/',
  'https://gcore.jsdelivr.net/gh/freebuisness/covers@main/',
  'https://cdn.statically.io/gh/freebuisness/covers/main/',
  'https://raw.githubusercontent.com/freebuisness/covers/main/',
];

/* jogos citados pelo usuário, mantidos como atalhos fixos */
export const FEATURED = [
  {
    name: 'Practice Geometry',
    note: 'gn-math · link direto (raw.esm.sh)',
    url: 'https://raw.esm.sh/gh/Why2ITry/gn-math-links-2-1@38eb5c5c9a62b0be2391fcd8f459ecbd47d855b1/practice-geometry-2-53t910.html',
  },
  {
    name: 'Practice (espelho sealiee11)',
    note: 'gn-math · loader a2.svg com 8 espelhos',
    loaders: [
      'https://originfastly.jsdelivr.net/gh/Sloth648/caverned-spooky-wraith@main/a2.svg',
      'https://cdn.jsdelivr.net/gh/Sloth648/caverned-spooky-wraith@main/a2.svg',
    ],
  },
];

export function coverUrls(file) {
  if (!file) return [];
  return COVER_MIRRORS.map((b) => b + file);
}

export function gameSources(game) {
  return MIRRORS.map((b) => b + game.f);
}

/* ── loader com progresso (no estilo a2.svg) ────────────────── */
export function loaderHTML(title = 'Carregando…') {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;height:100%;background:#0b0d12;color:#e9ebf2;font:13px/1.5 system-ui,sans-serif}
  #l{position:fixed;inset:0;display:flex;align-items:center;justify-content:center}
  #c{width:min(360px,80vw);text-align:center}
  .sp{position:relative;width:18px;height:18px;margin:0 auto 38px;animation:rot 1.4s infinite linear}
  .sp div{position:absolute;width:100%;height:100%;background:#fff;border-radius:2px;
    animation:fly 1.75s infinite ease;filter:drop-shadow(0 0 2px rgba(111,139,255,.5))}
  .sp div:nth-child(1){--r:90}.sp div:nth-child(2){--r:180}.sp div:nth-child(3){--r:270}.sp div:nth-child(4){--r:360}
  @keyframes fly{0%,100%{transform:rotate(calc(var(--r)*1deg)) translateY(0)}
    50%{transform:rotate(calc(var(--r)*1deg)) translateY(300%)}}
  @keyframes rot{to{transform:rotate(360deg)}}
  .t{font-size:13px;margin-bottom:9px;color:#c3c9dd;letter-spacing:-.01em}
  .b{height:6px;background:#171a22;border-radius:99px;overflow:hidden}
  .p{height:100%;width:2%;background:linear-gradient(90deg,#6f8bff,#b07bff);border-radius:99px;transition:width .12s linear}
  .n{margin-top:8px;font-size:11px;color:#6f8bff;font-variant-numeric:tabular-nums}
  .h{margin-top:22px;font-size:10.5px;color:#5c6478}
  </style></head><body><div id="l"><div id="c">
  <div class="sp"><div></div><div></div><div></div><div></div></div>
  <div class="t" id="t">${title}</div>
  <div class="b"><div class="p" id="p"></div></div>
  <div class="n" id="n">0%</div>
  <div class="h">GN-Math × LuminOS</div>
  </div></div></body></html>`;
}

/**
 * Baixa o jogo tentando cada espelho, com progresso reportado em `onProgress`.
 * Resolve { html, used } ou lança erro.
 */
export async function fetchGameHTML(game, { onProgress, timeout = 20000 } = {}) {
  const sources = gameSources(game);
  let lastErr = null;
  for (let i = 0; i < sources.length; i++) {
    const url = sources[i];
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), timeout);
    try {
      onProgress?.({ source: url, index: i, total: sources.length, percent: 0, phase: 'connect' });
      const res = await fetch(url, { cache: 'force-cache', signal: ac.signal });
      if (!res.ok || !res.body) throw new Error('HTTP ' + res.status + ' · ' + (res.body ? 'sem corpo' : 'vazio'));

      const total = +(res.headers.get('content-length') || 0);
      const reader = res.body.getReader();
      const chunks = [];
      let got = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        got += value.length;
        const den = total || Math.max(got * 1.25, 60000);
        onProgress?.({
          source: url, index: i, total: sources.length, phase: 'download',
          percent: Math.min(99, Math.round((got / den) * 100)), bytes: got, totalBytes: total,
        });
      }
      const all = new Uint8Array(got);
      let off = 0;
      for (const c of chunks) { all.set(c, off); off += c.length; }
      const html = new TextDecoder().decode(all);
      if (!html || html.trim().length < 40) throw new Error('arquivo vazio');
      clearTimeout(timer);
      onProgress?.({ source: url, percent: 100, phase: 'done' });
      return { html, used: url };
    } catch (err) {
      lastErr = err;
      clearTimeout(timer);
      onProgress?.({ source: url, index: i, total: sources.length, phase: 'retry', error: err.message });
    }
  }
  throw lastErr || new Error('nenhum espelho respondeu');
}

/** injeta <base> para que o jogo ache seus assets (relativos) — igual ao GN-Math */
export function injectBase(html, url) {
  const base = new URL('.', url).href;
  const tag = `<base href="${base}">`;
  if (/<base\s[^>]*>/i.test(html)) return html.replace(/<base\s[^>]*>/i, tag);
  if (/<head[^>]*>/i.test(html)) return html.replace(/<head[^>]*>/i, (m) => m + tag);
  if (/<html[^>]*>/i.test(html)) return html.replace(/<html[^>]*>/i, (m) => m + tag);
  return tag + html;
}

export function isYtPlayable(html) { return /ytgame/i.test(html); }

export { MIRRORS as GN_MIRRORS };
