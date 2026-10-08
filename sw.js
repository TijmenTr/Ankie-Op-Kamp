/* Service Worker – Ankie op Kamp */
const CACHE = 'aok-v1';
const PRECACHE = [
  '/',
  '/index.html',
  '/speler.html',
  '/regie.html',
  '/css/speler.css',
  '/css/regie.css',
  '/js/sync.js',
  '/manifest.json',
  '/manifest-regie.json',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // Network-first voor API calls, cache-first voor assets
  if (e.request.url.includes('supabase.co') || e.request.url.includes('nominatim') || e.request.url.includes('osrm') || e.request.url.includes('openfreemap')) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
      return res;
    }))
  );
});
