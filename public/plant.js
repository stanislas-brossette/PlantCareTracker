document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const name = params.get('name');
    if (!name) return;

    const plantNameElem = document.getElementById('plant-name');
    const imageElem = document.getElementById('plant-image');
    const prevBtn = document.getElementById('prev-plant');
    const nextBtn = document.getElementById('next-plant');
    const imageFileElem = document.getElementById('imageFile');
    const descElem = document.getElementById('description');
    const scheduleBody = document.querySelector('#schedule-table tbody');
    const toggleBtn = document.getElementById('toggle-edit');
    const saveBtn = document.getElementById('save');
    const archiveBtn = document.getElementById('archive');
    const identifyBtn = document.getElementById('identify');
    const messageElem = document.getElementById('message');
    const loadingElem = document.getElementById('loading');

    const autoResize = () => {
        descElem.style.height = 'auto';
        descElem.style.height = descElem.scrollHeight + 'px';
    };

    let imageData = null;
    let editing = false;
    let plantNames = [];

    if (imageFileElem) {
        imageFileElem.addEventListener('change', () => {
            const file = imageFileElem.files[0];
            if (!file) { imageData = null; return; }
            const reader = new FileReader();
            reader.onload = () => { imageData = reader.result; imageElem.src = imageData; };
            reader.readAsDataURL(file);
        });
    }

    descElem.addEventListener('input', autoResize);

    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const wateringInputs = [];
    const feedingInputs = [];

    const createCell = (arr) => {
        const td = document.createElement('td');
        td.className = 'text-center schedule-cell';
        const minus = document.createElement('button');
        minus.type = 'button';
        minus.className = 'btn btn-sm btn-outline-secondary minus';
        minus.textContent = '-';
        const input = document.createElement('input');
        input.type = 'number';
        input.className = 'form-control d-inline-block value mx-1 text-center';
        input.style.width = '60px';
        const plus = document.createElement('button');
        plus.type = 'button';
        plus.className = 'btn btn-sm btn-outline-secondary plus';
        plus.textContent = '+';
        minus.addEventListener('click', () => { if(editing){ input.value = Math.max(0, parseInt(input.value || 0) - 1); } });
        plus.addEventListener('click', () => { if(editing){ input.value = parseInt(input.value || 0) + 1; } });
        td.appendChild(minus);
        td.appendChild(input);
        td.appendChild(plus);
        arr.push(input);
        return td;
    };

    months.forEach((m) => {
        const tr = document.createElement('tr');
        const monthTd = document.createElement('td');
        monthTd.textContent = m;
        tr.appendChild(monthTd);
        tr.appendChild(createCell(wateringInputs));
        tr.appendChild(createCell(feedingInputs));
        scheduleBody.appendChild(tr);
    });

    const setEditing = (state) => {
        editing = state;
        descElem.readOnly = !state;
        imageFileElem.classList.toggle('d-none', !state);
        saveBtn.classList.toggle('d-none', !state);
        archiveBtn.classList.toggle('d-none', !state);
        document.querySelectorAll('#schedule-table input').forEach(i => i.readOnly = !state);
        document.querySelectorAll('#schedule-table .minus, #schedule-table .plus').forEach(btn => btn.classList.toggle('d-none', !state));
        toggleBtn.textContent = state ? 'View' : 'Edit';
        autoResize();
    };

    const showMessage = (msg, type = 'success') => {
        messageElem.textContent = msg;
        messageElem.className = `alert alert-${type}`;
        messageElem.classList.remove('d-none');
        setTimeout(() => messageElem.classList.add('d-none'), 3000);
    };

    const loadPlantNames = async () => {
        const res = await fetch('/plants');
        if (res.ok) {
            const list = await res.json();
            plantNames = list.map(p => p.name);
        }
    };

    const updateNavLinks = () => {
        if (plantNames.length === 0) return;
        const idx = plantNames.indexOf(name);
        const prevName = plantNames[(idx - 1 + plantNames.length) % plantNames.length];
        const nextName = plantNames[(idx + 1) % plantNames.length];
        prevBtn.onclick = () => { window.location.href = `plant.html?name=${encodeURIComponent(prevName)}`; };
        nextBtn.onclick = () => { window.location.href = `plant.html?name=${encodeURIComponent(nextName)}`; };
    };

    const initSwipe = () => {
        let startX = 0;
        document.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                startX = e.touches[0].clientX;
            }
        });
        document.addEventListener('touchend', (e) => {
            const dx = e.changedTouches[0].clientX - startX;
            if (Math.abs(dx) > 50) {
                if (dx < 0) {
                    nextBtn.click();
                } else {
                    prevBtn.click();
                }
            }
        });
    };

    const load = async () => {
        const res = await fetch(`/plants/${encodeURIComponent(name)}`);
        if (res.ok) {
            const plant = await res.json();
            plantNameElem.textContent = plant.name;
            imageElem.src = plant.image;
            descElem.value = plant.description || '';
            autoResize();
            (plant.wateringFreq || []).forEach((val, i) => { if (wateringInputs[i]) wateringInputs[i].value = val; });
            (plant.feedingFreq || []).forEach((val, i) => { if (feedingInputs[i]) feedingInputs[i].value = val; });
            archiveBtn.disabled = !!plant.archived;
        }
        setEditing(false);
    };

    const save = async () => {
        const body = {
            description: descElem.value,
            wateringFreq: wateringInputs.map(input => parseInt(input.value, 10) || 0),
            feedingFreq: feedingInputs.map(input => parseInt(input.value, 10) || 0)
        };
        if (imageData) { body.imageData = imageData; }
        await fetch(`/plants/${encodeURIComponent(name)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        showMessage('Saved', 'success');
        setTimeout(() => { window.location.href = 'index.html'; }, 1000);
    };

    const updateDescription = async (text) => {
        await fetch(`/plants/${encodeURIComponent(name)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ description: text })
        });
        showMessage('Description updated', 'success');
    };

    const archive = async () => {
        await fetch(`/plants/${encodeURIComponent(name)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ archived: true })
        });
        showMessage('Archived', 'success');
        setTimeout(() => { window.location.href = 'index.html'; }, 1000);
    };

    const identify = async () => {
        loadingElem.classList.remove('d-none');
        identifyBtn.disabled = true;
        const res = await fetch('/identify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: imageElem.getAttribute('src') })
        });
        loadingElem.classList.add('d-none');
        identifyBtn.disabled = false;
        if (res.ok) {
            const data = await res.json();
            try { await navigator.clipboard.writeText(data.answer); } catch(e) {}
            if (confirm(`${data.answer}\n\nMettre à jour la description ?`)) {
                descElem.value = data.answer;
                autoResize();
                await updateDescription(data.answer);
            }
        } else {
            alert('Error identifying plant');
        }
    };

    toggleBtn.addEventListener('click', () => setEditing(!editing));
    saveBtn.addEventListener('click', save);
    archiveBtn.addEventListener('click', archive);
    if (identifyBtn) identifyBtn.addEventListener('click', identify);

    await loadPlantNames();
    updateNavLinks();
    initSwipe();
    setEditing(false);
    await load();
});
