import { flushQueue, cachePlants, readPlants } from './storage.js';
import { api } from './api.js';

let renderer = null;
export function setRenderer(fn){ renderer = fn; }

async function pushOp(op){ await api(op.method, op.url, op.body); }

export async function sync(renderFn = renderer){
  await flushQueue(pushOp);

  // 1️⃣  get local snapshot
  const local = await readPlants();
  const map   = new Map(local.map(p => [p.uuid, p]));

  // 2️⃣  pull deltas
  const changed = await api('GET', `/plants/changes?since=${localStorage.lastSynced || 0}`);
  if (changed.offline){
    if (renderFn) renderFn(local);
    return;
  }

  // 3️⃣  merge: add new or newer items
  changed.plants.forEach(p => {
    const old = map.get(p.uuid);
    if (!old || old.updatedAt < p.updatedAt) map.set(p.uuid, p);
  });

  // 4️⃣  write back + bump timestamp
  const merged = Array.from(map.values());
  await cachePlants(merged);
  localStorage.lastSynced = Date.now();

  // 5️⃣  refresh UI without flicker
  if (renderFn) renderFn(merged);
}

window.addEventListener('online', () => sync());
