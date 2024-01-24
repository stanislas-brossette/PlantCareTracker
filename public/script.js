document.addEventListener('DOMContentLoaded', () => {
    const plantsTable = document.getElementById('plantsTable');

    // Array of plant names
    const plants = [
        { name: "ZZ", wateringFreq: 7, feedingFreq: 14 },
        { name: "Suzie", wateringFreq: 7, feedingFreq: 14 },
        { name: "Impatiens", wateringFreq: 7, feedingFreq: 14 },
        { name: "Philo vert pomme", wateringFreq: 7, feedingFreq: 14 },
        { name: "Philo velours", wateringFreq: 7, feedingFreq: 14 },
        { name: "Philo vert jungle", wateringFreq: 7, feedingFreq: 14 },
        { name: "Pothos Stan", wateringFreq: 7, feedingFreq: 14 },
        { name: "Pothos Marjo", wateringFreq: 7, feedingFreq: 14 },
        { name: "Dieffenbachia", wateringFreq: 7, feedingFreq: 14 },
        { name: "Pachira", wateringFreq: 7, feedingFreq: 14 },
        { name: "Citronnier", wateringFreq: 7, feedingFreq: 14 },
        { name: "Succulente", wateringFreq: 7, feedingFreq: 14 },
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

            //button.className = needsAttention ? 'button-alert' : 'button-normal';
            console.log(`Created ${type} button for ${plant.name}`);
            return button;
        };

        //const lastWatered = new Date(getLastClickedTimes[`${plant.name}-Arrosage`] || new Date());
        //const daysSinceWatered = Math.floor((new Date() - lastWatered) / (1000 * 60 * 60 * 24));
        //const needsWatering = daysSinceWatered > plant.wateringFreq;

        //const lastFed = new Date(getLastClickedTimes[`${plant.name}-Engrais`] || new Date());
        //const daysSinceFed = Math.floor((new Date() - lastFed) / (1000 * 60 * 60 * 24));
        //const needsFeeding = daysSinceFed > plant.feedingFreq;
        //const needsWatering = true;
        //const needsFeeding = false;

        // Create Arrosage and Engrais buttons for each plant
        createButton('Arrosage');//, needsWatering);
        createButton('Engrais');//, needsFeeding);
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
        console.log(`UpdateButtonState for ${buttonId}`);
        const timeDiff = lastClickedTime ? calculateTimeSince(lastClickedTime) : 'Never clicked';
        buttonRefs[buttonId].textContent = timeDiff;

        const isWateringButton = buttonId.includes("Arrosage");
        console.log(`isWateringButton ${isWateringButton}`);
        limitDays = buttonRefs[buttonId].getAttribute('feedingFrequency');
        if (isWateringButton == true)
        {
            limitDays = buttonRefs[buttonId].getAttribute('wateringFrequency');
        }
        console.log(`limitDays ${limitDays}`);

        const now = new Date();
        const lastClickedDate = new Date(lastClickedTime);
        const differenceInDays = Math.floor((now - lastClickedDate) / (1000* 60 * 60 * 24));
        console.log(`differenceInDays ${differenceInDays}`);

        const needsAttention = differenceInDays > limitDays;
        console.log(`needsAttention ${needsAttention}`)

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
