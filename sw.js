// Service worker de Shah Mat.
// - La página (index.html): siempre se intenta traer la versión NUEVA de internet
//   (con un máximo de espera de 4 segundos). Solo si no hay internet o está muy
//   lenta, se usa la última copia guardada. Así los alumnos nunca se quedan con
//   una versión vieja.
// - Imágenes, íconos, piezas del tablero y librerías: se guardan en el celular y se
//   muestran al instante; se actualizan en segundo plano.
// - La base de datos (Supabase) y Lichess NUNCA se guardan.
const VERSION = 'v2';
const PAGE_CACHE = 'shahmat-page-' + VERSION;
const STATIC_CACHE = 'shahmat-static-' + VERSION;
const CDN_HOSTS = ['cdn.jsdelivr.net', 'cdnjs.cloudflare.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', () => { self.skipWaiting(); });

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(k => k.startsWith('shahmat-') && !k.endsWith(VERSION))
      .map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

async function networkFirstPage(request) {
  const cache = await caches.open(PAGE_CACHE);
  const net = fetch(request.url, { cache: 'no-cache' }).then((res) => {
    if (res && res.ok) cache.put(request.url, res.clone());
    return res;
  });
  try {
    return await Promise.race([
      net,
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000)),
    ]);
  } catch (e) {
    const cached = await cache.match(request.url);
    if (cached) return cached;
    return net; // sin copia guardada: esperar a la red
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  const net = fetch(request).then((res) => {
    if (res && (res.ok || res.type === 'opaque')) cache.put(request, res.clone());
    return res;
  }).catch(() => null);
  if (cached) { net.catch(() => {}); return cached; }
  const res = await net;
  return res || Response.error();
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Nunca interceptar la base de datos ni Lichess
  if (url.hostname.endsWith('supabase.co') || url.hostname.endsWith('supabase.in') || url.hostname.includes('lichess.org')) return;

  // La página principal
  if (req.mode === 'navigate' || (url.origin === location.origin && (url.pathname.endsWith('/') || url.pathname.endsWith('/index.html')))) {
    event.respondWith(networkFirstPage(req));
    return;
  }

  // Imágenes, íconos, librerías y piezas
  if (url.origin === location.origin || CDN_HOSTS.includes(url.hostname)) {
    event.respondWith(staleWhileRevalidate(req));
  }
});
