/* sw-src.js — service-worker template */

import {precacheAndRoute} from 'workbox-precaching';
import {registerRoute} from 'workbox-routing';
import {CacheFirst, StaleWhileRevalidate} from 'workbox-strategies';
import {ExpirationPlugin} from 'workbox-expiration';

// ⬇️ Workbox CLI replaces this with an array of URLs at build time
precacheAndRoute([{"revision":"59dbe58eb74fc07e272c28738d3efffa","url":"config.js"},{"revision":"4fd9bceb782e158a7e27122cd76abf9c","url":"create.html"},{"revision":"0ffab517a21723a5e2c8a137db3eeba2","url":"create.js"},{"revision":"d28a2d2c9a45cad124c2b48a0c0f97f0","url":"images/img_1748190719933.jpeg"},{"revision":"e132b575609c82de363c405d543cf6dc","url":"images/img_1748190767897.jpeg"},{"revision":"3c1b80e17ed275aa5d8188cfbcda4e6f","url":"images/img_1748190799993.jpeg"},{"revision":"6705379f15d03b4ea7a3f4d60620196d","url":"images/img_1748190826701.jpeg"},{"revision":"eea7812221b58632768908435c3268d4","url":"images/img_1748190860989.jpeg"},{"revision":"c9485ab0162f495d8f4d4924bacd39f4","url":"images/img_1748190894990.jpeg"},{"revision":"c0653756d0f7a7232ec78da0cce41598","url":"images/img_1748190916525.jpeg"},{"revision":"89d7f58c676366887a1b7f76592b11c5","url":"images/img_1748190930116.jpeg"},{"revision":"851e7da57337ca4b2cb24e829f328b86","url":"images/img_1748190948877.jpeg"},{"revision":"1f68c6c2c65973a10a3198050ad6fc5f","url":"images/img_1748190964448.jpeg"},{"revision":"99b1791ed6fbca8a89917d3a61d5824e","url":"images/img_1748190992502.jpeg"},{"revision":"50293574a935e67ce2bae5dc03f570fe","url":"images/img_1748191010843.jpeg"},{"revision":"267e4451c5e08254d67fcdc7a2f0f314","url":"images/img_1748191031978.jpeg"},{"revision":"4446bddad7803547bb51640c5e574c7d","url":"images/img_1748361786818.jpeg"},{"revision":"417fd8ea158d9cb28d2756cb9c704d33","url":"images/img_1748361832109.jpeg"},{"revision":"c0cdd7f47581bd866a03a9bad7505968","url":"images/img_1748361857819.jpeg"},{"revision":"1fed6884f4b4c61e96d8cc27f925d7cd","url":"images/img_1748361889432.jpeg"},{"revision":"55b7110f2a44d09565726b59b405289d","url":"images/img_1748361912154.jpeg"},{"revision":"f607fd187b66ba7fdf0c3a7f4cab3587","url":"images/img_1748361940181.jpeg"},{"revision":"4314eb118c1972b12c3478a930f3a897","url":"images/img_1748505878815.jpeg"},{"revision":"4625d9ee705836af80e077cd2bad7f54","url":"images/img_1748506761136.jpeg"},{"revision":"6d18b1bd5d7b2f889cf6b8fe496c2910","url":"images/img_1748510827741.jpeg"},{"revision":"0ad207da7bf4a9eed589e8e410297747","url":"images/placeholder.png"},{"revision":"95139fee619bd454a51b5219ab305e8b","url":"index.html"},{"revision":"5ca5daaceb7d14d55bd533e5b302f982","url":"js/api.js"},{"revision":"b97a723fa2fe30d9373147be041adf98","url":"js/storage.js"},{"revision":"1203ee26e84e0eba57b1e43d549bc584","url":"js/sync.js"},{"revision":"ede22ac0072f096501171ddfb00e2481","url":"leafAnimations.js"},{"revision":"e4a7f43de79af8d31cfdefa01f989df0","url":"locations.html"},{"revision":"5a887657aec54cd8d7fdf53122c3845b","url":"locations.js"},{"revision":"21d03b5edc2dd02fafc3cae31cd53d3f","url":"offline.js"},{"revision":"aa43a2111ca114a4cb513a58fdbdab1d","url":"offlineData.js"},{"revision":"8dfc38aac9dc76c1346f9fb5da5841c9","url":"plant.html"},{"revision":"518f62dba9c08a9da5f18e6764bd39b4","url":"plant.js"},{"revision":"e2a610de54ab2a7fd7940b64e3360334","url":"script.js"},{"revision":"2f30956bddc65095a92730057653075f","url":"styles.css"}]);

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

