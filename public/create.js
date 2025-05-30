document.addEventListener('DOMContentLoaded', () => {
    const nameInput = document.getElementById('plant-name-input');
    const descElem = document.getElementById('description');
    const locationSelect = document.getElementById('location-select');
    const addLocationBtn = document.getElementById('add-location');
    const saveBtn = document.getElementById('save');
    const messageElem = document.getElementById('message');
    const imageElem = document.getElementById('plant-image');
    const cameraFileElem = document.getElementById('cameraFile');
    const galleryFileElem = document.getElementById('galleryFile');
    const cameraBtn = document.getElementById('camera-btn');
    const galleryBtn = document.getElementById('gallery-btn');
    const identifyBtn = document.getElementById('identify');
    const loadingElem = document.getElementById('loading');
    const loadingLeaf = document.getElementById('loading-leaf');
    const scheduleBody = document.querySelector('#schedule-table tbody');

    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const wateringMinInputs = [];
    const wateringMaxInputs = [];
    const feedingMinInputs = [];
    const feedingMaxInputs = [];
    let imageData = null;
    let identifying = false;
    const { startLeafAnimation, stopLeafAnimation } = createLeafAnimator(loadingElem, loadingLeaf);

    const autoResize = () => {
        descElem.style.height = 'auto';
        descElem.style.height = descElem.scrollHeight + 'px';
    };

    const parseFreqValue = (val) => {
        const num = parseInt(val, 10);
        return isNaN(num) ? null : num;
    };

    const createInputCell = (arr) => {
        const td = document.createElement('td');
        const group = document.createElement('div');
        group.className = 'input-group input-group-sm';

        const minus = document.createElement('button');
        minus.type = 'button';
        minus.textContent = '-';
        minus.className = 'btn btn-outline-secondary btn-sm adjust-btn';

        const input = document.createElement('input');
        input.type = 'number';
        input.className = 'form-control text-center';

        const plus = document.createElement('button');
        plus.type = 'button';
        plus.textContent = '+';
        plus.className = 'btn btn-outline-secondary btn-sm adjust-btn';

        group.appendChild(minus);
        group.appendChild(input);
        group.appendChild(plus);
        td.appendChild(group);

        minus.addEventListener('click', () => {
            let val = parseFreqValue(input.value);
            val = (val === null ? 0 : val) - 1;
            if (val < 0) val = 0;
            input.value = val;
            input.dispatchEvent(new Event('input'));
        });

        plus.addEventListener('click', () => {
            let val = parseFreqValue(input.value);
            val = (val === null ? 0 : val) + 1;
            input.value = val;
            input.dispatchEvent(new Event('input'));
        });

        arr.push(input);
        return td;
    };

    months.forEach(m => {
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
            minInput.addEventListener('input', () => enforcePair(minInput, maxInput));
            maxInput.addEventListener('input', () => enforcePair(minInput, maxInput));
        });
    };

    attachPairListeners(wateringMinInputs, wateringMaxInputs);
    attachPairListeners(feedingMinInputs, feedingMaxInputs);

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
                return;
            } catch (err) {
                console.error('Camera capture failed', err);
            }
        }
        cameraFileElem.click();
    };

    cameraBtn.addEventListener('click', takePhoto);
    galleryBtn.addEventListener('click', () => galleryFileElem.click());
    cameraFileElem.addEventListener('change', () => handleFileChange(cameraFileElem));
    galleryFileElem.addEventListener('change', () => handleFileChange(galleryFileElem));

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
        const stored = localStorage.getItem('currentLocation');
        if (stored && list.includes(stored)) locationSelect.value = stored;
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

    const showMessage = (msg, type = 'success') => {
        messageElem.textContent = msg;
        messageElem.className = `alert alert-${type}`;
        messageElem.classList.remove('d-none');
        setTimeout(() => messageElem.classList.add('d-none'), 3000);
    };

    const extractCommonName = (text) => {
        const match = /Nom\s+commun\s*:\s*([^\n]+)/i.exec(text || '');
        return match ? match[1].replace(/\*+/g, '').trim() : null;
    };

    const identify = async () => {
        const img = imageData || imageElem.getAttribute('src');
        if (!img || img === 'images/placeholder.png') {
            alert('Please add a photo first');
            return;
        }
        identifying = true;
        loadingElem.classList.remove('d-none');
        loadingElem.classList.add('blocking');
        startLeafAnimation();
        identifyBtn.disabled = true;
        const res = await fetch('/identify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: img })
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
        try { await navigator.clipboard.writeText(data.description); } catch(e){}
        if (confirm(`${data.description}\n\nMettre \u00e0 jour la description ?`)) {
            descElem.value = data.description;
            autoResize();
        }
        if (!nameInput.value.trim()) {
            const newName = data.commonName || extractCommonName(data.description);
            if (newName) nameInput.value = newName;
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
            if (confirm(`${table}\n\nMettre \u00e0 jour le planning ?`)) {
                (sched.wateringMin || []).forEach((v,i)=>{ if(wateringMinInputs[i]) wateringMinInputs[i].value = v ?? ''; });
                (sched.wateringMax || []).forEach((v,i)=>{ if(wateringMaxInputs[i]) wateringMaxInputs[i].value = v ?? ''; });
                (sched.feedingMin || []).forEach((v,i)=>{ if(feedingMinInputs[i]) feedingMinInputs[i].value = v ?? ''; });
                (sched.feedingMax || []).forEach((v,i)=>{ if(feedingMaxInputs[i]) feedingMaxInputs[i].value = v ?? ''; });
            }
        }
    };

    const save = async () => {
        const body = {
            name: nameInput.value.trim(),
            description: descElem.value,
            wateringMin: wateringMinInputs.map(i => parseFreqValue(i.value)),
            wateringMax: wateringMaxInputs.map(i => parseFreqValue(i.value)),
            feedingMin: feedingMinInputs.map(i => parseFreqValue(i.value)),
            feedingMax: feedingMaxInputs.map(i => parseFreqValue(i.value)),
            location: locationSelect.value
        };
        if (imageData) {
            body.imageData = imageData;
        } else {
            body.image = imageElem.getAttribute('src');
        }
        const res = await fetch('/plants', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (res.ok) {
            const created = await res.json();
            showMessage('Created', 'success');
            setTimeout(() => {
                window.location.href = `plant.html?name=${encodeURIComponent(created.name)}`;
            }, 1000);
        } else {
            const text = await res.text();
            showMessage('Error: ' + text, 'danger');
        }
    };

    addLocationBtn.addEventListener('click', addLocation);
    saveBtn.addEventListener('click', save);
    if (identifyBtn) identifyBtn.addEventListener('click', identify);
    descElem.addEventListener('input', autoResize);
    autoResize();

    loadLocations();
});
