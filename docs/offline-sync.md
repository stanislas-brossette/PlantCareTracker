# Offline synchronisation

## IndexedDB schema (via localforage)
- `plants`: cached array of plant objects (with `id`, `name`, `location`, `updatedAt`, `archived`, `image`).
- `locations`: cached array of location names.
- `times`: cached `lastClickedTimes` object.
- `sync`: stores `{ lastServerRev, lastSyncAt }` metadata.
- `images`: blobs keyed by `"<plantId>:<updatedAt>"` for offline photos.

## /sync protocol
- `GET /sync?since=<rev>` returns:
  - `serverRev`: current server revision integer.
  - `plants`: `{ upsert: [...], deleted: [{id,name}, ...] }` where `upsert` contains full plant objects.
  - `locations`: `{ upsert: [...], deleted: [...] }` with location names.
  - `lastClickedTimes`: present on full sync or when the timestamp revision changed.
  - `images`: `{ changed: [{ plantId, image, updatedAt }], deleted: [...] }` to allow image cache refresh.
- When `since` is omitted the response includes a full snapshot.

## Client caching strategy
- Data access flows through `public/js/dataClient.js` which tries a short-timeout fetch first and falls back to cached data on failure, marking connectivity offline.
- `syncIfOnline()` calls `/sync` with the last known revision, applies upserts/deletions to the stores, refreshes image blobs, and updates `sync` metadata.
- `getPlantImage()` returns a blob URL from cache when available, otherwise downloads and caches the current image.

## Offline read-only behaviour
- Connectivity state is tracked in `public/js/connectivity.js` (navigator `online/offline` events plus failed fetch detection).
- In offline mode buttons that mutate data are disabled and an “Offline (lecture seule)” banner is shown.
- Mutating attempts while offline surface an “Indisponible hors-ligne” alert.

## Known limitations
- Image caching fetches serially on sync; very large libraries may take longer to warm the cache.
- The server keeps a simple tombstone list for deletions without compaction.
