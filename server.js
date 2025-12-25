const express = require('express');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const parseIdentifyResponse = require('./parseIdentifyResponse');

const app = express();
const port = 2000;

const DATA_DIR = __dirname;
const PUBLIC_DIR = path.join(__dirname, 'public');
const IMAGE_DIR = path.join(PUBLIC_DIR, 'images');

const dataFile = path.join(DATA_DIR, 'lastClickedTimes.json');
const plantsFile = path.join(DATA_DIR, 'plants.json');
const locationsFile = path.join(DATA_DIR, 'locations.json');

const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-5-mini';
const rawTemp = process.env.OPENAI_TEMPERATURE;
const parsedTemp = Number.isFinite(parseFloat(rawTemp)) ? parseFloat(rawTemp) : undefined;
const OPENAI_TEMPERATURE = parsedTemp === undefined ? undefined : parsedTemp;

let lastClickedTimes = {};
let plants = [];
let locations = [];

function readJson(filePath, fallback) {
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (err) {
        return fallback;
    }
}

function writeJson(filePath, data, label) {
    fs.writeFile(filePath, JSON.stringify(data, null, 4), (err) => {
        if (err) {
            console.error(`Error writing ${label || filePath}`, err);
        }
    });
}

function generateDefaultName() {
    let idx = 1;
    const existing = new Set(plants.map((p) => p.name));
    let name = `Plant ${idx}`;
    while (existing.has(name)) {
        idx += 1;
        name = `Plant ${idx}`;
    }
    return name;
}

function isValidFreqArray(arr) {
    return (
        Array.isArray(arr) &&
        arr.length === 12 &&
        arr.every((n) => n === null || (typeof n === 'number' && Number.isFinite(n)))
    );
}

function saveBase64Image(data) {
    const match = /^data:(image\/\w+);base64,(.+)$/.exec(data || '');
    if (!match) return null;
    const ext = match[1].split('/')[1];
    const fileName = `img_${Date.now()}.${ext}`;
    const destination = path.join(IMAGE_DIR, fileName);
    try {
        fs.writeFileSync(destination, match[2], 'base64');
        return `/images/${fileName}`;
    } catch (err) {
        console.error('Failed to save image', err);
        return null;
    }
}

function readAllData() {
    lastClickedTimes = readJson(dataFile, {});
    locations = readJson(locationsFile, ['Default']);
    plants = readJson(plantsFile, []);

    const defaultLoc = locations[0] || 'Default';
    let changed = false;
    plants.forEach((p) => {
        if (!p.location) {
            p.location = defaultLoc;
            changed = true;
        }
        if (!p.uuid) {
            p.uuid = randomUUID();
            changed = true;
        }
        if (!p.updatedAt) {
            p.updatedAt = Date.now();
            changed = true;
        }
    });
    if (changed) writeJson(plantsFile, plants, 'plants');
}

function persistPlants() {
    writeJson(plantsFile, plants, 'plants');
}

function persistLocations() {
    writeJson(locationsFile, locations, 'locations');
}

function persistTimes() {
    writeJson(dataFile, lastClickedTimes, 'last clicked times');
}

readAllData();

app.use(express.json({ limit: '10mb' }));
app.use('/images', express.static(IMAGE_DIR));
app.use(express.static(PUBLIC_DIR));

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
});

app.use((req, res, next) => {
    if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
        req.updatedAt = Date.now();
    }
    next();
});

const api = express.Router();

api.get('/plants', (req, res) => {
    const visiblePlants = plants.filter((p) => !p.archived);
    res.json(visiblePlants);
});

api.get('/plants/changes', (req, res) => {
    const since = parseInt(req.query.since || '0', 10);
    const changed = plants.filter((p) => p.updatedAt > since);
    res.json({ plants: changed });
});

api.get('/plants/:idOrName', (req, res) => {
    const key = req.params.idOrName;
    const plant = plants.find((p) => p.uuid === key || p.name === key);
    if (plant) return res.json(plant);
    return res.status(404).json({ error: 'Plant not found' });
});

