(function(){
    // Base URL of the backend API. Update if the server IP or port changes.
    window.API_BASE = window.API_BASE || 'http://192.168.1.123:3000';
    const origFetch = window.fetch.bind(window);

    async function handleOffline(url, init){
        const path = new URL(url, window.API_BASE).pathname;
        if (path === '/plants' && init?.method === 'POST') {
            const plant = JSON.parse(init?.body || '{}');
            await window.offlineCache.savePlant(plant);
            await window.offlineCache.queueRequest('/plants', {method:'POST', headers:{'Content-Type':'application/json'}, body:init.body});
            return new Response(JSON.stringify(plant), { status: 201, headers:{'Content-Type':'application/json'} });
        }
        if (path === '/plants') {
            const data = await window.offlineCache.getPlants();
            if (data) return new Response(JSON.stringify(data), { headers: {'Content-Type':'application/json'} });
        }
        const plantMatch = path.match(/^\/plants\/(.+)$/);
        if (plantMatch) {
            const name = decodeURIComponent(plantMatch[1]);
            const list = await window.offlineCache.getPlants();
            if (Array.isArray(list)) {
                const plant = list.find(p => p.name === name);
                if (plant) {
                    return new Response(JSON.stringify(plant), { headers: {'Content-Type':'application/json'} });
                }
            }
        }
        if (path === '/locations') {
            const data = await window.offlineCache.getLocations();
            if (data) return new Response(JSON.stringify(data), { headers: {'Content-Type':'application/json'} });
        }
        if (path === '/lastClickedTimes') {
            const data = await window.offlineCache.getTimes();
            if (data) return new Response(JSON.stringify(data), { headers: {'Content-Type':'application/json'} });
        }
        if (path === '/clicked') {
            const body = JSON.parse(init?.body || '{}');
            const now = new Date().toISOString();
            await window.offlineCache.updateTime(body.buttonId, now);
            await window.offlineCache.queueRequest('/clicked', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({buttonId: body.buttonId}) });
            return new Response(JSON.stringify({ lastClickedTime: now }), { headers: {'Content-Type':'application/json'} });
        }
        if (path === '/undo') {
            const body = JSON.parse(init?.body || '{}');
            await window.offlineCache.updateTime(body.buttonId, body.previousTime);
            await window.offlineCache.queueRequest('/undo', { method:'POST', headers:{'Content-Type':'application/json'}, body: init.body });
            return new Response(JSON.stringify({ lastClickedTime: body.previousTime || null }), { headers: {'Content-Type':'application/json'} });
        }
        return Promise.reject('offline');
    }

    window.fetch = async function(input, init){
        try {
            if (typeof input === 'string' && input.startsWith('/')) {
                input = window.API_BASE + input;
            } else if (input instanceof Request && input.url.startsWith('/')) {
                input = new Request(window.API_BASE + input.url, input);
            }
        } catch (e) {}

        if (!navigator.onLine) {
            try {
                return await handleOffline(typeof input === 'string' ? input : input.url, init);
            } catch(e){}
        }

        const res = await origFetch(input, init);
        const path = new URL(typeof input === 'string' ? input : input.url).pathname;
        if (navigator.onLine && res.ok) {
            if (path === '/plants') {
                res.clone().json().then(window.offlineCache.savePlants).catch(()=>{});
            } else if (/^\/plants\/.+/.test(path)) {
                res.clone().json().then(window.offlineCache.savePlant).catch(()=>{});
            } else if (path === '/locations') {
                res.clone().json().then(window.offlineCache.saveLocations).catch(()=>{});
            } else if (path === '/lastClickedTimes') {
                res.clone().json().then(window.offlineCache.saveTimes).catch(()=>{});
            }
        }
        return res;
    };

    window.addEventListener('online', () => window.offlineCache.flushQueue());
})();
