/* LuminOS × Ultraviolet — service worker dedicado (escopo /uv/).
   Registrado em config/uv — não interfere no sw.js principal do sistema. */
importScripts('uv.bundle.js', 'uv.config.js');
importScripts(self.__uv$config.sw || 'uv.sw.js');

const uv = new UVServiceWorker();

self.addEventListener('fetch', (event) => {
  if (uv.route(event)) {
    event.respondWith(uv.fetch(event));
    return;
  }
  event.respondWith(fetch(event.request));
});

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
