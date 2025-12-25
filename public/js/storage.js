// IndexedDB helpers built on localforage
const lf = (typeof localforage !== 'undefined') ? localforage : (() => {
  const memory = {};
  const make = storeName => {
    const prefix = storeName + ':';
    return {
      async getItem(key){
        const k = prefix + key;
        const val = typeof localStorage !== 'undefined' ? localStorage.getItem(k) : memory[k];
        return val ? JSON.parse(val) : null;
      },
      async setItem(key,val){
        const k = prefix + key;
        const str = JSON.stringify(val);
        if (typeof localStorage !== 'undefined') localStorage.setItem(k, str);
        memory[k] = str;
      }
    };
  };
  return { config(){}, createInstance: opts => make(opts.storeName) };
})();

lf.config({ name: 'PlantCareTracker', storeName: 'pct' });
const plantsStore = lf.createInstance({ storeName: 'plants' });
const locsStore   = lf.createInstance({ storeName: 'locations' });
const timesStore  = lf.createInstance({ storeName: 'times' });

export async function getCachedPlants(){ return (await plantsStore.getItem('all')) ?? []; }
export async function saveCachedPlants(plants){ await plantsStore.setItem('all', plants); }

export async function getCachedLocations(){ return (await locsStore.getItem('all')) ?? []; }
export async function saveCachedLocations(locations){ await locsStore.setItem('all', locations); }

export async function getCachedTimes(){ return (await timesStore.getItem('all')) ?? {}; }
export async function saveCachedTimes(times){ await timesStore.setItem('all', times); }

// Backwards compatibility for existing modules
export const readPlants = getCachedPlants;
export const cachePlants = saveCachedPlants;
export const readLocations = getCachedLocations;
export const cacheLocations = saveCachedLocations;
