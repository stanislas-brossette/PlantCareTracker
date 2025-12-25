import { api } from './js/api.js';
import { readLocations, cacheLocations } from './js/storage.js';
import { sync } from './js/sync.js';

document.addEventListener('DOMContentLoaded', () => {
    const listElem = document.getElementById('locations-list');
    const newInput = document.getElementById('new-location');
    const addBtn = document.getElementById('add-location');

    const isReadOnly = () => window.offlineUI?.isOffline() ?? false;
    const guardMutation = () => {
        if (isReadOnly()) {
            window.offlineUI?.showReadOnlyMessage();
            return true;
        }
        return false;
    };

    const applyOfflineState = (state) => {
        const disabled = !!state;
        if (addBtn) {
            addBtn.disabled = disabled;
            addBtn.classList.toggle('offline-disabled', disabled);
        }
        document.querySelectorAll('#locations-list button').forEach(btn => {
            btn.disabled = disabled;
            btn.classList.toggle('offline-disabled', disabled);
        });
    };
    window.offlineUI?.onStatusChange(applyOfflineState);

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
            del.onclick = async () => {
                if (guardMutation()) return;
                try {
                    await api('DELETE', `/api/locations/${encodeURIComponent(loc)}`);
                    load();
                } catch (err) {
                    console.error('Failed to delete location', err);
                }
            };
            li.appendChild(del);
            listElem.appendChild(li);
        });
        applyOfflineState(isReadOnly());
    };

    const load = async () => {
        const cached = await readLocations();
        render(cached);
        try {
            const data = await api('GET', '/api/locations');
            await cacheLocations(data);
            render(data);
        } catch (err) {
            console.error('Failed to load locations', err);
        }
    };

    const add = async () => {
        const name = newInput.value.trim();
        if (!name) return;
        if (guardMutation()) return;
        try {
            await api('POST', '/api/locations', { name });
            newInput.value = '';
            load();
        } catch (err) {
            console.error('Failed to add location', err);
        }
    };

    addBtn.addEventListener('click', add);
    load().then(sync);
});
