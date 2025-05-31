import { api } from './js/api.js';
import { readLocations, cacheLocations } from './js/storage.js';
import { sync } from './js/sync.js';

document.addEventListener('DOMContentLoaded', () => {
    const listElem = document.getElementById('locations-list');
    const newInput = document.getElementById('new-location');
    const addBtn = document.getElementById('add-location');

    const render = (locs) => {
        listElem.innerHTML = '';
        locs.forEach(loc => {
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center';
            li.textContent = loc;
            const del = document.createElement('button');
            del.className = 'btn btn-sm btn-danger';
            del.textContent = 'Delete';
            del.onclick = async () => {
                const res = await api('DELETE', `/locations/${encodeURIComponent(loc)}`);
                if (!res.offline) load();
            };
            li.appendChild(del);
            listElem.appendChild(li);
        });
    };

    const load = async () => {
        // TODO-OFFLINE: replace the entire fetch block below with `api('GET', '/locations')`
        const cached = await readLocations();
        render(cached);
        const data = await api('GET', '/locations');
        if (!data.offline) {
            await cacheLocations(data);
            render(data);
        }
    };

    const add = async () => {
        const name = newInput.value.trim();
        if (!name) return;
        await api('POST', '/locations', { name });
        newInput.value = '';
        load();
    };

    addBtn.addEventListener('click', add);
    load().then(sync);
});
