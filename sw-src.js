/* sw-src.js — service-worker template */

import { precacheAndRoute } from 'workbox-precaching';

// ⬇️ Workbox CLI replaces this with an array of URLs at build time
precacheAndRoute(self.__WB_MANIFEST);

// Network-first strategy for API calls
self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.url.includes('/plants') || request.url.includes('/locations')) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
  }
});

