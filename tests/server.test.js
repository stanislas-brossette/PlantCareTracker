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
});
