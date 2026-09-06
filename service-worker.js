const CACHE = 'kamban-acopio-0002.8.9-batch1';

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/estilos.css?v=0002.8.7-campo',
  './js/config.js?v=0002.8.7-campo',
  './js/utilidades.js?v=0002.8.7-campo',
  './js/db.js?v=0002.8.7-campo',
  './js/reglas.js?v=0002.8.7-campo',
  './js/sincronizacion.js?v=0002.8.9-batch1',
  './js/seguimiento.js?v=0002.8.7-campo',
  './js/admin.js?v=0002.8.7-campo',
  './js/app.js?v=0002.8.7-campo',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key !== CACHE).map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const request = event.request;

  // Navegación: red primero, caché como respaldo.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put('./index.html', copy));
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Archivos estáticos: red primero y luego caché.
  event.respondWith(
    fetch(request)
      .then(response => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
