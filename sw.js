const CACHE_NAME = 'diashow-cache-v15';
const ASSETS = [
  'index.html',
  'manifest.json',
  'privacy.html',
  'rss-feeds.html',
  'icon-192.png',
  'icon-512.png'
];

// Install Event - Assets im Cache ablegen
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching core assets');
        return cache.addAll(ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate Event - Alte Caches aufräumen
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Clearing old cache', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Cache-first für statische Assets, Network-first für APIs
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Externe API-Anfragen (z.B. Wetter, RSS) oder Nicht-GET-Anfragen überspringen bzw. Network-first behandeln
  if (event.request.method !== 'GET') {
    return;
  }

  // Lokale statische Ressourcen
  if (ASSETS.some(asset => url.pathname.endsWith(asset)) || url.pathname === '/' || url.pathname.endsWith('/index.html')) {
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          return response || fetch(event.request).then(fetchResponse => {
            return caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, fetchResponse.clone());
              return fetchResponse;
            });
          });
        })
    );
  } else {
    // Dynamische Anfragen (Wetter, RSS) -> Network-first
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Antwort klonen und im Cache sichern für den Offline-Fall
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Bei Netzwerkfehler im Cache nachschauen
          return caches.match(event.request);
        })
    );
  }
});
