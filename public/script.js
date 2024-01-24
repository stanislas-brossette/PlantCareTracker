document.addEventListener('DOMContentLoaded', () => {
    const plantsTable = document.getElementById('plantsTable');

    // Array of plant names
    const plantNames = ["ZZ", "Suzie", "Impatiens", "Philo vert pomme", "Philo velours", "Philo vert jungle", "Pothos Stan", "Pothos Marjo", "Dieffenbachia", "Pachira", "Citronnier", "Succulente"];

    // Object to store button references
    const buttonRefs = {};

    // Create a row for each plant
    plantNames.forEach(plantName => {
        const row = plantsTable.insertRow();
        const nameCell = row.insertCell();
        nameCell.textContent = plantName;

        // Function to create a button
        const createButton = (type) => {
            const button = document.createElement('button');
            button.textContent = 'Never'; // Initial text
            button.id = `button-${plantName}-${type}`;
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
    const updateButtonText = (buttonId, lastClickedTime) => {
        const timeDiff = lastClickedTime ? calculateTimeSince(lastClickedTime) : 'Never clicked';
        buttonRefs[buttonId].textContent = timeDiff;
    };

    const getLastClickedTimes = async () => {
        const response = await fetch('/lastClickedTimes');
        const data = await response.json();
        Object.entries(data).forEach(([buttonId, time]) => {
            updateButtonText(buttonId, time);
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
        updateButtonText(buttonId, data.lastClickedTime);
    };

    getLastClickedTimes();
});
