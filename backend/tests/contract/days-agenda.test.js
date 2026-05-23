import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { openDb, applySchema } from '../../src/db/index.js';
import { createApp } from '../../src/app.js';

async function setup() {
  const db = openDb(':memory:');
  applySchema(db);
  const app = createApp(db, { serverSecret: 'days-test' });
  const res = await request(app)
    .post('/api/children')
    .send({ name: 'Mia', accessCode: 'bluefish', recoveryAnswer: 'oak park', createdDate: '2026-05-23' });
  return { app, token: res.body.sessionToken };
}

describe('GET /api/days/:date', () => {
  test('200 returns date + star (defaults to earned=false) + 14 agenda blocks', async () => {
    const { app, token } = await setup();
    const res = await request(app)
      .get('/api/days/2026-05-23').set('Authorization', `Bearer ${token}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.day.date, '2026-05-23');
    assert.equal(res.body.day.star.earned, false);
    assert.equal(res.body.day.agenda.length, 14);
    assert.equal(res.body.day.agenda[0].hour, 7);
    assert.equal(res.body.day.agenda[13].hour, 20);
    assert.equal(res.body.day.agenda[0].activity, '');
  });

  test('401 without token', async () => {
    const { app } = await setup();
    const res = await request(app).get('/api/days/2026-05-23');
    assert.equal(res.status, 401);
  });
});

describe('PUT /api/days/:date/agenda/:hour', () => {
  test('200 saves an upcoming block on today', async () => {
    const { app, token } = await setup();
    const res = await request(app)
      .put('/api/days/2026-05-23/agenda/14')
      .set('Authorization', `Bearer ${token}`)
      .send({ activity: 'Maths', clientDate: '2026-05-23', clientTime: '12:00' });
    assert.equal(res.status, 200);
    assert.equal(res.body.entry.hour, 14);
    assert.equal(res.body.entry.activity, 'Maths');
  });

  test('200 overwrites an existing entry', async () => {
    const { app, token } = await setup();
    await request(app).put('/api/days/2026-05-23/agenda/14')
      .set('Authorization', `Bearer ${token}`)
      .send({ activity: 'Maths', clientDate: '2026-05-23', clientTime: '12:00' });
    const res = await request(app).put('/api/days/2026-05-23/agenda/14')
      .set('Authorization', `Bearer ${token}`)
      .send({ activity: 'Reading', clientDate: '2026-05-23', clientTime: '12:00' });
    assert.equal(res.status, 200);
    assert.equal(res.body.entry.activity, 'Reading');
    const get = await request(app).get('/api/days/2026-05-23').set('Authorization', `Bearer ${token}`);
    assert.equal(get.body.day.agenda.find((e) => e.hour === 14).activity, 'Reading');
  });

  test('422 block_elapsed for any past-date block', async () => {
    const { app, token } = await setup();
    const res = await request(app)
      .put('/api/days/2026-05-22/agenda/14')
      .set('Authorization', `Bearer ${token}`)
      .send({ activity: 'late', clientDate: '2026-05-23', clientTime: '12:00' });
    assert.equal(res.status, 422);
    assert.equal(res.body.error.code, 'block_elapsed');
  });

  test('422 block_elapsed for a passed block on today', async () => {
    const { app, token } = await setup();
    const res = await request(app)
      .put('/api/days/2026-05-23/agenda/8')
      .set('Authorization', `Bearer ${token}`)
      .send({ activity: 'late', clientDate: '2026-05-23', clientTime: '14:00' });
    assert.equal(res.status, 422);
  });

  test('200 in-progress hour on today is still editable (clarify Q4)', async () => {
    const { app, token } = await setup();
    const res = await request(app)
      .put('/api/days/2026-05-23/agenda/14')
      .set('Authorization', `Bearer ${token}`)
      .send({ activity: 'now', clientDate: '2026-05-23', clientTime: '14:30' });
    assert.equal(res.status, 200);
  });

  test('200 future-date blocks are editable', async () => {
    const { app, token } = await setup();
    const res = await request(app)
      .put('/api/days/2026-05-25/agenda/9')
      .set('Authorization', `Bearer ${token}`)
      .send({ activity: 'plan', clientDate: '2026-05-23', clientTime: '14:00' });
    assert.equal(res.status, 200);
  });

  test('400 invalid_input for hour outside 7..20', async () => {
    const { app, token } = await setup();
    const res = await request(app)
      .put('/api/days/2026-05-23/agenda/6')
      .set('Authorization', `Bearer ${token}`)
      .send({ activity: 'x', clientDate: '2026-05-23', clientTime: '12:00' });
    assert.equal(res.status, 400);
  });

  test('401 without token', async () => {
    const { app } = await setup();
    const res = await request(app)
      .put('/api/days/2026-05-23/agenda/14')
      .send({ activity: 'x', clientDate: '2026-05-23', clientTime: '12:00' });
    assert.equal(res.status, 401);
  });
});
