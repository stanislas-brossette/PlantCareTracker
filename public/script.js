document.addEventListener('DOMContentLoaded', () => {
    const plantsTable = document.getElementById('plantsTable');

    // Array of plant names
    const plants = [
        { name: "ZZ",
         wateringFreq: [30, 30, 12, 12, 12, 12, 12, 12, 30, 30, 30, 30],
         feedingFreq: [1000, 1000, 7, 7, 7, 7, 7, 7, 7, 7, 1000, 1000] },
        { name: "Suzie",
         wateringFreq: [10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10],
         feedingFreq: [20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20] },
        { name: "Impatiens",
         wateringFreq: [12, 12, 2, 2, 2, 2, 2, 2, 12, 12, 12, 12],
         feedingFreq: [1000, 1000, 15, 15, 15, 15, 15, 15, 15, 15, 1000, 1000] },
        { name: "Philo vert pomme",
         wateringFreq: [12, 12, 5, 5, 5, 5, 5, 5, 12, 12, 12, 12],
         feedingFreq: [1000, 1000, 1000, 30, 30, 30, 30, 30, 30, 30, 1000, 1000] },
        { name: "Philo velours",
         wateringFreq: [12, 12, 5, 5, 5, 5, 5, 5, 12, 12, 12, 12],
         feedingFreq: [1000, 1000, 1000, 30, 30, 30, 30, 30, 30, 30, 1000, 1000] },
        { name: "Philo vert jungle",
         wateringFreq: [12, 12, 5, 5, 5, 5, 5, 5, 12, 12, 12, 12],
         feedingFreq: [1000, 1000, 1000, 30, 30, 30, 30, 30, 30, 30, 1000, 1000] },
        { name: "Pothos Stan",
         wateringFreq: [12, 12, 6, 6, 6, 6, 6, 6, 12, 12, 12, 12],
         feedingFreq: [1000, 1000, 14, 14, 14, 14, 14, 14, 14, 14, 1000, 1000] },
        { name: "Pothos Marjo",
         wateringFreq: [12, 12, 6, 6, 6, 6, 6, 6, 12, 12, 12, 12],
         feedingFreq: [1000, 1000, 14, 14, 14, 14, 14, 14, 14, 14, 1000, 1000] },
        { name: "Dieffenbachia",
         wateringFreq: [9, 9, 6, 6, 6, 6, 6, 6, 9, 9, 9, 9],
         feedingFreq: [1000, 1000, 15, 15, 15, 15, 15, 15, 15, 15, 1000, 1000] },
        { name: "Pachira",
         wateringFreq: [13, 13, 6, 6, 6, 6, 6, 6, 13, 13, 13, 13],
         feedingFreq: [1000, 1000, 1000, 30, 30, 30, 30, 30, 30, 1000, 1000, 1000] },
        { name: "Citronnier",
         wateringFreq: [14, 14, 7, 7, 3, 3, 3, 7, 7, 7, 14, 14],
         feedingFreq: [1000, 1000, 1000, 30, 30, 30, 30, 30, 30, 1000, 1000, 1000] },
        { name: "Succulente",
         wateringFreq: [30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
         feedingFreq: [1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000] },
    ];

    // Object to store button references
    const buttonRefs = {};

    // Create a row for each plant
    plants.forEach(plant => {
        const row = plantsTable.insertRow();
        const nameCell = row.insertCell();
        nameCell.textContent = plant.name;

        // Function to create a button
        const createButton = (type) => {
            const button = document.createElement('button');
            button.textContent = 'Never'; // Initial text
            button.id = `button-${plant.name}-${type}`;
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
        const timeDiff = lastClickedTime ? calculateTimeSince(lastClickedTime) : 'Never clicked';
        buttonRefs[buttonId].textContent = timeDiff;

        const now = new Date();
        const lastClickedDate = new Date(lastClickedTime);
        const differenceInDays = Math.floor((now - lastClickedDate) / (1000* 60 * 60 * 24));

        const isWateringButton = buttonId.includes("Arrosage");
        limitFrequencies = buttonRefs[buttonId].getAttribute('feedingFrequency').split(',');
        if (isWateringButton == true)
        {
            limitFrequencies = buttonRefs[buttonId].getAttribute('wateringFrequency').split(',');
        }
        limitDays = limitFrequencies[now.getMonth()];

        const needsAttention = differenceInDays > limitDays;

        buttonRefs[buttonId].className = needsAttention ? 'button-alert' : 'button-normal';
    };

    const getLastClickedTimes = async () => {
        const response = await fetch('/lastClickedTimes');
        const data = await response.json();
        Object.entries(data).forEach(([buttonId, time]) => {
            updateButtonState(buttonId, time);
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

    getLastClickedTimes();
});

document.getElementById('restoreBackupButton').addEventListener('click', () => {
    fetch('/restoreBackup', { method: 'POST' })
        .then(response => {
            if (response.ok) {
                console.log('Backup restored successfully');
                // Additional actions on successful backup restoration
            } else {
                console.error('Error restoring backup');
            }
        })
        .catch(error => console.error('Failed to send request:', error));
});
