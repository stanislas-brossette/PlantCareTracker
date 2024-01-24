const express = require('express');
const fs = require('fs');
const app = express();
const port = 3000;

let lastClickedTime = null;
const dataFile = 'lastClickedTime.txt';

// Function to read the last clicked time from a file
function readLastClickedTime() {
    try {
        const data = fs.readFileSync(dataFile, 'utf8');
        lastClickedTime = new Date(data);
    } catch (err) {
        console.log("No previous time found or error reading file:", err);
        lastClickedTime = null;
    }
}

// Function to write the last clicked time to a file
function writeLastClickedTime(time) {
    fs.writeFile(dataFile, time.toISOString(), err => {
        if (err) {
            console.error('Error writing to file', err);
        }
    });
}

// Read the last clicked time from the file on server start
readLastClickedTime();

app.use(express.static('public'));

app.get('/clicked', (req, res) => {
    lastClickedTime = new Date();
    writeLastClickedTime(lastClickedTime);
    res.send({ lastClickedTime: lastClickedTime.toISOString() });
});

app.get('/lastClickedTime', (req, res) => {
    res.send({ lastClickedTime: lastClickedTime ? lastClickedTime.toISOString() : null });
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening at http://localhost:${port}`);
});
