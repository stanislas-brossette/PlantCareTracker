/* sw-src.js — service-worker template */

import {precacheAndRoute} from 'workbox-precaching';
import {registerRoute} from 'workbox-routing';
import {CacheFirst, StaleWhileRevalidate} from 'workbox-strategies';
import {ExpirationPlugin} from 'workbox-expiration';

// ⬇️ Workbox CLI replaces this with an array of URLs at build time
precacheAndRoute(self.__WB_MANIFEST);

/* ⚙️  API: keep stale UI, revalidate in BG */
registerRoute(
  ({url}) => url.pathname.startsWith('/plants') || url.pathname.startsWith('/locations'),
  new StaleWhileRevalidate({cacheName: 'api-cache'})
);

/* 🖼️ Images: cache-first so they never disappear */
registerRoute(
  ({request}) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'img-cache',
    plugins: [ new ExpirationPlugin({maxEntries: 120, maxAgeSeconds: 7*24*3600}) ]
  })
);

