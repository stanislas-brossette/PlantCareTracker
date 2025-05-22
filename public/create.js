document.addEventListener('DOMContentLoaded', () => {
    const nameElem = document.getElementById('name');
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
    const imageElem = document.getElementById('image');
    const imageFileElem = document.getElementById('imageFile');
    const saveBtn = document.getElementById('save');
    const messageElem = document.getElementById('message');
    let imageData = null;

    if (imageFileElem) {
        imageFileElem.addEventListener('change', () => {
            const file = imageFileElem.files[0];
            if (!file) { imageData = null; return; }
            const reader = new FileReader();
            reader.onload = () => { imageData = reader.result; };
            reader.readAsDataURL(file);
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
            wateringFreq: wateringInputs.map(input => parseInt(input.value, 10) || 0),
            feedingFreq: feedingInputs.map(input => parseInt(input.value, 10) || 0)
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

    saveBtn.addEventListener('click', save);
});
