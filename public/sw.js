const APP_CACHE = 'app-shell-v1';
const STATIC_CACHE = 'static-cache-v1';
const API_CACHE = 'api-cache-v1';

const APP_SHELL = [
  '/',
  '/index.html',
  '/styles.css',
  '/script.js',
  '/config.js',
  '/offline.js',
  '/leafAnimations.js',
  '/plant.html',
  '/plant.js',
  '/create.html',
  '/create.js',
  '/locations.html',
  '/locations.js',
  '/images/placeholder.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  const validCaches = new Set([APP_CACHE, STATIC_CACHE, API_CACHE]);
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => !validCaches.has(k)).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;

  if (request.mode === 'navigate'){
    event.respondWith(handleNavigation(request));
    return;
  }

  if (request.method === 'GET' && sameOrigin && isApiRequest(url.pathname)){
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  if (request.method === 'GET' && sameOrigin && isStaticAsset(request)){
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }
});

function isApiRequest(pathname){
  return pathname.startsWith('/api/') || ['/plants','/locations','/lastClickedTimes'].includes(pathname);
}

function isStaticAsset(request){
  const destinations = ['script','style','image','font'];
  return destinations.includes(request.destination) || APP_SHELL.includes(new URL(request.url).pathname);
}

async function handleNavigation(request){
  try {
    const response = await fetch(request);
    const cache = await caches.open(APP_CACHE);
    if (response && response.ok){
      cache.put('/index.html', response.clone());
    }
    return response;
  } catch (err){
    const cached = await caches.match('/index.html');
    if (cached) return cached;
    throw err;
  }
}

async function networkFirst(request, cacheName){
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response && response.ok){
      cache.put(request, response.clone());
    }
    return response;
  } catch (err){
    const cached = await cache.match(request);
    if (cached) return cached;
    throw err;
  }
}

async function cacheFirst(request, cacheName){
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached){
    fetch(request).then((res) => {
      if (res && res.ok){
        cache.put(request, res.clone());
      }
    }).catch(() => {});
    return cached;
  }
  try {
    const response = await fetch(request);
    if (response && response.ok){
      cache.put(request, response.clone());
    }
    return response;
  } catch (err){
    const fallback = await caches.match(request);
    if (fallback) return fallback;
    throw err;
  }
}
