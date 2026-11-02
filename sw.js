/* ============================================================
   LuminOS — service worker
   Estratégia: network-first com fallback de cache.
   Regras de ouro:
     • NUNCA guardar respostas que não sejam 200 "ok";
     • nunca servir HTML no lugar de um módulo JS (isso quebra o boot);
     • atualizações do sistema entram no cache na primeira visita.
   ============================================================ */

const CACHE = 'luminos-v3';
const SHELL = [
  './', './index.html',
  './css/style.css', './css/apps.css',
  './js/main.js', './js/core.js', './js/icons.js', './js/wm.js', './js/ui.js',
  './js/registry.js', './js/desktop.js', './js/notifications.js', './js/luminos.bundle.js',
  './js/apps/browser.js', './js/apps/notes.js', './js/apps/ai.js', './js/apps/games.js',
  './js/apps/media.js', './js/apps/store.js', './js/apps/settings.js', './js/apps/files.js',
  './js/apps/tools.js', './js/apps/social.js', './js/apps/extras.js', './js/apps/webapp.js',
  './assets/icon.svg', './assets/manifest.webmanifest',
  './js/proxy.js', './js/studyhub.js', './js/chat.js', './js/gnmath.js',
  './js/luminsdk.js', './js/apps/arcade.js', './css/studyhub.css', './css/astolfo.css',
  './data/gnmath-games.json', './assets/wallpapers/astolfo.svg',
];

/* ── Scramjet: o controller vive no escopo raiz deste worker ──
   É ele que intercepta /~/sj/... e devolve as páginas reescritas. */
try { importScripts('./scramjet/controller.sw.js'); } catch (err) { console.warn('[sw] scramjet indisponível', err); }
const scramjet = self.$scramjetController || null;

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // adiciona um por um: uma falha não derruba o restante do pré-cache
    await Promise.all(SHELL.map(async (url) => {
      try {
        const res = await fetch(new Request(url, { cache: 'reload' }));
        if (res.ok) await cache.put(url, res);
      } catch {}
    }));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  // 1) Scramjet tem prioridade (prefixo /~/sj/)
  try {
    if (scramjet?.shouldRoute?.(event)) {
      event.respondWith(scramjet.route(event));
      return;
    }
  } catch (err) {
    console.error('[sw] scramjet', err);
  }

  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch { return; }
  if (url.origin !== location.origin) return;   // sites externos: nunca intercepta
  if (url.pathname.endsWith('/sw.js')) return;  // o próprio worker fica fora do cache
  if (url.pathname.startsWith('/~/sj/') || url.pathname.includes('/uv/service/')) return;

  const isNavigation = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const fresh = await fetch(req);
      // só guarda respostas totalmente válidas do próprio arquivo pedido
      if (fresh && fresh.ok && fresh.type === 'basic' && fresh.status === 200) {
        const len = fresh.headers.get('content-length');
        if (len !== '0') cache.put(req, fresh.clone()).catch(() => {});
      }
      return fresh;
    } catch {
      // offline: tenta o cache exato
      const hit = await cache.match(req, { ignoreSearch: true });
      if (hit) return hit;
      if (isNavigation) {
        const shell = await cache.match('./index.html', { ignoreSearch: true });
        if (shell) return shell;
      }
      return new Response('/* offline */', {
        status: 503,
        headers: { 'Content-Type': url.pathname.endsWith('.js') ? 'text/javascript' : 'text/plain' },
      });
    }
  })());
});

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});
