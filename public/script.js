document.addEventListener('DOMContentLoaded', () => {
    const plantsTable = document.getElementById('plantsTable');

    // Array of plant names
    const plantNames = ["ZZ", "Suzie", "Impatiens", "Philo vert pomme", "Philo velours", "Philo vert jungle", "Pothos Stan", "Pothos Marjo", "Dieffenbachia", "Pachira", "Citronnier", "Succulente"];

    // Create a row for each plant
    plantNames.forEach(plantName => {
        const row = plantsTable.insertRow();
        const nameCell = row.insertCell();
        nameCell.textContent = plantName;

        const createButton = (type) => {
            const button = document.createElement('button');
            button.textContent = type;
            button.id = `button-${plantName}-${type}`;
            button.onclick = () => buttonClicked(button.id);
            return button;
        };

        const arrosageCell = row.insertCell();
        arrosageCell.appendChild(createButton('Arrosage'));

        const engraisCell = row.insertCell();
        engraisCell.appendChild(createButton('Engrais'));
    });

    getLastClickedTimes();

    async function buttonClicked(buttonId) {
        await fetch('/clicked', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ buttonId }),
        });
        getLastClickedTimes();
    }

    async function getLastClickedTimes() {
        const response = await fetch('/lastClickedTimes');
        const data = await response.json();
        for (const [buttonId, time] of Object.entries(data)) {
            console.log(`Last clicked time of ${buttonId}: ${time}`);
        }
    }
});
