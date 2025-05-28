document.addEventListener('DOMContentLoaded', () => {
    const nameElem = document.getElementById('name');
    const descElem = document.getElementById('description');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const createMonthInputs = (containerId, prefix, defaultValue) => {
        const container = document.getElementById(containerId);
        const mins = [], maxs = [];
        months.forEach((m, i) => {
            const div = document.createElement('div');
            div.className = 'month-container';
            const label = document.createElement('label');
            label.className = 'form-label mb-1';
            label.textContent = m;
            const inputMin = document.createElement('input');
            inputMin.type = 'number';
            inputMin.className = 'form-control form-control-sm month-input';
            inputMin.id = `${prefix}-min-${i}`;
            inputMin.value = defaultValue;
            const inputMax = document.createElement('input');
            inputMax.type = 'number';
            inputMax.className = 'form-control form-control-sm month-input mt-1';
            inputMax.id = `${prefix}-max-${i}`;
            inputMax.value = defaultValue;
            div.appendChild(label);
            div.appendChild(inputMin);
            div.appendChild(inputMax);
            container.appendChild(div);
            mins.push(inputMin);
            maxs.push(inputMax);
        });
        return [mins, maxs];
    };

    const [wateringMinInputs, wateringMaxInputs] = createMonthInputs('watering-inputs', 'watering', 7);
    const [feedingMinInputs, feedingMaxInputs] = createMonthInputs('feeding-inputs', 'feeding', 30);
    const imageElem = document.getElementById('image');
    const imageFileElem = document.getElementById('imageFile');
    const previewElem = document.getElementById('imagePreview');
    const saveBtn = document.getElementById('save');
    const locationSelect = document.getElementById('location-select');
    const addLocationBtn = document.getElementById('add-location');
    const messageElem = document.getElementById('message');
    let imageData = null;

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

    if (imageFileElem) {
        imageFileElem.addEventListener('change', async () => {
            const file = imageFileElem.files[0];
            if (!file) {
                imageData = null;
                if (previewElem) {
                    previewElem.classList.add('d-none');
                    previewElem.src = '';
                }
                return;
            }
            try {
                imageData = await resizeImage(file);
                if (previewElem) {
                    previewElem.src = imageData;
                    previewElem.classList.remove('d-none');
                }
            } catch (e) {
                console.error('Image resize failed', e);
            }
        });
    }

    const showMessage = (msg, type = 'success') => {
        messageElem.textContent = msg;
        messageElem.className = `alert alert-${type}`;
        messageElem.classList.remove('d-none');
        setTimeout(() => messageElem.classList.add('d-none'), 3000);
    };

    const save = async () => {
        const body = {
            name: nameElem.value.trim(),
            description: descElem.value,
            wateringMin: wateringMinInputs.map(i => parseInt(i.value, 10) || 0),
            wateringMax: wateringMaxInputs.map(i => parseInt(i.value, 10) || 0),
            feedingMin: feedingMinInputs.map(i => parseInt(i.value, 10) || 0),
            feedingMax: feedingMaxInputs.map(i => parseInt(i.value, 10) || 0),
            location: locationSelect.value
        };
        if (imageData) {
            body.imageData = imageData;
        } else {
            body.image = imageElem.value;
        }
        const res = await fetch('/plants', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (res.ok) {
            showMessage('Created', 'success');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        } else {
            const text = await res.text();
            showMessage('Error: ' + text, 'danger');
        }
    };

    addLocationBtn.addEventListener('click', addLocation);
    saveBtn.addEventListener('click', save);
    loadLocations();
});
