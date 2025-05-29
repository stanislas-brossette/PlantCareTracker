const CACHE_NAME = 'plantcare-v1';
const FILES_TO_CACHE = [
  '/',
  '/index.html',
  '/create.html',
  '/plant.html',
  '/locations.html',
  '/styles.css',
  '/script.js',
  '/create.js',
  '/plant.js',
  '/locations.js',
  '/leafAnimations.js',
  '/offline.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(resp => resp || fetch(event.request))
  );
});
