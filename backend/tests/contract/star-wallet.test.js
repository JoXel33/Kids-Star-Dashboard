import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { openDb, applySchema } from '../../src/db/index.js';
import { createApp } from '../../src/app.js';

async function setup() {
  const db = openDb(':memory:');
  applySchema(db);
  const app = createApp(db, { serverSecret: 'sw-test' });
  const res = await request(app).post('/api/children')
    .send({ name: 'Mia', accessCode: 'star', recoveryAnswer: 'oak', createdDate: '2026-05-23' });
  return { app, token: res.body.sessionToken };
}

describe('PUT /api/days/:date/star', () => {
  test('200 sets star earned=true for today before 21:30', async () => {
    const { app, token } = await setup();
    const res = await request(app).put('/api/days/2026-05-23/star')
      .set('Authorization', `Bearer ${token}`)
      .send({ earned: true, clientDate: '2026-05-23', clientTime: '20:00' });
    assert.equal(res.status, 200);
    assert.equal(res.body.star.earned, true);
  });

  test('200 toggles back to false', async () => {
    const { app, token } = await setup();
    await request(app).put('/api/days/2026-05-23/star')
      .set('Authorization', `Bearer ${token}`)
      .send({ earned: true, clientDate: '2026-05-23', clientTime: '20:00' });
    const res = await request(app).put('/api/days/2026-05-23/star')
      .set('Authorization', `Bearer ${token}`)
      .send({ earned: false, clientDate: '2026-05-23', clientTime: '20:00' });
    assert.equal(res.status, 200);
    assert.equal(res.body.star.earned, false);
  });

  test('422 star_not_today for a non-today date', async () => {
    const { app, token } = await setup();
    const res = await request(app).put('/api/days/2026-05-22/star')
      .set('Authorization', `Bearer ${token}`)
      .send({ earned: true, clientDate: '2026-05-23', clientTime: '12:00' });
    assert.equal(res.status, 422);
    assert.equal(res.body.error.code, 'star_not_today');
  });

  test('422 star_locked at 21:30 or later', async () => {
    const { app, token } = await setup();
    const res = await request(app).put('/api/days/2026-05-23/star')
      .set('Authorization', `Bearer ${token}`)
      .send({ earned: true, clientDate: '2026-05-23', clientTime: '21:30' });
    assert.equal(res.status, 422);
    assert.equal(res.body.error.code, 'star_locked');
  });

  test('star status flows through to GET /api/days/:date', async () => {
    const { app, token } = await setup();
    await request(app).put('/api/days/2026-05-23/star')
      .set('Authorization', `Bearer ${token}`)
      .send({ earned: true, clientDate: '2026-05-23', clientTime: '20:00' });
    const day = await request(app).get('/api/days/2026-05-23')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(day.body.day.star.earned, true);
  });

  test('401 without token', async () => {
    const { app } = await setup();
    const res = await request(app).put('/api/days/2026-05-23/star')
      .send({ earned: true, clientDate: '2026-05-23', clientTime: '12:00' });
    assert.equal(res.status, 401);
  });
});

describe('GET /api/wallet', () => {
  test('200 returns zero wallet for a new child', async () => {
    const { app, token } = await setup();
    const res = await request(app)
      .get('/api/wallet?clientDate=2026-05-23&clientTime=12:00')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.wallet, { starsCollected: 0, starsSpent: 0, starBalance: 0 });
  });

  test("today's earned star is NOT counted before 21:30", async () => {
    const { app, token } = await setup();
    await request(app).put('/api/days/2026-05-23/star')
      .set('Authorization', `Bearer ${token}`)
      .send({ earned: true, clientDate: '2026-05-23', clientTime: '20:00' });
    const res = await request(app)
      .get('/api/wallet?clientDate=2026-05-23&clientTime=20:00')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(res.body.wallet.starsCollected, 0);
  });

  test("today's earned star IS counted at exactly 21:30", async () => {
    const { app, token } = await setup();
    await request(app).put('/api/days/2026-05-23/star')
      .set('Authorization', `Bearer ${token}`)
      .send({ earned: true, clientDate: '2026-05-23', clientTime: '20:00' });
    const res = await request(app)
      .get('/api/wallet?clientDate=2026-05-23&clientTime=21:30')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(res.body.wallet.starsCollected, 1);
    assert.equal(res.body.wallet.starBalance, 1);
  });

  test('400 invalid_input when clientDate or clientTime missing/invalid', async () => {
    const { app, token } = await setup();
    const res = await request(app)
      .get('/api/wallet?clientDate=bad&clientTime=12:00')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(res.status, 400);
  });

  test('401 without token', async () => {
    const { app } = await setup();
    const res = await request(app).get('/api/wallet?clientDate=2026-05-23&clientTime=12:00');
    assert.equal(res.status, 401);
  });
});
