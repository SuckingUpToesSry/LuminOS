/* LuminOS — service worker: cache-first para os arquivos do sistema.
   Estratégia: pré-cache do shell; runtime cache para o resto do domínio.
   Iframes de sites externos NÃO são cacheados. */
const CACHE = 'luminos-v1';
const SHELL = [
  './', './index.html',
  './css/style.css', './css/apps.css',
  './js/main.js', './js/core.js', './js/icons.js', './js/wm.js', './js/ui.js',
  './js/registry.js', './js/desktop.js', './js/notifications.js',
  './js/apps/browser.js', './js/apps/notes.js', './js/apps/ai.js', './js/apps/games.js',
  './js/apps/media.js', './js/apps/store.js', './js/apps/settings.js', './js/apps/files.js',
  './js/apps/tools.js', './js/apps/social.js', './js/apps/extras.js', './js/apps/webapp.js',
  './assets/icon.svg', './assets/manifest.webmanifest',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL).catch(() => {})).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // não intercepta sites externos
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});
