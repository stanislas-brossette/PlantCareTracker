document.addEventListener('DOMContentLoaded', () => {
    const nameElem = document.getElementById('name');
    const descElem = document.getElementById('description');
    const wateringElem = document.getElementById('watering');
    const feedingElem = document.getElementById('feeding');
    const imageElem = document.getElementById('image');
    const saveBtn = document.getElementById('save');

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
            alert('Created');
            window.location.href = 'index.html';
        } else {
            const text = await res.text();
            alert('Error: ' + text);
        }
    };

    saveBtn.addEventListener('click', save);
});
