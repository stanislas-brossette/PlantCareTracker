const CACHE_NAME = 'pct-cache-v1';
const PRECACHE = [
  '/',
  '/index.html',
  '/create.html',
  '/plant.html',
  '/locations.html',
  '/script.js',
  '/create.js',
  '/plant.js',
  '/locations.js',
  '/styles.css',
  '/leafAnimations.js',
  '/config.js',
  '/offline.js',
  '/offlineData.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request).then(res => {
      const clone = res.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
      return res;
    }).catch(() => caches.match(event.request))
  );
});
