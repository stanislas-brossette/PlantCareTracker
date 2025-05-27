const express = require('express');
const fs = require('fs');
const app = express();
const port = 3000;
const path = require('path');

const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4-turbo";
let lastClickedTimes = {}; // Stores last clicked times for each action of each plant
const dataFile = 'lastClickedTimes.json';

let plants = [];
const plantsFile = 'plants.json';

let locations = [];
const locationsFile = 'locations.json';

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

    // Ensure every plant has a location
    const defaultLoc = locations[0] || 'Default';
    let changed = false;
    plants.forEach(p => {
        if (!p.location) { p.location = defaultLoc; changed = true; }
    });
    if (changed) writePlants();
}

function writePlants() {
    fs.writeFile(plantsFile, JSON.stringify(plants, null, 4), err => {
        if (err) {
            console.error('Error writing plants file', err);
        }
    });
}

function readLocations() {
    try {
        const data = fs.readFileSync(locationsFile, 'utf8');
        locations = JSON.parse(data);
    } catch (err) {
        locations = ['Default'];
    }
}

function writeLocations() {
    fs.writeFile(locationsFile, JSON.stringify(locations, null, 4), err => {
        if (err) {
            console.error('Error writing locations file', err);
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

// Read stored data on server start
readLastClickedTimes();
readLocations();
readPlants();

app.use(express.static('public'));
// Increase JSON body size limit to handle base64 images
app.use(express.json({ limit: '10mb' }));

const MONTHS = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];

function isValidFreqArray(arr) {
    return Array.isArray(arr) &&
        arr.length === 12 &&
        arr.every(o => o && typeof o === 'object' &&
            typeof o.min === 'number' && Number.isFinite(o.min) &&
            typeof o.max === 'number' && Number.isFinite(o.max));
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

app.get('/locations', (req, res) => {
    res.send(locations);
});

app.post('/locations', (req, res) => {
    const { name } = req.body;
    if (!name) {
        return res.status(400).send('Name is required');
    }
    if (!locations.includes(name)) {
        locations.push(name);
        writeLocations();
    }
    res.status(201).send({ name });
});

app.delete('/locations/:name', (req, res) => {
    const idx = locations.indexOf(req.params.name);
    if (idx === -1) {
        return res.status(404).send('Location not found');
    }
    if (locations.length === 1) {
        return res.status(400).send('Cannot delete last location');
    }
    const removed = locations.splice(idx, 1)[0];
    const fallback = locations[0] || 'Default';
    let changed = false;
    plants.forEach(p => {
        if (p.location === removed) {
            p.location = fallback;
            changed = true;
        }
    });
    writeLocations();
    if (changed) writePlants();
    res.send({ name: removed });
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
    const oldName = plants[index].name;
    const newName = req.body.name && req.body.name !== oldName ? req.body.name : null;
    if (newName) {
        if (plants.find(p => p.name === newName)) {
            return res.status(400).send('Plant already exists');
        }
        plants[index].name = newName;
        Object.keys(lastClickedTimes).forEach(key => {
            if (key.startsWith(`button-${oldName}-`)) {
                const suffix = key.substring(`button-${oldName}-`.length);
                lastClickedTimes[`button-${newName}-${suffix}`] = lastClickedTimes[key];
                delete lastClickedTimes[key];
            }
        });
        writeLastClickedTimes();
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

    if (req.body.location && !locations.includes(req.body.location)) {
        locations.push(req.body.location);
        writeLocations();
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
    if (!newPlant.location) {
        return res.status(400).send('Location is required');
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
        image: newPlant.image || 'images/placeholder.png',
        location: newPlant.location
    };
    if (!locations.includes(plantToAdd.location)) {
        locations.push(plantToAdd.location);
        writeLocations();
    }
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
                            text: 'Peux-tu identifier cette plante à partir de la photo ci-jointe et me donner une fiche synthétique ?  Je veux : – Le nom scientifique et le nom commun – 3 ou 4 caractéristiques clés de la plante – Des conseils d’entretien (lumière, arrosage, substrat, engrais, toxicité éventuelle) – Le tout présenté de manière claire et concise, en bullet points, sans ligne vide entre les sections et au format markdown pour plus de clarté. Fais attention à la toxicité pour les chats. Format répondant à un usage d’application mobile / carnet de plantes. Termine ta réponse par un bloc markdown JSON nommé watering_frequency_days et fertilizer_frequency_days avec pour chaque mois des valeurs min et max en jours.'
                        },
                        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } }
                    ]
                }],
                max_tokens: 700
            })
        });
        if (!apiRes.ok) {
            console.error('OpenAI error', await apiRes.text());
            return res.status(500).send('OpenAI request failed');
        }
        const data = await apiRes.json();
        let answer = data.choices?.[0]?.message?.content || '';
        let wateringFreq = null;
        let feedingFreq = null;
        const m = answer.match(/```json\s*([\s\S]*?)\s*```/);
        if (m) {
            try {
                const obj = JSON.parse(m[1]);
                const convert = (src) => MONTHS.map(mon => {
                    const v = src?.[mon];
                    if (!v) return { min: 0, max: 0 };
                    return { min: v.min ?? 0, max: v.max ?? 0 };
                });
                if (obj.watering_frequency_days) {
                    wateringFreq = convert(obj.watering_frequency_days);
                }
                if (obj.fertilizer_frequency_days) {
                    feedingFreq = convert(obj.fertilizer_frequency_days);
                }
                answer = answer.replace(m[0], '').trim();
            } catch(e) {
                console.error('Failed to parse frequency JSON', e);
            }
        }
        res.send({ answer, wateringFreq, feedingFreq });
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
