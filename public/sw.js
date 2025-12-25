/* PlantCareTracker Service Worker */
importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js');

workbox.setConfig({ debug: true });

const { core, precaching, routing, strategies, expiration } = workbox;
const { precacheAndRoute, createHandlerBoundToURL } = precaching;
const { registerRoute, NavigationRoute } = routing;
const { StaleWhileRevalidate, CacheFirst } = strategies;
const { ExpirationPlugin } = expiration;

core.setCacheNameDetails({ prefix: 'pct' });
core.clientsClaim();
self.skipWaiting();

const precacheManifest = self.__WB_MANIFEST || [
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
];

precacheAndRoute(precacheManifest);

const navigationHandler = createHandlerBoundToURL('/index.html');
registerRoute(new NavigationRoute(navigationHandler, {
  denylist: [
    /\/plants(\/.*)?$/i,
    /\/locations(\/.*)?$/i,
    /\/lastClickedTimes(\/.*)?$/i,
  ],
}));

const isLastClickedPath = (urlInput) => {
  const href = urlInput instanceof Request
    ? urlInput.url
    : typeof urlInput === 'string'
      ? urlInput
      : urlInput && urlInput.href;

  if (!href) return false;
  const { pathname } = new URL(href, self.location.href);
  return pathname === '/lastClickedTimes' || pathname === '/api/lastClickedTimes';
};

const apiMatch = ({ request, url }) => (
  request.method === 'GET' &&
  url.origin === self.location.origin &&
  (
    url.pathname === '/plants' ||
    url.pathname.startsWith('/plants/') ||
    url.pathname === '/locations' ||
    isLastClickedPath(url)
  )
);

const lastClickedLoggingPlugin = {
  cachedResponseWillBeUsed: async ({ request, cachedResponse }) => {
    if (isLastClickedPath(request.url)) {
      console.log('[sw] lastClickedTimes cache', cachedResponse ? 'hit' : 'miss', request.url);
    }
    return cachedResponse;
  },
  cacheDidUpdate: async ({ request }) => {
    if (isLastClickedPath(request.url)) {
      console.log('[sw] lastClickedTimes cached/updated', request.url);
    }
  }
};

registerRoute(
  apiMatch,
  new StaleWhileRevalidate({
    cacheName: 'api-cache',
    plugins: [lastClickedLoggingPlugin],
  })
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
