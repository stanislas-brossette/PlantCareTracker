document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const name = params.get('name');
    if (!name) return;

    const plantNameElem = document.getElementById('plant-name');
    const imageElem = document.getElementById('plant-image');
    const descElem = document.getElementById('description');
    const wateringElem = document.getElementById('watering');
    const feedingElem = document.getElementById('feeding');
    const saveBtn = document.getElementById('save');
    const archiveBtn = document.getElementById('archive');

    const load = async () => {
        const res = await fetch(`/plants/${encodeURIComponent(name)}`);
        if (res.ok) {
            const plant = await res.json();
            plantNameElem.textContent = plant.name;
            imageElem.src = plant.image;
            descElem.value = plant.description || '';
            wateringElem.value = (plant.wateringFreq || []).join(',');
            feedingElem.value = (plant.feedingFreq || []).join(',');
            archiveBtn.disabled = !!plant.archived;
        }
    };

    const save = async () => {
        const body = {
            description: descElem.value,
            wateringFreq: wateringElem.value.split(',').map(n => parseInt(n.trim(), 10)),
            feedingFreq: feedingElem.value.split(',').map(n => parseInt(n.trim(), 10))
        };
        await fetch(`/plants/${encodeURIComponent(name)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        alert('Saved');
    };

    const archive = async () => {
        await fetch(`/plants/${encodeURIComponent(name)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ archived: true })
        });
        alert('Archived');
        window.location.href = 'index.html';
    };

    saveBtn.addEventListener('click', save);
    archiveBtn.addEventListener('click', archive);
    load();
});
