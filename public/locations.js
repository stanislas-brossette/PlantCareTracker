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
                const res = await fetch(`/locations/${encodeURIComponent(loc)}`, { method: 'DELETE' });
                if (res.ok) load();
            };
            li.appendChild(del);
            listElem.appendChild(li);
        });
    };

    const load = async () => {
        const res = await fetch('/locations');
        const data = await res.json();
        render(data);
    };

    const add = async () => {
        const name = newInput.value.trim();
        if (!name) return;
        await fetch('/locations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        newInput.value = '';
        load();
    };

    addBtn.addEventListener('click', add);
    load();
});
