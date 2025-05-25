document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const name = params.get('name');
    if (!name) return;

    const plantNameElem = document.getElementById('plant-name');
    const imageElem = document.getElementById('plant-image');
    const imageFileElem = document.getElementById('imageFile');
    const descElem = document.getElementById('description');
    const descViewElem = document.getElementById('description-view');
    const imageUploadElem = document.getElementById('image-upload');
    const toggleBtn = document.getElementById('toggle-edit');
    const quickInfoElem = document.getElementById('quick-info');
    let editing = false;
    let imageData = null;

    if (imageFileElem) {
        imageFileElem.addEventListener('change', () => {
            const file = imageFileElem.files[0];
            if (!file) { imageData = null; return; }
            const reader = new FileReader();
            reader.onload = () => {
                imageData = reader.result;
                imageElem.src = imageData;
            };
            reader.readAsDataURL(file);
        });
    }
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const scheduleBody = document.querySelector('#schedule-table tbody');
    const wateringInputs = [];
    const feedingInputs = [];
    months.forEach((m, i) => {
        const tr = document.createElement('tr');
        const tdMonth = document.createElement('td');
        tdMonth.textContent = m;
        const tdWater = document.createElement('td');
        const waterInput = document.createElement('input');
        waterInput.type = 'number';
        waterInput.className = 'form-control form-control-sm';
        waterInput.id = `watering-${i}`;
        tdWater.appendChild(waterInput);
        const tdFeed = document.createElement('td');
        const feedInput = document.createElement('input');
        feedInput.type = 'number';
        feedInput.className = 'form-control form-control-sm';
        feedInput.id = `feeding-${i}`;
        tdFeed.appendChild(feedInput);
        tr.append(tdMonth, tdWater, tdFeed);
        scheduleBody.appendChild(tr);
        wateringInputs.push(waterInput);
        feedingInputs.push(feedInput);
    });
    const saveBtn = document.getElementById('save');
    const archiveBtn = document.getElementById('archive');
    const messageElem = document.getElementById('message');

    const showMessage = (msg, type = 'success') => {
        messageElem.textContent = msg;
        messageElem.className = `alert alert-${type}`;
        messageElem.classList.remove('d-none');
        setTimeout(() => messageElem.classList.add('d-none'), 3000);
    };

    const setEditingMode = (enabled) => {
        editing = enabled;
        descElem.parentElement.classList.toggle('d-none', !enabled);
        imageUploadElem.classList.toggle('d-none', !enabled);
        saveBtn.classList.toggle('d-none', !enabled);
        descViewElem.classList.toggle('d-none', enabled);
        wateringInputs.forEach(i => i.disabled = !enabled);
        feedingInputs.forEach(i => i.disabled = !enabled);
        toggleBtn.textContent = enabled ? 'View' : 'Edit';
    };

    const load = async () => {
        const res = await fetch(`/plants/${encodeURIComponent(name)}`);
        if (res.ok) {
            const plant = await res.json();
            plantNameElem.textContent = plant.name;
            imageElem.src = plant.image;
            descElem.value = plant.description || '';
            descViewElem.textContent = plant.description || '';
            (plant.wateringFreq || []).forEach((val, i) => {
                if (wateringInputs[i]) wateringInputs[i].value = val;
            });
            (plant.feedingFreq || []).forEach((val, i) => {
                if (feedingInputs[i]) feedingInputs[i].value = val;
            });
            archiveBtn.disabled = !!plant.archived;
            quickInfoElem.innerHTML =
                '<span class="badge bg-success">\uD83C\uDF3F Safe for cats</span>' +
                ' <span class="badge bg-warning text-dark">\u2600\uFE0F Bright light</span>' +
                ' <span class="badge bg-info text-dark">\uD83D\uDCA7 Water weekly</span>';
        }
    };

    const save = async () => {
        const body = {
            description: descElem.value,
            wateringFreq: wateringInputs.map(input => parseInt(input.value, 10) || 0),
            feedingFreq: feedingInputs.map(input => parseInt(input.value, 10) || 0)
        };
        if (imageData) {
            body.imageData = imageData;
        }
        await fetch(`/plants/${encodeURIComponent(name)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        showMessage('Saved', 'success');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    };

    const archive = async () => {
        await fetch(`/plants/${encodeURIComponent(name)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ archived: true })
        });
        showMessage('Archived', 'success');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    };

    saveBtn.addEventListener('click', save);
    archiveBtn.addEventListener('click', archive);
    toggleBtn.addEventListener('click', () => setEditingMode(!editing));
    load().then(() => setEditingMode(false));
});
