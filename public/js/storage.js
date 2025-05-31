import localforage from 'localforage';

localforage.config({ name: 'PlantCareTracker', storeName: 'pct' });
export const plantsStore = localforage.createInstance({ storeName: 'plants' });
export const locsStore   = localforage.createInstance({ storeName: 'locations' });
export const outbox      = localforage.createInstance({ storeName: 'outbox' });

export async function cachePlants(arr){ await plantsStore.setItem('all', arr); }
export async function readPlants(){ return (await plantsStore.getItem('all')) ?? []; }
export async function cacheLocations(arr){ await locsStore.setItem('all', arr); }
export async function readLocations(){ return (await locsStore.getItem('all')) ?? []; }
export async function queue(op){                // op = {method, url, body, ts}
  const q = (await outbox.getItem('ops')) ?? [];
  q.push(op); await outbox.setItem('ops', q);
}
export async function flushQueue(syncFn){
  const q = (await outbox.getItem('ops')) ?? [];
  for (const op of q){ await syncFn(op); }
  await outbox.setItem('ops', []);
}
