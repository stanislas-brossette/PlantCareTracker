module.exports = {
  globDirectory: 'public',
  globPatterns: ['**/*.{html,js,css,png,jpeg,svg,json}'],
  swDest: 'public/sw.js',
  ignoreURLParametersMatching: [/^utm_/, /^fbclid$/, /^name$/],
  runtimeCaching: [
    {
      urlPattern: ({url}) => url.pathname.startsWith('/plants') || url.pathname.startsWith('/locations'),
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'api-cache',
      },
    },
    {
      urlPattern: ({request}) => request.destination === 'image',
      handler: 'CacheFirst',
      options: {
        cacheName: 'img-cache',
        expiration: {
          maxEntries: 120,
          maxAgeSeconds: 7 * 24 * 60 * 60,
        },
      },
    },
  ],
};