api.put('/plants/:name', (req, res) => {
    const index = plants.findIndex((p) => p.name === req.params.name);
    if (index === -1) {
        return res.status(404).json({ error: 'Plant not found' });
    }

    const oldName = plants[index].name;
    const newName = req.body.name && req.body.name !== oldName ? req.body.name : null;
    if (newName) {
        if (plants.find((p) => p.name === newName)) {
            return res.status(400).json({ error: 'Plant already exists' });
        }
        plants[index].name = newName;
        Object.keys(lastClickedTimes).forEach((key) => {
            if (key.startsWith(`button-${oldName}-`)) {
                const suffix = key.substring(`button-${oldName}-`.length);
                lastClickedTimes[`button-${newName}-${suffix}`] = lastClickedTimes[key];
                delete lastClickedTimes[key];
            }
        });
        persistTimes();
    }

    if (req.body.imageData) {
        const saved = saveBase64Image(req.body.imageData);
        if (saved) {
            req.body.image = saved;
        }
        delete req.body.imageData;
    }

    if (req.body.wateringMin && !isValidFreqArray(req.body.wateringMin)) {
        return res.status(400).json({ error: 'wateringMin must be an array of 12 numbers' });
    }
    if (req.body.wateringMax && !isValidFreqArray(req.body.wateringMax)) {
        return res.status(400).json({ error: 'wateringMax must be an array of 12 numbers' });
    }
    if (req.body.feedingMin && !isValidFreqArray(req.body.feedingMin)) {
        return res.status(400).json({ error: 'feedingMin must be an array of 12 numbers' });
    }
    if (req.body.feedingMax && !isValidFreqArray(req.body.feedingMax)) {
        return res.status(400).json({ error: 'feedingMax must be an array of 12 numbers' });
    }

    if (req.body.location && !locations.includes(req.body.location)) {
        locations.push(req.body.location);
        persistLocations();
    }

    plants[index] = { ...plants[index], ...req.body, updatedAt: req.updatedAt };

    if (req.body.archived === true) {
        const finalName = newName || req.params.name;
        Object.keys(lastClickedTimes).forEach((key) => {
            if (key.startsWith(`button-${finalName}-`)) {
                delete lastClickedTimes[key];
            }
        });
        persistTimes();
    }

    persistPlants();
    res.json(plants[index]);
});

api.post('/plants', (req, res) => {
    const newPlant = req.body;
    if (!newPlant.name || !newPlant.name.trim()) {
        newPlant.name = generateDefaultName();
    }
    if (plants.find((p) => p.name === newPlant.name)) {
        return res.status(400).json({ error: 'Plant already exists' });
    }

    if (!newPlant.location) {
        return res.status(400).json({ error: 'Location is required' });
    }
    if (newPlant.imageData) {
        const saved = saveBase64Image(newPlant.imageData);
        if (saved) {
            newPlant.image = saved;
        }
        delete newPlant.imageData;
    }

    if (newPlant.wateringMin && !isValidFreqArray(newPlant.wateringMin)) {
        return res.status(400).json({ error: 'wateringMin must be an array of 12 numbers' });
    }
    if (newPlant.wateringMax && !isValidFreqArray(newPlant.wateringMax)) {
        return res.status(400).json({ error: 'wateringMax must be an array of 12 numbers' });
    }
    if (newPlant.feedingMin && !isValidFreqArray(newPlant.feedingMin)) {
        return res.status(400).json({ error: 'feedingMin must be an array of 12 numbers' });
    }
    if (newPlant.feedingMax && !isValidFreqArray(newPlant.feedingMax)) {
        return res.status(400).json({ error: 'feedingMax must be an array of 12 numbers' });
    }

    const plantToAdd = {
        name: newPlant.name,
        description: newPlant.description || '',
        wateringMin: newPlant.wateringMin || Array(12).fill(null),
        wateringMax: newPlant.wateringMax || Array(12).fill(null),
        feedingMin: newPlant.feedingMin || Array(12).fill(null),
        feedingMax: newPlant.feedingMax || Array(12).fill(null),
        image: newPlant.image || '/images/placeholder.png',
        location: newPlant.location,
        uuid: randomUUID(),
        updatedAt: req.updatedAt,
    };

    if (!locations.includes(plantToAdd.location)) {
        locations.push(plantToAdd.location);
        persistLocations();
    }
    plants.push(plantToAdd);
    persistPlants();

    res.status(201).json(plantToAdd);
});

api.delete('/plants/:name', (req, res) => {
    const index = plants.findIndex((p) => p.name === req.params.name);
    if (index === -1) {
        return res.status(404).json({ error: 'Plant not found' });
    }
    const removed = plants.splice(index, 1)[0];

    Object.keys(lastClickedTimes).forEach((key) => {
        if (key.startsWith(`button-${req.params.name}-`)) {
            delete lastClickedTimes[key];
        }
    });
    persistTimes();
    persistPlants();

    res.json(removed);
});

api.get('/locations', (req, res) => {
    res.json(locations);
});

api.post('/locations', (req, res) => {
    const { name } = req.body;
    if (!name) {
        return res.status(400).json({ error: 'Name is required' });
    }

    if (!locations.includes(name)) {
        locations.push(name);
        persistLocations();
        return res.status(201).json({ name });
    }

    res.status(200).json({ name });
});

