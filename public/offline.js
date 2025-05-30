(function(){
    const plugins = window.Capacitor ? window.Capacitor.Plugins || {} : {};
    const Storage = plugins.Storage;
    const Filesystem = plugins.Filesystem;
    const Directory = plugins.Directory || plugins.FilesystemDirectory || (window.Capacitor && window.Capacitor.FilesystemDirectory) || 'DATA';

    const KEYS = {
        plants: 'offline_plants',
        locations: 'offline_locations',
        times: 'offline_times',
        queue: 'offline_queue'
    };

    async function toBase64(blob){
        return await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    async function cacheInitial(){
        if (!Storage || !Filesystem) return;
        try {
            const [pRes, lRes, tRes] = await Promise.all([
                fetch('/plants'),
                fetch('/locations'),
                fetch('/lastClickedTimes')
            ]);
            let plants = await pRes.json();
            const locs = await lRes.json();
            const times = await tRes.json();

            plants = await Promise.all(plants.map(async p => {
                if (p.image && !/^data:/.test(p.image) && !/^https?:/.test(p.image)) {
                    try {
                        const url = (window.API_BASE || '').replace(/\/$/, '') + '/' + p.image.replace(/^\//,'');
                        const blob = await fetch(url).then(r => r.blob());
                        const dataUrl = await toBase64(blob);
                        const extMatch = /^data:image\/([^;]+);/.exec(dataUrl);
                        const ext = extMatch ? extMatch[1] : 'jpg';
                        const fileName = `plant_${encodeURIComponent(p.name)}.${ext}`;
                        await Filesystem.writeFile({ path: fileName, data: dataUrl.split(',')[1], directory: Directory });
                        const { uri } = await Filesystem.getUri({ path: fileName, directory: Directory });
                        p.image = uri;
                    } catch(err){ console.error('cache image', err); }
                }
                return p;
            }));

            await Storage.set({ key: KEYS.plants, value: JSON.stringify(plants) });
            await Storage.set({ key: KEYS.locations, value: JSON.stringify(locs) });
            await Storage.set({ key: KEYS.times, value: JSON.stringify(times) });
        } catch(e){
            console.error('offline cache init failed', e);
        }
    }

    async function get(key){
        if (!Storage) return null;
        const { value } = await Storage.get({ key });
        return value ? JSON.parse(value) : null;
    }
    async function set(key,val){
        if (!Storage) return;
        await Storage.set({ key, value: JSON.stringify(val) });
    }

    async function queueRequest(url, options){
        const q = await get(KEYS.queue) || [];
        q.push({ url, options });
        await set(KEYS.queue, q);
    }

    async function flushQueue(){
        const q = await get(KEYS.queue);
        if (!q || q.length === 0) return;
        const remaining = [];
        for (const item of q){
            try {
                await fetch(item.url, item.options);
            } catch(e){
                remaining.push(item);
            }
        }
        if (remaining.length === 0) {
            await Storage.remove({ key: KEYS.queue });
        } else {
            await set(KEYS.queue, remaining);
        }
    }

    async function updateTime(buttonId, time){
        const times = await get(KEYS.times) || {};
        if (time) times[buttonId] = time; else delete times[buttonId];
        await set(KEYS.times, times);
    }

    window.offlineCache = {
        init: cacheInitial,
        getPlants: () => get(KEYS.plants),
        getLocations: () => get(KEYS.locations),
        getTimes: () => get(KEYS.times),
        savePlants: val => set(KEYS.plants, val),
        saveLocations: val => set(KEYS.locations, val),
        saveTimes: val => set(KEYS.times, val),
        queueRequest,
        flushQueue,
        updateTime
    };

    if (navigator.onLine) cacheInitial();
    window.addEventListener('online', flushQueue);
})();
