/* PlantCareTracker Service Worker */
importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js');

workbox.core.setCacheNameDetails({ prefix: 'pct' });
workbox.core.clientsClaim();
self.skipWaiting();

const { precaching, routing, strategies, expiration } = workbox;
const { precacheAndRoute } = precaching;
const { registerRoute, NavigationRoute } = routing;
const { StaleWhileRevalidate, CacheFirst } = strategies;
const { ExpirationPlugin } = expiration;

precacheAndRoute([
  { url: '/', revision: '1' },
  { url: '/index.html', revision: '1' },
  { url: '/create.html', revision: '1' },
  { url: '/locations.html', revision: '1' },
  { url: '/plant.html', revision: '1' },
  { url: '/styles.css', revision: '1' },
  { url: '/config.js', revision: '1' },
  { url: '/offline.js', revision: '1' },
  { url: '/offlineData.js', revision: '1' },
  { url: '/leafAnimations.js', revision: '1' },
  { url: '/script.js', revision: '1' },
  { url: '/create.js', revision: '1' },
  { url: '/locations.js', revision: '1' },
  { url: '/plant.js', revision: '1' },
  { url: '/js/api.js', revision: '1' },
  { url: '/js/storage.js', revision: '1' },
  { url: '/js/sync.js', revision: '1' },
  { url: '/images/placeholder.png', revision: '1' },
]);

registerRoute(new NavigationRoute(precaching.createHandlerBoundToURL('/index.html')));

const apiStrategy = new StaleWhileRevalidate({ cacheName: 'api-cache' });
const isSameOrigin = (url) => url.origin === self.location.origin;

registerRoute(
  ({ url, request }) => request.method === 'GET' && isSameOrigin(url) && (
    url.pathname === '/plants' ||
    url.pathname.startsWith('/plants/') ||
    url.pathname === '/locations' ||
    url.pathname === '/lastClickedTimes' ||
    url.pathname === '/api/lastClickedTimes'
  ),
  async ({ event }) => {
    const { request } = event;
    const matchPath = new URL(request.url).pathname;
    const isLastClicked = matchPath === '/lastClickedTimes' || matchPath === '/api/lastClickedTimes';
    const cached = await caches.match(request);
    if (isLastClicked) {
      console.log('[sw] lastClickedTimes cache', cached ? 'hit' : 'miss', request.url);
    }
    const response = await apiStrategy.handle({ event });
    if (isLastClicked && !cached) {
      const nowCached = await caches.match(request);
      if (nowCached) {
        console.log('[sw] lastClickedTimes cached after fetch', request.url);
      }
    }
    return response;
  }
);

registerRoute(
  ({ request, url }) => request.destination === 'image' || url.pathname.startsWith('/images/'),
  new CacheFirst({
    cacheName: 'img-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 })
    ]
  })
);

