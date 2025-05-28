document.addEventListener('DOMContentLoaded', () => {
    const plantsTable = document.getElementById('plantsTable');
    const undoBtn = document.getElementById('undo');
    const locationSelect = document.getElementById('location-select');

    const undoStack = [];

    const updateUndoBtn = () => {
        undoBtn.disabled = undoStack.length === 0;
    };

    let plants = [];

    // Object to store button references
    const buttonRefs = {};

    const loadLocations = async () => {
        const res = await fetch('/locations');
        const list = await res.json();
        locationSelect.innerHTML = '';
        const optAll = document.createElement('option');
        optAll.value = 'All';
        optAll.textContent = 'All';
        locationSelect.appendChild(optAll);
        list.forEach(loc => {
            const o = document.createElement('option');
            o.value = loc;
            o.textContent = loc;
            locationSelect.appendChild(o);
        });
        const stored = localStorage.getItem('currentLocation') || 'All';
        locationSelect.value = stored;
    };

    const renderPlants = () => {
        while (plantsTable.rows.length > 1) {
            plantsTable.deleteRow(1);
        }
        Object.keys(buttonRefs).forEach(k => delete buttonRefs[k]);
        const current = locationSelect.value;
        plants.filter(p => !p.archived && (current === 'All' || p.location === current)).forEach(plant => {
            const row = plantsTable.insertRow();
            const nameCell = row.insertCell();

            const container = document.createElement('div');
            container.className = 'plant-photo-container';

            const img = document.createElement('img');
            img.src = plant.image;
            img.alt = `${plant.name} image`;
            img.className = 'plant-photo';

            const overlay = document.createElement('a');
            overlay.href = `plant.html?name=${encodeURIComponent(plant.name)}`;
            overlay.textContent = plant.name;
            overlay.className = 'plant-name-overlay text-decoration-none';

            container.appendChild(img);
            container.appendChild(overlay);
            nameCell.appendChild(container);

        // Function to create a button
        const createButton = (type) => {
            const button = document.createElement('button');
            button.textContent = 'Never'; // Initial text
            button.id = `button-${plant.name}-${type}`;
            button.className = 'btn w-100 btn-success';
            button.setAttribute('feedingMin', plant.feedingMin)
            button.setAttribute('feedingMax', plant.feedingMax)
            button.setAttribute('wateringMin', plant.wateringMin)
            button.setAttribute('wateringMax', plant.wateringMax)
            button.onclick = () => buttonClicked(button.id);
            row.insertCell().appendChild(button);
            buttonRefs[button.id] = button; // Store button reference

            return button;
        };

        // Create Arrosage and Engrais buttons for each plant
        createButton('Arrosage');
        createButton('Engrais');
        });
        getLastClickedTimes();
    };

    const loadPlants = async () => {
        const response = await fetch('/plants');
        plants = await response.json();
        renderPlants();
        setInterval(refreshTimes, 60000);
    };

    const calculateTimeSince = (lastClickedTime) => {
        const now = new Date();
        const lastClickedDate = new Date(lastClickedTime);
        const differenceInSeconds = Math.floor((now - lastClickedDate) / 1000);

        if (differenceInSeconds < 60) {
            return differenceInSeconds > 0 ? `${differenceInSeconds} seconds ago` : 'Just now';
        } else if (differenceInSeconds < 3600) {
            const minutes = Math.floor(differenceInSeconds / 60);
            return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        } else if (differenceInSeconds < 86400) {
            const hours = Math.floor(differenceInSeconds / 3600);
            return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        } else {
            const days = Math.floor(differenceInSeconds / 86400);
            return `${days} day${days > 1 ? 's' : ''} ago`;
        }
    };

    // Update button text based on last clicked time
    const updateButtonState = (buttonId, lastClickedTime) => {
        if (lastClickedTime !== undefined) {
            buttonRefs[buttonId].dataset.lastClickedTime = lastClickedTime;
        } else {
            lastClickedTime = buttonRefs[buttonId].dataset.lastClickedTime;
        }

        const timeDiff = lastClickedTime ? calculateTimeSince(lastClickedTime) : 'Never clicked';
        buttonRefs[buttonId].textContent = timeDiff;

        const now = new Date();
        const lastClickedDate = new Date(lastClickedTime);
        const differenceInDays = Math.floor((now - lastClickedDate) / (1000 * 60 * 60 * 24));

        const isWateringButton = buttonId.includes('Arrosage');
        const minAttr = isWateringButton ? 'wateringMin' : 'feedingMin';
        const maxAttr = isWateringButton ? 'wateringMax' : 'feedingMax';
        const minArr = buttonRefs[buttonId].getAttribute(minAttr).split(',');
        const maxArr = buttonRefs[buttonId].getAttribute(maxAttr).split(',');
        const minDays = parseInt(minArr[now.getMonth()]);
        const maxDays = parseInt(maxArr[now.getMonth()]);

        let color = 'btn-success';
        if (!isNaN(minDays) && differenceInDays >= minDays) color = 'btn-warning';
        if (!isNaN(maxDays) && differenceInDays > maxDays) color = 'btn-danger';

        buttonRefs[buttonId].className = `btn w-100 ${color}`;
    };

    const getLastClickedTimes = async () => {
        const response = await fetch('/lastClickedTimes');
        const data = await response.json();
        Object.entries(data).forEach(([buttonId, time]) => {
            if (buttonRefs[buttonId]) {
                updateButtonState(buttonId, time);
            }
        });
    };

    const buttonClicked = async (buttonId) => {
        const prevTime = buttonRefs[buttonId].dataset.lastClickedTime || null;
        undoStack.push({ buttonId, prevTime });
        updateUndoBtn();

        const response = await fetch('/clicked', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ buttonId }),
        });
        const data = await response.json();
        updateButtonState(buttonId, data.lastClickedTime);
    };

    const undoLast = async () => {
        if (undoStack.length === 0) return;
        const { buttonId, prevTime } = undoStack.pop();
        const response = await fetch('/undo', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ buttonId, previousTime: prevTime })
        });
        const data = await response.json();
        updateButtonState(buttonId, data.lastClickedTime);
        updateUndoBtn();
    };

    const refreshTimes = () => {
        Object.keys(buttonRefs).forEach(buttonId => {
            updateButtonState(buttonId);
        });
    };

    locationSelect.addEventListener('change', () => {
        localStorage.setItem('currentLocation', locationSelect.value);
        renderPlants();
    });

    undoBtn.addEventListener('click', undoLast);
    updateUndoBtn();
    loadLocations().then(loadPlants);
});
