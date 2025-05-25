const express = require('express');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const app = express();
const port = 3000;

const imagesDir = path.join(__dirname, 'public', 'images');
const thumbsDir = path.join(__dirname, 'public', 'thumbs');
if (!fs.existsSync(thumbsDir)) {
    fs.mkdirSync(thumbsDir, { recursive: true });
}

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
        plants.forEach(p => {
            if (p.image) {
                generateThumbnail(p.image);
            }
        });
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

function getThumbPath(imageRel) {
    const base = path.basename(imageRel || '');
    return `thumbs/${base}`;
}

function generateThumbnail(imageRel) {
    const src = path.join(imagesDir, path.basename(imageRel));
    const dest = path.join(thumbsDir, path.basename(imageRel));
    if (fs.existsSync(dest)) {
        return;
    }
    sharp(src)
        .resize(40, 40, { fit: 'cover' })
        .toFile(dest)
        .catch(err => console.error('Failed to create thumbnail', err));
}
// Save base64 image data to disk and return relative path
function saveBase64Image(data) {
    const match = /^data:(image\/\w+);base64,(.+)$/.exec(data || '');
    if (!match) return null;
    const ext = match[1].split('/')[1];
    const fileName = `img_${Date.now()}.${ext}`;
    try {
        fs.writeFileSync(path.join(imagesDir, fileName), match[2], 'base64');
        generateThumbnail(`images/${fileName}`);
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
    return Array.isArray(arr) && arr.length === 12 && arr.every(n => typeof n === 'number');
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
    const visiblePlants = plants.filter(p => !p.archived).map(p => {
        return { ...p, thumb: getThumbPath(p.image) };
    });
    res.send(visiblePlants);
});

app.get('/plants/:name', (req, res) => {
    const plant = plants.find(p => p.name === req.params.name);
    if (plant) {
        res.send({ ...plant, thumb: getThumbPath(plant.image) });
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
    } else if (req.body.image) {
        generateThumbnail(req.body.image);
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
    } else if (newPlant.image) {
        generateThumbnail(newPlant.image);
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
    generateThumbnail(plantToAdd.image);
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

if (require.main === module) {
    app.listen(port, '0.0.0.0', () => {
        console.log(`Server listening at http://localhost:${port}`);
    });
}

module.exports = app;
