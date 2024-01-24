document.addEventListener('DOMContentLoaded', () => {
    const buttonsContainer = document.getElementById('buttons');

    // Array of strings to create buttons
    const buttonNames = ["ZZ", "Suzie", "Impatiens", "Philo vert pomme", "Philo velours", "Philo vert jungle", "Pothos Stan", "Pothos Marjo", "Dieffenbachia", "Pachira", "Citronnier", "Succulente"];

    // Create a button for each string in the array
    buttonNames.forEach(name => {
        const button = document.createElement('button');
        button.textContent = name;
        button.id = `button-${name}`;
        button.onclick = () => buttonClicked(button.id);
        buttonsContainer.appendChild(button);
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
