// Workbox injects precache manifest here
self.addEventListener('fetch', event=>{
  const {request} = event;
  // network-first for API
  if (request.url.includes('/plants') || request.url.includes('/locations')){
    event.respondWith(
      fetch(request).catch(()=>caches.match(request))
    );
  }
});
