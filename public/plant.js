document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    let name = params.get('name');
    if (!name) return;

    const incomingDir = localStorage.getItem('transitionDirection');
    if (incomingDir) {
        document.body.classList.add(`slide-in-${incomingDir}`);
        localStorage.removeItem('transitionDirection');
    }

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
    const loadingLeaf = document.getElementById('loading-leaf');
    let leafInterval;
    let leafX = 0;
    let leafY = 0;

    const moveLeaf = () => {
        const maxX = window.innerWidth - 40;
        const maxY = window.innerHeight - 40;
        const newX = Math.random() * maxX;
        const newY = Math.random() * maxY;

        const trail = document.createElement('img');
        trail.src = loadingLeaf.src;
        trail.className = 'leaf-trail';
        trail.style.transform = `translate(${leafX}px, ${leafY}px)`;
        loadingElem.appendChild(trail);
        setTimeout(() => trail.remove(), 1000);

        leafX = newX;
        leafY = newY;
        loadingLeaf.style.transform = `translate(${newX}px, ${newY}px) rotate(${Math.random()*360}deg)`;
    };

    const startLeafAnimation = () => {
        moveLeaf();
        leafInterval = setInterval(moveLeaf, 800);
    };

    const stopLeafAnimation = () => {
        clearInterval(leafInterval);
    };

    const autoResize = () => {
        descElem.style.height = 'auto';
        descElem.style.height = descElem.scrollHeight + 'px';
    };

    let imageData = null;
    let editing = false;
    let plantNames = [];

    const resizeImage = (file) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const size = 600;
                const canvas = document.createElement('canvas');
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext('2d');
                const min = Math.min(img.width, img.height);
                const sx = (img.width - min) / 2;
                const sy = (img.height - min) / 2;
                ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
                resolve(canvas.toDataURL('image/jpeg', 0.8));
            };
            img.onerror = reject;
            img.src = URL.createObjectURL(file);
        });
    };
    const plantCache = {};

    const fetchPlant = async (plantName) => {
        if (plantCache[plantName]) return plantCache[plantName];
        const res = await fetch(`/plants/${encodeURIComponent(plantName)}`);
        if (res.ok) {
            const plant = await res.json();
            plantCache[plantName] = plant;
            return plant;
        }
        return null;
    };

    const transitionToPlant = async (targetName, dir) => {
        if (targetName === name) return;
        const incoming = dir === 'left' ? 'right' : 'left';
        document.body.classList.add(`slide-out-${dir}`);
        const plantPromise = fetchPlant(targetName);
        setTimeout(async () => {
            const plant = await plantPromise;
            if (!plant) return;
            history.pushState({}, '', `plant.html?name=${encodeURIComponent(targetName)}`);
            name = targetName;
            displayPlant(plant);
            updateNavLinks();
            document.body.classList.remove(`slide-out-${dir}`);
            document.body.classList.add(`slide-in-${incoming}`);
            setTimeout(() => document.body.classList.remove(`slide-in-${incoming}`), 200);
        }, 200);
    };

    if (imageFileElem) {
        imageFileElem.addEventListener('change', async () => {
            const file = imageFileElem.files[0];
            if (!file) { imageData = null; return; }
            try {
                imageData = await resizeImage(file);
                imageElem.src = imageData;
            } catch (e) {
                console.error('Image resize failed', e);
            }
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

    const displayPlant = (plant) => {
        plantNameElem.textContent = plant.name;
        imageElem.src = plant.image;
        descElem.value = plant.description || '';
        autoResize();
        (plant.wateringFreq || []).forEach((val, i) => { if (wateringInputs[i]) wateringInputs[i].value = val; });
        (plant.feedingFreq || []).forEach((val, i) => { if (feedingInputs[i]) feedingInputs[i].value = val; });
        archiveBtn.disabled = !!plant.archived;
    };

    const loadPlantNames = async () => {
        const res = await fetch('/plants');
        if (res.ok) {
            const list = await res.json();
            plantNames = list.map(p => p.name);
        }
    };

    const preloaded = new Set();

    const preloadImage = async (plantName) => {
        if (preloaded.has(plantName)) return;
        try {
            const plant = await fetchPlant(plantName);
            if (plant) {
                const img = new Image();
                img.src = plant.image;
                preloaded.add(plantName);
            }
        } catch (err) {
            console.error('Preload failed', err);
        }
    };

    const updateNavLinks = () => {
        if (plantNames.length === 0) return;
        const idx = plantNames.indexOf(name);
        const prevName = plantNames[(idx - 1 + plantNames.length) % plantNames.length];
        const nextName = plantNames[(idx + 1) % plantNames.length];
        prevBtn.onclick = () => {
            transitionToPlant(prevName, 'right');
        };
        nextBtn.onclick = () => {
            transitionToPlant(nextName, 'left');
        };
        preloadImage(prevName);
        preloadImage(nextName);
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

    const load = async (plantName) => {
        const plant = await fetchPlant(plantName);
        if (plant) {
            name = plantName;
            displayPlant(plant);
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
        startLeafAnimation();
        identifyBtn.disabled = true;
        const res = await fetch('/identify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: imageElem.getAttribute('src') })
        });
        stopLeafAnimation();
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
    initSwipe();
    await load(name);
    updateNavLinks();
});
