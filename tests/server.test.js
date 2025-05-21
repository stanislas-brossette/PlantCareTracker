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

  test('POST /undo reverts to previous timestamp', async () => {
    const buttonId = 'undo-test-button';

    const first = await request(app)
      .post('/clicked')
      .send({ buttonId });

    // ensure different timestamp
    await new Promise(r => setTimeout(r, 10));

    const second = await request(app)
      .post('/clicked')
      .send({ buttonId });

    expect(first.body.lastClickedTime).not.toEqual(second.body.lastClickedTime);

    const undoRes = await request(app)
      .post('/undo')
      .send({ buttonId });

    expect(undoRes.statusCode).toBe(200);
    expect(undoRes.body.lastClickedTime).toEqual(first.body.lastClickedTime);

    const undoEmpty = await request(app)
      .post('/undo')
      .send({ buttonId });

    expect(undoEmpty.statusCode).toBe(200);
    expect(undoEmpty.body.lastClickedTime).toBeNull();
  });
});
