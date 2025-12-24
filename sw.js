// Workbox injects precache manifest here
self.addEventListener('fetch', event=>{
  const {request} = event;
  // network-first for API
  if (request.url.includes('/plants') || request.url.includes('/locations')){
    event.respondWith((async () => {
      try {
        return await fetch(request);
      } catch (err) {
        const cached = await caches.match(request);
        if (cached) return cached;
        return new Response(
          JSON.stringify({ error: 'offline', message: 'No cached response' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      }
    })());
  }
});
