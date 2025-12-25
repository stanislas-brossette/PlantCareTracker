import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, StaleWhileRevalidate, CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

precacheAndRoute(self.__WB_MANIFEST || []);

registerRoute(
  ({ request }) => request.mode === 'navigate',
  new NetworkFirst({ cacheName: 'pages' })
);

const apiPaths = ['/api/plants', '/api/locations', '/api/lastClickedTimes'];
registerRoute(
  ({ url, request }) => request.method === 'GET' && apiPaths.includes(url.pathname),
  async (options) => {
    const strategy = new StaleWhileRevalidate({ cacheName: 'api-cache' });
    const response = await strategy.handle(options);
    if (!response) return response;
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new Error('Expected JSON from API');
    }
    return response;
  }
);

registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'img-cache',
    plugins: [new ExpirationPlugin({ maxEntries: 120, maxAgeSeconds: 7 * 24 * 3600 })]
  })
);
