document.addEventListener('DOMContentLoaded', () => {
    const nameElem = document.getElementById('name');
    const descElem = document.getElementById('description');
    const wateringElem = document.getElementById('watering');
    const feedingElem = document.getElementById('feeding');
    const imageElem = document.getElementById('image');
    const saveBtn = document.getElementById('save');
    const messageElem = document.getElementById('message');

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
            wateringFreq: wateringElem.value.split(',').map(n => parseInt(n.trim(), 10)),
            feedingFreq: feedingElem.value.split(',').map(n => parseInt(n.trim(), 10)),
            image: imageElem.value
        };
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
