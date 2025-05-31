// Use global localforage if available (loaded via CDN).
// Fall back to a very small in-memory/localStorage based store so tests run
// without the actual library.
const lf = (typeof localforage !== 'undefined') ? localforage : (() => {
  const memory = {};
  const make = storeName => {
    const prefix = storeName + ':';
    return {
      async getItem(key){
        const k = prefix + key;
        const val = typeof localStorage !== 'undefined' ?
          localStorage.getItem(k) : memory[k];
        return val ? JSON.parse(val) : null;
      },
      async setItem(key,val){
        const k = prefix + key;
        if (typeof localStorage !== 'undefined')
          localStorage.setItem(k, JSON.stringify(val));
        memory[k] = JSON.stringify(val);
      }
    };
  };
  return { config(){}, createInstance: opts => make(opts.storeName) };
})();

lf.config({ name: 'PlantCareTracker', storeName: 'pct' });
export const plantsStore = lf.createInstance({ storeName: 'plants' });
export const locsStore   = lf.createInstance({ storeName: 'locations' });
export const outbox      = lf.createInstance({ storeName: 'outbox' });

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
