importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js');

workbox.precaching.precacheAndRoute([]);

workbox.routing.registerRoute(
  ({request, url}) => request.mode === 'navigate' && !/^\/api\//.test(url.pathname),
  new workbox.strategies.NetworkFirst({ cacheName: 'html-cache' })
);

const apiMatch = ({url, request}) => request.method === 'GET' && (
  url.pathname === '/api/plants' ||
  url.pathname.startsWith('/api/plants/') ||
  url.pathname === '/api/locations' ||
  url.pathname === '/api/lastClickedTimes'
);

workbox.routing.registerRoute(
  apiMatch,
  new workbox.strategies.StaleWhileRevalidate({ cacheName: 'api-cache' })
);

workbox.routing.registerRoute(
  ({request}) => request.destination === 'image',
  new workbox.strategies.CacheFirst({
    cacheName: 'img-cache',
    plugins: [new workbox.expiration.ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 })]
  })
);
