const express = require('express');
const fs = require('fs');
const app = express();
const port = 3000;
const path = require('path');

const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
let lastClickedTimes = {}; // Stores last clicked times for each action of each plant
const dataFile = 'lastClickedTimes.json';

let plants = [];
const plantsFile = 'plants.json';

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

function readPlants() {
    try {
        const data = fs.readFileSync(plantsFile, 'utf8');
        plants = JSON.parse(data);
    } catch (err) {
        console.log('No plants data found or error reading file:', err);
        plants = [];
    }
}

function writePlants() {
    fs.writeFile(plantsFile, JSON.stringify(plants, null, 4), err => {
        if (err) {
            console.error('Error writing plants file', err);
        }
    });
}
// Save base64 image data to disk and return relative path
function saveBase64Image(data) {
    const match = /^data:(image\/\w+);base64,(.+)$/.exec(data || '');
    if (!match) return null;
    const ext = match[1].split('/')[1];
    const fileName = `img_${Date.now()}.${ext}`;
    try {
        fs.writeFileSync(`public/images/${fileName}`, match[2], 'base64');
        return `images/${fileName}`;
    } catch (err) {
        console.error('Failed to save image', err);
        return null;
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

// Read the last clicked times from the file on server start
readLastClickedTimes();
readPlants();

app.use(express.static('public'));
// Increase JSON body size limit to handle base64 images
app.use(express.json({ limit: '10mb' }));

function isValidFreqArray(arr) {
    return Array.isArray(arr) &&
        arr.length === 12 &&
        arr.every(n => typeof n === 'number' && Number.isFinite(n));
}

app.post('/clicked', (req, res) => {
    const buttonId = req.body.buttonId;
    if (buttonId) {
        lastClickedTimes[buttonId] = new Date().toISOString();
        writeLastClickedTimes();
        res.send({ lastClickedTime: lastClickedTimes[buttonId] });
    } else {
        res.status(400).send('Button ID is required');
    }
});

app.post('/undo', (req, res) => {
    const { buttonId, previousTime } = req.body;
    if (!buttonId) {
        return res.status(400).send('Button ID is required');
    }

    if (previousTime) {
        lastClickedTimes[buttonId] = previousTime;
    } else {
        delete lastClickedTimes[buttonId];
    }

    writeLastClickedTimes();
    res.send({ lastClickedTime: previousTime || null });
});

app.get('/lastClickedTimes', (req, res) => {
    res.send(lastClickedTimes);
});

app.get('/plants', (req, res) => {
    // Only return non archived plants
    const visiblePlants = plants.filter(p => !p.archived);
    res.send(visiblePlants);
});

app.get('/plants/:name', (req, res) => {
    const plant = plants.find(p => p.name === req.params.name);
    if (plant) {
        res.send(plant);
    } else {
        res.status(404).send('Plant not found');
    }
});

app.put('/plants/:name', (req, res) => {
    const index = plants.findIndex(p => p.name === req.params.name);
    if (index === -1) {
        return res.status(404).send('Plant not found');
    }
    if (req.body.imageData) {
        const saved = saveBase64Image(req.body.imageData);
        if (saved) {
            req.body.image = saved;
        }
        delete req.body.imageData;
    }
    if (req.body.wateringFreq && !isValidFreqArray(req.body.wateringFreq)) {
        return res.status(400).send('wateringFreq must be an array of 12 numbers');
    }
    if (req.body.feedingFreq && !isValidFreqArray(req.body.feedingFreq)) {
        return res.status(400).send('feedingFreq must be an array of 12 numbers');
    }
    plants[index] = { ...plants[index], ...req.body };

    if (req.body.archived === true) {
        Object.keys(lastClickedTimes).forEach(key => {
            if (key.startsWith(`button-${req.params.name}-`)) {
                delete lastClickedTimes[key];
            }
        });
        writeLastClickedTimes();
    }

    writePlants();
    res.send(plants[index]);
});

app.post('/plants', (req, res) => {
    const newPlant = req.body;
    if (!newPlant.name) {
        return res.status(400).send('Name is required');
    }
    if (plants.find(p => p.name === newPlant.name)) {
        return res.status(400).send('Plant already exists');
    }
    if (newPlant.imageData) {
        const saved = saveBase64Image(newPlant.imageData);
        if (saved) {
            newPlant.image = saved;
        }
        delete newPlant.imageData;
    }
    if (newPlant.wateringFreq && !isValidFreqArray(newPlant.wateringFreq)) {
        return res.status(400).send('wateringFreq must be an array of 12 numbers');
    }
    if (newPlant.feedingFreq && !isValidFreqArray(newPlant.feedingFreq)) {
        return res.status(400).send('feedingFreq must be an array of 12 numbers');
    }
    const plantToAdd = {
        name: newPlant.name,
        description: newPlant.description || '',
        wateringFreq: newPlant.wateringFreq || Array(12).fill(0),
        feedingFreq: newPlant.feedingFreq || Array(12).fill(0),
        image: newPlant.image || 'images/placeholder.jpg'
    };
    plants.push(plantToAdd);
    writePlants();
    res.status(201).send(plantToAdd);
});

app.delete('/plants/:name', (req, res) => {
    const index = plants.findIndex(p => p.name === req.params.name);
    if (index === -1) {
        return res.status(404).send('Plant not found');
    }
    const removed = plants.splice(index, 1)[0];

    Object.keys(lastClickedTimes).forEach(key => {
        if (key.startsWith(`button-${req.params.name}-`)) {
            delete lastClickedTimes[key];
        }
    });
    writeLastClickedTimes();

    writePlants();
    res.send(removed);
});

app.post('/identify', async (req, res) => {
    const { image } = req.body;
    if (!image) {
        return res.status(400).send('Image is required');
    }
    try {
        const filePath = path.join(__dirname, 'public', image);
        const buffer = fs.readFileSync(filePath);
        const base64 = buffer.toString('base64');
        const apiRes = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: OPENAI_MODEL,
                messages: [{
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: 'Quel est cette plante? Donnes moi le nom de l\u2019esp\u00e8ce (scientifique et commun si possible), quelques particularit\u00e9s et des conseils d\u2019entretien (lumi\u00e8re, arrosage, engrais, etc.). R\u00e9ponds en fran\u00e7ais en 6 lignes maximum, la première ligne contient uniquement le nom de la plante, chaque ligne suivante commen\u00e7ant par \u201c- \u201d et sans ligne vide.'
                        },
                        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } }
                    ]
                }],
                max_tokens: 200
            })
        });
        if (!apiRes.ok) {
            console.error('OpenAI error', await apiRes.text());
            return res.status(500).send('OpenAI request failed');
        }
        const data = await apiRes.json();
        const answer = data.choices?.[0]?.message?.content || '';
        res.send({ answer });
    } catch (err) {
        console.error('Identify error', err);
        res.status(500).send('Error identifying plant');
    }
});

if (require.main === module) {
    app.listen(port, '0.0.0.0', () => {
        console.log(`Server listening at http://localhost:${port}`);
    });
}

module.exports = app;
