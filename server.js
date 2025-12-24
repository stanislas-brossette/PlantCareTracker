const express = require('express');
const fs = require('fs');
const { randomUUID } = require('crypto');
const app = express();
const port = 2000;
const path = require('path');
const parseIdentifyResponse = require('./parseIdentifyResponse');

const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5-mini";
const rawTemp = process.env.OPENAI_TEMPERATURE;
const parsedTemp = Number.isFinite(parseFloat(rawTemp)) ? parseFloat(rawTemp) : undefined;
const OPENAI_TEMPERATURE = parsedTemp === undefined ? undefined : parsedTemp;
let lastClickedTimes = {}; // Stores last clicked times for each action of each plant
const dataFile = 'lastClickedTimes.json';

let plants = [];
const plantsFile = 'plants.json';

let locations = [];
const locationsFile = 'locations.json';

function generateDefaultName() {
    let idx = 1;
    const existing = new Set(plants.map(p => p.name));
    let name = `Plant ${idx}`;
    while (existing.has(name)) {
        idx += 1;
        name = `Plant ${idx}`;
    }
    return name;
}

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
        if (!p.uuid){ p.uuid = randomUUID(); changed = true; }
        if (!p.updatedAt){ p.updatedAt = Date.now(); changed = true; }
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
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
});
// Increase JSON body size limit to handle base64 images
app.use(express.json({ limit: '10mb' }));
app.use((req,res,next)=>{ if(['POST','PUT','DELETE'].includes(req.method)) req.updatedAt = Date.now(); next(); });

function isValidFreqArray(arr) {
    return Array.isArray(arr) &&
        arr.length === 12 &&
        arr.every(n => n === null || (typeof n === 'number' && Number.isFinite(n)));
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
        return res.status(201).send({ name });
    }

    res.status(200).send({ name });
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

