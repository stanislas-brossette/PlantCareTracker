import { api } from './js/api.js';
import { readPlants, cachePlants, readLocations, cacheLocations } from './js/storage.js';
import { sync } from './js/sync.js';

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
    const testAnimBtn = document.getElementById('test-animation');
    const messageElem = document.getElementById('message');
    const loadingElem = document.getElementById('loading');
    const loadingLeaf = document.getElementById('loading-leaf');
    let identifying = false;
    const { startLeafAnimation, stopLeafAnimation } = createLeafAnimator(loadingElem, loadingLeaf, { tinyLeafDuration: 2000 });

    const resolveImageUrl = (src) => {
        if (!src) return src;
        if (/^https?:\/\//.test(src) || src.startsWith('data:')) return src;
        if (window.API_BASE) {
            return window.API_BASE.replace(/\/$/, '') + '/' + src.replace(/^\/+/, '');
        }
        return src;
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
        const render = (list) => {
            const unique = Array.from(new Set(list)).filter(Boolean);
            if (unique.length === 0) unique.push('Default');
            locationSelect.innerHTML = '';
            unique.forEach(loc => {
                const opt = document.createElement('option');
                opt.value = loc;
                opt.textContent = loc;
                locationSelect.appendChild(opt);
            });
        };
        // TODO-OFFLINE: replace the entire fetch block below with `api('GET', '/locations')`
        const cached = await readLocations();
        render(cached);
        try {
            const list = await api('GET', '/locations');
            if (!list.offline) {
                await cacheLocations(list);
                render(list);
            }
        } catch (err) {
            console.error('Failed to load locations', err);
        }
    };

    const addLocation = async () => {
        const name = prompt('New location name')?.trim();
        if (!name) return;
        try {
            await api('POST', '/locations', { name });
            const opts = Array.from(locationSelect.options).map(o => o.value);
            if (!opts.includes(name)) {
                const opt = document.createElement('option');
                opt.value = name;
                opt.textContent = name;
                locationSelect.appendChild(opt);
            }
            locationSelect.value = name;
            await cacheLocations(opts.concat(name));
        } catch (err) {
            console.error('Failed to add location', err);
        }
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
        const plant = await api('GET', `/plants/${encodeURIComponent(plantName)}`);
        if (!plant.offline) {
            plantCache[plantName] = plant;
            return plant;
        }
        return plantCache[plantName] || null;
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
            delete imageElem.dataset.path;
        } catch (e) {
            console.error('Image resize failed', e);
        }
    };

    const takePhoto = async () => {
        const cam = window.Capacitor?.Plugins?.Camera;
        if (cam && window.Capacitor?.isNativePlatform?.()) {
            try {
                const photo = await cam.getPhoto({
                    resultType: 'dataUrl',
                    source: 'CAMERA',
                    quality: 80,
                    width: 600
                });
                imageData = photo.dataUrl;
                imageElem.src = imageData;
                delete imageElem.dataset.path;
                return;
            } catch (err) {
                console.error('Camera capture failed', err);
            }
        }
        cameraFileElem.click();
    };

    if (cameraFileElem) {
        cameraFileElem.addEventListener('change', () => handleFileChange(cameraFileElem));
    }
    if (galleryFileElem) {
        galleryFileElem.addEventListener('change', () => handleFileChange(galleryFileElem));
    }

    if (cameraBtn) cameraBtn.addEventListener('click', takePhoto);
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
        imageElem.dataset.path = plant.image;
        imageElem.src = resolveImageUrl(plant.image);
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
        // TODO-OFFLINE: replace the entire fetch block below with `api('GET', '/plants')`
        const list = await api('GET', '/plants');
        if (!list.offline) {
            const filtered = list.filter(p => !p.archived && (currentLocation === 'All' || p.location === currentLocation));
            plantNames = filtered.map(p => p.name);
            await cachePlants(list);
        } else {
            const cached = await readPlants();
            const filtered = cached.filter(p => !p.archived && (currentLocation === 'All' || p.location === currentLocation));
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
                img.src = resolveImageUrl(plant.image);
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
        const res = await api('PUT', `/plants/${encodeURIComponent(name)}`, body);
        if (res?.offline) {
            window.offlineUI?.notifyIfOffline();
            showMessage('Saving is unavailable while offline', 'danger');
            return;
        }
        showMessage('Saved', 'success');
        setTimeout(() => { window.location.href = 'index.html'; }, 1000);
    };

    const updateDescription = async (text) => {
        const res = await api('PUT', `/plants/${encodeURIComponent(name)}`, { description: text });
        if (res?.offline) {
            window.offlineUI?.notifyIfOffline();
            return;
        }
        if (plantCache[name]) {
            plantCache[name].description = text;
        }
        showMessage('Description updated', 'success');
    };

    const updateSchedule = async (sched) => {
        const res = await api('PUT', `/plants/${encodeURIComponent(name)}`, {
            wateringMin: sched.wateringMin,
            wateringMax: sched.wateringMax,
            feedingMin: sched.feedingMin,
            feedingMax: sched.feedingMax
        });
        if (res?.offline) {
            window.offlineUI?.notifyIfOffline();
            return;
        }
        if (plantCache[name]) {
            plantCache[name].wateringMin = sched.wateringMin;
            plantCache[name].wateringMax = sched.wateringMax;
            plantCache[name].feedingMin = sched.feedingMin;
            plantCache[name].feedingMax = sched.feedingMax;
        }
        showMessage('Schedule updated', 'success');
    };

    const archive = async () => {
        const res = await api('PUT', `/plants/${encodeURIComponent(name)}`, { archived: true });
        if (res?.offline) {
            window.offlineUI?.notifyIfOffline();
            showMessage('Archive unavailable offline', 'danger');
            return;
        }
        showMessage('Archived', 'success');
        setTimeout(() => { window.location.href = 'index.html'; }, 1000);
    };

    const extractCommonName = (text) => {
        const match = /Nom\s+commun\s*:\s*([^\n]+)/i.exec(text || '');
        return match ? match[1].replace(/\*+/g, '').trim() : null;
    };

    const renamePlant = async (newName) => {
        if (!newName || newName === name) return;
        const res = await api('PUT', `/plants/${encodeURIComponent(name)}`, { name: newName });
        if (res.offline) {
            window.offlineUI?.notifyIfOffline();
            return;
        }
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
        const imgParam = imageData || imageElem.dataset.path || imageElem.getAttribute('src');

        try {
            const res = await api('POST', '/identify', { image: imgParam });
            if (!res || res.offline) {
                throw new Error('Error identifying plant');
            }

            const data = res;
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
        } catch (err) {
            console.error('Identify failed', err);
            const message = err?.message || 'Could not identify plant';
            showMessage(message, 'danger');
        } finally {
            stopLeafAnimation();
            identifying = false;
            loadingElem.classList.remove('blocking');
            loadingElem.classList.add('d-none');
            identifyBtn.disabled = false;
        }
    };

    toggleBtn.addEventListener('change', () => setEditing(toggleBtn.checked));
    saveBtn.addEventListener('click', save);
    archiveBtn.addEventListener('click', archive);
    addLocationBtn.addEventListener('click', addLocation);
    if (identifyBtn) identifyBtn.addEventListener('click', identify);
    if (testAnimBtn) testAnimBtn.addEventListener('click', () => {
        if (identifying) return;
        loadingElem.classList.remove('d-none');
        startLeafAnimation();
        setTimeout(() => {
            stopLeafAnimation();
            loadingElem.classList.add('d-none');
        }, 10000);
    });

    window.offlineUI?.refresh();
    await loadLocations();
    await loadPlantNames();
    initSwipe();
    await load(name);
    updateNavLinks();
    sync();
});