api.delete('/locations/:name', (req, res) => {
    const idx = locations.indexOf(req.params.name);
    if (idx === -1) {
        return res.status(404).json({ error: 'Location not found' });
    }
    if (locations.length === 1) {
        return res.status(400).json({ error: 'Cannot delete last location' });
    }
    const removed = locations.splice(idx, 1)[0];
    const fallback = locations[0] || 'Default';
    let changed = false;
    plants.forEach((p) => {
        if (p.location === removed) {
            p.location = fallback;
            changed = true;
        }
    });
    persistLocations();
    if (changed) persistPlants();
    res.json({ name: removed });
});

api.post('/clicked', (req, res) => {
    const { buttonId } = req.body;
    if (!buttonId) {
        return res.status(400).json({ error: 'Button ID is required' });
    }
    lastClickedTimes[buttonId] = new Date().toISOString();
    persistTimes();
    res.json({ lastClickedTime: lastClickedTimes[buttonId] });
});

api.post('/undo', (req, res) => {
    const { buttonId, previousTime } = req.body;
    if (!buttonId) {
        return res.status(400).json({ error: 'Button ID is required' });
    }

    if (previousTime) {
        lastClickedTimes[buttonId] = previousTime;
    } else {
        delete lastClickedTimes[buttonId];
    }

    persistTimes();
    res.json({ lastClickedTime: previousTime || null });
});

api.get('/lastClickedTimes', (req, res) => {
    res.json(lastClickedTimes);
});

api.post('/bulk', async (req, res) => {
    const ops = Array.isArray(req.body) ? req.body : [];
    const results = [];
    for (const op of ops) {
        try {
            const target = op.url.startsWith('/api') ? op.url : `/api${op.url.startsWith('/') ? op.url : '/' + op.url}`;
            const response = await fetch(`http://localhost:${port}${target}`, {
                method: op.method,
                headers: { 'Content-Type': 'application/json' },
                body: op.body ? JSON.stringify(op.body) : undefined,
            });
            results.push({ status: response.status });
        } catch (err) {
            results.push({ status: 500 });
        }
    }
    res.json({ results });
});

api.post('/identify', async (req, res) => {
    const { image } = req.body;
    if (!image) {
        return res.status(400).json({ error: 'Image is required' });
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
                if (node.text !== undefined) visit(node.text);
                if (node.content !== undefined) visit(node.content);
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
            const filePath = path.join(PUBLIC_DIR, image.replace(/^\//, ''));
            const buffer = fs.readFileSync(filePath);
            base64 = buffer.toString('base64');
        }

        const requestBody = {
            model: OPENAI_MODEL,
            messages: [
                { role: 'system', content: 'You are a botanical expert who helps identify plants and provide care instructions.' },
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: "Peux-tu identifier cette plante à partir de la photo ci-jointe. Réponds en français. Donne d'abord une courte fiche synthétique au format markdown (nom scientifique et commun, 3 ou 4 caractéristiques clés et conseils d'entretien : lumière, arrosage, substrat, engrais, toxicité éventuelle). Pas de ligne vide entre les sections.\nEnsuite écris une ligne contenant uniquement --- puis un bloc JSON exactement au format suivant avec les recommandations d'arrosage et d'engrais par mois (janvier à décembre), chaque valeur étant le nombre de jours entre deux actions et null s'il n'y a pas de recommandation.\n```json\n{\"wateringMin\":[],\"wateringMax\":[],\"feedingMin\":[],\"feedingMax\":[]}\n```",
                        },
                        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } },
                    ],
                },
            ],
        };

        const questionText = requestBody.messages
            .find((m) => m.role === 'user')
            ?.content?.find?.((part) => part.type === 'text')?.text;

        if (OPENAI_TEMPERATURE === undefined) {
            // default
        } else if (OPENAI_TEMPERATURE === 1) {
            requestBody.temperature = OPENAI_TEMPERATURE;
        } else {
            console.warn(`OPENAI_TEMPERATURE=${OPENAI_TEMPERATURE} is not supported for ${OPENAI_MODEL}; using model default.`);
        }

        const apiRes = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify(requestBody),
        });

        if (!apiRes.ok) {
            console.error('OpenAI error', await apiRes.text());
            return res.status(500).json({ error: 'OpenAI request failed' });
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
        res.json({ description, schedule, commonName });
    } catch (err) {
        console.error('Identify error', err);
        res.status(500).json({ error: 'Error identifying plant' });
    }
});

app.use('/api', api);

app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Not found' });
});

app.get('*', (req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

if (require.main === module) {
    app.listen(port, '0.0.0.0', () => {
        console.log(`Server listening at http://localhost:${port}`);
    });
}

module.exports = app;
