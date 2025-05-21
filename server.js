const express = require('express');
const fs = require('fs');
const app = express();
const port = 3000;

let lastClickedTimes = {}; // Stores last clicked times for each action of each plant
const dataFile = 'lastClickedTimes.json';
const historyFile = 'actionHistory.json';
let actionHistory = {}; // Keeps history for undo functionality

// Function to read the last clicked times from a file
function readLastClickedTimes() {
    try {
        const data = fs.readFileSync(dataFile, 'utf8');
        lastClickedTimes = JSON.parse(data);
    } catch (err) {
        console.log("No previous data found or error reading file:", err);
        lastClickedTimes = {};
    }
}

// Function to read action history for undo
function readActionHistory() {
    try {
        const data = fs.readFileSync(historyFile, 'utf8');
        actionHistory = JSON.parse(data);
    } catch (err) {
        console.log("No history data found or error reading file:", err);
        actionHistory = {};
    }
}

// Function to write the last clicked times to a file
function writeLastClickedTimes() {
    fs.writeFile(dataFile, JSON.stringify(lastClickedTimes, null, 4), err => {
        if (err) {
            console.error('Error writing to file', err);
        }
    });
}

// Function to write action history to a file
function writeActionHistory() {
    fs.writeFile(historyFile, JSON.stringify(actionHistory, null, 4), err => {
        if (err) {
            console.error('Error writing history file', err);
        }
    });
}

// Read the last clicked times from the file on server start
readLastClickedTimes();
readActionHistory();

app.use(express.static('public'));
app.use(express.json()); // Middleware to parse JSON bodies

app.post('/clicked', (req, res) => {
    const buttonId = req.body.buttonId;
    if (buttonId) {
        const time = new Date().toISOString();
        lastClickedTimes[buttonId] = time;

        if (!actionHistory[buttonId]) {
            actionHistory[buttonId] = [];
        }
        actionHistory[buttonId].push(time);

        writeLastClickedTimes();
        writeActionHistory();
        res.send({ lastClickedTime: time });
    } else {
        res.status(400).send('Button ID is required');
    }
});

app.get('/lastClickedTimes', (req, res) => {
    res.send(lastClickedTimes);
});

app.post('/undo', (req, res) => {
    const buttonId = req.body.buttonId;
    if (!buttonId) {
        return res.status(400).send('Button ID is required');
    }

    const history = actionHistory[buttonId];
    if (!history || history.length === 0) {
        return res.status(400).send('No history for this button');
    }

    // Remove last action
    history.pop();
    let newTime = null;
    if (history.length > 0) {
        newTime = history[history.length - 1];
        lastClickedTimes[buttonId] = newTime;
    } else {
        delete lastClickedTimes[buttonId];
        delete actionHistory[buttonId];
    }

    writeLastClickedTimes();
    writeActionHistory();
    res.send({ lastClickedTime: newTime });
});

if (require.main === module) {
    app.listen(port, '0.0.0.0', () => {
        console.log(`Server listening at http://localhost:${port}`);
    });
}

module.exports = app;
