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
});
