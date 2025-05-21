document.addEventListener('DOMContentLoaded', () => {
    const plantsTable = document.getElementById('plantsTable');

    let plants = [];

    // Object to store button references
    const buttonRefs = {};

    const loadPlants = async () => {
        const response = await fetch('/plants');
        plants = await response.json();

        plants.filter(p => !p.archived).forEach(plant => {
            const row = plantsTable.insertRow();
            const nameCell = row.insertCell();
            const link = document.createElement('a');
            link.href = `plant.html?name=${encodeURIComponent(plant.name)}`;
            link.textContent = plant.name;
            nameCell.appendChild(link);

        // Function to create a button
        const createButton = (type) => {
            const button = document.createElement('button');
            button.textContent = 'Never'; // Initial text
            button.id = `button-${plant.name}-${type}`;
            button.className = 'btn w-100 btn-success';
            button.setAttribute('feedingFrequency', plant.feedingFreq)
            button.setAttribute('wateringFrequency', plant.wateringFreq)
            button.onclick = () => buttonClicked(button.id);
            row.insertCell().appendChild(button);
            buttonRefs[button.id] = button; // Store button reference

            return button;
        };

        // Create Arrosage and Engrais buttons for each plant
        createButton('Arrosage');
        createButton('Engrais');
        });

        await getLastClickedTimes();
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

        let limitFrequencies;
        let limitDays;

        const isWateringButton = buttonId.includes("Arrosage");
        limitFrequencies = buttonRefs[buttonId].getAttribute('feedingFrequency').split(',');
        if (isWateringButton == true)
        {
            limitFrequencies = buttonRefs[buttonId].getAttribute('wateringFrequency').split(',');
        }
        limitDays = limitFrequencies[now.getMonth()];

        const needsAttention = differenceInDays > limitDays;

        buttonRefs[buttonId].className = `btn w-100 ${needsAttention ? 'btn-danger' : 'btn-success'}`;
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

    const refreshTimes = () => {
        Object.keys(buttonRefs).forEach(buttonId => {
            updateButtonState(buttonId);
        });
    };

    loadPlants();
});
