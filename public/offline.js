const OFFLINE_QUEUE_KEY = 'offlineQueue';
const OFFLINE_PLANTS_KEY = 'offlinePlants';
const OFFLINE_LOCATIONS_KEY = 'offlineLocations';

function loadQueue() {
    try { return JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY)) || []; }
    catch { return []; }
}

function saveQueue(q) {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(q));
}

function queueRequest(method, url, body) {
    const q = loadQueue();
    q.push({ method, url, body });
    saveQueue(q);
}

async function processQueue() {
    if (!navigator.onLine) return false;
    const q = loadQueue();
    const remaining = [];
    for (const req of q) {
        try {
            const res = await fetch(req.url, {
                method: req.method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(req.body)
            });
            if (!res.ok) throw new Error('failed');
        } catch (err) {
            remaining.push(req);
        }
    }
    saveQueue(remaining);
    return remaining.length === 0;
}

window.addEventListener('online', processQueue);

function loadOfflinePlants() {
    try { return JSON.parse(localStorage.getItem(OFFLINE_PLANTS_KEY)) || []; }
    catch { return []; }
}

function saveOfflinePlants(plants) {
    localStorage.setItem(OFFLINE_PLANTS_KEY, JSON.stringify(plants));
}

function upsertOfflinePlant(plant) {
    const plants = loadOfflinePlants();
    const idx = plants.findIndex(p => p.name === plant.name);
    if (idx !== -1) {
        plants[idx] = { ...plants[idx], ...plant };
    } else {
        plants.push(plant);
    }
    saveOfflinePlants(plants);
}

function getOfflinePlant(name) {
    return loadOfflinePlants().find(p => p.name === name);
}

function loadOfflineLocations() {
    try { return JSON.parse(localStorage.getItem(OFFLINE_LOCATIONS_KEY)) || []; }
    catch { return []; }
}

function saveOfflineLocations(locs) {
    localStorage.setItem(OFFLINE_LOCATIONS_KEY, JSON.stringify(locs));
}

window.offlineHelpers = { queueRequest, processQueue, loadOfflinePlants, saveOfflinePlants, upsertOfflinePlant, getOfflinePlant, loadOfflineLocations, saveOfflineLocations };
