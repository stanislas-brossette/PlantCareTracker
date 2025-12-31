const fs = require('fs');
const request = require('supertest');

describe('Plant Renaming Logic', () => {
    const plantsFile = 'plants.json';
    const timesFile = 'lastClickedTimes.json';
    let originalPlants = [];
    let originalTimes = {};
    let app;

    beforeAll(() => {
        try {
            originalPlants = JSON.parse(fs.readFileSync(plantsFile, 'utf8'));
        } catch (e) { originalPlants = []; }
        try {
            originalTimes = JSON.parse(fs.readFileSync(timesFile, 'utf8'));
        } catch (e) { originalTimes = {}; }
    });

    afterAll(() => {
        fs.writeFileSync(plantsFile, JSON.stringify(originalPlants, null, 4));
        fs.writeFileSync(timesFile, JSON.stringify(originalTimes, null, 4));
    });

    beforeEach(() => {
        jest.resetModules();
        fs.writeFileSync(timesFile, JSON.stringify({}, null, 4));
        fs.writeFileSync(plantsFile, JSON.stringify([], null, 4));
        app = require('../server');
    });

    test('Renaming "Fern" should not affect "Fern 2" keys', async () => {
        const plant1 = {
            name: 'Fern',
            location: 'Default',
            wateringMin: Array(12).fill(null),
            wateringMax: Array(12).fill(null),
            feedingMin: Array(12).fill(null),
            feedingMax: Array(12).fill(null)
        };
        const plant2 = {
            name: 'Fern 2',
            location: 'Default',
            wateringMin: Array(12).fill(null),
            wateringMax: Array(12).fill(null),
            feedingMin: Array(12).fill(null),
            feedingMax: Array(12).fill(null)
        };

        await request(app).post('/plants').send(plant1);
        await request(app).post('/plants').send(plant2);

        await request(app).post('/clicked').send({ buttonId: 'button-Fern-Arrosage' });
        await request(app).post('/clicked').send({ buttonId: 'button-Fern 2-Arrosage' });

        let times = (await request(app).get('/lastClickedTimes')).body;
        expect(times['button-Fern-Arrosage']).toBeDefined();
        expect(times['button-Fern 2-Arrosage']).toBeDefined();

        await request(app).put('/plants/Fern').send({ name: 'Fern New' });

        times = (await request(app).get('/lastClickedTimes')).body;

        expect(times['button-Fern New-Arrosage']).toBeDefined();
        expect(times['button-Fern-Arrosage']).toBeUndefined();

        expect(times['button-Fern 2-Arrosage']).toBeDefined();
        expect(times['button-Fern New 2-Arrosage']).toBeUndefined();
    });

    test('Renaming "A" should not affect "A-B" keys (Bug Reproduction)', async () => {
        const plant1 = {
            name: 'A',
            location: 'Default',
            wateringMin: Array(12).fill(null),
            wateringMax: Array(12).fill(null),
            feedingMin: Array(12).fill(null),
            feedingMax: Array(12).fill(null)
        };
        const plant2 = {
            name: 'A-B',
            location: 'Default',
            wateringMin: Array(12).fill(null),
            wateringMax: Array(12).fill(null),
            feedingMin: Array(12).fill(null),
            feedingMax: Array(12).fill(null)
        };

        await request(app).post('/plants').send(plant1);
        await request(app).post('/plants').send(plant2);

        await request(app).post('/clicked').send({ buttonId: 'button-A-Arrosage' });
        await request(app).post('/clicked').send({ buttonId: 'button-A-B-Arrosage' });

        let times = (await request(app).get('/lastClickedTimes')).body;
        expect(times['button-A-Arrosage']).toBeDefined();
        expect(times['button-A-B-Arrosage']).toBeDefined();

        await request(app).put('/plants/A').send({ name: 'X' });

        times = (await request(app).get('/lastClickedTimes')).body;

        expect(times['button-X-Arrosage']).toBeDefined();
        expect(times['button-A-Arrosage']).toBeUndefined();

        expect(times['button-A-B-Arrosage']).toBeDefined();
        expect(times['button-X-B-Arrosage']).toBeUndefined();
    });
});
