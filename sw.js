/* Service Worker — wis oude caches en verwijder zichzelf */
self.addEventListener('install', function() { self.skipWaiting(); });
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.map(function(k) { return caches.delete(k); }));
    }).then(function() { return self.clients.claim(); })
  );
});
/* Geen caching meer — alles rechtstreeks van netwerk */
self.addEventListener('fetch', function(e) {
  e.respondWith(fetch(e.request));
});
