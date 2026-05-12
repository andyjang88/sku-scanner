const CACHE_NAME = 'sku-scanner-v1';
const ASSETS = [
  './barcode-scanner.html',
  './manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/html5-qrcode/2.3.8/html5-qrcode.min.js'
];

// Install: cache core assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first for API calls, cache-first for assets
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Always go to network for Google Apps Script and product lookups
  if (url.hostname.includes('script.google.com') ||
      url.hostname.includes('openfoodfacts.org') ||
      url.hostname.includes('upcitemdb.com')) {
    return; // let browser handle normally
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).then(response => {
        // Cache new assets on the fly
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    }).catch(() => {
      // Offline fallback for the main page
      if (event.request.mode === 'navigate') {
        return caches.match('./barcode-scanner.html');
      }
    })
  );
});
