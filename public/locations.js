import { api } from './js/api.js';
import { readLocations, cacheLocations } from './js/storage.js';

document.addEventListener('DOMContentLoaded', () => {
    const listElem = document.getElementById('locations-list');
    const newInput = document.getElementById('new-location');
    const addBtn = document.getElementById('add-location');
    let offline = !navigator.onLine;

    const render = (locs) => {
        const unique = Array.from(new Set(locs)).filter(Boolean);
        if (unique.length === 0) unique.push('Default');
        listElem.innerHTML = '';
        unique.forEach(loc => {
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center';
            li.textContent = loc;
            const del = document.createElement('button');
            del.className = 'btn btn-sm btn-danger';
            del.textContent = 'Delete';
            del.disabled = offline;
            del.onclick = async () => {
                if (offline) return;
                try {
                    const res = await api('DELETE', `/locations/${encodeURIComponent(loc)}`);
                    if (!res.offline) load();
                } catch (err) {
                    console.error('Failed to delete location', err);
                }
            };
            li.appendChild(del);
            listElem.appendChild(li);
        });
        applyOfflineState();
    };

    const load = async () => {
        // TODO-OFFLINE: replace the entire fetch block below with `api('GET', '/locations')`
        const cached = await readLocations();
        render(cached);
        try {
            const data = await api('GET', '/locations');
            if (!data.offline) {
                await cacheLocations(data);
                render(data);
            }
        } catch (err) {
            console.error('Failed to load locations', err);
        }
    };

    const add = async () => {
        if (offline) return;
        const name = newInput.value.trim();
        if (!name) return;
        try {
            await api('POST', '/locations', { name });
            newInput.value = '';
            load();
        } catch (err) {
            console.error('Failed to add location', err);
        }
    };

    const applyOfflineState = () => {
        addBtn.disabled = offline;
        newInput.disabled = offline;
        document.querySelectorAll('#locations-list button').forEach(btn => btn.disabled = offline);
    };

    document.addEventListener('offline-state-changed', (e) => {
        offline = e.detail.offline;
        applyOfflineState();
    });

    addBtn.addEventListener('click', add);
    applyOfflineState();
    load();
});
