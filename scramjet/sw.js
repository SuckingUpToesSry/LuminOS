/* ============================================================
   LuminOS — Scramjet (service worker no escopo /scramjet/)
   Serve o controller e roteia as requisições do proxy.
   O controller é registrado pelo app Navegador (config/scramjet).
   ============================================================ */

importScripts('./controller.sw.js');

const { route, shouldRoute } = self.$scramjetController || {};

// deixa o controller assumir as URLs do prefixo dele (/~/sj/...)
self.addEventListener('fetch', (event) => {
  try {
    if (shouldRoute && shouldRoute(event)) {
      event.respondWith(route(event));
    }
  } catch (err) {
    console.error('[scramjet sw]', err);
  }
});

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
