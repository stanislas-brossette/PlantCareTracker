const request = require('supertest');
const app = require('../server');

describe('Server endpoints', () => {
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
      wateringFreq: Array(12).fill(1),
      feedingFreq: Array(12).fill(1),
      image: 'images/placeholder.jpg'
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

  test('Reject invalid frequency arrays on creation', async () => {
    const res = await request(app)
      .post('/plants')
      .send({
        name: 'InvalidPlant',
        wateringFreq: [1],
        feedingFreq: Array(12).fill(1)
      });
    expect(res.statusCode).toBe(400);
  });

  test('Reject invalid frequency arrays on update', async () => {
    const res = await request(app)
      .put('/plants/ZZ')
      .send({ wateringFreq: [1] });
    expect(res.statusCode).toBe(400);
  });

  test('Reject non-finite frequency values', async () => {
    const invalid = Array(12).fill(1e309); // Infinity when parsed
    const res = await request(app)
      .post('/plants')
      .send({ name: 'BadNum', wateringFreq: invalid, feedingFreq: invalid });
    expect(res.statusCode).toBe(400);
  });
});
