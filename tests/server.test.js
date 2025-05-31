const request = require('supertest');
const app = require('../server');

describe('Server endpoints', () => {
  test('GET /locations returns status 200 and array', async () => {
    const res = await request(app).get('/locations');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('POST /locations creates a location', async () => {
    const name = 'TestArea-' + Date.now();
    const res = await request(app)
      .post('/locations')
      .send({ name });
    expect([200, 201]).toContain(res.statusCode);
    const list = await request(app).get('/locations');
    expect(list.body).toContain(name);
  });

  test('DELETE /locations removes location and updates plants', async () => {
    await request(app).post('/locations').send({ name: 'TempLoc' });
    await request(app)
      .post('/plants')
      .send({
        name: 'TempPlant',
        wateringMin: Array(12).fill(1),
        wateringMax: Array(12).fill(1),
        feedingMin: Array(12).fill(1),
        feedingMax: Array(12).fill(1),
        image: 'images/placeholder.png',
        location: 'TempLoc'
      });
    const delRes = await request(app).delete('/locations/TempLoc');
    expect(delRes.statusCode).toBe(200);
    const list = await request(app).get('/locations');
    expect(list.body).not.toContain('TempLoc');
    const plant = await request(app).get('/plants/TempPlant');
    expect(plant.body.location).not.toBe('TempLoc');
    await request(app).delete('/plants/TempPlant');
  });
  test('GET /lastClickedTimes returns status 200 and JSON', async () => {
    const res = await request(app).get('/lastClickedTimes');
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toMatch(/json/);
    expect(typeof res.body).toBe('object');
  });

  test('POST /clicked responds with updated timestamp', async () => {
    const res = await request(app)
      .post('/clicked')
      .send({ buttonId: 'sample-button' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('lastClickedTime');
  });

  test('POST /undo restores previous timestamp', async () => {
    const buttonId = 'sample-button-undo';
    await request(app).post('/clicked').send({ buttonId });

    const ts = new Date('2000-01-01T00:00:00.000Z').toISOString();
    const res = await request(app)
      .post('/undo')
      .send({ buttonId, previousTime: ts });
    expect(res.statusCode).toBe(200);
    expect(res.body.lastClickedTime).toBe(ts);

    const times = await request(app).get('/lastClickedTimes');
    expect(times.body[buttonId]).toBe(ts);

    await request(app).post('/undo').send({ buttonId, previousTime: null });
  });

  test('GET /plants returns array of plants', async () => {
    const res = await request(app).get('/plants');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('PUT /plants/:name updates a plant', async () => {
    const res = await request(app)
      .put('/plants/ZZ')
      .send({ description: 'test-desc' });
    expect(res.statusCode).toBe(200);
    expect(res.body.description).toBe('test-desc');

    await request(app)
      .put('/plants/ZZ')
      .send({ description: '' });
  });


  test('PUT /plants/:name archives a plant', async () => {
    const res = await request(app)
      .put('/plants/ZZ')
      .send({ archived: true });
    expect(res.statusCode).toBe(200);
    expect(res.body.archived).toBe(true);

    await request(app)
      .put('/plants/ZZ')
      .send({ archived: false });
  });

  test('Archiving a plant removes its lastClickedTimes entries', async () => {
    const name = 'Fougère';

    await request(app).post('/clicked').send({ buttonId: `button-${name}-Arrosage` });
    await request(app).post('/clicked').send({ buttonId: `button-${name}-Engrais` });

    const archiveRes = await request(app)
      .put('/plants/' + encodeURIComponent(name))
      .send({ archived: true });
    expect(archiveRes.statusCode).toBe(200);

    const times = await request(app).get('/lastClickedTimes');
    const hasEntry = Object.keys(times.body).some(k => k.includes(name));
    expect(hasEntry).toBe(false);

    await request(app)
      .put('/plants/' + encodeURIComponent(name))
      .send({ archived: false });
    await request(app).post('/clicked').send({ buttonId: `button-${name}-Arrosage` });
    await request(app).post('/clicked').send({ buttonId: `button-${name}-Engrais` });
  });

  test('POST /plants creates and DELETE removes a plant', async () => {
    const newPlant = {
      name: 'TestPlant',
      description: 'temp',
      wateringMin: Array(12).fill(1),
      wateringMax: Array(12).fill(1),
      feedingMin: Array(12).fill(1),
      feedingMax: Array(12).fill(1),
      image: 'images/placeholder.png',
      location: 'TestArea'
    };

    const createRes = await request(app)
      .post('/plants')
      .send(newPlant);
    expect(createRes.statusCode).toBe(201);
    expect(createRes.body.name).toBe(newPlant.name);

    const delRes = await request(app)
      .delete('/plants/' + encodeURIComponent(newPlant.name));
    expect(delRes.statusCode).toBe(200);
  });

  test('POST /plants assigns default name when missing', async () => {
    const res = await request(app)
      .post('/plants')
      .send({
        description: 'temp',
        wateringMin: Array(12).fill(1),
        wateringMax: Array(12).fill(1),
        feedingMin: Array(12).fill(1),
        feedingMax: Array(12).fill(1),
        image: 'images/placeholder.png',
        location: 'TestArea'
      });
    expect(res.statusCode).toBe(201);
    expect(res.body.name).toBeTruthy();
    await request(app).delete('/plants/' + encodeURIComponent(res.body.name));
  });

  test('Reject invalid frequency arrays on creation', async () => {
    const res = await request(app)
      .post('/plants')
      .send({
        name: 'InvalidPlant',
        wateringMin: [1],
        wateringMax: Array(12).fill(1),
        feedingMin: Array(12).fill(1),
        feedingMax: Array(12).fill(1),
        location: 'TestArea'
      });
    expect(res.statusCode).toBe(400);
  });

  test('Reject invalid frequency arrays on update', async () => {
    const res = await request(app)
      .put('/plants/ZZ')
      .send({ wateringMin: [1] });
    expect(res.statusCode).toBe(400);
  });

  test('Reject non-finite frequency values', async () => {
    const invalid = Array(12).fill('x');
    const res = await request(app)
      .post('/plants')
      .send({ name: 'BadNum', wateringMin: invalid, wateringMax: invalid, feedingMin: invalid, feedingMax: invalid, location: 'TestArea' });
    expect(res.statusCode).toBe(400);
  });

  test('Allow null frequency values on update', async () => {
    const arr = Array(12).fill(null);
    const res = await request(app)
      .put('/plants/ZZ')
      .send({ wateringMin: arr, wateringMax: arr });
    expect(res.statusCode).toBe(200);
    const plant = await request(app).get('/plants/ZZ');
    expect(plant.body.wateringMin.every(v => v === null)).toBe(true);
  });

  test('Renaming and archiving removes renamed lastClickedTimes', async () => {
    const oldName = 'ZZ';
    const newName = `New${Date.now()}`;

    await request(app).post('/clicked').send({ buttonId: `button-${oldName}-Arrosage` });
    await request(app).post('/clicked').send({ buttonId: `button-${oldName}-Engrais` });

    const archiveRes = await request(app)
      .put('/plants/' + encodeURIComponent(oldName))
      .send({ name: newName, archived: true });
    expect(archiveRes.statusCode).toBe(200);

    const times = await request(app).get('/lastClickedTimes');
    const has = Object.keys(times.body).some(k => k.includes(newName));
    expect(has).toBe(false);

    await request(app)
      .put('/plants/' + encodeURIComponent(newName))
      .send({ name: oldName, archived: false });
    await request(app).post('/clicked').send({ buttonId: `button-${oldName}-Arrosage` });
    await request(app).post('/clicked').send({ buttonId: `button-${oldName}-Engrais` });
  });

  test('GET /plants/changes returns recent updates', async () => {
    const before = Date.now() - 1;
    await request(app).post('/plants').send({
      name: 'ChangePlant',
      wateringMin: Array(12).fill(1),
      wateringMax: Array(12).fill(1),
      feedingMin: Array(12).fill(1),
      feedingMax: Array(12).fill(1),
      image: 'images/placeholder.png',
      location: 'TestArea'
    });
    const res = await request(app).get('/plants/changes?since=' + before);
    expect(res.statusCode).toBe(200);
    await request(app).delete('/plants/ChangePlant');
  });

  test('POST /bulk processes multiple ops', async () => {
    const ops = [
      { method: 'POST', url: '/plants', body: { name: 'BulkPlant', wateringMin: Array(12).fill(1), wateringMax: Array(12).fill(1), feedingMin: Array(12).fill(1), feedingMax: Array(12).fill(1), image: 'images/placeholder.png', location: 'TestArea' } },
      { method: 'DELETE', url: '/plants/BulkPlant' }
    ];
    const res = await request(app).post('/bulk').send(ops);
    expect(res.statusCode).toBe(200);
  });
});
