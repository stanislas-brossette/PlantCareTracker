document.addEventListener('DOMContentLoaded', () => {
    const button = document.getElementById('clickButton');
    const lastClickedDisplay = document.getElementById('lastClicked');

    button.addEventListener('click', async () => {
        await fetch('/clicked');
        getLastClickedTime();
    });

    const getLastClickedTime = async () => {
        const response = await fetch('/lastClickedTime');
        const data = await response.json();
        if (data.lastClickedTime) {
            lastClickedDisplay.textContent = new Date(data.lastClickedTime).toLocaleString();
        } else {
            lastClickedDisplay.textContent = 'Never';
        }
    };

    getLastClickedTime();
});
