document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const name = params.get('name');
    if (!name) return;

    const plantNameElem = document.getElementById('plant-name');
    const imageElem = document.getElementById('plant-image');
    const descElem = document.getElementById('description');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const createMonthInputs = (containerId, prefix, defaultValue) => {
        const container = document.getElementById(containerId);
        const inputs = [];
        months.forEach((m, i) => {
            const div = document.createElement('div');
            div.className = 'month-container';
            const label = document.createElement('label');
            label.className = 'form-label mb-1';
            label.textContent = m;
            const input = document.createElement('input');
            input.type = 'number';
            input.className = 'form-control form-control-sm month-input';
            input.id = `${prefix}-${i}`;
            input.value = defaultValue;
            div.appendChild(label);
            div.appendChild(input);
            container.appendChild(div);
            inputs.push(input);
        });
        return inputs;
    };

    const wateringInputs = createMonthInputs('watering-inputs', 'watering', 7);
    const feedingInputs = createMonthInputs('feeding-inputs', 'feeding', 30);
    const saveBtn = document.getElementById('save');
    const archiveBtn = document.getElementById('archive');
    const messageElem = document.getElementById('message');

    const showMessage = (msg, type = 'success') => {
        messageElem.textContent = msg;
        messageElem.className = `alert alert-${type}`;
        messageElem.classList.remove('d-none');
        setTimeout(() => messageElem.classList.add('d-none'), 3000);
    };

    const load = async () => {
        const res = await fetch(`/plants/${encodeURIComponent(name)}`);
        if (res.ok) {
            const plant = await res.json();
            plantNameElem.textContent = plant.name;
            imageElem.src = plant.image;
            descElem.value = plant.description || '';
            (plant.wateringFreq || []).forEach((val, i) => {
                if (wateringInputs[i]) wateringInputs[i].value = val;
            });
            (plant.feedingFreq || []).forEach((val, i) => {
                if (feedingInputs[i]) feedingInputs[i].value = val;
            });
            archiveBtn.disabled = !!plant.archived;
        }
    };

    const save = async () => {
        const body = {
            description: descElem.value,
            wateringFreq: wateringInputs.map(input => parseInt(input.value, 10) || 0),
            feedingFreq: feedingInputs.map(input => parseInt(input.value, 10) || 0)
        };
        await fetch(`/plants/${encodeURIComponent(name)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        showMessage('Saved', 'success');
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
    load();
});