app.get('/plants/changes', (req, res) => {
    const since = parseInt(req.query.since || '0', 10);
    const changed = plants.filter(p => p.updatedAt > since);
    res.send({ plants: changed });
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
    if (req.body.wateringMin && !isValidFreqArray(req.body.wateringMin)) {
        return res.status(400).send('wateringMin must be an array of 12 numbers');
    }
    if (req.body.wateringMax && !isValidFreqArray(req.body.wateringMax)) {
        return res.status(400).send('wateringMax must be an array of 12 numbers');
    }
    if (req.body.feedingMin && !isValidFreqArray(req.body.feedingMin)) {
        return res.status(400).send('feedingMin must be an array of 12 numbers');
    }
    if (req.body.feedingMax && !isValidFreqArray(req.body.feedingMax)) {
        return res.status(400).send('feedingMax must be an array of 12 numbers');
    }

    if (req.body.location && !locations.includes(req.body.location)) {
        locations.push(req.body.location);
        writeLocations();
    }
    plants[index] = { ...plants[index], ...req.body, updatedAt: req.updatedAt };

    if (req.body.archived === true) {
        const finalName = newName || req.params.name;
        Object.keys(lastClickedTimes).forEach(key => {
            if (key.startsWith(`button-${finalName}-`)) {
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
    if (!newPlant.name || !newPlant.name.trim()) {
        newPlant.name = generateDefaultName();
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
    if (newPlant.wateringMin && !isValidFreqArray(newPlant.wateringMin)) {
        return res.status(400).send('wateringMin must be an array of 12 numbers');
    }
    if (newPlant.wateringMax && !isValidFreqArray(newPlant.wateringMax)) {
        return res.status(400).send('wateringMax must be an array of 12 numbers');
    }
    if (newPlant.feedingMin && !isValidFreqArray(newPlant.feedingMin)) {
        return res.status(400).send('feedingMin must be an array of 12 numbers');
    }
    if (newPlant.feedingMax && !isValidFreqArray(newPlant.feedingMax)) {
        return res.status(400).send('feedingMax must be an array of 12 numbers');
    }
    const plantToAdd = {
        name: newPlant.name,
        description: newPlant.description || '',
        wateringMin: newPlant.wateringMin || Array(12).fill(null),
        wateringMax: newPlant.wateringMax || Array(12).fill(null),
        feedingMin: newPlant.feedingMin || Array(12).fill(null),
        feedingMax: newPlant.feedingMax || Array(12).fill(null),
        image: newPlant.image || 'images/placeholder.png',
        location: newPlant.location,
        uuid: randomUUID(),
        updatedAt: req.updatedAt
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

app.post('/bulk', async (req, res) => {
    const ops = Array.isArray(req.body) ? req.body : [];
    const results = [];
    for (const op of ops){
        try {
            const r = await fetch(`http://localhost:${port}${op.url}`, {
                method: op.method,
                headers:{'Content-Type':'application/json'},
                body: op.body ? JSON.stringify(op.body) : undefined
            });
            results.push({ status: r.status });
        }catch(err){
            results.push({ status: 500 });
        }
    }
    res.send({ results });
});

app.post('/identify', async (req, res) => {
    const { image } = req.body;
    if (!image) {
        return res.status(400).send('Image is required');
    }

    const extractText = (content) => {
        const pieces = [];
        const visit = (node) => {
            if (node == null) return;
            if (typeof node === 'string' || typeof node === 'number' || typeof node === 'boolean') {
                pieces.push(String(node));
                return;
            }
            if (Array.isArray(node)) {
                node.forEach(visit);
                return;
            }
            if (typeof node === 'object') {
                // Common shapes: { text: '...' }, { text: [{ type: 'text', text: '...' }] }
                if (node.text !== undefined) visit(node.text);
                if (node.content !== undefined) visit(node.content);
                return;
            }
        };
        visit(content);
        return pieces.join('\n\n');
    };

    try {
        let base64;
        if (/^data:image\/\w+;base64,/.test(image)) {
            base64 = image.split(',')[1];
        } else {
            const filePath = path.join(__dirname, 'public', image);
            const buffer = fs.readFileSync(filePath);
            base64 = buffer.toString('base64');
        }
        const requestBody = {
            model: OPENAI_MODEL,
            messages: [
                {
                    role: 'system',
                    content: 'You are a botanical expert who helps identify plants and provide care instructions.'
                },
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: 'Peux-tu identifier cette plante à partir de la photo ci-jointe. Réponds en français. Donne d\'abord une courte fiche synthétique au format markdown (nom scientifique et commun, 3 ou 4 caractéristiques clés et conseils d\'entretien : lumière, arrosage, substrat, engrais, toxicité éventuelle). Pas de ligne vide entre les sections.\nEnsuite écris une ligne contenant uniquement --- puis un bloc JSON exactement au format suivant avec les recommandations d\'arrosage et d\'engrais par mois (janvier à décembre), chaque valeur étant le nombre de jours entre deux actions et null s\'il n\'y a pas de recommandation.\n```json\n{"wateringMin":[],"wateringMax":[],"feedingMin":[],"feedingMax":[]}\n```\nSi l\'identification est incertaine, propose deux ou trois options.'
                        },
                        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } }
                    ]
                }
            ],
        };
        const questionText = requestBody.messages
            .find(m => m.role === 'user')
            ?.content
            ?.find?.(part => part.type === 'text')
            ?.text;
        if (OPENAI_TEMPERATURE === undefined) {
            // Leave temperature at model default; some models (e.g., gpt-5-mini) only allow the default value.
        } else if (OPENAI_TEMPERATURE === 1) {
            requestBody.temperature = OPENAI_TEMPERATURE;
        } else {
            console.warn(`OPENAI_TEMPERATURE=${OPENAI_TEMPERATURE} is not supported for ${OPENAI_MODEL}; using model default.`);
        }

        const apiRes = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify(requestBody)
        });
        if (!apiRes.ok) {
            console.error('OpenAI error', await apiRes.text());
            return res.status(500).send('OpenAI request failed');
        }
        const data = await apiRes.json();
        const message = data.choices?.[0]?.message || {};
        const rawContent = message.content ?? message.text;
        const full = extractText(rawContent);
        if (questionText) {
            console.log('\n[OpenAI Identify] Question:\n', questionText);
        }
        console.log('[OpenAI Identify] Answer:\n', full);
        if (!full && rawContent !== undefined) {
            console.log('[OpenAI Identify] Raw content (unexpected shape):', JSON.stringify(rawContent, null, 2));
            console.log('[OpenAI Identify] Full message payload:', JSON.stringify(message, null, 2));
            console.log('[OpenAI Identify] Full API response:', JSON.stringify(data, null, 2));
        }
        const { description, schedule, commonName } = parseIdentifyResponse(full);
        res.send({ description, schedule, commonName });
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
