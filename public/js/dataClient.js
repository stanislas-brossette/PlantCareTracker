import { cacheImage, cacheLocations, cachePlants, cacheSyncMeta, cacheTimes, readImage, readLocations, readPlants, readSyncMeta, readTimes } from './storage.js';
import { connectivity } from './connectivity.js';

function withBase(path){
    if (window.API_BASE){
        return window.API_BASE.replace(/\/$/, '') + path;
    }
    return path;
}

async function fetchWithTimeout(url, options = {}, timeout = 3000){
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const resp = await fetch(withBase(url), { ...options, signal: controller.signal });
        clearTimeout(id);
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        return resp;
    } catch (err){
        clearTimeout(id);
        throw err;
    }
}

async function safeGetJson(path){
    try {
        const res = await fetchWithTimeout(path);
        connectivity.setOnline();
        return await res.json();
    } catch (err){
        connectivity.setOffline();
        return { offline: true };
    }
}

async function cacheImages(changed){
    for (const item of changed){
        try {
            const res = await fetch(withBase('/' + (item.image || '').replace(/^\/+/, '')));
            if (!res.ok) continue;
            const blob = await res.blob();
            await cacheImage(`${item.plantId}:${item.updatedAt}`, blob);
        } catch (err){
            // ignore fetch errors for images
        }
    }
}

async function applySync(payload){
    const meta = await readSyncMeta();
    const currentPlants = await readPlants();
    const plantMap = new Map(currentPlants.map(p => [p.id || p.uuid || p.name, p]));

    if (payload.plants){
        (payload.plants.upsert || []).forEach(p => {
            const id = p.id || p.uuid || p.name;
            plantMap.set(id, { ...p, id });
        });
        (payload.plants.deleted || []).forEach(d => {
            const id = d.id || d.name;
            plantMap.delete(id);
        });
    }

    const merged = Array.from(plantMap.values());
    await cachePlants(merged);

    if (payload.locations){
        if (payload.locations.upsert && payload.locations.upsert.length){
            await cacheLocations(payload.locations.upsert);
        }
        if (payload.locations.deleted && payload.locations.deleted.length){
            const locs = await readLocations();
            const filtered = locs.filter(l => !payload.locations.deleted.includes(l));
            await cacheLocations(filtered);
        }
    }

    if (payload.lastClickedTimes){
        await cacheTimes(payload.lastClickedTimes);
    }

    if (payload.images && payload.images.changed){
        cacheImages(payload.images.changed);
    }

    await cacheSyncMeta({ lastServerRev: payload.serverRev || meta.lastServerRev, lastSyncAt: Date.now() });
}

export async function syncIfOnline(){
    const meta = await readSyncMeta();
    const since = meta.lastServerRev || 0;
    const payload = await safeGetJson(`/sync${since ? `?since=${since}` : ''}`);
    if (payload.offline) return false;
    await applySync(payload);
    return true;
}

export async function getPlants(){
    const cached = await readPlants();
    const remote = await safeGetJson('/plants');
    if (!remote.offline){
        await cachePlants(remote);
        return remote;
    }
    return cached;
}

export async function getLocations(){
    const cached = await readLocations();
    const remote = await safeGetJson('/locations');
    if (!remote.offline){
        await cacheLocations(remote);
        return remote;
    }
    return cached;
}

export async function getLastClickedTimes(){
    const cached = await readTimes();
    const remote = await safeGetJson('/lastClickedTimes');
    if (!remote.offline){
        await cacheTimes(remote);
        return remote;
    }
    return cached;
}

export async function getPlantImage(plant){
    const key = `${plant.id || plant.uuid || plant.name}:${plant.updatedAt || ''}`;
    const blob = await readImage(key);
    if (blob){
        return URL.createObjectURL(blob);
    }
    if (!connectivity.isOffline()){
        try {
            const res = await fetch(withBase('/' + (plant.image || '').replace(/^\/+/, '')));
            if (res.ok){
                const b = await res.blob();
                await cacheImage(key, b);
                return URL.createObjectURL(b);
            }
        } catch (err){
            // ignore
        }
    }
    return plant.image;
}
