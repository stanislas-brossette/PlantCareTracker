const KEY_PLANTS = 'offlinePlants';
const KEY_LOCATIONS = 'offlineLocations';
const KEY_TIMES = 'offlineTimes';

function load(key, def) {
    try {
        const val = localStorage.getItem(key);
        return val ? JSON.parse(val) : def;
    } catch (e) {
        return def;
    }
}

function save(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        // ignore
    }
}

window.offlineData = {
    loadPlants: () => load(KEY_PLANTS, []),
    savePlants: (plants) => save(KEY_PLANTS, plants),
    loadPlant: (name) => {
        const plants = load(KEY_PLANTS, []);
        return plants.find(p => p.name === name);
    },
    savePlant: (plant) => {
        const plants = load(KEY_PLANTS, []);
        const idx = plants.findIndex(p => p.name === plant.name);
        if (idx !== -1) plants[idx] = plant; else plants.push(plant);
        save(KEY_PLANTS, plants);
    },
    loadLocations: () => load(KEY_LOCATIONS, []),
    saveLocations: (locs) => save(KEY_LOCATIONS, locs),
    loadTimes: () => load(KEY_TIMES, {}),
    saveTimes: (times) => save(KEY_TIMES, times)
};
