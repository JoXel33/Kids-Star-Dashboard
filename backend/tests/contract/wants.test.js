import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { openDb, applySchema } from '../../src/db/index.js';
import { createApp } from '../../src/app.js';

async function setup() {
  const db = openDb(':memory:');
  applySchema(db);
  const app = createApp(db, { serverSecret: 'wants-test' });
  const res = await request(app).post('/api/children')
    .send({ name: 'Mia', accessCode: 'want', recoveryAnswer: 'oak', createdDate: '2026-05-15' });
  return { app, token: res.body.sessionToken };
}

async function earnStars(app, token, count, startDate = '2026-05-15') {
  const auth = { Authorization: `Bearer ${token}` };
  const [y, m, d] = startDate.split('-').map(Number);
  for (let i = 0; i < count; i++) {
    const dt = new Date(Date.UTC(y, m - 1, d + i));
    const date = dt.toISOString().slice(0, 10);
    await request(app).put(`/api/days/${date}/star`).set(auth)
      .send({ earned: true, clientDate: date, clientTime: '20:00' });
  }
}

describe('GET /api/wants', () => {
  test('200 with empty list initially', async () => {
    const { app, token } = await setup();
    const res = await request(app).get('/api/wants').set('Authorization', `Bearer ${token}`);
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.wants, []);
  });

  test('401 without token', async () => {
    const { app } = await setup();
    const res = await request(app).get('/api/wants');
    assert.equal(res.status, 401);
  });
});

describe('POST /api/wants', () => {
  test('201 adds a want', async () => {
    const { app, token } = await setup();
    const res = await request(app).post('/api/wants')
      .set('Authorization', `Bearer ${token}`)
      .send({ description: 'Ice cream', cost: 3 });
    assert.equal(res.status, 201);
    assert.equal(res.body.want.description, 'Ice cream');
    assert.equal(res.body.want.cost, 3);
    assert.ok(res.body.want.id);
  });

  test('400 invalid_input for cost out of 1..5', async () => {
    const { app, token } = await setup();
    let res = await request(app).post('/api/wants').set('Authorization', `Bearer ${token}`)
      .send({ description: 'too low', cost: 0 });
    assert.equal(res.status, 400);
    res = await request(app).post('/api/wants').set('Authorization', `Bearer ${token}`)
      .send({ description: 'too high', cost: 6 });
    assert.equal(res.status, 400);
  });

  test('400 invalid_input for empty description', async () => {
    const { app, token } = await setup();
    const res = await request(app).post('/api/wants').set('Authorization', `Bearer ${token}`)
      .send({ description: '', cost: 1 });
    assert.equal(res.status, 400);
  });

  test('422 want_limit_reached after 3 wants', async () => {
    const { app, token } = await setup();
    for (let i = 0; i < 3; i++) {
      await request(app).post('/api/wants').set('Authorization', `Bearer ${token}`)
        .send({ description: `w${i}`, cost: 1 });
    }
    const res = await request(app).post('/api/wants').set('Authorization', `Bearer ${token}`)
      .send({ description: '4th', cost: 1 });
    assert.equal(res.status, 422);
    assert.equal(res.body.error.code, 'want_limit_reached');
  });
});

describe('DELETE /api/wants/:id', () => {
  test('204 removes a want', async () => {
    const { app, token } = await setup();
    const add = await request(app).post('/api/wants').set('Authorization', `Bearer ${token}`)
      .send({ description: 'remove me', cost: 1 });
    const id = add.body.want.id;
    const del = await request(app).delete(`/api/wants/${id}`).set('Authorization', `Bearer ${token}`);
    assert.equal(del.status, 204);
    const list = await request(app).get('/api/wants').set('Authorization', `Bearer ${token}`);
    assert.equal(list.body.wants.length, 0);
  });

  test('404 want_not_found for unknown id', async () => {
    const { app, token } = await setup();
    const res = await request(app).delete('/api/wants/9999').set('Authorization', `Bearer ${token}`);
    assert.equal(res.status, 404);
    assert.equal(res.body.error.code, 'want_not_found');
  });
});

describe('POST /api/wants/:id/redeem', () => {
  test('200 redeems when affordable: removes want, updates wallet', async () => {
    const { app, token } = await setup();
    await earnStars(app, token, 4);    // 4 past stars
    const add = await request(app).post('/api/wants').set('Authorization', `Bearer ${token}`)
      .send({ description: 'cone', cost: 3 });
    const id = add.body.want.id;
    const res = await request(app).post(`/api/wants/${id}/redeem`)
      .set('Authorization', `Bearer ${token}`)
      .send({ clientDate: '2026-05-23', clientTime: '12:00' });
    assert.equal(res.status, 200);
    assert.equal(res.body.wallet.starsSpent, 3);
    assert.equal(res.body.wallet.starBalance, 1);
    const list = await request(app).get('/api/wants').set('Authorization', `Bearer ${token}`);
    assert.equal(list.body.wants.length, 0);
  });

  test('422 insufficient_balance when too expensive; want unchanged', async () => {
    const { app, token } = await setup();
    await earnStars(app, token, 2);
    const add = await request(app).post('/api/wants').set('Authorization', `Bearer ${token}`)
      .send({ description: 'pricey', cost: 5 });
    const id = add.body.want.id;
    const res = await request(app).post(`/api/wants/${id}/redeem`)
      .set('Authorization', `Bearer ${token}`)
      .send({ clientDate: '2026-05-23', clientTime: '12:00' });
    assert.equal(res.status, 422);
    assert.equal(res.body.error.code, 'insufficient_balance');
    const list = await request(app).get('/api/wants').set('Authorization', `Bearer ${token}`);
    assert.equal(list.body.wants.length, 1);
  });

  test('404 want_not_found for unknown id', async () => {
    const { app, token } = await setup();
    const res = await request(app).post('/api/wants/9999/redeem')
      .set('Authorization', `Bearer ${token}`)
      .send({ clientDate: '2026-05-23', clientTime: '12:00' });
    assert.equal(res.status, 404);
  });
});
