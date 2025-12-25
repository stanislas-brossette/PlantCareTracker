importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js');

const PRECACHE_VERSION = 'v1';
const PRECACHE_MANIFEST = [
  '/',
  '/index.html',
  '/locations.html',
  '/create.html',
  '/plant.html',
  '/styles.css',
  '/script.js',
  '/locations.js',
  '/create.js',
  '/plant.js',
  '/offline.js',
  '/config.js',
  '/js/api.js',
  '/js/storage.js',
  '/js/sync.js',
  '/leafAnimations.js',
  '/images/placeholder.png'
].map(url => ({ url, revision: PRECACHE_VERSION }));

workbox.precaching.precacheAndRoute(PRECACHE_MANIFEST);

const offlineNotifier = {
  async fetchDidFail(){
    const clients = await self.clients.matchAll({type:'window'});
    clients.forEach(client => client.postMessage({ type: 'offline-mode' }));
  },
  async fetchDidSucceed({response}){
    const clients = await self.clients.matchAll({type:'window'});
    clients.forEach(client => client.postMessage({ type: 'online-mode' }));
    return response;
  }
};

workbox.routing.registerRoute(
  ({request, url}) => request.method === 'GET' && url.pathname.startsWith('/api/'),
  new workbox.strategies.StaleWhileRevalidate({ cacheName: 'api-cache', plugins: [offlineNotifier] })
);

workbox.routing.registerRoute(
  ({request}) => request.destination === 'image',
  new workbox.strategies.CacheFirst({
    cacheName: 'img-cache',
    plugins: [new workbox.expiration.ExpirationPlugin({ maxEntries: 120, maxAgeSeconds: 7*24*3600 }), offlineNotifier]
  })
);

workbox.routing.registerRoute(
  ({request, url}) => request.mode === 'navigate' && !url.pathname.startsWith('/api/'),
  new workbox.strategies.NetworkFirst({ cacheName: 'page-cache', plugins: [offlineNotifier] })
);

workbox.routing.setCatchHandler(async ({request}) => {
  if (request.destination === 'document') {
    const cache = await caches.open('page-cache');
    const cached = await cache.match('/index.html');
    if (cached) return cached;
  }
  return Response.error();
});
