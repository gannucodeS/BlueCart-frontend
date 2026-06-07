var CACHE = 'bc-v1';
var STATIC_ASSETS = [
  '/shared.js',
  '/shared.css',
  '/db.mongo.js'
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(c) {
      return c.addAll(STATIC_ASSETS);
    })
  );
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE; }).map(function(k) { return caches.delete(k); })
      );
    })
  );
});

self.addEventListener('fetch', function(e) {
  var url = new URL(e.request.url);

  // Cache-first for static assets
  if (STATIC_ASSETS.indexOf(url.pathname) >= 0) {
    e.respondWith(
      caches.match(e.request).then(function(cached) {
        return cached || fetch(e.request).then(function(r) {
          return caches.open(CACHE).then(function(c) { c.put(e.request, r.clone()); return r; });
        });
      })
    );
    return;
  }

  // Network-first for HTML pages
  if (url.pathname.endsWith('.html') || url.pathname === '/' || !url.pathname.includes('.')) {
    e.respondWith(
      fetch(e.request).then(function(r) {
        return caches.open(CACHE).then(function(c) { c.put(e.request, r.clone()); return r; });
      }).catch(function() {
        return caches.match(e.request);
      })
    );
    return;
  }

  // Cache-first for everything else (images, fonts, etc.)
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      return cached || fetch(e.request).then(function(r) {
        return caches.open(CACHE).then(function(c) { c.put(e.request, r.clone()); return r; });
      });
    })
  );
});
