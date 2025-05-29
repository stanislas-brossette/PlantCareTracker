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
    const plantNameInput = document.getElementById('plant-name-input');
    const imageElem = document.getElementById('plant-image');
    const prevBtn = document.getElementById('prev-plant');
    const nextBtn = document.getElementById('next-plant');
    const cameraFileElem = document.getElementById('cameraFile');
    const galleryFileElem = document.getElementById('galleryFile');
    const cameraBtn = document.getElementById('camera-btn');
    const galleryBtn = document.getElementById('gallery-btn');
    const descElem = document.getElementById('description');
    const descDisplay = document.getElementById('description-display');
    const locationSelect = document.getElementById('location-select');
    const addLocationBtn = document.getElementById('add-location');
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
    let identifying = false;

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

    const updateDescDisplay = () => {
        if (window.marked) {
            descDisplay.innerHTML = marked.parse(descElem.value || '');
        } else {
            descDisplay.textContent = descElem.value || '';
        }
    };

    let imageData = null;
    let editing = false;
    let plantNames = [];
    const currentLocation = localStorage.getItem('currentLocation') || 'All';

    const parseFreqValue = (val) => {
        const num = parseInt(val, 10);
        return isNaN(num) ? null : num;
    };

    const loadLocations = async () => {
        const res = await fetch('/locations');
        const list = await res.json();
        locationSelect.innerHTML = '';
        list.forEach(loc => {
            const opt = document.createElement('option');
            opt.value = loc;
            opt.textContent = loc;
            locationSelect.appendChild(opt);
        });
    };

    const addLocation = async () => {
        const name = prompt('New location name');
        if (!name) return;
        await fetch('/locations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        locationSelect.appendChild(opt);
        locationSelect.value = name;
    };

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

    const handleFileChange = async (input) => {
        const file = input.files[0];
        if (!file) { imageData = null; return; }
        try {
            imageData = await resizeImage(file);
            imageElem.src = imageData;
        } catch (e) {
            console.error('Image resize failed', e);
        }
    };

    if (cameraFileElem) {
        cameraFileElem.addEventListener('change', () => handleFileChange(cameraFileElem));
    }
    if (galleryFileElem) {
        galleryFileElem.addEventListener('change', () => handleFileChange(galleryFileElem));
    }

    if (cameraBtn) cameraBtn.addEventListener('click', () => cameraFileElem.click());
    if (galleryBtn) galleryBtn.addEventListener('click', () => galleryFileElem.click());

    descElem.addEventListener('input', autoResize);
    descElem.addEventListener('input', () => {
        if (!editing) updateDescDisplay();
    });

    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const wateringMinInputs = [];
    const wateringMaxInputs = [];
    const feedingMinInputs = [];
    const feedingMaxInputs = [];

    const createInputCell = (arr) => {
        const td = document.createElement('td');
        const group = document.createElement('div');
        group.className = 'input-group input-group-sm';

        const minus = document.createElement('button');
        minus.type = 'button';
        minus.textContent = '-';
        minus.className = 'btn btn-outline-secondary btn-sm adjust-btn d-none';

        const input = document.createElement('input');
        input.type = 'number';
        input.className = 'form-control text-center';

        const plus = document.createElement('button');
        plus.type = 'button';
        plus.textContent = '+';
        plus.className = 'btn btn-outline-secondary btn-sm adjust-btn d-none';

        group.appendChild(minus);
        group.appendChild(input);
        group.appendChild(plus);
        td.appendChild(group);

        minus.addEventListener('click', () => {
            if (input.readOnly) return;
            let val = parseFreqValue(input.value);
            val = (val === null ? 0 : val) - 1;
            if (val < 0) val = 0;
            input.value = val;
            input.dispatchEvent(new Event('input'));
        });

        plus.addEventListener('click', () => {
            if (input.readOnly) return;
            let val = parseFreqValue(input.value);
            val = (val === null ? 0 : val) + 1;
            input.value = val;
            input.dispatchEvent(new Event('input'));
        });

        arr.push(input);
        return td;
    };

    months.forEach((m) => {
        const tr = document.createElement('tr');
        const monthTd = document.createElement('td');
        monthTd.textContent = m;
        tr.appendChild(monthTd);
        tr.appendChild(createInputCell(wateringMinInputs));
        tr.appendChild(createInputCell(wateringMaxInputs));
        tr.appendChild(createInputCell(feedingMinInputs));
        tr.appendChild(createInputCell(feedingMaxInputs));
        scheduleBody.appendChild(tr);
    });

    const enforcePair = (minInput, maxInput) => {
        const minVal = parseFreqValue(minInput.value);
        const maxVal = parseFreqValue(maxInput.value);
        if (minVal !== null && maxVal !== null && minVal > maxVal) {
            maxInput.value = minVal;
        }
    };

    const attachPairListeners = (minArr, maxArr) => {
        minArr.forEach((minInput, idx) => {
            const maxInput = maxArr[idx];
            minInput.addEventListener('input', () => {
                if (editing) enforcePair(minInput, maxInput);
            });
            maxInput.addEventListener('input', () => {
                if (editing) enforcePair(minInput, maxInput);
            });
        });
    };

    attachPairListeners(wateringMinInputs, wateringMaxInputs);
    attachPairListeners(feedingMinInputs, feedingMaxInputs);

    const setEditing = (state) => {
        editing = state;
        descElem.readOnly = !state;
        descElem.classList.toggle('d-none', !state);
        descDisplay.classList.toggle('d-none', state);
        plantNameElem.classList.toggle('d-none', state);
        plantNameInput.classList.toggle('d-none', !state);
        cameraBtn.classList.toggle('d-none', !state);
        galleryBtn.classList.toggle('d-none', !state);
        saveBtn.classList.toggle('d-none', !state);
        archiveBtn.classList.toggle('d-none', !state);
        locationSelect.disabled = !state;
        addLocationBtn.classList.toggle('d-none', !state);
        document.querySelectorAll('#schedule-table input').forEach(i => i.readOnly = !state);
        document.querySelectorAll('.adjust-btn').forEach(btn => btn.classList.toggle('d-none', !state));
        toggleBtn.checked = state;
        if (!state) updateDescDisplay();
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
        plantNameInput.value = plant.name;
        imageElem.src = plant.image;
        descElem.value = plant.description || '';
        updateDescDisplay();
        autoResize();
        (plant.wateringMin || []).forEach((val, i) => { if (wateringMinInputs[i]) wateringMinInputs[i].value = val; });
        (plant.wateringMax || []).forEach((val, i) => { if (wateringMaxInputs[i]) wateringMaxInputs[i].value = val; });
        (plant.feedingMin || []).forEach((val, i) => { if (feedingMinInputs[i]) feedingMinInputs[i].value = val; });
        (plant.feedingMax || []).forEach((val, i) => { if (feedingMaxInputs[i]) feedingMaxInputs[i].value = val; });
        archiveBtn.disabled = !!plant.archived;
        locationSelect.value = plant.location;
    };

    const loadPlantNames = async () => {
        const res = await fetch('/plants');
        if (res.ok) {
            const list = await res.json();
            const filtered = list.filter(p => !p.archived && (currentLocation === 'All' || p.location === currentLocation));
            plantNames = filtered.map(p => p.name);
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
            if (identifying) return;
            if (e.touches.length === 1) {
                startX = e.touches[0].clientX;
            }
        });
        document.addEventListener('touchend', (e) => {
            if (identifying) return;
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
            name: plantNameInput.value.trim(),
            description: descElem.value,
            wateringMin: wateringMinInputs.map(i => parseFreqValue(i.value)),
            wateringMax: wateringMaxInputs.map(i => parseFreqValue(i.value)),
            feedingMin: feedingMinInputs.map(i => parseFreqValue(i.value)),
            feedingMax: feedingMaxInputs.map(i => parseFreqValue(i.value)),
            location: locationSelect.value
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
        if (plantCache[name]) {
            plantCache[name].description = text;
        }
        showMessage('Description updated', 'success');
    };

    const updateSchedule = async (sched) => {
        await fetch(`/plants/${encodeURIComponent(name)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                wateringMin: sched.wateringMin,
                wateringMax: sched.wateringMax,
                feedingMin: sched.feedingMin,
                feedingMax: sched.feedingMax
            })
        });
        if (plantCache[name]) {
            plantCache[name].wateringMin = sched.wateringMin;
            plantCache[name].wateringMax = sched.wateringMax;
            plantCache[name].feedingMin = sched.feedingMin;
            plantCache[name].feedingMax = sched.feedingMax;
        }
        showMessage('Schedule updated', 'success');
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

    const extractCommonName = (text) => {
        const match = /Nom\s+commun\s*:\s*([^\n]+)/i.exec(text || '');
        return match ? match[1].replace(/\*+/g, '').trim() : null;
    };

    const renamePlant = async (newName) => {
        if (!newName || newName === name) return;
        const res = await fetch(`/plants/${encodeURIComponent(name)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newName })
        });
        if (!res.ok) return;
        if (plantCache[name]) {
            plantCache[newName] = { ...plantCache[name], name: newName };
            delete plantCache[name];
        }
        const idx = plantNames.indexOf(name);
        if (idx !== -1) plantNames[idx] = newName;
        name = newName;
        plantNameElem.textContent = newName;
        plantNameInput.value = newName;
        history.replaceState({}, '', `plant.html?name=${encodeURIComponent(newName)}`);
    };

    const identify = async () => {
        identifying = true;
        loadingElem.classList.remove('d-none');
        loadingElem.classList.add('blocking');
        startLeafAnimation();
        identifyBtn.disabled = true;
        const res = await fetch('/identify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: imageElem.getAttribute('src') })
        });
        stopLeafAnimation();
        identifying = false;
        loadingElem.classList.remove('blocking');
        loadingElem.classList.add('d-none');
        identifyBtn.disabled = false;
        if (!res.ok) {
            alert('Error identifying plant');
            return;
        }
        const data = await res.json();
        try { await navigator.clipboard.writeText(data.description); } catch(e) {}
        if (confirm(`${data.description}\n\nMettre à jour la description ?`)) {
            descElem.value = data.description;
            updateDescDisplay();
            autoResize();
            await updateDescription(data.description);
            if (/^Plant \d+$/.test(plantNameInput.value.trim())) {
                const newName = data.commonName || extractCommonName(data.description);
                if (newName) await renamePlant(newName);
            }
        }
        if (data.schedule) {
            const sched = data.schedule;
            const table = months.map((m,i)=>{
                const wMin = sched.wateringMin?.[i];
                const wMax = sched.wateringMax?.[i];
                const fMin = sched.feedingMin?.[i];
                const fMax = sched.feedingMax?.[i];
                return `${m}: W ${wMin ?? '-'}-${wMax ?? '-'} | F ${fMin ?? '-'}-${fMax ?? '-'}`;
            }).join('\n');
            if (confirm(`${table}\n\nMettre à jour le planning ?`)) {
                (sched.wateringMin || []).forEach((v,i)=>{ if(wateringMinInputs[i]) wateringMinInputs[i].value = v ?? ''; });
                (sched.wateringMax || []).forEach((v,i)=>{ if(wateringMaxInputs[i]) wateringMaxInputs[i].value = v ?? ''; });
                (sched.feedingMin || []).forEach((v,i)=>{ if(feedingMinInputs[i]) feedingMinInputs[i].value = v ?? ''; });
                (sched.feedingMax || []).forEach((v,i)=>{ if(feedingMaxInputs[i]) feedingMaxInputs[i].value = v ?? ''; });
                await updateSchedule(sched);
            }
        }
    };

    toggleBtn.addEventListener('change', () => setEditing(toggleBtn.checked));
    saveBtn.addEventListener('click', save);
    archiveBtn.addEventListener('click', archive);
    addLocationBtn.addEventListener('click', addLocation);
    if (identifyBtn) identifyBtn.addEventListener('click', identify);

    await loadLocations();
    await loadPlantNames();
    initSwipe();
    await load(name);
    updateNavLinks();
});
