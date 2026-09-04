// Service worker mínimo: solo existe para que el navegador considere que
// la app se puede "instalar". No guarda nada en caché, así que siempre
// va a mostrar la versión más nueva de la web.
self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => { self.clients.claim(); });
self.addEventListener('fetch', (e) => {
  e.respondWith(fetch(e.request));
});
